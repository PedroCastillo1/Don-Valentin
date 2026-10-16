import { writeFile } from "node:fs/promises";
import { loadConfig } from "../config.ts";
import { createPool } from "./pool.ts";
import { migrate } from "./migrate.ts";
import { seedBase, seedUsuarios, USUARIOS_PRUEBA } from "./seed.ts";

const cfg = loadConfig();
const db = createPool(cfg, { multipleStatements: true });
await migrate(db);
await seedBase(db);
const demo = process.argv.includes("--usuarios-prueba");
if (demo) {
  const creadas = await seedUsuarios(db, USUARIOS_PRUEBA);
  if (Object.keys(creadas).length) {
    await writeFile(new URL("../../.credenciales-prueba.json", import.meta.url), JSON.stringify(creadas, null, 2), {
      mode: 0o600,
    });
    console.log("Usuarios de prueba creados. Contraseñas en apps/api/.credenciales-prueba.json (fuera de git).");
  }
}
console.log("Seed base completo.");
await db.end();
