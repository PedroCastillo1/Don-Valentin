import { readFileSync, writeFileSync } from "node:fs";
import { loadConfig } from "../config.ts";
import { createPool } from "./pool.ts";
import { cifrar, descifrar, exportar, restaurar } from "./respaldo.ts";

/*
 * RNF-6. Uso (la conexión sale de DATABASE_URL o de DB_*; la clave, de RESPALDO_CLAVE):
 *   npm run db:respaldo -- respaldo.dvr          → guarda el respaldo cifrado
 *   npm run db:restaurar -- respaldo.dvr         → lo carga en una base VACÍA
 */
const [accion, archivo] = process.argv.slice(2);
const pass = process.env.RESPALDO_CLAVE ?? "";
if (!archivo || !["respaldar", "restaurar"].includes(accion ?? "")) {
  console.error("Uso: respaldo-cli.ts respaldar|restaurar <archivo>");
  process.exit(2);
}
if (pass.length < 16) {
  console.error("Falta RESPALDO_CLAVE (al menos 16 caracteres). Sin ella el respaldo no se puede cifrar ni abrir.");
  process.exit(2);
}
const db = createPool(loadConfig(), { multipleStatements: true });
try {
  if (accion === "respaldar") {
    const c = await exportar(db);
    writeFileSync(archivo, cifrar(c, pass));
    const filas = Object.values(c.tablas).reduce((n, t) => n + t.length, 0);
    console.log(`Respaldo listo: ${archivo} (${filas} filas, ${Object.keys(c.tablas).length} tablas, ${c.creado}).`);
  } else {
    const cargadas = await restaurar(db, descifrar(readFileSync(archivo), pass));
    const total = Object.values(cargadas).reduce((n, x) => n + x, 0);
    console.log(`Restauración completa: ${total} filas.`);
    console.table(cargadas);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await db.end();
}
