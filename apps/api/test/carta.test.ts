import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PARRILLA_LIBRE, SALSAS } from "@dv/shared";

describe("datos de la carta", () => {
  const carta = JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../db/data/carta.json"), "utf8"));
  it("la parrilla libre y las salsas de @dv/shared coinciden con carta.json", () => {
    expect(PARRILLA_LIBRE).toEqual(carta.parrillaLibre);
    expect(SALSAS).toEqual(carta.salsas);
  });
  it("todos los productos tienen sector y al menos una variante", () => {
    for (const p of carta.productos) {
      expect(["parrilla", "cocina", "barra"]).toContain(p.sector);
      expect(p.variantes.length).toBeGreaterThan(0);
    }
    expect(carta.productos.length).toBe(126);
  });
});
