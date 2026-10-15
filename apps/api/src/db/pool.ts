import mysql from "mysql2/promise";
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import type { Config } from "../config.ts";

export type Db = Pool;
export type Tx = PoolConnection;
export type Row = RowDataPacket;

export function createPool(cfg: Pick<Config, "DB_HOST" | "DB_PORT" | "DB_USER" | "DB_PASSWORD" | "DB_NAME" | "DB_SOCKET">, opts: { multipleStatements?: boolean } = {}): Db {
  return mysql.createPool({
    host: cfg.DB_SOCKET ? undefined : cfg.DB_HOST,
    port: cfg.DB_SOCKET ? undefined : cfg.DB_PORT,
    socketPath: cfg.DB_SOCKET,
    user: cfg.DB_USER,
    password: cfg.DB_PASSWORD,
    database: cfg.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: "Z",
    dateStrings: true,
    charset: "utf8mb4",
    multipleStatements: opts.multipleStatements ?? false,
    namedPlaceholders: false,
  });
}

export async function rows<T extends Row = Row>(db: Db | Tx, sql: string, params: unknown[] = []): Promise<T[]> {
  const [r] = await db.query<T[]>(sql, params);
  return r;
}

export async function one<T extends Row = Row>(db: Db | Tx, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await rows<T>(db, sql, params))[0];
}

export async function exec(db: Db | Tx, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [r] = await db.query<ResultSetHeader>(sql, params);
  return r;
}

/** Transacción con reintento ante deadlock (1213) o timeout de bloqueo (1205). */
export async function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>, intentos = 3): Promise<T> {
  for (let i = 1; ; i++) {
    const tx = await db.getConnection();
    try {
      await tx.beginTransaction();
      const out = await fn(tx);
      await tx.commit();
      return out;
    } catch (err) {
      await tx.rollback().catch(() => undefined);
      const code = (err as { errno?: number }).errno;
      if ((code === 1213 || code === 1205) && i < intentos) continue;
      throw err;
    } finally {
      tx.release();
    }
  }
}
