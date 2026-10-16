import { describe, expect, it } from "vitest";
import { estadoDelLocal } from "./horario.ts";

// Argentina es UTC-3: 15:00Z = 12:00 local.
describe("estadoDelLocal", () => {
  it("abre a las 12:00", () => {
    expect(estadoDelLocal(new Date("2026-10-20T14:59:00Z")).abierto).toBe(false);
    expect(estadoDelLocal(new Date("2026-10-20T15:00:00Z")).abierto).toBe(true);
  });
  it("sigue abierto después de medianoche y cierra a las 02:00", () => {
    expect(estadoDelLocal(new Date("2026-10-21T04:30:00Z")).abierto).toBe(true); // 01:30
    expect(estadoDelLocal(new Date("2026-10-21T05:00:00Z")).abierto).toBe(false); // 02:00
  });
  it("informa el próximo cambio", () => {
    expect(estadoDelLocal(new Date("2026-10-20T18:00:00Z")).texto).toContain("02:00");
    expect(estadoDelLocal(new Date("2026-10-20T10:00:00Z")).texto).toContain("12:00");
  });
});
