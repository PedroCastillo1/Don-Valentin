import pg from "pg";
import type { Config } from "../config.ts";

/*
 * Capa única de acceso a PostgreSQL (Supabase en el ambiente de prueba; PostgreSQL 17 embebido en las pruebas).
 * Mantiene la interfaz que usaba la versión MySQL para no tocar los servicios:
 *  - parámetros con "?" (se traducen a $1, $2…);
 *  - exec() devuelve { insertId, affectedRows };
 *  - los errores de clave duplicada traen errno 1062 y los de bloqueo 1213/1205;
 *  - fechas y horas llegan como texto UTC "AAAA-MM-DD HH:MM:SS.mmm", días como "AAAA-MM-DD".
 */

// Tipos que se leen igual que con mysql2
const T = pg.types.builtins;
const sinZona = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toISOString().replace("T", " ").replace("Z", "");
};
pg.types.setTypeParser(T.TIMESTAMPTZ, sinZona);
pg.types.setTypeParser(T.TIMESTAMP, (v) => v);
pg.types.setTypeParser(T.DATE, (v) => v);
pg.types.setTypeParser(T.INT8, (v) => Number(v)); // COUNT(*), SUM(), ids bigint: valores chicos

export type Db = pg.Pool;
export type Tx = pg.PoolClient;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export interface ResultadoExec {
  insertId: number;
  affectedRows: number;
}

type ConfigDb = Pick<
  Config,
  "DATABASE_URL" | "DB_HOST" | "DB_PORT" | "DB_USER" | "DB_PASSWORD" | "DB_NAME" | "DB_SSL" | "DB_POOL_MAX"
>;

export function createPool(cfg: ConfigDb, _opts: { multipleStatements?: boolean } = {}): Db {
  const ssl = cfg.DB_SSL ? { rejectUnauthorized: false } : undefined;
  const base = {
    max: cfg.DB_POOL_MAX,
    ssl,
    // En conexiones directas fijamos UTC; en Supabase la base ya trabaja en UTC.
    options: cfg.DATABASE_URL ? undefined : "-c TimeZone=UTC",
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 8_000,
    query_timeout: 8_000,
    statement_timeout: 8_000,
    keepAlive: true,
    allowExitOnIdle: true,
  };
  const pool = cfg.DATABASE_URL
    ? new pg.Pool({ ...base, connectionString: cfg.DATABASE_URL })
    : new pg.Pool({
        ...base,
        host: cfg.DB_HOST,
        port: cfg.DB_PORT,
        user: cfg.DB_USER,
        password: cfg.DB_PASSWORD,
        database: cfg.DB_NAME,
      });
  pool.on("error", () => undefined); // una conexión ociosa que se corta no debe tirar el proceso
  return pool;
}

/** "SELECT ... WHERE a = ? AND b = '?'" → "SELECT ... WHERE a = $1 AND b = '?'" (respeta textos entre comillas). */
export function aPostgres(sql: string): string {
  let n = 0;
  let out = "";
  let comilla: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]!;
    if (comilla) {
      out += c;
      if (c === comilla) comilla = null;
    } else if (c === "'" || c === '"') {
      comilla = c;
      out += c;
    } else if (c === "?") out += `$${++n}`;
    else out += c;
  }
  return out;
}

const ERRNO: Record<string, number> = { "23505": 1062, "40P01": 1213, "40001": 1213, "55P03": 1205 };

async function consulta(db: Db | Tx, sql: string, params: unknown[]): Promise<pg.QueryResult> {
  const q = aPostgres(sql);
  for (let intento = 1; ; intento++) {
    try {
      return await db.query(q, params as unknown[]);
    } catch (e) {
      const code = (e as { code?: string }).code;
      const msg = (e as { message?: string }).message ?? "";
      const esPool = "totalCount" in db;
      const caida =
        code === "57P01" ||
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        /Connection terminated|timeout|closed|ECONNRESET/i.test(msg);
      if (esPool && intento === 1 && caida) continue;
      if (code && ERRNO[code]) (e as { errno?: number }).errno = ERRNO[code];
      throw e;
    }
  }
}

export async function rows<T extends Row = Row>(db: Db | Tx, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await consulta(db, sql, params)).rows as T[];
}

export async function one<T extends Row = Row>(
  db: Db | Tx,
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return (await rows<T>(db, sql, params))[0];
}

export async function exec(db: Db | Tx, sql: string, params: unknown[] = []): Promise<ResultadoExec> {
  const esInsert = /^\s*insert\b/i.test(sql) && !/\breturning\b/i.test(sql);
  const r = await consulta(db, esInsert ? `${sql} RETURNING *` : sql, params);
  const primera = r.rows[0] as Row | undefined;
  return { insertId: Number(primera?.id ?? 0), affectedRows: r.rowCount ?? 0 };
}

/** Transacción con reintento ante deadlock o conflicto de serialización. */
export async function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>, intentos = 3): Promise<T> {
  for (let i = 1; ; i++) {
    const tx = await db.connect();
    try {
      await tx.query("BEGIN");
      const out = await fn(tx);
      await tx.query("COMMIT");
      return out;
    } catch (err) {
      await tx.query("ROLLBACK").catch(() => undefined);
      const code = (err as { errno?: number }).errno;
      if ((code === 1213 || code === 1205) && i < intentos) continue;
      throw err;
    } finally {
      tx.release();
    }
  }
}
