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

/** Hito 4 (RF-Q1 a RF-Q4): pedido desde el QR, paneles por sector, estados, demoras, pedido del mozo y carta editable. */
const env = {
  NODE_ENV: "test",
  DB_NAME: "dv_test_h4",
  DB_PORT: String(PUERTO_PG_TEST),
  DB_USER: "postgres",
  DB_PASSWORD: "postgres",
} as NodeJS.ProcessEnv;
let db: Db;
let app: Express;
let pass: Record<string, string>;

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
const admin = {
  get: async (u: string, ruta: string) => (await como(u)).agent.get(`/api/admin${ruta}`),
  post: async (u: string, ruta: string, body: object = {}) => {
    const c = await como(u);
    return c.agent.post(`/api/admin${ruta}`).set("x-csrf-token", c.csrf).send(body);
  },
  put: async (u: string, ruta: string, body: object) => {
    const c = await como(u);
    return c.agent.put(`/api/admin${ruta}`).set("x-csrf-token", c.csrf).send(body);
  },
  del: async (u: string, ruta: string) => {
    const c = await como(u);
    return c.agent.delete(`/api/admin${ruta}`).set("x-csrf-token", c.csrf);
  },
};

interface Mesa {
  id: number;
  numero: number;
  token: string;
}
async function mesa(numero: number): Promise<Mesa> {
  const m = await one(db, "SELECT id, numero, qr_token FROM mesas WHERE numero = ?", [numero]);
  return { id: m!.id, numero: m!.numero, token: m!.qr_token };
}
/** Una variante con precio de cada sector (para armar pedidos que se reparten). */
async function variante(sector: "cocina" | "parrilla" | "barra"): Promise<number> {
  const v = await one(
    db,
    `SELECT v.id FROM variantes_producto v JOIN productos p ON p.id = v.producto_id
       JOIN sectores_preparacion s ON s.id = p.sector_preparacion_id
      WHERE s.codigo = ? AND v.precio IS NOT NULL AND p.disponible = 1 ORDER BY v.id LIMIT 1`,
    [sector],
  );
  return v!.id;
}
/** Comensal: escanea el QR (ingreso) con su propio navegador. */
async function comensal(m: Mesa) {
  const agent = request.agent(app);
  const r = await agent.post(`/api/public/mesa/${m.token}/ingreso`);
  return { agent, r };
}

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
  await a.query("DROP DATABASE IF EXISTS dv_test_h4 WITH (FORCE)");
  await a.query("CREATE DATABASE dv_test_h4 ENCODING 'UTF8'");
  await a.end();
  db = createPool(cfg);
  const mdb = createPool(cfg, { multipleStatements: true });
  await migrate(mdb);
  await mdb.end();
  await seedBase(db);
  pass = await seedUsuarios(db, USUARIOS_PRUEBA);
  app = createApp({ db, cfg, limitarTasa: false });
}, 60_000);
afterAll(async () => {
  await db.end();
});

describe("RF-Q1/Q2: el comensal pide desde el QR", () => {
  it("sin sesión abierta no se puede pedir; un código inventado da 404", async () => {
    const m = await mesa(1);
    const { r } = await comensal(m);
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe("MESA_SIN_SESION");
    expect((await request(app).post(`/api/public/mesa/${"0".repeat(32)}/ingreso`)).status).toBe(404);
    expect((await request(app).post(`/api/public/mesa/${m.token}/pedidos`).send({ items: [] })).status).toBe(403);
  });

  it("el pedido se reparte por sector y aparece en cada panel en menos de 5 segundos", async () => {
    const m = await mesa(2);
    expect((await admin.post("mozo", `/mesas/${m.id}/sesion`)).status).toBe(201);
    const { agent, r } = await comensal(m);
    expect(r.status).toBe(200);
    expect(r.body.numero).toBe(2);
    expect(String(r.headers["set-cookie"])).toMatch(/HttpOnly/i);
    const inicio = Date.now();
    const p = await agent.post(`/api/public/mesa/${m.token}/pedidos`).send({
      items: [
        { varianteId: await variante("parrilla"), cantidad: 2, nota: "jugoso" },
        { varianteId: await variante("cocina"), cantidad: 1 },
        { varianteId: await variante("barra"), cantidad: 3 },
      ],
    });
    expect(p.status, JSON.stringify(p.body)).toBe(201);
    expect(p.body.origen).toBe("qr");
    for (const [usuario, sector] of [
      ["parrilla", "parrilla"],
      ["cocina", "cocina"],
      ["barra", "barra"],
    ] as const) {
      const panel = await admin.get(usuario, "/sectores/items?sector=cocina"); // pide otro: igual ve el suyo
      expect(panel.status).toBe(200);
      expect(panel.body.sector).toBe(sector);
      expect(panel.body.fijo).toBe(true);
      expect(panel.body.items.every((i: { sector: string }) => i.sector === sector)).toBe(true);
      expect(panel.body.items.some((i: { pedidoId: number }) => i.pedidoId === p.body.id)).toBe(true);
    }
    expect(Date.now() - inicio).toBeLessThan(5_000);
    const mios = await agent.get(`/api/public/mesa/${m.token}/pedidos`);
    expect(mios.body.pedidos).toHaveLength(1);
    expect(mios.body.pedidos[0].items.find((i: { nota: string }) => i.nota === "jugoso")).toBeTruthy();
  });

  it("un producto agotado o sin precio no se puede pedir", async () => {
    const m = await mesa(3);
    await admin.post("mozo", `/mesas/${m.id}/sesion`);
    const { agent } = await comensal(m);
    const sinPrecio = await one(db, "SELECT id FROM variantes_producto WHERE precio IS NULL LIMIT 1");
    if (sinPrecio) {
      const r = await agent
        .post(`/api/public/mesa/${m.token}/pedidos`)
        .send({ items: [{ varianteId: sinPrecio.id, cantidad: 1 }] });
      expect(r.status).toBe(409);
    }
    const v = await variante("cocina");
    await db.query(
      "UPDATE productos SET disponible = 0 WHERE id = (SELECT producto_id FROM variantes_producto WHERE id = $1)",
      [v],
    );
    const r = await agent.post(`/api/public/mesa/${m.token}/pedidos`).send({ items: [{ varianteId: v, cantidad: 1 }] });
    expect(r.status).toBe(409);
    expect(r.body.error.codigo).toBe("PRODUCTO_NO_DISPONIBLE");
    await db.query(
      "UPDATE productos SET disponible = 1 WHERE id = (SELECT producto_id FROM variantes_producto WHERE id = $1)",
      [v],
    );
  });

  it("al liberar la mesa, el celular del grupo anterior ya no ve ni pide; el grupo nuevo empieza en cero", async () => {
    const m = await mesa(4);
    await admin.post("mozo", `/mesas/${m.id}/sesion`);
    const viejo = await comensal(m);
    await viejo.agent
      .post(`/api/public/mesa/${m.token}/pedidos`)
      .send({ items: [{ varianteId: await variante("barra"), cantidad: 1 }] });
    expect((await admin.del("mozo", `/mesas/${m.id}/sesion`)).status).toBe(204);
    await admin.post("mozo", `/mesas/${m.id}/sesion`);
    expect((await viejo.agent.get(`/api/public/mesa/${m.token}/pedidos`)).status).toBe(403);
    const pedido = await viejo.agent
      .post(`/api/public/mesa/${m.token}/pedidos`)
      .send({ items: [{ varianteId: await variante("barra"), cantidad: 1 }] });
    expect(pedido.status).toBe(403);
    const nuevo = await comensal(m);
    expect((await nuevo.agent.get(`/api/public/mesa/${m.token}/pedidos`)).body.pedidos).toEqual([]);
  });
});

describe("RF-Q3: estados y demoras", () => {
  it("recibido → en preparación → listo (el sector) → entregado (el mozo); cada puesto solo toca lo suyo", async () => {
    const m = await mesa(5);
    await admin.post("mozo", `/mesas/${m.id}/sesion`);
    const p = await admin.post("mozo", `/mesas/${m.id}/pedidos`, {
      items: [
        { varianteId: await variante("parrilla"), cantidad: 1 },
        { varianteId: await variante("cocina"), cantidad: 1 },
      ],
    });
    expect(p.status).toBe(201);
    expect(p.body.origen).toBe("mozo");
    const parrilla = p.body.items.find((i: { sector: string }) => i.sector === "parrilla");
    const cocina = p.body.items.find((i: { sector: string }) => i.sector === "cocina");
    expect((await admin.post("cocina", `/items/${parrilla.id}/estado`, { estado: "en_preparacion" })).status).toBe(403);
    expect((await admin.post("parrilla", `/items/${parrilla.id}/estado`, { estado: "listo" })).status).toBe(409);
    expect((await admin.post("parrilla", `/items/${parrilla.id}/estado`, { estado: "en_preparacion" })).status).toBe(
      200,
    );
    expect((await admin.post("parrilla", `/items/${parrilla.id}/estado`, { estado: "listo" })).status).toBe(200);
    expect((await admin.post("parrilla", `/items/${parrilla.id}/estado`, { estado: "entregado" })).status).toBe(403);
    expect((await admin.post("mozo", `/items/${parrilla.id}/estado`, { estado: "entregado" })).status).toBe(200);
    // El pedido sigue al ítem más atrasado: la cocina todavía no empezó.
    expect((await one(db, "SELECT estado FROM pedidos WHERE id = ?", [p.body.id]))!.estado).toBe("recibido");
    await admin.post("cocina", `/items/${cocina.id}/estado`, { estado: "en_preparacion" });
    await admin.post("cocina", `/items/${cocina.id}/estado`, { estado: "listo" });
    await admin.post("mozo", `/items/${cocina.id}/estado`, { estado: "entregado" });
    expect((await one(db, "SELECT estado FROM pedidos WHERE id = ?", [p.body.id]))!.estado).toBe("entregado");
    // Lo entregado ya no ocupa el panel.
    const panel = await admin.get("parrilla", "/sectores/items");
    expect(panel.body.items.some((i: { id: number }) => i.id === parrilla.id)).toBe(false);
    expect((await admin.post("mozo", `/items/${cocina.id}/estado`, { estado: "cancelado" })).status).toBe(403);
  });

  it("un ítem que supera el tiempo máximo de su tipo de solicitud figura demorado", async () => {
    const m = await mesa(6);
    await admin.post("mozo", `/mesas/${m.id}/sesion`);
    const p = await admin.post("mozo", `/mesas/${m.id}/pedidos`, {
      items: [{ varianteId: await variante("barra"), cantidad: 1 }],
    });
    const id = p.body.items[0].id;
    let item = (await admin.get("barra", "/sectores/items")).body.items.find((i: { id: number }) => i.id === id);
    expect(item.demorado).toBe(false);
    await db.query("UPDATE pedido_items SET creado_en = creado_en - interval '45 minutes' WHERE id = $1", [id]);
    item = (await admin.get("barra", "/sectores/items")).body.items.find((i: { id: number }) => i.id === id);
    expect(item.minutos).toBeGreaterThanOrEqual(45);
    expect(item.demorado).toBe(true);
    // El Encargado ve todos los sectores (y la demora) desde el resumen de pedidos.
    const todos = await admin.get("encargado", "/sectores/items");
    expect(todos.body.sector).toBeNull();
    expect(todos.body.fijo).toBe(false);
    const parrillaEnc = await admin.get("encargado", "/sectores/items?sector=parrilla");
    expect(parrillaEnc.body).toMatchObject({ sector: "parrilla", fijo: false });
    expect(todos.body.items.find((i: { id: number }) => i.id === id).demorado).toBe(true);
  });
});

describe("carta, permisos y concurrencia", () => {
  it("el Encargado cambia un precio y el sitio lo muestra; queda en la auditoría con antes y después", async () => {
    const v = await variante("cocina");
    const r = await admin.put("encargado", `/carta/variantes/${v}`, { precio: 12345.5 });
    expect(r.status).toBe(200);
    expect(r.body.despues).toBe(12345.5);
    const carta = await request(app).get("/api/public/carta");
    const precios = carta.body.grupos.flatMap(
      (g: { categorias: { productos: { variantes: { id: number; precio: number }[] }[] }[] }) =>
        g.categorias.flatMap((c) => c.productos.flatMap((p) => p.variantes)),
    );
    expect(precios.find((x: { id: number }) => x.id === v).precio).toBe(12345.5);
    const aud = await rows(db, "SELECT detalle FROM auditoria WHERE accion = 'carta:precio' ORDER BY id DESC LIMIT 1");
    expect(JSON.stringify(aud[0]!.detalle)).toContain("12345.5");
    expect((await admin.put("mozo", `/carta/variantes/${v}`, { precio: 1 })).status).toBe(403);
    expect((await admin.put("encargado", `/carta/variantes/${v}`, { precio: -5 })).status).toBe(400);
  });

  it("un producto agotado desaparece de la carta pública y vuelve al reactivarlo", async () => {
    const prod = (await one(db, "SELECT id FROM productos ORDER BY id LIMIT 1"))!.id;
    const cuenta = async () =>
      (await request(app).get("/api/public/carta")).body.grupos.reduce(
        (n: number, g: { categorias: { productos: unknown[] }[] }) =>
          n + g.categorias.reduce((k, c) => k + c.productos.length, 0),
        0,
      );
    const antes = await cuenta();
    expect((await admin.put("encargado", `/carta/productos/${prod}`, { disponible: false })).status).toBe(204);
    expect(await cuenta()).toBe(antes - 1);
    await admin.put("encargado", `/carta/productos/${prod}`, { disponible: true });
    expect(await cuenta()).toBe(antes);
  });

  it("los 30 QR abren su mesa", async () => {
    const ms = await rows(db, "SELECT numero, qr_token FROM mesas ORDER BY numero");
    expect(ms).toHaveLength(30);
    for (const m of ms) {
      const r = await request(app).get(`/api/public/mesa/${m.qr_token}`);
      expect(r.body.numero).toBe(m.numero);
    }
  });

  it("30 pedidos simultáneos de 10 mesas llegan completos a los paneles", async () => {
    const mesas = [];
    for (let n = 11; n <= 20; n++) {
      const m = await mesa(n);
      await admin.post("mozo", `/mesas/${m.id}/sesion`);
      mesas.push({ m, c: (await comensal(m)).agent });
    }
    const [vp, vc, vb] = [await variante("parrilla"), await variante("cocina"), await variante("barra")];
    const envios = mesas.flatMap(({ m, c }) =>
      [vp, vc, vb].map((v) =>
        c.post(`/api/public/mesa/${m.token}/pedidos`).send({ items: [{ varianteId: v, cantidad: 1 }] }),
      ),
    );
    const res = await Promise.all(envios);
    expect(res.every((r) => r.status === 201)).toBe(true);
    const n = await one(
      db,
      "SELECT COUNT(*) AS n FROM pedido_items i JOIN pedidos p ON p.id = i.pedido_id JOIN sesiones_mesa s ON s.id = p.sesion_mesa_id JOIN mesas m ON m.id = s.mesa_id WHERE m.numero BETWEEN 11 AND 20 AND s.estado = 'abierta'",
    );
    expect(Number(n!.n)).toBe(30);
  });
});
