export interface MesaCandidata {
  id: number;
  numero: number;
  capacidad: number;
}

/** RF-R2: asigna la mesa más ajustada a la capacidad; a igual capacidad, la de menor número. */
export function elegirMesa<T extends MesaCandidata>(libres: readonly T[], personas: number): T | undefined {
  return libres
    .filter((m) => m.capacidad >= personas)
    .sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero)[0];
}

export type EstadoFranja = "disponible" | "completa" | "sin_mesa" | "cerrada";

export function estadoDeFranja(i: {
  personas: number;
  aforoRestante: number;
  hayMesaParaGrupo: boolean;
  yaEmpezo: boolean;
}): EstadoFranja {
  if (i.yaEmpezo) return "cerrada";
  if (i.aforoRestante < i.personas) return "completa";
  if (!i.hayMesaParaGrupo) return "sin_mesa";
  return "disponible";
}
