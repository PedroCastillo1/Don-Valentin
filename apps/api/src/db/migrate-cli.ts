import { loadConfig } from "../config.ts";
import { createPool } from "./pool.ts";
import { migrate } from "./migrate.ts";

const cfg = loadConfig();
const db = createPool(cfg, { multipleStatements: true });
const nuevas = await migrate(db);
console.log(nuevas.length ? `Migraciones aplicadas: ${nuevas.map((n) => n.nombre).join(", ")}` : "Sin migraciones pendientes.");
await db.end();
