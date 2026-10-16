import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Db } from "./pool.ts";

export const MIGRATIONS_DIR = process.env.DV_DB_DIR
  ? path.join(process.env.DV_DB_DIR, "migrations")
  : path.resolve(import.meta.dirname, "../../../../db/migrations");

export interface MigracionAplicada {
  nombre: string;
  checksum: string;
}

/** Aplica en orden los .sql pendientes. Falla si una migración ya aplicada cambió (checksum). */
export async function migrate(db: Db, dir = MIGRATIONS_DIR): Promise<MigracionAplicada[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS migraciones (
    nombre VARCHAR(120) NOT NULL PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    aplicada_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB`);
  const [done] = await db.query<(MigracionAplicada & import("mysql2/promise").RowDataPacket)[]>(
    "SELECT nombre, checksum FROM migraciones ORDER BY nombre",
  );
  const aplicadas = new Map(done.map((d) => [d.nombre, d.checksum]));
  const archivos = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const nuevas: MigracionAplicada[] = [];
  for (const nombre of archivos) {
    const sql = await readFile(path.join(dir, nombre), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previo = aplicadas.get(nombre);
    if (previo) {
      if (previo !== checksum)
        throw new Error(`La migración ${nombre} ya fue aplicada y cambió. Creá una migración nueva.`);
      continue;
    }
    const conn = await db.getConnection();
    try {
      await conn.query(sql);
      await conn.query("INSERT INTO migraciones (nombre, checksum) VALUES (?, ?)", [nombre, checksum]);
    } finally {
      conn.release();
    }
    nuevas.push({ nombre, checksum });
  }
  return nuevas;
}
