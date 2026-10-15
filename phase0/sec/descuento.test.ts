import { expect, it } from "vitest";
import { calcularDescuento } from "./descuento";
it.each([
  [12, true, "martes", 15],
  [12, false, "martes", 10],
  [6, true, "martes", 8],
  [6, false, "martes", 5],
  [2, true, "martes", 0],
  [2, false, "lunes", 5],
  [12, true, "lunes", 20],
])("%i %s %s => %i", (p, c, d, e) => {
  expect(calcularDescuento(p, c, d)).toBe(e);
});
