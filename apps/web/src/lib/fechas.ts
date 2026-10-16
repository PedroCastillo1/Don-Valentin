export const sumarDias = (iso: string, n: number): string => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
};

export const diaLargo = (iso: string): string => {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, d ?? 1));
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    f,
  );
};

/** Fecha de hoy en Argentina (UTC-3) como aaaa-mm-dd. */
export const hoyAr = (ahora: Date = new Date()): string =>
  new Date(ahora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

export const ORIGEN: Record<string, string> = {
  web: "Web",
  telefono: "Teléfono",
  presencial: "En persona",
  whatsapp: "WhatsApp",
};
