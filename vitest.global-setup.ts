import { levantarPostgres } from "./apps/api/src/db/pg-local.ts";

/** PostgreSQL embebido para las pruebas de integración (puerto fijo que leen los tests). */
export const PUERTO_PG_TEST = 54329;

export default async function setup() {
  const pg = await levantarPostgres({ puerto: PUERTO_PG_TEST });
  return async () => {
    await pg.detener();
  };
}
