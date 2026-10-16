import mysql from "mysql2/promise";
import { loadConfig } from "../apps/api/src/config.ts";
import { createPool } from "../apps/api/src/db/pool.ts";
import { migrate } from "../apps/api/src/db/migrate.ts";
import { seedBase, seedUsuarios } from "../apps/api/src/db/seed.ts";

export const CLAVE = "E2e-clave-segura-1";
export const USUARIOS = ["admin", "encargado", "mozo", "parrilla", "cocina", "barra"] as const;

/** Base dedicada `dv_e2e`, recreada desde cero en cada corrida: nada se mezcla con datos de desarrollo. */
export default async function globalSetup() {
  const socket = process.env.DB_SOCKET ?? "/run/dvmysql/mysql.sock";
  const cfg = loadConfig({
    NODE_ENV: "test",
    DB_NAME: "dv_e2e",
    DB_SOCKET: socket,
    DB_USER: "root",
  } as NodeJS.ProcessEnv);
  const c = await mysql.createConnection({ socketPath: socket, user: "root" });
  await c.query("DROP DATABASE IF EXISTS dv_e2e");
  await c.query("CREATE DATABASE dv_e2e CHARACTER SET utf8mb4");
  await c.end();
  const mdb = createPool(cfg, { multipleStatements: true });
  await migrate(mdb);
  await mdb.end();
  const db = createPool(cfg);
  await seedBase(db);
  const roles = {
    admin: "admin",
    encargado: "encargado",
    mozo: "mozo",
    parrilla: "parrillero",
    cocina: "cocinero",
    barra: "barra",
  } as const;
  await seedUsuarios(
    db,
    USUARIOS.map((u) => ({ usuario: u, nombre: `${u} (prueba)`, rol: roles[u], password: CLAVE })),
  );
  await db.end();
}
