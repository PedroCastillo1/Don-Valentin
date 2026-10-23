import { expect, test } from "@playwright/test";
import { ingresar, manana } from "./helpers.ts";

/** Hito 3 en el navegador: buscar, modificar, cancelar y reactivar una reserva con confirmación (RF-R4) y ver el salón por franja (RF-R3). */
test("Hito 3: buscar, modificar y cancelar una reserva; el salón muestra cada mesa por franja", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "un solo ingreso al panel por corrida (límite de intentos)");
  await ingresar(page, "encargado");
  await page.goto("/admin/reservas");
  await page.getByLabel("A nombre de").fill("Familia Quiroga Hito Tres");
  await page.getByLabel("Teléfono", { exact: true }).fill("1144448888");
  await page.getByLabel("Personas").fill("2");
  await page.getByLabel("Fecha", { exact: true }).fill(manana());
  await page.getByLabel("Horario").selectOption({ index: 5 });
  await page.getByRole("button", { name: "Guardar reserva" }).click();
  await page.getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(page.getByText(/Reserva guardada/)).toBeVisible();

  // Buscar en todas las fechas, sin acentos ni mayúsculas, y abrir con el botón Modificar de la fila
  await page.getByLabel("Buscar en todas las fechas").fill("quiroga");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("button", { name: /Modificar reserva de Familia Quiroga Hito Tres/ }).click();
  const detalle = page.locator(".detalle");
  await expect(detalle).toContainText("Confirmada");

  // Modificar con confirmación: pasa a 5 personas (la mesa se reasigna si hace falta)
  await detalle.getByRole("button", { name: "Modificar" }).click();
  await detalle.getByRole("spinbutton", { name: "Personas" }).fill("5");
  await detalle.getByRole("button", { name: "Guardar cambios" }).click();
  await detalle.getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(detalle.getByText("Cambios guardados.")).toBeVisible();
  await expect(detalle.locator(".datos")).toContainText("5");

  // Cancelar con confirmación: libera la mesa, y permite volver a confirmada
  await detalle.getByRole("button", { name: "Cancelar reserva" }).click();
  await detalle.getByRole("button", { name: "Sí, cancelar" }).click();
  await expect(detalle.getByText("Reserva cancelada. La mesa quedó libre.")).toBeVisible();
  await expect(detalle).toContainText("Cancelada");
  await expect(detalle.getByRole("button", { name: "Modificar" })).toHaveCount(0);
  await expect(detalle.getByRole("button", { name: "Volver a confirmada" })).toBeVisible();

  // Estado del salón: 30 mesas, cada una libre, reservada u ocupada, con resumen de la franja
  await page.getByRole("link", { name: "Estado del salón" }).click();
  await expect(page.getByRole("heading", { name: "Estado del salón" })).toBeVisible();
  await expect(page.locator(".mapa--salon button.mesa")).toHaveCount(30);
  await expect(page.getByRole("group", { name: "Franja horaria" }).getByRole("button")).toHaveCount(7);
  await page.locator(".mapa--salon button.mesa").first().click();
  await expect(page.getByRole("heading", { name: /^Mesa 1 · (Libre|Reservada|Ocupada)$/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
