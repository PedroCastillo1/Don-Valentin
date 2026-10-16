import { LOCAL } from "@dv/shared";

const aMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export interface EstadoLocal {
  abierto: boolean;
  /** Texto corto para mostrar: "Abierto ahora · cierra 02:00" o "Abre hoy 12:00". */
  texto: string;
}

/** Argentina es UTC-3 todo el año. El horario cruza la medianoche (12:00 a 02:00). */
export function estadoDelLocal(ahora: Date = new Date()): EstadoLocal {
  const ar = new Date(ahora.getTime() - 3 * 3600_000);
  const min = ar.getUTCHours() * 60 + ar.getUTCMinutes();
  const ap = aMin(LOCAL.horario.apertura);
  const ci = aMin(LOCAL.horario.cierre);
  const abierto = min >= ap || min < ci;
  return abierto
    ? { abierto, texto: `Abierto ahora · cierra a las ${LOCAL.horario.cierre}` }
    : { abierto, texto: `Cerrado · abre a las ${LOCAL.horario.apertura}` };
}
