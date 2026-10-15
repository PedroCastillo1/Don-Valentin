/** Argentina no usa horario de verano: UTC-3 todo el año. */
export const OFFSET_AR_MIN = -180;

function minutos(hhmm: string): number {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

export function sumarDias(fechaIso: string, dias: number): string {
  const d = new Date(`${fechaIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Instante (UTC) en que arranca una franja del día de servicio `fechaServicio`.
 * El local atiende de `apertura` a `cierre` (p. ej. 12:00 a 02:00): las franjas que empiezan antes
 * de la apertura (00:00) pertenecen al día de servicio anterior y ocurren en la madrugada del día siguiente.
 */
export function inicioFranjaUtc(fechaServicio: string, horaInicio: string, apertura: string): Date {
  const dia = minutos(horaInicio) < minutos(apertura) ? sumarDias(fechaServicio, 1) : fechaServicio;
  const [h = "0", m = "0"] = horaInicio.split(":");
  const localComoUtc = Date.parse(`${dia}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00Z`);
  return new Date(localComoUtc - OFFSET_AR_MIN * 60_000);
}

/** Día de servicio vigente en `ahora`: de madrugada, antes del cierre, todavía rige el día anterior. */
export function fechaServicioActual(ahora: Date, apertura: string, cierre: string): string {
  const local = new Date(ahora.getTime() + OFFSET_AR_MIN * 60_000);
  const fecha = local.toISOString().slice(0, 10);
  const min = local.getUTCHours() * 60 + local.getUTCMinutes();
  const cierreMin = minutos(cierre);
  const aperturaMin = minutos(apertura);
  return cierreMin < aperturaMin && min < cierreMin ? sumarDias(fecha, -1) : fecha;
}

/** "14:00:00" -> "14:00" */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function sumarMinutosHhmm(hora: string, mins: number): string {
  const total = (minutos(hora) + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
