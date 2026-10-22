import { expect, test } from "@playwright/test";
import { axe, ingresar } from "./helpers.ts";

/**
 * Hito 4 en el navegador: el comensal pide desde el QR con su celular (RF-Q1/Q2), el pedido llega al panel de
 * parrilla en menos de 5 segundos, pasa a «en preparación» y «listo» (RF-Q3) y se entrega (RF-Q4).
 * Un solo ingreso al panel (el Encargado opera todos los puestos) para no chocar con el límite de intentos.
 */
test("Hito 4: pedido desde el QR, panel de parrilla y entrega", async ({ page, browser }, info) => {
  test.skip(info.project.name !== "desktop", "un solo ingreso al panel por corrida");
  await ingresar(page, "encargado");
  const csrf = (await (await page.request.get("/api/auth/me")).json()).csrfToken as string;
  const mesas = (await (await page.request.get("/api/admin/mesas")).json()).mesas as {
    id: number;
    numero: number;
    sesionAbierta: boolean;
  }[];
  const mesa = mesas.find((m) => m.numero === 27)!;
  if (!mesa.sesionAbierta)
    expect(
      (await page.request.post(`/api/admin/mesas/${mesa.id}/sesion`, { headers: { "x-csrf-token": csrf } })).ok(),
    ).toBe(true);
  const { codigos } = await (await page.request.get("/api/admin/qr")).json();
  const url = new URL(codigos.find((c: { numero: number }) => c.numero === 27).url).pathname;

  // El comensal, en su celular
  const cel = await (
    await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  ).newPage();
  await cel.goto(url);
  await expect(cel.getByRole("heading", { level: 1, name: "Mesa 27" })).toBeVisible();
  await cel.getByPlaceholder("Buscar un plato o una bebida").fill("molleja");
  await cel.locator(".carta__agregar button").first().click();
  await cel.getByLabel(/Aclaración para Molleja/).fill("bien cocida");
  expect(await axe(cel), "accesibilidad del pedido en el celular").toEqual([]);
  await cel.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(cel.getByText(/Pedido enviado/)).toBeVisible();
  const enviado = Date.now();
  expect(await cel.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

  // Llega a la parrilla en menos de 5 segundos
  await page.goto("/admin/sectores");
  await page.getByRole("button", { name: "Parrilla" }).click();
  const ticket = page.locator(".ticket-s", { hasText: "Mesa 27" }).filter({ hasText: "bien cocida" });
  await expect(ticket).toBeVisible({ timeout: 5_000 });
  expect(Date.now() - enviado).toBeLessThan(5_000);
  await ticket.getByRole("button", { name: /^Empezar/ }).click();
  await expect(
    page.locator(".cocina__col", { hasText: "En preparación" }).locator(".ticket-s", { hasText: "bien cocida" }),
  ).toBeVisible();
  await page
    .locator(".ticket-s", { hasText: "bien cocida" })
    .getByRole("button", { name: /^Listo/ })
    .click();

  // El comensal ve el estado y el mozo lo entrega
  await expect(cel.locator(".seguimiento")).toContainText("Listo, ya viene", { timeout: 12_000 });
  await page.goto("/admin/mozo");
  await page
    .locator(".ticket-s", { hasText: "bien cocida" })
    .getByRole("button", { name: /^Entregado/ })
    .click();
  await expect(cel.locator(".seguimiento")).toContainText("Entregado", { timeout: 12_000 });
});
