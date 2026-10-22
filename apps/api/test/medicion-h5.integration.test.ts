import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import request from "supertest";
import type { Express } from "express";
import { PUERTO_PG_TEST } from "../../../vitest.global-setup.ts";
import { loadConfig } from "../src/config.ts";
import { createPool, rows } from "../src/db/pool.ts";
import type { Db } from "../src/db/pool.ts";
import { migrate } from "../src/db/migrate.ts";
import { seedBase, seedUsuarios, USUARIOS_PRUEBA } from "../src/db/seed.ts";
import { createApp } from "../src/http/app.ts";

/** Hito 5 (RF-W3): medición propia, anónima y agregada. */
const env = {
  NODE_ENV: "test",
  DB_NAME: "dv_test_h5",
  DB_PORT: String(PUERTO_PG_TEST),
  DB_USER: "postgres",
  DB_PASSWORD: "postgres",
} as NodeJS.ProcessEnv;
const AHORA = new Date("2026-11-10T15:00:00Z");
let db: Db;
let app: Express;
let pass: Record<string, string>;

beforeAll(async () => {
  const cfg = loadConfig(env);
  const a = new pg.Client({
    host: "127.0.0.1",
    port: PUERTO_PG_TEST,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
  await a.connect();
  await a.query("DROP DATABASE IF EXISTS dv_test_h5 WITH (FORCE)");
  await a.query("CREATE DATABASE dv_test_h5 ENCODING 'UTF8'");
  await a.end();
  db = createPool(cfg);
  const mdb = createPool(cfg, { multipleStatements: true });
  await migrate(mdb);
  await mdb.end();
  await seedBase(db);
  pass = await seedUsuarios(db, USUARIOS_PRUEBA);
  app = createApp({ db, cfg, ahora: () => AHORA, limitarTasa: false });
}, 60_000);
afterAll(async () => {
  await db.end();
});

const evento = (evento: string, ruta = "/") => request(app).post("/api/public/eventos").send({ evento, ruta });

describe("RF-W3: medición del sitio", () => {
  it("cuenta eventos por día y página sin guardar nada de la persona ni el código de la mesa", async () => {
    for (const r of ["/", "/", "/carta", "/reservar?x=1", "/m/0123456789abcdef0123456789abcdef", "/no-existe"])
      expect((await evento("pagina_vista", r)).status).toBe(204);
    await evento("reserva_iniciada", "/reservar");
    await evento("reserva_confirmada", "/reservar");
    const filas = await rows(db, "SELECT dia, evento, ruta, cantidad FROM eventos_sitio ORDER BY ruta");
    expect(filas.map((f) => f.ruta)).toEqual(expect.arrayContaining(["/", "/carta", "/reservar", "/m", "otra"]));
    expect(JSON.stringify(filas)).not.toContain("0123456789abcdef");
    expect(Object.keys(filas[0]!).sort()).toEqual(["cantidad", "dia", "evento", "ruta"]);
    expect(filas.find((f) => f.ruta === "/" && f.evento === "pagina_vista")!.cantidad).toBe(2);
    expect(filas[0]!.dia).toBe("2026-11-10");
  });

  it("rechaza eventos desconocidos", async () => {
    expect((await evento("comprar_bitcoin")).status).toBe(400);
    expect((await request(app).post("/api/public/eventos").send({})).status).toBe(400);
  });

  it("el Encargado ve el resumen con el embudo; el mozo no", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ usuario: "encargado", password: pass.encargado });
    const r = await agent.get("/api/admin/medicion?dias=7");
    expect(r.status).toBe(200);
    expect(r.body.porDia).toHaveLength(7);
    expect(r.body.hasta).toBe("2026-11-10");
    expect(r.body.eventos.pagina_vista).toBe(6);
    expect(r.body.eventos.reserva_confirmada).toBe(1);
    expect(r.body.paginas[0]).toEqual({ ruta: "/", visitas: 2 });
    const mozo = request.agent(app);
    await mozo.post("/api/auth/login").send({ usuario: "mozo", password: pass.mozo });
    expect((await mozo.get("/api/admin/medicion")).status).toBe(403);
  });
});
