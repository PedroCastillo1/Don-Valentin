import { levantarPostgres } from "../apps/api/src/db/pg-local.ts";
import { loadConfig } from "../apps/api/src/config.ts";
import { createPool } from "../apps/api/src/db/pool.ts";
import { migrate } from "../apps/api/src/db/migrate.ts";
import { seedBase, seedUsuarios } from "../apps/api/src/db/seed.ts";

export const CLAVE = "E2e-clave-segura-1";
export const USUARIOS = ["admin", "encargado", "mozo", "parrilla", "cocina", "barra"] as const;

/** Base dedicada `dv_e2e`, recreada desde cero en cada corrida: nada se mezcla con datos de desarrollo. */
/** PostgreSQL embebido de las pruebas de punta a punta (el servidor de Playwright usa este puerto). */
export const PUERTO_PG_E2E = 54330;

export default async function globalSetup() {
  const pg = await levantarPostgres({ puerto: PUERTO_PG_E2E });
  await pg.baseNueva("dv_e2e");
  const cfg = loadConfig({
    NODE_ENV: "test",
    DB_NAME: "dv_e2e",
    DB_PORT: String(PUERTO_PG_E2E),
    DB_USER: pg.usuario,
    DB_PASSWORD: pg.clave,
  } as NodeJS.ProcessEnv);
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
  return async () => {
    await pg.detener();
  };
}
