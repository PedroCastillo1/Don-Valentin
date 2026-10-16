/**
 * Sistema completo en una compu sin MySQL instalado (vista local para revisar el panel).
 * Levanta un MySQL temporal (mysql-memory-server; la primera vez lo descarga del CDN oficial de MySQL),
 * aplica las migraciones, carga la carta real, crea usuarios de prueba con contraseñas al azar y datos de PRUEBA
 * para el panel, y sirve el sitio y la API en http://localhost:3001. Al cerrar la ventana se borra todo.
 * No es para producción.
 */
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createDB } from "mysql-memory-server";

const base = process.env.DV_BASE ?? path.dirname(fileURLToPath(import.meta.url));
const puerto = process.env.PORT ?? "3001";
console.log("Preparando la base de datos de prueba (la primera vez descarga MySQL: puede tardar unos minutos)...");
const mysqlDb = await createDB({ version: "8.4.x", dbName: "don_valentin", logLevel: "ERROR", xEnabled: "OFF" });

Object.assign(process.env, {
  NODE_ENV: "development",
  PORT: puerto,
  DB_HOST: "127.0.0.1",
  DB_PORT: String(mysqlDb.port),
  DB_USER: mysqlDb.username,
  DB_PASSWORD: "",
  DB_NAME: mysqlDb.dbName,
  WEB_DIST: path.join(base, "web"),
  COOKIE_SECURE: "false",
  PUBLIC_BASE_URL: `http://localhost:${puerto}`,
  DV_DB_DIR: path.join(base, "db"),
});

const { loadConfig } = await import("./config.ts");
const { createPool } = await import("./db/pool.ts");
const { migrate } = await import("./db/migrate.ts");
const { seedBase, seedUsuarios, USUARIOS_PRUEBA } = await import("./db/seed.ts");
const { createApp } = await import("./http/app.ts");

const cfg = loadConfig();
const admin = createPool(cfg, { multipleStatements: true });
await migrate(admin);
await seedBase(admin);
const creadas = await seedUsuarios(admin, USUARIOS_PRUEBA);
await admin.end();
const archivo = path.join(base, "CREDENCIALES-DE-PRUEBA.txt");
await writeFile(
  archivo,
  "Usuarios de PRUEBA de la vista local (se crean de nuevo, con otras contraseñas, cada vez que se abre).\n\n" +
    Object.entries(creadas)
      .map(([usuario, clave]) => `Usuario: ${usuario}\nContraseña: ${clave}\n`)
      .join("\n"),
  { mode: 0o600 },
);
await import("./db/seed-demo.ts");

const db = createPool(cfg);
const app = createApp({ db, cfg });
const server = app.listen(cfg.PORT, () => {
  console.log(`\nDon Valentín (sistema completo) corriendo en http://localhost:${cfg.PORT}`);
  console.log(`Panel: http://localhost:${cfg.PORT}/admin/ingresar`);
  console.log(`Usuarios y contraseñas de prueba: ${archivo}`);
  console.log("Cerrá esta ventana para detenerlo (se borran los datos de prueba).");
  if (process.env.DV_ABRIR === "1" && process.platform === "win32")
    exec(`start "" "http://localhost:${cfg.PORT}/admin/ingresar"`);
});
const cerrar = () =>
  server.close(
    () =>
      void db
        .end()
        .then(() => mysqlDb.stop())
        .then(() => process.exit(0)),
  );
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
