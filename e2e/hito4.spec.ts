import { expect, test } from "@playwright/test";
import { axe, ingresar } from "./helpers.ts";

/**
 * Hito 4 en el navegador: el comensal pide desde el QR con su celular (RF-Q1/Q2), el pedido llega al panel de
 * parrilla en menos de 5 segundos, pasa a «en preparación» y «listo» con confirmación, puede volver atrás a un
 * estado anterior, y luego se entrega (RF-Q3/Q4).
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

  // El comensal, en su celular: busca por palabra intermedia/sin tilde y puede ocultar/mostrar la lista del pedido
  const cel = await (
    await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  ).newPage();
  await cel.goto(url);
  await expect(cel.getByRole("heading", { level: 1, name: "Mesa 27" })).toBeVisible();
  await cel.getByPlaceholder("Buscar un plato o una bebida").fill("chorizo");
  await expect(cel.locator(".carta__nombre", { hasText: "Bife de chorizo" }).first()).toBeVisible();
  await cel.getByPlaceholder("Buscar un plato o una bebida").fill("molleja");
  await cel.locator(".carta__agregar button").first().click();
  await cel.getByRole("button", { name: "Ocultar lista" }).click();
  await expect(cel.locator("#carrito-detalle")).toBeHidden();
  await cel.getByRole("button", { name: /Ver lista/ }).click();
  await expect(cel.locator("#carrito-detalle")).toBeVisible();
  await cel.getByLabel(/Aclaración para Molleja/).fill("bien cocida");
  expect(await axe(cel), "accesibilidad del pedido en el celular").toEqual([]);
  await cel.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(cel.getByText(/Pedido enviado/)).toBeVisible();
  const enviado = Date.now();
  expect(await cel.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);

  // Llega a la parrilla en menos de 5 segundos; cada cambio pide confirmación
  await page.goto("/admin/sectores");
  await page.getByRole("button", { name: "Parrilla" }).click();
  const ticket = page.locator(".ticket-s", { hasText: "Mesa 27" }).filter({ hasText: "bien cocida" });
  await expect(ticket).toBeVisible({ timeout: 5_000 });
  expect(Date.now() - enviado).toBeLessThan(5_000);
  await ticket.getByRole("button", { name: /^Empezar/ }).click();
  await ticket.getByRole("button", { name: "Sí, confirmar" }).click();
  const enPrepTicket = page
    .locator(".cocina__col", { hasText: "En preparación" })
    .locator(".ticket-s", { hasText: "bien cocida" });
  await expect(enPrepTicket).toBeVisible();
  await enPrepTicket.getByRole("button", { name: /^Listo/ }).click();
  await enPrepTicket.getByRole("button", { name: "Sí, confirmar" }).click();

  // Un plato listo puede volver atrás a preparación y volver a listo con confirmación
  const listoTicket = page
    .locator(".cocina__col", { hasText: "Listos para entregar" })
    .locator(".ticket-s", { hasText: "bien cocida" });
  await expect(listoTicket).toBeVisible();
  await listoTicket.getByRole("button", { name: /A preparación/ }).click();
  await listoTicket.getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(enPrepTicket).toBeVisible();
  await enPrepTicket.getByRole("button", { name: /^Listo/ }).click();
  await enPrepTicket.getByRole("button", { name: "Sí, confirmar" }).click();

  // En Pedidos se puede filtrar por mesa y gestionar; en Pedido del mozo buscar por palabra intermedia y sumar/restar de a 1
  await page.goto("/admin/pedidos");
  await expect(page.getByRole("region", { name: "Filtrar y buscar mesas" })).toBeVisible();

  // El comensal ve el estado y el mozo lo entrega con confirmación
  await expect(cel.locator(".seguimiento")).toContainText("Listo, ya viene", { timeout: 12_000 });
  await page.goto("/admin/mozo?mesa=27");
  await page.getByLabel("Buscar en la carta").fill("chorizo");
  await page
    .getByRole("button", { name: /Agregar Bife de chorizo/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Sumar uno de Bife de chorizo/ }).click();
  await expect(page.getByRole("list", { name: "Pedido" })).toContainText("2 ×");
  await page.getByRole("button", { name: /Restar uno de Bife de chorizo/ }).click();
  await expect(page.getByRole("list", { name: "Pedido" })).toContainText("1 ×");
  const entregarTicket = page.locator(".ticket-s", { hasText: "bien cocida" });
  await entregarTicket.getByRole("button", { name: /^Entregado/ }).click();
  await entregarTicket.getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(cel.locator(".seguimiento")).toContainText("Entregado", { timeout: 12_000 });
});
