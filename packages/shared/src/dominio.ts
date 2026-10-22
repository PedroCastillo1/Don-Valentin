export const ESTADOS_RESERVA = ["confirmada", "cancelada", "no_show", "cumplida"] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

/** walk_in: el grupo llega sin reserva (Hito 3, RF-R3). */
export const ORIGENES_RESERVA = ["web", "telefono", "whatsapp", "presencial", "walk_in"] as const;
export type OrigenReserva = (typeof ORIGENES_RESERVA)[number];

export const SECTORES_PREPARACION = ["cocina", "parrilla", "barra"] as const;
export type SectorPreparacion = (typeof SECTORES_PREPARACION)[number];

export const ESTADOS_VALIDACION = ["documentado", "provisorio", "validado"] as const;
export type EstadoValidacion = (typeof ESTADOS_VALIDACION)[number];

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

/** Local abierto de 12:00 a 02:00 de corrido (Acta v4 §2; Fase de Implementación v4). */
export const LOCAL = {
  nombre: "Don Valentín",
  descriptor: "Parrilla Libre & Restó",
  desde: 1994,
  direccion: "Av. Pres. Arturo Umberto Illia 3873",
  localidad: "San Miguel",
  provincia: "Buenos Aires",
  horario: { apertura: "12:00", cierre: "02:00" },
  telefonos: [
    { etiqueta: "WhatsApp y celular", valor: "11-3303-9516", tel: "+5491133039516" },
    { etiqueta: "Teléfono fijo", valor: "4664-1720", tel: "+541146641720" },
  ],
  instagram: "https://www.instagram.com/parrilladonvalentin",
} as const;

/** Días de la semana en el orden de la planilla (dias_atencion). */
export const DIAS_SEMANA = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];
export const DIA_NOMBRE: Record<DiaSemana, string> = {
  lun: "lunes",
  mar: "martes",
  mie: "miércoles",
  jue: "jueves",
  vie: "viernes",
  sab: "sábado",
  dom: "domingo",
};

/** Día de la semana de una fecha de servicio AAAA-MM-DD (la fecha del turno, no la del reloj). */
export function diaDeSemana(fecha: string): DiaSemana {
  const [a, m, d] = fecha.split("-").map(Number);
  const js = new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, d ?? 1)).getUTCDay(); // 0 = domingo
  return DIAS_SEMANA[(js + 6) % 7]!;
}

/** "lun,mar,…" → lista válida (ignora valores desconocidos). */
export function parsearDias(valor: string): DiaSemana[] {
  return valor
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter((x): x is DiaSemana => (DIAS_SEMANA as readonly string[]).includes(x));
}

/** "2026-12-25, 2027-01-01" → fechas válidas AAAA-MM-DD. */
export function parsearFechas(valor: string): string[] {
  return valor
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
}

/** ¿El local atiende ese día de servicio? */
export function localAbre(fecha: string, diasAtencion: string, diasCerrados: string): boolean {
  return parsearDias(diasAtencion).includes(diaDeSemana(fecha)) && !parsearFechas(diasCerrados).includes(fecha);
}
