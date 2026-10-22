/**
 * RNF-7: prueba de carga de un turno simulado.
 * Levanta la API con PostgreSQL 17 embebido y, por HTTP real, reproduce un turno lleno comprimido en el tiempo:
 * las 30 mesas abiertas, cada comensal pide varias veces desde el QR, los tres sectores consultan su panel cada
 * 3 segundos y los preparan, los mozos miran el salón y entregan, y en paralelo entran reservas web y visitas a la carta.
 * Criterio (Alcance v4): sin pérdidas y el 95 % de las respuestas en 5 segundos o menos.
 *
 *   node --experimental-strip-types scripts/carga-turno.ts [segundos=60]
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { writeFileSync } from "node:fs";
import { levantarPostgres } from "../apps/api/src/db/pg-local.ts";
import { loadConfig } from "../apps/api/src/config.ts";
import { createPool, one } from "../apps/api/src/db/pool.ts";
import { migrate } from "../apps/api/src/db/migrate.ts";
import { seedBase, seedUsuarios, USUARIOS_PRUEBA } from "../apps/api/src/db/seed.ts";
import { createApp } from "../apps/api/src/http/app.ts";

const SEGUNDOS = Number(process.argv[2] ?? 60);
const PUERTO_PG = 54471;
const pgl = await levantarPostgres({ puerto: PUERTO_PG });
await pgl.baseNueva("dv_carga");
const cfg = loadConfig({
  NODE_ENV: "test",
  DB_NAME: "dv_carga",
  DB_PORT: String(PUERTO_PG),
  DB_USER: pgl.usuario,
  DB_PASSWORD: pgl.clave,
  DB_POOL_MAX: "10",
} as NodeJS.ProcessEnv);
const db = createPool(cfg, { multipleStatements: true });
await migrate(db);
await seedBase(db);
const pass = await seedUsuarios(db, USUARIOS_PRUEBA);
// Límite de tasa apagado: en el local cada puesto tiene su IP; acá todos salen de la misma.
const servidor = createServer(createApp({ db, cfg, limitarTasa: false }));
await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;

// ───────── cliente HTTP con cookies y medición ─────────
const tiempos = new Map<string, number[]>();
const errores: string[] = [];
class Navegador {
  cookies = new Map<string, string>();
  csrf = "";
  async pedir(nombre: string, ruta: string, opts: { method?: string; body?: unknown } = {}) {
    const t0 = performance.now();
    const res = await fetch(BASE + ruta, {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
        ...(this.csrf && opts.method && opts.method !== "GET" ? { "x-csrf-token": this.csrf } : {}),
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const ms = performance.now() - t0;
    (tiempos.get(nombre) ?? tiempos.set(nombre, []).get(nombre)!).push(ms);
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const [k, ...v] = kv!.split("=");
      this.cookies.set(k!, v.join("="));
    }
    const texto = await res.text();
    if (res.status >= 500) errores.push(`${nombre} ${res.status} ${texto.slice(0, 120)}`);
    return { status: res.status, body: texto ? JSON.parse(texto) : null };
  }
  async ingresar(usuario: string) {
    const r = await this.pedir("ingreso", "/api/auth/login", {
      method: "POST",
      body: { usuario, password: pass[usuario] },
    });
    this.csrf = r.body.csrfToken;
  }
}
// Las reservas web van a un día dentro de los 30 días que acepta el local (en hora argentina).
const FECHA = new Date(Date.now() - 3 * 3_600_000 + 5 * 86_400_000).toISOString().slice(0, 10);
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const azar = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]!;
const fin = Date.now() + SEGUNDOS * 1000;
const vivo = () => Date.now() < fin;

// ───────── preparación: mozo abre las 30 mesas ─────────
const mozo = new Navegador();
await mozo.ingresar("mozo");
const mesas = (await mozo.pedir("salón", "/api/admin/sesiones/mesas")).body.mesas as { id: number; numero: number }[];
for (const m of mesas) await mozo.pedir("abrir mesa", `/api/admin/mesas/${m.id}/sesion`, { method: "POST" });
const enc = new Navegador();
await enc.ingresar("encargado");
const codigos = (await enc.pedir("qr", "/api/admin/qr")).body.codigos as { numero: number; url: string }[];
const variantes = (
  (await new Navegador().pedir("carta", "/api/public/carta")).body.grupos as {
    categorias: { productos: { variantes: { id: number; precio: number | null }[] }[] }[];
  }[]
)
  .flatMap((g) => g.categorias.flatMap((c) => c.productos.flatMap((p) => p.variantes)))
  .filter((v) => v.precio !== null)
  .map((v) => v.id);

let pedidosEnviados = 0;
let itemsEnviados = 0;
let reservasOk = 0;
let reservasRechazadas = 0;

// ───────── actores ─────────
async function comensal(token: string) {
  const n = new Navegador();
  await n.pedir("QR: ingreso", `/api/public/mesa/${token}/ingreso`, { method: "POST" });
  await n.pedir("carta", "/api/public/carta");
  while (vivo()) {
    const items = Array.from({ length: 1 + Math.floor(Math.random() * 4) }, () => ({
      varianteId: azar(variantes),
      cantidad: 1 + Math.floor(Math.random() * 3),
    }));
    const r = await n.pedir("QR: enviar pedido", `/api/public/mesa/${token}/pedidos`, {
      method: "POST",
      body: { items },
    });
    if (r.status === 201) {
      pedidosEnviados++;
      itemsEnviados += items.length;
    } else errores.push(`pedido ${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
    // mira cómo va su pedido un par de veces y vuelve a pedir
    for (let i = 0; i < 2 && vivo(); i++) {
      await esperar(4000 + Math.random() * 4000);
      await n.pedir("QR: seguimiento", `/api/public/mesa/${token}/pedidos`);
    }
  }
}
async function sector(usuario: string) {
  const n = new Navegador();
  await n.ingresar(usuario);
  while (vivo()) {
    const items = (await n.pedir("panel de sector", "/api/admin/sectores/items")).body.items as {
      id: number;
      estado: string;
    }[];
    for (const it of items.slice(0, 6)) {
      const sig = it.estado === "recibido" ? "en_preparacion" : it.estado === "en_preparacion" ? "listo" : null;
      if (sig)
        await n.pedir("sector: cambiar estado", `/api/admin/items/${it.id}/estado`, {
          method: "POST",
          body: { estado: sig },
        });
    }
    await esperar(3000);
  }
}
async function mozoActor(usuario: string) {
  const n = new Navegador();
  await n.ingresar(usuario);
  while (vivo()) {
    await n.pedir("salón", "/api/admin/salon");
    const listos = (
      (await n.pedir("mozo: listos", "/api/admin/sectores/items")).body.items as { id: number; estado: string }[]
    ).filter((i) => i.estado === "listo");
    for (const it of listos.slice(0, 5))
      await n.pedir("mozo: entregar", `/api/admin/items/${it.id}/estado`, {
        method: "POST",
        body: { estado: "entregado" },
      });
    await esperar(5000);
  }
}
async function visitante(i: number) {
  const n = new Navegador();
  let k = 0;
  while (vivo()) {
    await n.pedir("visita: carta", "/api/public/carta");
    await n.pedir("visita: info", "/api/public/info");
    const r = await n.pedir(
      "reserva web: disponibilidad",
      `/api/public/disponibilidad?fecha=${FECHA}&personas=${2 + (k % 5)}`,
    );
    const libre = (r.body?.franjas as { id: number; estado: string }[] | undefined)?.find(
      (f) => f.estado === "disponible",
    );
    if (libre) {
      const res = await n.pedir("reserva web: confirmar", "/api/public/reservas", {
        method: "POST",
        body: {
          nombre: `Carga ${i}-${k}`,
          telefono: `116${String(i).padStart(3, "0")}${String(k).padStart(4, "0")}`,
          personas: 2 + (k % 5),
          fecha: FECHA,
          franjaId: libre.id,
          aceptaAviso: true,
        },
      });
      if (res.status === 201) reservasOk++;
      else if (res.status === 409) reservasRechazadas++;
      else errores.push(`reserva ${res.status}`);
    }
    k++;
    await esperar(1500 + Math.random() * 2000);
  }
}

console.log(`Turno simulado de ${SEGUNDOS} s contra ${BASE}…`);
const t0 = Date.now();
await Promise.all([
  ...codigos.map((c) => comensal(new URL(c.url).pathname.split("/").pop()!)),
  ...["parrilla", "cocina", "barra"].map(sector),
  mozoActor("mozo"),
  mozoActor("encargado"),
  ...Array.from({ length: 20 }, (_, i) => visitante(i)),
]);
const duracion = (Date.now() - t0) / 1000;

// ───────── verificación: nada se perdió ─────────
const enBase = await one(db, "SELECT count(*)::int AS p, (SELECT count(*)::int FROM pedido_items) AS i FROM pedidos");
const reservasBase = await one(db, "SELECT count(*)::int AS n FROM reservas WHERE fecha_servicio = ?", [FECHA]);
const sobreventa = await one(
  db,
  `SELECT count(*)::int AS n FROM (SELECT franja_id, mesa_id FROM reservas WHERE fecha_servicio = ? AND estado = 'confirmada'
     GROUP BY franja_id, mesa_id HAVING count(*) > 1) x`,
  [FECHA],
);
const aforo = await one(
  db,
  `SELECT count(*)::int AS n FROM ocupacion_franja o JOIN aforos a ON a.franja_id = o.franja_id AND a.sector_salon_id = o.sector_salon_id
    WHERE o.personas_confirmadas > a.aforo_personas`,
);

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
};
const todas = [...tiempos.values()].flat();
const dentro = todas.filter((ms) => ms <= 5000).length / todas.length;
const filas = [...tiempos.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .map(
    ([k, xs]) =>
      `| ${k} | ${xs.length} | ${Math.round(pct(xs, 50))} | ${Math.round(pct(xs, 95))} | ${Math.round(Math.max(...xs))} |`,
  );
const perdidas = enBase!.p - pedidosEnviados + (enBase!.i - itemsEnviados) + (reservasBase!.n - reservasOk);
const ok = perdidas === 0 && errores.length === 0 && dentro >= 0.95 && sobreventa!.n === 0 && aforo!.n === 0;
const informe = `# Prueba de carga de un turno — RNF-7 (${new Date().toISOString().slice(0, 10)})

Turno simulado de ${duracion.toFixed(0)} s por HTTP real contra la API con PostgreSQL 17: 30 mesas abiertas con un comensal
pidiendo desde el QR en cada una, los paneles de parrilla, cocina y barra consultando cada 3 s y preparando, dos personas de
salón mirando el salón y entregando, y 20 visitantes del sitio navegando la carta y reservando a la vez.
Comando: \`node --experimental-strip-types scripts/carga-turno.ts ${SEGUNDOS}\`

**Resultado: ${ok ? "CUMPLE" : "NO CUMPLE"}** el criterio (sin pérdidas y el 95 % de las respuestas en 5 s o menos).

- Respuestas: ${todas.length}, dentro de 5 s: ${(dentro * 100).toFixed(2)} %. p95 general: ${Math.round(pct(todas, 95))} ms.
- Pedidos desde el QR enviados y confirmados: ${pedidosEnviados} (${itemsEnviados} líneas). En la base: ${enBase!.p} pedidos y ${enBase!.i} líneas.
- Reservas web confirmadas: ${reservasOk}; rechazadas por falta de lugar: ${reservasRechazadas}. En la base: ${reservasBase!.n}.
- Mesas asignadas dos veces en la misma franja: ${sobreventa!.n}. Franjas por encima del aforo: ${aforo!.n}.
- Errores del servidor (5xx) o respuestas inesperadas: ${errores.length}${errores.length ? ` (primeros: ${errores.slice(0, 3).join("; ")})` : ""}.

| Operación | Pedidos HTTP | p50 (ms) | p95 (ms) | Máximo (ms) |
|---|---|---|---|---|
${filas.join("\n")}
`;
writeFileSync(process.env.INFORME ?? "docs/evidencias/hito6/carga-turno.md", informe);
console.log(informe);
servidor.close();
await db.end();
await pgl.detener();
process.exit(ok ? 0 : 1);
