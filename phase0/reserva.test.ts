import { describe, expect, it } from "vitest";
import { validarReserva } from "./reserva";

describe("validarReserva", () => {
  it("acepta cuando hay lugar", () => expect(validarReserva(4, 10)).toEqual({ ok: true }));
  it("rechaza cero personas", () => expect(validarReserva(0, 10).ok).toBe(false));
  it("rechaza decimales", () => expect(validarReserva(2.5, 10).ok).toBe(false));
  it("rechaza si supera la capacidad", () => expect(validarReserva(11, 10).ok).toBe(false));
});
