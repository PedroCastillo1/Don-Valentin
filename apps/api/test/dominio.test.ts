import { describe, expect, it } from "vitest";
import { elegirMesa, estadoDeFranja } from "../src/domain/disponibilidad.ts";
import { fechaServicioActual, inicioFranjaUtc, sumarDias } from "../src/domain/tiempo.ts";

describe("tiempo (hora argentina, UTC-3, sin horario de verano)", () => {
  it("la franja de las 12:00 arranca a las 15:00 UTC del mismo día", () => {
    expect(inicioFranjaUtc("2026-10-20", "12:00:00", "12:00").toISOString()).toBe("2026-10-20T15:00:00.000Z");
  });
  it("la franja de las 00:00 pertenece al día de servicio anterior y arranca a las 03:00 UTC del día siguiente", () => {
    expect(inicioFranjaUtc("2026-10-20", "00:00:00", "12:00").toISOString()).toBe("2026-10-21T03:00:00.000Z");
  });
  it("a la 01:30 todavía rige el día de servicio anterior; a las 05:00 el local está cerrado y rige el mismo día", () => {
    expect(fechaServicioActual(new Date("2026-10-21T04:30:00Z"), "12:00", "02:00")).toBe("2026-10-20");
    expect(fechaServicioActual(new Date("2026-10-21T08:00:00Z"), "12:00", "02:00")).toBe("2026-10-21");
    expect(fechaServicioActual(new Date("2026-10-20T16:00:00Z"), "12:00", "02:00")).toBe("2026-10-20");
  });
  it("sumarDias cruza fin de mes", () => {
    expect(sumarDias("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("elegirMesa: la más ajustada a la capacidad", () => {
  const mesas = [
    { id: 1, numero: 1, capacidad: 2 },
    { id: 2, numero: 2, capacidad: 4 },
    { id: 3, numero: 3, capacidad: 4 },
    { id: 4, numero: 4, capacidad: 8 },
  ];
  it("elige la mesa más chica que alcance, y a igual capacidad la de menor número", () => {
    expect(elegirMesa(mesas, 3)?.id).toBe(2);
    expect(elegirMesa(mesas, 2)?.id).toBe(1);
    expect(elegirMesa(mesas, 5)?.id).toBe(4);
  });
  it("devuelve undefined si ninguna mesa alcanza", () => {
    expect(elegirMesa(mesas, 9)).toBeUndefined();
    expect(elegirMesa([], 2)).toBeUndefined();
  });
});

describe("estadoDeFranja", () => {
  const base = { personas: 4, aforoRestante: 20, hayMesaParaGrupo: true, yaEmpezo: false };
  it("disponible cuando hay aforo y mesa", () => {
    expect(estadoDeFranja(base)).toBe("disponible");
  });
  it("completa cuando el aforo restante no alcanza (aunque haya mesa)", () => {
    expect(estadoDeFranja({ ...base, aforoRestante: 3 })).toBe("completa");
  });
  it("sin_mesa cuando hay aforo pero ninguna mesa libre alcanza para el grupo", () => {
    expect(estadoDeFranja({ ...base, hayMesaParaGrupo: false })).toBe("sin_mesa");
  });
  it("cerrada cuando la franja ya empezó", () => {
    expect(estadoDeFranja({ ...base, yaEmpezo: true })).toBe("cerrada");
  });
  it("el aforo exacto alcanza: 4 personas con 4 restantes es disponible", () => {
    expect(estadoDeFranja({ ...base, aforoRestante: 4 })).toBe("disponible");
  });
});
