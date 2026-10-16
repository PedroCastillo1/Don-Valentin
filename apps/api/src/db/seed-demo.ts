import { loadConfig } from "../config.ts";
import { createPool, exec, one, rows } from "./pool.ts";
import { crearReserva, leerConfigLocal, disponibilidad } from "../services/reservas.ts";
import { abrirSesion, listarMesas } from "../services/mesas.ts";
import { fechaServicioActual, sumarDias } from "../domain/tiempo.ts";

/** Datos de PRUEBA para demostrar el panel. Nombres con "(prueba)" y teléfonos 11 5555-01xx; nunca se mezclan con datos reales. */
const cfg = loadConfig();
if (cfg.isProd) throw new Error("seed-demo no corre en producción.");
const db = createPool(cfg);
const ahora = new Date();
const c = await leerConfigLocal(db);
const hoy = fechaServicioActual(ahora, c.apertura, c.cierre);

const apellidos = [
  "García",
  "Rodríguez",
  "Fernández",
  "López",
  "Martínez",
  "Pérez",
  "Gómez",
  "Sosa",
  "Díaz",
  "Romero",
  "Álvarez",
  "Torres",
];
const plan: { dia: number; franja: number; personas: number; origen: "web" | "telefono" | "presencial" }[] = [
  { dia: 0, franja: 1, personas: 4, origen: "web" },
  { dia: 0, franja: 1, personas: 6, origen: "telefono" },
  { dia: 0, franja: 2, personas: 2, origen: "web" },
  { dia: 0, franja: 2, personas: 8, origen: "telefono" },
  { dia: 0, franja: 2, personas: 4, origen: "web" },
  { dia: 0, franja: 3, personas: 5, origen: "web" },
  { dia: 0, franja: 3, personas: 4, origen: "presencial" },
  { dia: 0, franja: 3, personas: 6, origen: "telefono" },
  { dia: 0, franja: 4, personas: 3, origen: "web" },
  { dia: 0, franja: 4, personas: 4, origen: "web" },
  { dia: 0, franja: 5, personas: 2, origen: "web" },
  { dia: 1, franja: 2, personas: 4, origen: "web" },
  { dia: 1, franja: 3, personas: 6, origen: "telefono" },
];
let n = 0;
for (const p of plan) {
  const fecha = sumarDias(hoy, p.dia);
  const fr = (await disponibilidad(db, fecha, p.personas, ahora)).filter((f) => f.estado === "disponible");
  const f = fr[Math.min(p.franja, fr.length - 1)];
  if (!f) continue;
  const apellido = apellidos[n % apellidos.length]!;
  try {
    await crearReserva(
      db,
      {
        nombre: `${apellido} (prueba)`,
        telefono: `11 5555 01${String(n).padStart(2, "0")}`,
        personas: p.personas,
        fecha,
        franjaId: f.id,
        comentarios: "Dato de prueba",
        origen: p.origen,
      },
      ahora,
    );
    n++;
  } catch (e) {
    console.warn("omitida:", (e as Error).message);
  }
}
const admin = await one<{ id: number } & import("mysql2/promise").RowDataPacket>(
  db,
  "SELECT id FROM usuarios WHERE usuario='encargado'",
);
const mesas = await listarMesas(db);
for (const m of mesas.filter((x) => [2, 5, 9, 12, 17, 22].includes(x.numero)))
  if (admin) await abrirSesion(db, m.id, admin.id);
const [t] = await rows(db, "SELECT COUNT(*) n FROM reservas WHERE comentarios='Dato de prueba'");
console.log(`Datos de prueba: ${t?.n} reservas (${n} nuevas).`);
await exec(db, "SELECT 1");
await db.end();
