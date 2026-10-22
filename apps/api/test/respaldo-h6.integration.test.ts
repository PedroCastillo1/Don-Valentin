import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { PUERTO_PG_TEST } from "../../../vitest.global-setup.ts";
import { loadConfig } from "../src/config.ts";
import { createPool, exec, one } from "../src/db/pool.ts";
import type { Db } from "../src/db/pool.ts";
import { migrate } from "../src/db/migrate.ts";
import { seedBase, seedUsuarios, USUARIOS_PRUEBA } from "../src/db/seed.ts";
import { cifrar, descifrar, exportar, restaurar, TABLAS_RESPALDO } from "../src/db/respaldo.ts";
import { crearReserva } from "../src/services/reservas.ts";
import { abrirSesion } from "../src/services/mesas.ts";
import { crearPedido } from "../src/services/pedidos.ts";
import { registrarEvento } from "../src/services/medicion.ts";

/** RNF-6: un respaldo cifrado se restaura en otra base y queda idéntico, tabla por tabla. */
const base = (nombre: string) =>
  loadConfig({
    NODE_ENV: "test",
    DB_NAME: nombre,
    DB_PORT: String(PUERTO_PG_TEST),
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
  } as NodeJS.ProcessEnv);
const CLAVE = "clave-de-prueba-del-respaldo-123";
let origen: Db;
let destino: Db;

async function recrear(nombre: string) {
  const a = new pg.Client({
    host: "127.0.0.1",
    port: PUERTO_PG_TEST,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
  await a.connect();
  await a.query(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
  await a.query(`CREATE DATABASE ${nombre} ENCODING 'UTF8'`);
  await a.end();
}
/** Huella de una tabla: el contenido completo ordenado, para comparar origen y destino. */
async function huella(db: Db, t: string): Promise<string> {
  const r = await one(
    db,
    `SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h, count(*)::int AS n FROM ${t} x`,
  );
  return `${r!.n}:${r!.h}`;
}

beforeAll(async () => {
  await recrear("dv_test_h6");
  await recrear("dv_test_h6_restaurada");
  origen = createPool(base("dv_test_h6"), { multipleStatements: true });
  destino = createPool(base("dv_test_h6_restaurada"), { multipleStatements: true });
  await migrate(origen);
  await seedBase(origen);
  await seedUsuarios(origen, USUARIOS_PRUEBA);
  // Un poco de operación real: reservas, una mesa abierta con pedido y medición.
  const ahora = new Date("2026-11-18T15:00:00Z");
  const franja = (await one(origen, "SELECT id FROM franjas ORDER BY orden LIMIT 1 OFFSET 4"))!.id;
  for (let i = 0; i < 8; i++)
    await crearReserva(
      origen,
      {
        nombre: `Respaldo ${i} Muñoz`,
        telefono: `11777000${10 + i}`,
        personas: 2 + (i % 4),
        fecha: "2026-11-21",
        franjaId: franja,
        origen: "telefono",
      },
      ahora,
    );
  const mozo = (await one(origen, "SELECT id FROM usuarios WHERE usuario = 'mozo'"))!.id;
  const s = await abrirSesion(origen, 3, mozo);
  const v = (await one(origen, "SELECT id FROM variantes_producto WHERE precio IS NOT NULL ORDER BY id LIMIT 1"))!.id;
  await crearPedido(origen, s.id, [{ varianteId: v, cantidad: 2, nota: "sin sal" }], "mozo", mozo);
  await registrarEvento(origen, "pagina_vista", "/carta", ahora);
  await exec(origen, "UPDATE parametros SET valor = '20' WHERE clave = 'tolerancia_no_show_min'");
}, 90_000);
afterAll(async () => {
  await origen.end();
  await destino.end();
});

describe("RNF-6: respaldo y restauración", () => {
  it("cubre todas las tablas del modelo", async () => {
    const c = await exportar(origen);
    expect(Object.keys(c.tablas)).toEqual([...TABLAS_RESPALDO]);
    expect(c.migraciones.length).toBeGreaterThanOrEqual(4);
  });

  it("el archivo va cifrado: sin la clave no se lee, y no contiene datos en claro", async () => {
    const archivo = cifrar(await exportar(origen), CLAVE);
    expect(archivo.toString("latin1")).not.toContain("Muñoz");
    expect(archivo.toString("latin1")).not.toContain("1177700010");
    expect(() => descifrar(archivo, "otra-clave-cualquiera-123")).toThrow(/clave/);
  });

  it("restaurado en una base vacía queda idéntico tabla por tabla y sigue funcionando", async () => {
    const archivo = cifrar(await exportar(origen), CLAVE);
    const cargadas = await restaurar(destino, descifrar(archivo, CLAVE));
    expect(cargadas.reservas).toBe(8);
    for (const t of TABLAS_RESPALDO) expect(await huella(destino, t), t).toBe(await huella(origen, t));
    // Los identificadores siguen después del último: una reserva nueva no choca con las restauradas.
    const franja = (await one(destino, "SELECT id FROM franjas ORDER BY orden LIMIT 1 OFFSET 5"))!.id;
    const nueva = await crearReserva(
      destino,
      {
        nombre: "Después de restaurar",
        telefono: "1177700099",
        personas: 2,
        fecha: "2026-11-21",
        franjaId: franja,
        origen: "telefono",
      },
      new Date("2026-11-18T15:00:00Z"),
    );
    const max = (await one(origen, "SELECT max(id) AS m FROM reservas"))!.m;
    expect(nueva.id).toBeGreaterThan(Number(max));
  });

  it("no restaura sobre una base con datos", async () => {
    const archivo = cifrar(await exportar(origen), CLAVE);
    await expect(restaurar(destino, descifrar(archivo, CLAVE))).rejects.toThrow(/no está vacía/);
  });
});
