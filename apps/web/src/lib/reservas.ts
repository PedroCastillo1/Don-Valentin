/** Forma de una reserva tal como la devuelve el panel (/api/admin/reservas…). */
export interface ReservaAdmin {
  id: number;
  codigo: string;
  fecha: string;
  franja: { id: number; nombre: string; desde: string; hasta: string };
  personas: number;
  aNombreDe: string;
  telefono: string;
  mesa: number;
  mesaId: number;
  sector: string;
  estado: "confirmada" | "cumplida" | "cancelada" | "no_show";
  origen: string;
  comentarios: string | null;
  llegadaEn: string | null;
  acciones: { modificar: boolean; cancelar: boolean; llegada: boolean; noShow: boolean };
}

export const ESTADO_RESERVA: Record<ReservaAdmin["estado"], { texto: string; clase: string }> = {
  confirmada: { texto: "Confirmada", clase: "confirmada" },
  cumplida: { texto: "Llegó", clase: "cumplida" },
  cancelada: { texto: "Cancelada", clase: "cancelada" },
  no_show: { texto: "No vino", clase: "no-show" },
};

export interface FranjaDisp {
  id: number;
  nombre: string;
  estado: "disponible" | "completa" | "sin_mesa" | "cerrada";
}
export const MOTIVO_FRANJA: Record<string, string> = {
  completa: "sin aforo",
  sin_mesa: "sin mesa para ese grupo",
  cerrada: "cerrada",
};

/** "2026-10-24" → "sáb 24/10" */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, d ?? 1)),
  );
  return `${dia.replace(".", "")} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}
