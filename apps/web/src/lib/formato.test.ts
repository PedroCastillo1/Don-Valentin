import { describe, expect, it } from "vitest";
import { coincideBusqueda, normalizarBusqueda, puntajeBusqueda } from "./formato.ts";

describe("búsqueda de productos en carta, mozo y QR", () => {
  it("encuentra por cualquier palabra del nombre aunque no esté al inicio", () => {
    expect(coincideBusqueda("Bife de chorizo", "chorizo")).toBe(true);
    expect(coincideBusqueda("Sándwich de milanesa con lechuga y tomate", "milanesa")).toBe(true);
    expect(coincideBusqueda("Sándwich de bondiola, matambre o vacío", "matambre")).toBe(true);
    expect(coincideBusqueda("Milanesa napolitana", "napo")).toBe(true);
  });

  it("ignora tildes, diéresis y mayúsculas", () => {
    expect(coincideBusqueda("Vacío", "vacio")).toBe(true);
    expect(coincideBusqueda("Chinchulín", "chinchulin")).toBe(true);
    expect(coincideBusqueda("Sándwich de milanesa", "sandwich")).toBe(true);
    expect(coincideBusqueda("Rúcula", "rucula")).toBe(true);
    expect(coincideBusqueda("López", "lopez")).toBe(true);
    expect(coincideBusqueda("Tiramisú", "tiramisu")).toBe(true);
  });

  it("permite combinar palabras en distinto orden y con la categoría", () => {
    expect(coincideBusqueda("Calabresa Pizzas Pizzas y pastas", "pizza calabresa")).toBe(true);
    expect(coincideBusqueda("Sándwich de milanesa con lechuga y tomate", "milanesa sandwich")).toBe(true);
    expect(coincideBusqueda("López Vinos tintos Bebidas", "vino lopez")).toBe(true);
  });

  it("reconoce variantes ortográficas habituales y fracciones", () => {
    expect(normalizarBusqueda("Mozzarella")).toContain("muzzarella");
    expect(coincideBusqueda("Mozzarella Pizzas", "muzza")).toBe(true);
    expect(coincideBusqueda("Anchoa con muzzarela", "mozzarella")).toBe(true);
    expect(coincideBusqueda("¼ de pollo", "1/4 pollo")).toBe(true);
    expect(coincideBusqueda("¼ de pollo", "cuarto pollo")).toBe(true);
    expect(coincideBusqueda("Gaseosa 1 ½", "1/2")).toBe(true);
  });

  it("prioriza coincidencias en el nombre del plato y no mezcla pastas al buscar pizza", () => {
    const enNombre = puntajeBusqueda("Milanesa napolitana", "Porciones con guarnición", "milanesa");
    const enMedio = puntajeBusqueda("Sándwich de milanesa", "Sándwiches", "milanesa");
    const pizzaReal = puntajeBusqueda("Calabresa", "Pizzas", "pizza");
    const matambrePizza = puntajeBusqueda("Matambre a la pizza", "Porciones con guarnición", "pizza");
    const pastaNoEsPizza = puntajeBusqueda("Agñolotis de ricota y jamón", "Pastas caseras", "pizza");
    expect(enNombre).toBeGreaterThan(enMedio);
    expect(pizzaReal).toBeGreaterThan(matambrePizza);
    expect(pastaNoEsPizza).toBe(0);
  });
});
