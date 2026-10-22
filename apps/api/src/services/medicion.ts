import type { EventoSitio } from "@dv/shared";
import { EVENTOS_SITIO, rutaMedida } from "@dv/shared";
import type { Db } from "../db/pool.ts";
import { exec, rows } from "../db/pool.ts";
import { OFFSET_AR_MIN, sumarDias } from "../domain/tiempo.ts";

/** Día calendario de Argentina (la medición se agrupa por día local, no por día de servicio). */
const diaAr = (ahora: Date) => new Date(ahora.getTime() + OFFSET_AR_MIN * 60_000).toISOString().slice(0, 10);

/** RF-W3: suma 1 al contador del evento en el día y la página. No guarda IP, cookies ni nada de la persona. */
export async function registrarEvento(db: Db, evento: EventoSitio, ruta: string, ahora = new Date()): Promise<void> {
  await exec(
    db,
    `INSERT INTO eventos_sitio (dia, evento, ruta, cantidad) VALUES (?,?,?,1)
     ON CONFLICT (dia, evento, ruta) DO UPDATE SET cantidad = eventos_sitio.cantidad + 1`,
    [diaAr(ahora), evento, rutaMedida(ruta)],
  );
}

export interface ResumenMedicion {
  desde: string;
  hasta: string;
  porDia: { dia: string; visitas: number; reservas: number }[];
  paginas: { ruta: string; visitas: number }[];
  eventos: Record<EventoSitio, number>;
}

export async function resumenMedicion(db: Db, dias: number, ahora = new Date()): Promise<ResumenMedicion> {
  const hasta = diaAr(ahora);
  const desde = sumarDias(hasta, -(dias - 1));
  const r = await rows(
    db,
    "SELECT dia, evento, ruta, cantidad FROM eventos_sitio WHERE dia BETWEEN ? AND ? ORDER BY dia",
    [desde, hasta],
  );
  const eventos = Object.fromEntries(EVENTOS_SITIO.map((e) => [e, 0])) as Record<EventoSitio, number>;
  const porDia = new Map<string, { visitas: number; reservas: number }>();
  for (let i = 0; i < dias; i++) porDia.set(sumarDias(desde, i), { visitas: 0, reservas: 0 });
  const paginas = new Map<string, number>();
  for (const x of r) {
    const n = Number(x.cantidad);
    eventos[x.evento as EventoSitio] = (eventos[x.evento as EventoSitio] ?? 0) + n;
    const d = porDia.get(x.dia)!;
    if (x.evento === "pagina_vista") {
      d.visitas += n;
      paginas.set(x.ruta, (paginas.get(x.ruta) ?? 0) + n);
    }
    if (x.evento === "reserva_confirmada") d.reservas += n;
  }
  return {
    desde,
    hasta,
    porDia: [...porDia.entries()].map(([dia, v]) => ({ dia, ...v })),
    paginas: [...paginas.entries()].map(([ruta, visitas]) => ({ ruta, visitas })).sort((a, b) => b.visitas - a.visitas),
    eventos,
  };
}
