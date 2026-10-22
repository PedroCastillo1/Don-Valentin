import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import type { Db } from "./pool.ts";
import { withTx } from "./pool.ts";
import { migrate } from "./migrate.ts";

/*
 * RNF-6: respaldo y restauración.
 * El respaldo es una copia lógica de todas las tablas (JSON de PostgreSQL, que conserva fechas con zona horaria),
 * comprimida y cifrada con AES-256-GCM: tiene nombres y teléfonos, así que nunca se guarda en claro.
 * Formato: "DVR1" + sal (16) + IV (12) + etiqueta (16) + datos cifrados.
 */

/** Orden de carga: cada tabla después de las que referencia. */
export const TABLAS_RESPALDO = [
  "roles",
  "sectores_preparacion",
  "sectores_salon",
  "parametros",
  "usuarios",
  "mesas",
  "franjas",
  "aforos",
  "clientes",
  "reservas",
  "ocupacion_franja",
  "sesiones_mesa",
  "tipos_solicitud",
  "categorias_carta",
  "productos",
  "variantes_producto",
  "pedidos",
  "pedido_items",
  "auditoria",
  "eventos_sitio",
] as const;
/** Sesiones de ingreso (se vuelven a iniciar) y el registro de migraciones (lo recrea `migrate`). */
export const TABLAS_EXCLUIDAS = ["sesiones_usuario", "migraciones"] as const;

export interface ContenidoRespaldo {
  formato: 1;
  creado: string;
  migraciones: string[];
  tablas: Record<string, unknown[]>;
}

const MAGIA = Buffer.from("DVR1");
const clave = (pass: string, sal: Buffer) => scryptSync(pass, sal, 32);

export async function tablasDeLaBase(db: Db): Promise<string[]> {
  const r = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1",
  );
  return r.rows.map((x: { table_name: string }) => x.table_name);
}

/** Copia todas las tablas en una sola transacción de solo lectura (foto consistente). */
export async function exportar(db: Db, ahora = new Date()): Promise<ContenidoRespaldo> {
  const enBase = await tablasDeLaBase(db);
  const sinCubrir = enBase.filter(
    (t) => !(TABLAS_RESPALDO as readonly string[]).includes(t) && !(TABLAS_EXCLUIDAS as readonly string[]).includes(t),
  );
  if (sinCubrir.length) throw new Error(`Tablas sin incluir en el respaldo: ${sinCubrir.join(", ")}`);
  return withTx(db, async (tx) => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY");
    const tablas: Record<string, unknown[]> = {};
    for (const t of TABLAS_RESPALDO) {
      const r = await tx.query(`SELECT coalesce(json_agg(x), '[]'::json) AS filas FROM ${t} x`);
      tablas[t] = r.rows[0].filas as unknown[];
    }
    const m = await tx.query("SELECT nombre FROM migraciones ORDER BY nombre");
    return {
      formato: 1,
      creado: ahora.toISOString(),
      migraciones: m.rows.map((x: { nombre: string }) => x.nombre),
      tablas,
    };
  });
}

export function cifrar(contenido: ContenidoRespaldo, pass: string): Buffer {
  if (pass.length < 16) throw new Error("La clave del respaldo tiene que tener al menos 16 caracteres.");
  const sal = randomBytes(16);
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave(pass, sal), iv);
  const datos = Buffer.concat([c.update(gzipSync(JSON.stringify(contenido))), c.final()]);
  return Buffer.concat([MAGIA, sal, iv, c.getAuthTag(), datos]);
}

export function descifrar(archivo: Buffer, pass: string): ContenidoRespaldo {
  if (!archivo.subarray(0, 4).equals(MAGIA)) throw new Error("El archivo no es un respaldo de Don Valentín.");
  const sal = archivo.subarray(4, 20);
  const iv = archivo.subarray(20, 32);
  const tag = archivo.subarray(32, 48);
  const d = createDecipheriv("aes-256-gcm", clave(pass, sal), iv);
  d.setAuthTag(tag);
  try {
    return JSON.parse(gunzipSync(Buffer.concat([d.update(archivo.subarray(48)), d.final()])).toString("utf8"));
  } catch {
    throw new Error("No se pudo abrir el respaldo: la clave no es la correcta o el archivo está dañado.");
  }
}

/**
 * Restaura sobre una base vacía: aplica las migraciones, carga cada tabla en orden y deja los contadores
 * de identificadores después del último valor. Todo en una transacción: si algo falla, la base queda vacía.
 */
export async function restaurar(db: Db, c: ContenidoRespaldo): Promise<Record<string, number>> {
  await migrate(db);
  const aplicadas = (await db.query("SELECT nombre FROM migraciones")).rows.map((x: { nombre: string }) => x.nombre);
  const faltan = c.migraciones.filter((m) => !aplicadas.includes(m));
  if (faltan.length)
    throw new Error(`El respaldo es de una versión más nueva (faltan migraciones: ${faltan.join(", ")}).`);
  return withTx(db, async (tx) => {
    for (const t of TABLAS_RESPALDO) {
      const n = (await tx.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n as number;
      if (n > 0) throw new Error(`La base de destino no está vacía (la tabla ${t} tiene datos).`);
    }
    const cargadas: Record<string, number> = {};
    for (const t of TABLAS_RESPALDO) {
      const filas = c.tablas[t] ?? [];
      if (filas.length) {
        // OVERRIDING SYSTEM VALUE: se respetan los id originales (las columnas son identidad).
        await tx.query(
          `INSERT INTO ${t} OVERRIDING SYSTEM VALUE SELECT * FROM json_populate_recordset(NULL::${t}, $1::json)`,
          [JSON.stringify(filas)],
        );
      }
      cargadas[t] = filas.length;
      const id = await tx.query(
        `SELECT pg_get_serial_sequence($1, 'id') AS seq FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'id'`,
        [t],
      );
      const seq = id.rows[0]?.seq as string | undefined;
      if (seq)
        await tx.query(
          `SELECT setval($1, GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${t}), 1), (SELECT COUNT(*) > 0 FROM ${t}))`,
          [seq],
        );
    }
    return cargadas;
  });
}
