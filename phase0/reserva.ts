export type ResultadoReserva = { ok: true } | { ok: false; motivo: string };

/** Valida personas contra la capacidad libre. Datos de prueba: no son reglas reales del local. */
export function validarReserva(personas: number, capacidadLibre: number): ResultadoReserva {
  if (!Number.isInteger(personas) || personas < 1) {
    return { ok: false, motivo: "Indicá cuántas personas van a venir." };
  }
  if (personas > capacidadLibre) {
    return { ok: false, motivo: "Para ese horario ya no tenemos lugar." };
  }
  return { ok: true };
}
