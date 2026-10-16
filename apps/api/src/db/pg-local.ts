/**
 * PostgreSQL 17 embebido (paquete embedded-postgres) para las pruebas y la vista local.
 * Es la misma versión mayor que usa Supabase, así que lo que pasa acá pasa allá.
 * No se usa en el ambiente de prueba en la nube: ahí la base es Supabase (DATABASE_URL).
 */
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";

export interface PostgresLocal {
  puerto: number;
  usuario: string;
  clave: string;
  /** Borra (si existe) y crea una base vacía. */
  baseNueva(nombre: string): Promise<void>;
  detener(): Promise<void>;
}

export async function levantarPostgres(opciones: { puerto: number; carpeta?: string }): Promise<PostgresLocal> {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const usuario = "postgres";
  const clave = "postgres";
  // En /tmp (o la carpeta temporal del sistema): si el proceso corre como root, embedded-postgres usa otro usuario.
  const carpeta = opciones.carpeta ?? path.join(os.tmpdir(), `dv-postgres-${opciones.puerto}`);
  mkdirSync(path.dirname(carpeta), { recursive: true });
  const servidor = new EmbeddedPostgres({
    databaseDir: carpeta,
    port: opciones.puerto,
    user: usuario,
    password: clave,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-c", "timezone=UTC"],
    onLog: () => undefined,
    onError: () => undefined,
  });
  await servidor.initialise();
  await servidor.start();
  const baseNueva = async (nombre: string) => {
    const c = new pg.Client({
      host: "127.0.0.1",
      port: opciones.puerto,
      user: usuario,
      password: clave,
      database: "postgres",
    });
    await c.connect();
    await c.query(`DROP DATABASE IF EXISTS ${pg.escapeIdentifier(nombre)} WITH (FORCE)`);
    await c.query(`CREATE DATABASE ${pg.escapeIdentifier(nombre)} ENCODING 'UTF8'`);
    await c.end();
  };
  return { puerto: opciones.puerto, usuario, clave, baseNueva, detener: () => servidor.stop() };
}
