import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import request from "supertest";
import type { Express } from "express";
import { PUERTO_PG_TEST } from "../../../vitest.global-setup.ts";
import { loadConfig } from "../src/config.ts";
import { createPool, one, rows } from "../src/db/pool.ts";
import type { Db } from "../src/db/pool.ts";
import { migrate } from "../src/db/migrate.ts";
import { seedBase, seedUsuarios, USUARIOS_PRUEBA } from "../src/db/seed.ts";
import { createApp } from "../src/http/app.ts";

/**
 * Hito 3 (RF-R3, RF-R4): buscar, modificar, cancelar, no-show, llegada, walk-in y estado del salón.
 * Base propia (dv_test_h3) y un reloj que se puede mover: la llegada, el no-show y el walk-in dependen de la hora.
 */
const env = {
  NODE_ENV: "test",
  DB_NAME: "dv_test_h3",
  DB_PORT: String(PUERTO_PG_TEST),
  DB_USER: "postgres",
  DB_PASSWORD: "postgres",
} as NodeJS.ProcessEnv;

const DIA = "2026-10-24"; // sábado
/** Hora de Argentina (UTC-3) del día de servicio: "20:10" → instante UTC. */
const a = (hhmm: string, dia = DIA) => new Date(`${dia}T${hhmm}:00-03:00`);
let reloj = a("12:00", "2026-10-21");
/** Mover el reloj vuelve a iniciar sesión: una sesión de días antes ya venció. */
function poner(hora: Date) {
  reloj = hora;
  sesiones.clear();
}
let db: Db;
let app: Express;
let pass: Record<string, string>;
const franja: Record<string, number> = {};

interface Cliente {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
}
const sesiones = new Map<string, Cliente>();
async function como(usuario: string): Promise<Cliente> {
  const ya = sesiones.get(usuario);
  if (ya) return ya;
  const agent = request.agent(app);
  const r = await agent.post("/api/auth/login").send({ usuario, password: pass[usuario] });
  expect(r.status).toBe(200);
  const c = { agent, csrf: r.body.csrfToken as string };
  sesiones.set(usuario, c);
  return c;
}
async function post(usuario: string, ruta: string, body: object = {}) {
  const c = await como(usuario);
  return c.agent.post(`/api/admin${ruta}`).set("x-csrf-token", c.csrf).send(body);
}
async function patch(usuario: string, ruta: string, body: object) {
  const c = await como(usuario);
  return c.agent.patch(`/api/admin${ruta}`).set("x-csrf-token", c.csrf).send(body);
}
async function get(usuario: string, ruta: string) {
  return (await como(usuario)).agent.get(`/api/admin${ruta}`);
}

let tel = 1155500000;
async function reservar(personas: number, desde: string, extra: Partial<Record<string, unknown>> = {}) {
  const r = await post("encargado", "/reservas", {
    nombre: `Prueba ${tel}`,
    telefono: String(tel++),
    personas,
    fecha: DIA,
    franjaId: franja[desde],
    origen: "telefono",
    ...extra,
  });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body as { id: number; codigo: string; mesa: number; mesaId: number; estado: string };
}

/** Invariante del control de aforo: cada contador es la suma de las personas que ocupan esa franja. */
async function contadoresCuadran(): Promise<void> {
  const desvios = await rows(
    db,
    `SELECT o.fecha_servicio, o.franja_id, o.personas_confirmadas,
            COALESCE((SELECT SUM(r.personas) FROM reservas r WHERE r.fecha_servicio = o.fecha_servicio AND r.franja_id = o.franja_id
                        AND r.sector_salon_id = o.sector_salon_id AND r.estado IN ('confirmada','cumplida')), 0) AS suma
       FROM ocupacion_franja o`,
  );
  expect(desvios.filter((d) => Number(d.personas_confirmadas) !== Number(d.suma))).toEqual([]);
}

beforeAll(async () => {
  const cfg = loadConfig(env);
  const admin = new pg.Client({
    host: "127.0.0.1",
    port: PUERTO_PG_TEST,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  });
  await admin.connect();
  await admin.query("DROP DATABASE IF EXISTS dv_test_h3 WITH (FORCE)");
  await admin.query("CREATE DATABASE dv_test_h3 ENCODING 'UTF8'");
  await admin.end();
  db = createPool(cfg);
  const mdb = createPool(cfg, { multipleStatements: true });
  await migrate(mdb);
  await mdb.end();
  await seedBase(db);
  pass = await seedUsuarios(db, USUARIOS_PRUEBA);
  app = createApp({ db, cfg, ahora: () => reloj, limitarTasa: false });
  for (const f of await rows(db, "SELECT id, hora_inicio FROM franjas"))
    franja[String(f.hora_inicio).slice(0, 5)] = f.id;
}, 60_000);
afterAll(async () => {
  await db.end();
});

describe("RF-R4: buscar, modificar y cancelar", () => {
  it("busca por nombre sin importar acentos, por teléfono y por código, en todas las fechas", async () => {
    const r = await reservar(4, "20:00", { nombre: "Familia Muñoz Pérez", telefono: "11 4444-7788" });
    for (const q of ["munoz", "PEREZ", "4444-7788", r.codigo]) {
      const b = await get("encargado", `/reservas/buscar?q=${encodeURIComponent(q)}`);
      expect(b.status).toBe(200);
      expect(
        b.body.reservas.map((x: { id: number }) => x.id),
        q,
      ).toContain(r.id);
    }
    expect((await get("encargado", "/reservas/buscar?q=z")).status).toBe(400);
  });

  it("al subir personas conserva la mesa si alcanza y si no la cambia; el aforo se mueve con la reserva", async () => {
    const r = await reservar(2, "18:00");
    const igual = await patch("encargado", `/reservas/${r.id}`, { personas: 1 });
    expect(igual.status).toBe(200);
    expect(igual.body.mesa).toBe(r.mesa);
    const mayor = await patch("encargado", `/reservas/${r.id}`, { personas: 6 });
    expect(mayor.status).toBe(200);
    expect(mayor.body.personas).toBe(6);
    const cap = await one(db, "SELECT capacidad FROM mesas WHERE id = ?", [mayor.body.mesaId]);
    expect(cap!.capacidad).toBeGreaterThanOrEqual(6);
    await contadoresCuadran();
  });

  it("cambiar de día y horario libera el cupo anterior y toma el nuevo", async () => {
    const r = await reservar(4, "14:00");
    const m = await patch("encargado", `/reservas/${r.id}`, { fecha: "2026-10-25", franjaId: franja["22:00"] });
    expect(m.status).toBe(200);
    expect(m.body.fecha).toBe("2026-10-25");
    expect(m.body.franja.desde).toBe("22:00");
    const antes = await one(
      db,
      "SELECT COUNT(*) AS n FROM reservas WHERE mesa_id = ? AND fecha_servicio = ? AND franja_id = ? AND estado = 'confirmada'",
      [r.mesaId, DIA, franja["14:00"]],
    );
    expect(Number(antes!.n)).toBe(0);
    await contadoresCuadran();
  });

  it("si en el horario nuevo no hay lugar, la reserva queda exactamente como estaba", async () => {
    const r = await reservar(2, "12:00");
    await db.query("UPDATE aforos SET aforo_personas = 0 WHERE franja_id = $1", [franja["16:00"]]);
    const m = await patch("encargado", `/reservas/${r.id}`, { franjaId: franja["16:00"] });
    expect(m.status).toBe(409);
    expect(m.body.error.codigo).toBe("SIN_AFORO");
    await db.query("UPDATE aforos SET aforo_personas = 100 WHERE franja_id = $1", [franja["16:00"]]);
    const v = await get("encargado", `/reservas/${r.id}`);
    expect(v.body.franja.desde).toBe("12:00");
    expect(v.body.mesa).toBe(r.mesa);
    await contadoresCuadran();
  });

  it("cancelar libera la mesa para otra reserva; no se cancela dos veces", async () => {
    const r = await reservar(8, "00:00");
    const r2 = await reservar(8, "00:00");
    expect(r2.mesa).not.toBe(r.mesa);
    const c = await post("encargado", `/reservas/${r.id}/cancelar`);
    expect(c.status).toBe(200);
    expect(c.body.estado).toBe("cancelada");
    expect((await post("encargado", `/reservas/${r.id}/cancelar`)).status).toBe(409);
    const r3 = await reservar(8, "00:00");
    expect(r3.mesa).toBe(r.mesa);
    expect((await patch("encargado", `/reservas/${r.id}`, { personas: 2 })).status).toBe(409);
    await contadoresCuadran();
  });

  it("permite cambiar la mesa asignada y reactivar reservas marcadas como no-show, cancelada o cumplida", async () => {
    poner(a("12:00", "2026-10-21"));
    const r = await reservar(2, "16:00");
    const otraMesa = await one(db, "SELECT id, numero FROM mesas WHERE capacidad >= 4 AND id <> ? LIMIT 1", [r.mesaId]);
    const cambioMesa = await patch("encargado", `/reservas/${r.id}`, { mesaId: otraMesa!.id as number });
    expect(cambioMesa.status).toBe(200);
    expect(cambioMesa.body.mesaId).toBe(otraMesa!.id);

    // El día de la reserva, aún con la franja iniciada, se puede modificar o deshacer no-show
    poner(a("16:25"));
    const ns = await post("encargado", `/reservas/${r.id}/no-show`);
    expect(ns.status).toBe(200);
    expect(ns.body.estado).toBe("no_show");
    expect(ns.body.acciones.reabrir).toBe(true);

    const reabierta = await post("encargado", `/reservas/${r.id}/reabrir`);
    expect(reabierta.status).toBe(200);
    expect(reabierta.body.estado).toBe("confirmada");
    expect(reabierta.body.acciones.modificar).toBe(true);

    const editadaEnCurso = await patch("encargado", `/reservas/${r.id}`, { nombre: "Familia Editada En Curso" });
    expect(editadaEnCurso.status).toBe(200);
    expect(editadaEnCurso.body.aNombreDe).toBe("Familia Editada En Curso");

    await contadoresCuadran();
  });
});

describe("RF-R3: llegada, no-show, walk-in y estado del salón", () => {
  it("la llegada solo se registra el día de la reserva y deja la mesa ocupada con su sesión", async () => {
    poner(a("12:00", "2026-10-21"));
    const r = await reservar(4, "20:00");
    expect((await post("mozo", `/reservas/${r.id}/llegada`)).status).toBe(409); // todavía es el 21/10
    poner(a("19:50"));
    const l = await post("mozo", `/reservas/${r.id}/llegada`);
    expect(l.status).toBe(200);
    expect(l.body.estado).toBe("cumplida");
    const s = await one(db, "SELECT reserva_id FROM sesiones_mesa WHERE mesa_id = ? AND estado = 'abierta'", [
      r.mesaId,
    ]);
    expect(Number(s!.reserva_id)).toBe(r.id);
    poner(a("20:05"));
    const salon = await get("mozo", "/salon");
    expect(salon.body.franja.desde).toBe("20:00");
    expect(salon.body.mesas.find((m: { id: number }) => m.id === r.mesaId).estado).toBe("ocupada");
    await contadoresCuadran();
  });

  it("no-show: antes de la tolerancia se rechaza, después libera la mesa", async () => {
    poner(a("19:00"));
    const r = await reservar(2, "22:00");
    poner(a("22:05"));
    const temprano = await post("encargado", `/reservas/${r.id}/no-show`);
    expect(temprano.status).toBe(409);
    expect(temprano.body.error.codigo).toBe("NO_SHOW_ANTICIPADO");
    poner(a("22:20"));
    const ns = await post("encargado", `/reservas/${r.id}/no-show`);
    expect(ns.status).toBe(200);
    expect(ns.body.estado).toBe("no_show");
    const salon = await get("encargado", "/salon");
    expect(salon.body.mesas.find((m: { id: number }) => m.id === r.mesaId).estado).toBe("libre");
    await contadoresCuadran();
  });

  it("walk-in: toma una mesa libre de la franja en curso; una mesa reservada u ocupada se rechaza", async () => {
    poner(a("22:30"));
    const salon = (await get("mozo", "/salon")).body;
    const reservada = salon.mesas.find((m: { estado: string }) => m.estado !== "libre");
    if (reservada) {
      const no = await post("mozo", "/salon/walk-in", { personas: 2, mesaId: reservada.id });
      expect(no.status).toBe(409);
    }
    const w = await post("mozo", "/salon/walk-in", { personas: 3 });
    expect(w.status, JSON.stringify(w.body)).toBe(201);
    expect(w.body.origen).toBe("walk_in");
    expect(w.body.estado).toBe("cumplida");
    expect(w.body.telefono).toBe("");
    const despues = (await get("mozo", "/salon")).body;
    expect(despues.mesas.find((m: { id: number }) => m.id === w.body.mesaId).estado).toBe("ocupada");
    expect(despues.conteo.ocupada).toBe(salon.conteo.ocupada + 1);
    await contadoresCuadran();
  });

  it("walk-in fuera del horario de atención se rechaza", async () => {
    poner(a("09:00"));
    const w = await post("mozo", "/salon/walk-in", { personas: 2 });
    expect(w.status).toBe(409);
    expect(w.body.error.codigo).toBe("SIN_FRANJA");
  });

  it("una mesa abierta por el mozo sin reserva figura ocupada en la franja en curso", async () => {
    poner(a("16:10"));
    const mesa = await one(db, "SELECT id FROM mesas WHERE numero = 30");
    expect((await post("mozo", `/mesas/${mesa!.id}/sesion`)).status).toBe(201);
    const salon = (await get("mozo", "/salon")).body;
    const m = salon.mesas.find((x: { id: number }) => x.id === mesa!.id);
    expect(m.estado).toBe("ocupada");
    expect(m.sesionSinReserva).toBe(true);
    // otra franja del mismo día no se ve afectada
    const otra = (await get("mozo", `/salon?franjaId=${franja["18:00"]}`)).body;
    expect(otra.mesas.find((x: { id: number }) => x.id === mesa!.id).estado).not.toBe("ocupada");
  });
});

describe("permisos y concurrencia", () => {
  it("el mozo opera el salón pero no cancela ni modifica; el cocinero no ve el salón", async () => {
    poner(a("12:00", "2026-10-21"));
    const r = await reservar(2, "18:00");
    expect((await post("mozo", `/reservas/${r.id}/cancelar`)).status).toBe(403);
    expect((await patch("mozo", `/reservas/${r.id}`, { personas: 3 })).status).toBe(403);
    expect((await get("cocina", "/salon")).status).toBe(403);
  });

  it("modificaciones, cancelaciones y altas simultáneas no superan el aforo ni repiten mesa", async () => {
    poner(a("12:00", "2026-10-21"));
    const fecha = "2026-10-26";
    await db.query("UPDATE aforos SET aforo_personas = 30 WHERE franja_id = $1", [franja["20:00"]]);
    const base = [];
    for (let i = 0; i < 6; i++) base.push(await reservar(2, "20:00", { fecha }));
    const ops = [
      ...base.slice(0, 3).map((r) => patch("encargado", `/reservas/${r.id}`, { personas: 4 })),
      ...base.slice(3).map((r) => post("encargado", `/reservas/${r.id}/cancelar`)),
      ...Array.from({ length: 12 }, (_, i) =>
        post("encargado", "/reservas", {
          nombre: `Simultánea ${i}`,
          telefono: String(1166600000 + i),
          personas: 2,
          fecha,
          franjaId: franja["20:00"],
          origen: "telefono",
        }),
      ),
    ];
    const res = await Promise.all(ops);
    expect(res.every((x) => [200, 201, 409].includes(x.status))).toBe(true);
    const ocup = await one(
      db,
      "SELECT SUM(personas) AS p, COUNT(*) AS n, COUNT(DISTINCT mesa_id) AS m FROM reservas WHERE fecha_servicio = ? AND franja_id = ? AND estado IN ('confirmada','cumplida')",
      [fecha, franja["20:00"]],
    );
    expect(Number(ocup!.p)).toBeLessThanOrEqual(30);
    expect(Number(ocup!.n)).toBe(Number(ocup!.m));
    await contadoresCuadran();
    await db.query("UPDATE aforos SET aforo_personas = 100 WHERE franja_id = $1", [franja["20:00"]]);
  });
});
