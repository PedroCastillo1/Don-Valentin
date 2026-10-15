export const ESTADOS_RESERVA = ["confirmada", "cancelada", "no_show", "cumplida"] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export const ORIGENES_RESERVA = ["web", "telefono", "presencial"] as const;
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
