import { expect, test } from "@playwright/test";
import { ingresar, manana } from "./helpers.ts";

/**
 * Revisión del 22/10: al crear una reserva con un nombre largo, la lista «Reservas del día»
 * se metía debajo del panel «Salón» y la página se desplazaba de costado.
 */
test("panel: una reserva con nombre largo no desborda Reservas del día ni el Salón", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "se recorren los anchos a mano; alcanza con una entrada al panel");
  await ingresar(page, "encargado");
  await page.goto("/admin/reservas");
  await page.getByLabel("A nombre de").fill("MaximilianoSebastiánRodríguezEtcheverryGoyena");
  await page.getByLabel("Teléfono", { exact: true }).fill("1155554444");
  await page.getByLabel("Personas").fill("2");
  await page.getByLabel("Fecha", { exact: true }).fill(manana());
  await page.getByLabel("Horario").selectOption({ index: 4 });
  await page.getByRole("button", { name: "Guardar reserva" }).click();
  await page.getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(page.getByText(/Reserva (creada|confirmada|guardada)/i).first()).toBeVisible();

  for (const ancho of [390, 820, 1024, 1180, 1280, 1440, 1920]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const ruta of ["/admin", "/admin/reservas"]) {
      await page.goto(ruta);
      await expect(page.getByRole("group", { name: "Día" }).getByRole("button", { name: "Hoy" })).toBeVisible();
      if (ruta === "/admin") await page.getByRole("button", { name: "Día siguiente" }).click();
      else await page.getByLabel("Ir a la fecha").fill(manana());
      await expect(page.getByRole("group", { name: "Día" }).getByRole("button", { name: "Mañana" })).toBeVisible();
      await expect(page.getByText("MaximilianoSebastián", { exact: false }).first()).toBeVisible();
      const r = await page.evaluate(() => {
        const fuera = [...document.querySelectorAll(".reservas li > *, .dos > section td")].filter((e) => {
          const cont = e.closest(".panel, .dos > section")!.getBoundingClientRect();
          const a = e.getBoundingClientRect();
          return a.width > 0 && (a.right > cont.right + 1 || a.left < cont.left - 1);
        }).length;
        const tablas = [...document.querySelectorAll(".tabla-wrap")].filter(
          (x) => x.scrollWidth > x.clientWidth,
        ).length;
        return { desborde: document.documentElement.scrollWidth - innerWidth, fuera, tablas };
      });
      expect(r, `${ruta} a ${ancho}px`).toEqual({ desborde: 0, fuera: 0, tablas: 0 });
    }
  }
});
