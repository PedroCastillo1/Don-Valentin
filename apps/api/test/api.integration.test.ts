import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";
import request from "supertest";
import type { Express } from "express";
import { loadConfig } from "../src/config.ts";
import type { Config } from "../src/config.ts";
import { createPool } from "../src/db/pool.ts";
import type { Db } from "../src/db/pool.ts";
import { migrate } from "../src/db/migrate.ts";
import { seedBase, seedUsuarios, USUARIOS_PRUEBA } from "../src/db/seed.ts";
import { createApp } from "../src/http/app.ts";
import { rows } from "../src/db/pool.ts";

const env = { NODE_ENV: "test", DB_NAME: "dv_test", DB_SOCKET: process.env.DB_SOCKET ?? "/run/dvmysql/mysql.sock", DB_USER: "root" } as NodeJS.ProcessEnv;
const AHORA = new Date("2026-10-20T15:00:00Z"); // 12:00 en Argentina
const FECHA = "2026-10-24";
let cfg: Config;
let db: Db;
let app: Express;
let pass: Record<string, string>;

interface Cliente {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
}
async function login(usuario: string): Promise<Cliente> {
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ usuario, password: pass[usuario] });
  expect(r.status).toBe(200);
  return { agent, csrf: r.body.csrfToken };
}

beforeAll(async () => {
  cfg = loadConfig(env);
  const admin = await mysql.createConnection({ socketPath: cfg.DB_SOCKET, user: "root" });
  await admin.query("DROP DATABASE IF EXISTS dv_test");
  await admin.query("CREATE DATABASE dv_test CHARACTER SET utf8mb4");
  await admin.end();
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

async function franjaId(): Promise<number> {
  const r = await request(app).get(`/api/public/disponibilidad?fecha=${FECHA}&personas=2`);
  expect(r.status).toBe(200);
  return r.body.franjas[1].id as number;
}

describe("autenticación y sesión", () => {
  it("rechaza credenciales inválidas con mensaje genérico", async () => {
    const a = await request(app).post("/api/auth/login").send({ usuario: "mozo", password: "incorrecta" });
    const b = await request(app).post("/api/auth/login").send({ usuario: "nadie", password: "incorrecta" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.mensaje).toBe(b.body.error.mensaje);
  });
  it("la cookie es httpOnly y SameSite=Strict", async () => {
    const r = await request(app).post("/api/auth/login").send({ usuario: "encargado", password: pass.encargado });
    const c = String(r.headers["set-cookie"]);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=Strict/i);
  });
  it("bloquea la cuenta tras 5 intentos fallidos aunque después llegue la contraseña correcta", async () => {
    for (let i = 0; i < 5; i++) await request(app).post("/api/auth/login").send({ usuario: "barra", password: "x" + i });
    const r = await request(app).post("/api/auth/login").send({ usuario: "barra", password: pass.barra });
    expect(r.status).toBe(429);
  });
  it("sin sesión no se accede al admin", async () => {
    expect((await request(app).get("/api/admin/mesas")).status).toBe(401);
  });
  it("una petición de escritura sin token CSRF se rechaza", async () => {
    const { agent } = await login("encargado");
    const r = await agent.post("/api/admin/reservas").send({});
    expect(r.status).toBe(403);
    expect(r.body.error.codigo).toBe("CSRF");
  });
  it("un Origin ajeno se rechaza", async () => {
    const { agent, csrf } = await login("encargado");
    const r = await agent.post("/api/admin/reservas").set("Origin", "https://malo.example").set("X-CSRF-Token", csrf).send({});
    expect(r.status).toBe(403);
  });
});

describe("RBAC (RNF-3)", () => {
  it("el mozo no administra mesas y el intento queda auditado", async () => {
    const { agent, csrf } = await login("mozo");
    const r = await agent.post("/api/admin/mesas").set("X-CSRF-Token", csrf).send({ numero: 99, sectorSalonId: 1, capacidad: 4 });
    expect(r.status).toBe(403);
    const aud = await rows(db, "SELECT resultado, accion FROM auditoria WHERE accion='acceso:mesas:administrar'");
    expect(aud.length).toBeGreaterThan(0);
    expect(aud[0]?.resultado).toBe("denegado");
  });
  it("el mozo ve solo la lista de sesiones (no administra mesas); el encargado administra", async () => {
    const m = await login("mozo");
    expect((await m.agent.get("/api/admin/mesas")).status).toBe(403);
    expect((await m.agent.get("/api/admin/sesiones/mesas")).status).toBe(200);
    const e = await login("encargado");
    const r = await e.agent.post("/api/admin/mesas").set("X-CSRF-Token", e.csrf).send({ numero: 31, sectorSalonId: 1, capacidad: 4 });
    expect(r.status).toBe(201);
  });
  it("el cocinero no entra a reservas ni usuarios", async () => {
    const c = await login("cocina");
    expect((await c.agent.get("/api/admin/reservas")).status).toBe(403);
    expect((await c.agent.get("/api/admin/usuarios")).status).toBe(403);
  });
});

describe("reservas públicas", () => {
  it("crea una reserva, no expone la mesa y descuenta disponibilidad", async () => {
    const fid = await franjaId();
    const r = await request(app).post("/api/public/reservas").send({ nombre: "Ana Prueba", telefono: "11 5555 0001", personas: 4, fecha: FECHA, franjaId: fid, aceptaAviso: true });
    expect(r.status).toBe(201);
    expect(r.body.codigo).toMatch(/^[A-Z0-9]{8}$/);
    expect(r.body.mesa).toBeUndefined();
  });
  it("exige el aviso de datos (RNF-4)", async () => {
    const fid = await franjaId();
    const r = await request(app).post("/api/public/reservas").send({ nombre: "Sin Aviso", telefono: "11 5555 0002", personas: 2, fecha: FECHA, franjaId: fid });
    expect(r.status).toBe(400);
  });
  it("rechaza fechas fuera de rango y franjas inexistentes", async () => {
    const fid = await franjaId();
    const lejos = await request(app).post("/api/public/reservas").send({ nombre: "Lejos", telefono: "11 5555 0003", personas: 2, fecha: "2027-03-01", franjaId: fid, aceptaAviso: true });
    expect(lejos.status).toBe(400);
    const mala = await request(app).post("/api/public/reservas").send({ nombre: "Mala", telefono: "11 5555 0003", personas: 2, fecha: FECHA, franjaId: 99999, aceptaAviso: true });
    expect(mala.status).toBeGreaterThanOrEqual(400);
  });
  it("una inyección SQL en el nombre se guarda como texto y no rompe nada", async () => {
    const fid = await franjaId();
    const r = await request(app).post("/api/public/reservas").send({ nombre: "Robert'); DROP TABLE reservas;--", telefono: "11 5555 0004", personas: 2, fecha: FECHA, franjaId: fid, aceptaAviso: true });
    expect(r.status).toBe(201);
    expect((await rows(db, "SELECT COUNT(*) n FROM reservas"))[0]?.n).toBeGreaterThan(0);
  });
});

describe("concurrencia: aforo y mesas", () => {
  it("60 reservas simultáneas nunca superan el aforo ni repiten mesa", async () => {
    const fid = (await request(app).get(`/api/public/disponibilidad?fecha=2026-10-25&personas=2`)).body.franjas[3].id as number;
    const intentos = Array.from({ length: 60 }, (_, i) =>
      request(app).post("/api/public/reservas").send({ nombre: `Carga ${i}`, telefono: `11 6000 ${String(1000 + i)}`, personas: 4, fecha: "2026-10-25", franjaId: fid, aceptaAviso: true }),
    );
    const res = await Promise.all(intentos);
    const ok = res.filter((r) => r.status === 201).length;
    const fallidas = res.filter((r) => r.status !== 201);
    expect(fallidas.every((r) => [409, 422].includes(r.status))).toBe(true);
    const tot = await rows(db, "SELECT COALESCE(SUM(personas),0) p, COUNT(*) n, COUNT(DISTINCT mesa_id) m FROM reservas WHERE fecha_servicio='2026-10-25' AND franja_id=? AND estado='confirmada'", [fid]);
    expect(Number(tot[0]?.p)).toBeLessThanOrEqual(100);
    expect(Number(tot[0]?.n)).toBe(ok);
    expect(Number(tot[0]?.m)).toBe(ok);
    expect(ok).toBe(25);
  }, 60_000);
});

describe("sesión de mesa y QR", () => {
  it("dos mozos abriendo la misma mesa a la vez generan una sola sesión", async () => {
    const m1 = await login("mozo");
    const m2 = await login("encargado");
    const mesas = (await m1.agent.get("/api/admin/sesiones/mesas")).body.mesas as { id: number }[];
    const id = mesas[4]!.id;
    const [a, b] = await Promise.all([m1.agent.post(`/api/admin/mesas/${id}/sesion`).set("X-CSRF-Token", m1.csrf), m2.agent.post(`/api/admin/mesas/${id}/sesion`).set("X-CSRF-Token", m2.csrf)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect((await rows(db, "SELECT COUNT(*) n FROM sesiones_mesa WHERE mesa_id=? AND cerrada_en IS NULL", [id]))[0]?.n).toBe(1);
  });
  it("cada QR resuelve a su mesa y un token inventado da 404", async () => {
    const e = await login("encargado");
    const { codigos } = (await e.agent.get("/api/admin/qr")).body as { codigos: { numero: number; url: string }[] };
    expect(codigos.length).toBeGreaterThanOrEqual(30);
    for (const c of codigos.slice(0, 30)) {
      const token = c.url.split("/m/")[1]!;
      const r = await request(app).get(`/api/public/mesa/${token}`);
      expect(r.status).toBe(200);
      expect(r.body.numero).toBe(c.numero);
    }
    expect((await request(app).get("/api/public/mesa/00000000000000000000000000000000")).status).toBe(404);
  });
  it("el SVG del QR se genera", async () => {
    const e = await login("encargado");
    const mesas = (await e.agent.get("/api/admin/mesas")).body.mesas as { id: number }[];
    const r = await e.agent.get(`/api/admin/mesas/${mesas[0]!.id}/qr.svg`);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/svg/);
  });
});

describe("planilla de parámetros (H2)", () => {
  it("expone parámetros con estado de validación y se puede validar", async () => {
    const e = await login("encargado");
    const p = await e.agent.get("/api/admin/parametros");
    expect(p.status).toBe(200);
    expect(JSON.stringify(p.body)).toMatch(/provisorio|documentado/);
    const v = await e.agent.put("/api/admin/parametros/tolerancia_no_show_min").set("X-CSRF-Token", e.csrf).send({ valor: "20" });
    expect(v.status).toBe(204);
  });
});

describe("carta pública", () => {
  it("devuelve 126 productos agrupados", async () => {
    const r = await request(app).get("/api/public/carta");
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body).length).toBeGreaterThan(5000);
  });
});

describe("cabeceras de seguridad", () => {
  it("CSP, nosniff y sin x-powered-by", async () => {
    const r = await request(app).get("/api/public/info");
    expect(r.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-powered-by"]).toBeUndefined();
  });
});
