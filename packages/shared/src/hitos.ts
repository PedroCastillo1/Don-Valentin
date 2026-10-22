/**
 * Línea base v4 (CR-009, aprobada según confirmación del responsable el 15/10/2026).
 * Fuente: Declaración del Alcance v4 §2.1 y §3.2; Tablero 05, hoja Hitos.
 * Cualquier cambio de fecha entra por control de cambios, nunca por código.
 */
export type HitoId = "H1" | "H2" | "N3" | "H3" | "N4" | "H4" | "H5" | "H6" | "H7";

export interface Hito {
  id: HitoId;
  nombre: string;
  /** Fecha de la línea base v4 (YYYY-MM-DD). N4 es tentativa. */
  fecha: string;
  tentativa?: boolean;
}

export const HITOS: readonly Hito[] = [
  { id: "H1", nombre: "Acta, relevamiento y línea base del alcance", fecha: "2026-08-28" },
  { id: "H2", nombre: "Prototipo UX/UI, modelo de datos y parametrización", fecha: "2026-10-16" },
  { id: "N3", nombre: "Demo del prototipo funcional", fecha: "2026-10-20" },
  { id: "H3", nombre: "Gestor de reservas y turnos operativo", fecha: "2026-10-30" },
  { id: "N4", nombre: "Presentación final", fecha: "2026-11-03", tentativa: true },
  { id: "H4", nombre: "Circuito de pedidos por QR", fecha: "2026-11-06" },
  { id: "H5", nombre: "Integración y sitio en ambiente de prueba", fecha: "2026-11-13" },
  { id: "H6", nombre: "Pruebas integrales y Plan de Implantación", fecha: "2026-11-20" },
  { id: "H7", nombre: "Aceptación final y cierre", fecha: "2026-11-27" },
];

export function hitoPorId(id: HitoId): Hito {
  const h = HITOS.find((x) => x.id === id);
  if (!h) throw new Error(`Hito desconocido: ${id}`);
  return h;
}

/** "2026-10-30" -> "30/10/2026" */
export function fechaAr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Número del hito para el texto de estado: H3 -> "Hito 3", N4 -> "Nota 4". */
export function etiquetaHito(id: HitoId): string {
  return id.startsWith("H") ? `Hito ${id.slice(1)}` : `Nota ${id.slice(1)}`;
}

/** Texto exacto exigido para funciones que todavía no corresponden: "Programado para el Hito 3 — 30/10/2026". */
export function textoProgramado(id: HitoId): string {
  const h = hitoPorId(id);
  return `Programado para el ${etiquetaHito(id)} — ${fechaAr(h.fecha)}`;
}

export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
  /** Hito en el que el Sponsor acepta el módulo. */
  hito: HitoId;
  /** true solo si la función existe y está probada en esta versión. */
  disponible: boolean;
  /** Requisitos del Alcance v4 que cubre. */
  requisitos: string[];
}

/** Registro único de módulos: lo usa el panel para mostrar disponibilidad real (sin inventar estados). */
export const MODULOS: readonly Modulo[] = [
  {
    id: "reservas",
    nombre: "Reservas",
    descripcion: "Alta de reserva con asignación de mesa y control de aforo por franja y sector.",
    hito: "H3",
    disponible: true,
    requisitos: ["RF-R1", "RF-R2"],
  },
  {
    id: "mesas-qr",
    nombre: "Mesas y QR",
    descripcion: "Mesas con capacidad y sector, código QR único por mesa y apertura de sesión de mesa.",
    hito: "H4",
    disponible: true,
    requisitos: ["RF-Q1"],
  },
  {
    id: "parametros",
    nombre: "Parámetros",
    descripcion: "Planilla de parametrización: mesas, sectores, franjas, aforo, tiempos y tipos de solicitud.",
    hito: "H2",
    disponible: true,
    requisitos: ["RNF-3"],
  },
  {
    id: "usuarios",
    nombre: "Usuarios y roles",
    descripcion: "Cada perfil accede solo a sus funciones; los intentos denegados quedan registrados.",
    hito: "H3",
    disponible: true,
    requisitos: ["RNF-3"],
  },
  {
    id: "estado-salon",
    nombre: "Estado del salón",
    descripcion: "Mesas libres, reservadas y ocupadas por franja; walk-in y no-show.",
    hito: "H3",
    disponible: true,
    requisitos: ["RF-R3"],
  },
  {
    id: "modificar-reserva",
    nombre: "Modificar y cancelar reservas",
    descripcion: "Liberar o reasignar el cupo al modificar o cancelar.",
    hito: "H3",
    disponible: true,
    requisitos: ["RF-R4"],
  },
  {
    id: "carta-digital",
    nombre: "Carta digital y pedidos",
    descripcion: "El comensal pide desde la mesa y el pedido llega al sector que lo prepara.",
    hito: "H4",
    disponible: false,
    requisitos: ["RF-Q2", "RF-Q3", "RF-Q4"],
  },
  {
    id: "carta-precios",
    nombre: "Edición de carta y precios",
    descripcion: "Cambiar precios y productos desde el panel, con impacto en el sitio y en el pedido por QR.",
    hito: "H4",
    disponible: false,
    requisitos: ["RF-Q1"],
  },
  {
    id: "paneles-sector",
    nombre: "Paneles de cocina, parrilla y barra",
    descripcion: "Pedidos por sector con estados y alerta por demora.",
    hito: "H4",
    disponible: false,
    requisitos: ["RF-Q2", "RF-Q3"],
  },
  {
    id: "medicion-sitio",
    nombre: "Medición del sitio",
    descripcion: "Google Analytics 4 y Search Console con sitemap.",
    hito: "H5",
    disponible: false,
    requisitos: ["RF-W3"],
  },
];
