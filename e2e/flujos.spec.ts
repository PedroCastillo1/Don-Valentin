import { expect, test } from "@playwright/test";
import { axe, ingresar } from "./helpers.ts";

test.describe("sitio público", () => {
  test("el inicio muestra el hero, el estado del local y no tiene errores de consola", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    page.on("pageerror", (e) => errores.push(String(e)));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("La parrilla de siempre");
    await expect(page.getByText(/Abierto ahora|Cerrado/).first()).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Don Valentín, parrilla/ }).getByRole("link", { name: "Reservar mesa" }),
    ).toBeVisible();
    expect(errores.filter((e) => !e.includes("401"))).toEqual([]);
  });

  test("el hero está limpio: sin botón de saltar, sin pasos ni rieles, solo una pausa discreta", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.getByRole("button", { name: /Saltar/i })).toHaveCount(0);
    await expect(page.locator("[data-parada], .hero__pasos, .hero__saltar")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: /Pasos/i })).toHaveCount(0);
    await expect(page.locator(".hero__v--a")).toHaveAttribute("src", /hero-a/);
    await expect
      .poll(() => page.locator(".hero__v--a").evaluate((v: HTMLVideoElement) => v.currentTime))
      .toBeGreaterThan(0);
    // pausa accesible (WCAG 2.2.2): detiene los videos y se puede reanudar
    const pausa = page.getByRole("button", { name: "Pausar los videos de la portada" });
    await expect(pausa).toBeVisible();
    await pausa.click();
    await expect(page.getByRole("button", { name: "Reanudar los videos de la portada" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await page.locator(".hero__v--a").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.getByRole("button", { name: "Reanudar los videos de la portada" }).click();
    await expect.poll(() => page.locator(".hero__v--a").evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  });

  test("el scroll del hero es nativo: sin pin, un solo gesto avanza y vuelve, y el menú cambia al salir", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(1500);
    await expect(page.locator("html")).toHaveClass(/nav-claro/);
    // nada retiene el scroll: no hay pin-spacer ni elementos fijados por GSAP
    expect(await page.locator(".pin-spacer").count()).toBe(0);
    const alto = await page.evaluate(() => window.innerHeight);
    if (isMobile) {
      await page.keyboard.press("PageDown");
    } else {
      await page.mouse.move(600, 400);
      await page.mouse.wheel(0, 900);
    }
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 2500 }).toBeGreaterThan(alto * 0.6);
    // un gesto fuerte hacia abajo supera la portada (3 escenas): no hay que repetirlo
    if (!isMobile) {
      await page.mouse.wheel(0, 2400);
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 2500 }).toBeGreaterThan(alto * 2.5);
    }
    await page.evaluate(() => window.scrollTo(0, 3.1 * window.innerHeight));
    await expect(page.locator("html")).not.toHaveClass(/nav-claro/, { timeout: 3000 });
    // la persiana de la tercera escena queda completa y se lee el texto
    await page.evaluate(() => document.querySelector(".asador")!.scrollIntoView());
    await expect(page.getByRole("heading", { name: /Costillares a la estaca/ })).toBeVisible();
    await page.waitForTimeout(1200);
    const clip = await page
      .locator(".tira")
      .last()
      .evaluate((el) => getComputedStyle(el).clipPath);
    expect(clip).toMatch(/inset\(0(px|%)?( 0(px|%)?){0,3}\)|none/);
    // segunda escena: el video se carga y reproduce cuando entra
    await page.evaluate(() => document.querySelector(".portada__fuego")!.scrollIntoView());
    await expect(page.locator(".portada__fuego-v")).toHaveAttribute("src", /hero-b/);
    // de vuelta arriba con un solo gesto
    if (!isMobile) {
      await page.mouse.wheel(0, -9000);
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBe(0);
      await expect(page.locator("html")).toHaveClass(/nav-claro/);
    }
  });

  test("el inicio cuenta del fuego a la mesa, muestra el precio con su contexto y el mapa", async ({ page }) => {
    await page.goto("/");
    await page.locator(".precios").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: /Parrilla libre desde \$ 41\.000 por persona/ })).toBeVisible();
    await expect(page.getByText("Lunes a viernes al mediodía")).toBeVisible();
    await expect(page.getByText("$ 48.500")).toBeVisible();
    await page.locator(".ubic").scrollIntoViewIfNeeded();
    await expect(page.getByRole("img", { name: /Mapa de los alrededores de Don Valentín/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cómo llegar" }).last()).toBeVisible();
  });

  test("cómo llegar: mapa propio, referencias con distancia, y accesos a Google Maps", async ({ page }) => {
    await page.goto("/como-llegar");
    await expect(page.getByRole("img", { name: /Mapa de los alrededores de Don Valentín/ })).toBeVisible();
    await expect(page.getByText("Av. Illia 3873")).toBeVisible();
    const ruta = page.getByRole("link", { name: "Cómo llegar en Google Maps" });
    await expect(ruta).toHaveAttribute("href", /google\.com\/maps\/dir\/.*destination=-34\.5319/);
    await expect(page.getByRole("link", { name: "Ver en Google Maps" })).toHaveAttribute(
      "href",
      /google\.com\/maps\/search/,
    );
    await page.getByRole("button", { name: /Estación General Lemos/ }).click();
    await expect(page.getByRole("button", { name: /Estación General Lemos/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("tab", { name: "En colectivo" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Lemos / Ruta 8");
    await expect(page.getByRole("link", { name: /colaboradores de OpenStreetMap/ })).toBeVisible();
  });

  test("con movimiento reducido el hero queda legible, sin video ni pin", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: "http://127.0.0.1:3100" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator(".hero__v--a")).not.toHaveAttribute("src", /.+/);
    await expect(page.locator(".portada__fuego-v")).not.toHaveAttribute("src", /.+/);
    expect(await page.locator(".pin-spacer").count()).toBe(0);
    await expect(page.getByRole("button", { name: /Pausar|Reanudar/ })).toHaveCount(0);
    await expect(page.getByRole("img", { name: /asador del local/ })).toBeVisible();
    await ctx.close();
  });

  test("la carta muestra precios reales y filtra", async ({ page }) => {
    await page.goto("/carta");
    await expect(page.getByText("Asado", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("$ 14.700").first()).toBeVisible();
    await page.getByPlaceholder("Buscar en la carta").fill("vacío");
    await expect(page.getByText("Vacío", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Asado", { exact: true })).toHaveCount(0);
  });

  test("parrilla libre usa los precios de la carta", async ({ page }) => {
    await page.goto("/parrilla-libre");
    await expect(page.getByText("$ 41.000").first()).toBeVisible();
    await expect(page.getByText("$ 48.500").first()).toBeVisible();
  });

  test("reservar: sin aviso no se puede enviar; con aviso se confirma y aparece en el panel", async ({ page }) => {
    await page.goto("/reservar");
    await page.getByLabel("Nombre", { exact: true }).fill("Ana Prueba");
    await page.getByLabel("Teléfono", { exact: true }).fill("11 5555 7777");
    await page.getByLabel("Personas", { exact: true }).fill("4");
    await page.locator("label.franja", { hasText: "14:00 – 16:00" }).click();
    const enviar = page.getByRole("button", { name: "Reservar mesa" });
    await expect(enviar).toBeDisabled();
    await page.getByLabel(/Acepto que Don Valentín use mi nombre/).check();
    await enviar.click();
    await expect(page.getByRole("heading", { name: /tu mesa está reservada/ })).toBeVisible();
    const codigo = (await page.locator(".ticket__codigo").textContent())!.trim();
    expect(codigo).toMatch(/^[A-Z0-9]{8}$/);
    await expect(page.getByText(/mesa \d+/i)).toHaveCount(0); // la mesa asignada es interna

    await ingresar(page, "encargado");
    await page.getByRole("link", { name: "Reservas", exact: true }).click();
    // entre las 00:00 y las 02:00 el día de servicio todavía es el anterior: avanzamos hasta la fecha reservada
    for (let i = 0; i < 3 && !(await page.getByText(codigo).isVisible()); i++) {
      await page.getByRole("button", { name: "Día siguiente" }).click();
      await page.waitForTimeout(400);
    }
    await expect(page.getByText(codigo)).toBeVisible();
  });

  test("un QR inventado no abre ninguna mesa", async ({ page }) => {
    await page.goto("/m/00000000000000000000000000000000");
    await expect(page.getByText(/no corresponde a ninguna mesa/)).toBeVisible();
  });

  test("accesibilidad (axe, WCAG 2.2 AA) en las páginas públicas", async ({ page }) => {
    for (const ruta of ["/", "/carta", "/parrilla-libre", "/como-llegar", "/reservar", "/admin/ingresar"]) {
      await page.goto(ruta);
      await page.waitForTimeout(1800);
      expect(await axe(page), `violaciones en ${ruta}`).toEqual([]);
    }
  });
});

test.describe("administración", () => {
  test("el encargado opera mesas: QR real y sesión única", async ({ page }, info) => {
    const n = info.project.name === "desktop" ? 7 : 8; // cada proyecto usa su mesa: la base se comparte entre ambos
    await ingresar(page, "encargado");
    await page.getByRole("link", { name: "Mesas y QR" }).click();
    const fila = page.locator("tr", { has: page.locator("td.hora", { hasText: new RegExp(`^${n}$`) }) });
    await fila.getByRole("button", { name: "Abrir sesión" }).click();
    await expect(page.getByText(`Mesa ${n}: sesión abierta.`)).toBeVisible();
    await fila.getByRole("button", { name: "Ver QR" }).click();
    const img = page.getByRole("img", { name: `Código QR de la mesa ${n}` });
    await expect(img).toBeVisible();
    expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();

    // El QR de esa mesa lleva a la mesa correcta.
    const { codigos } = await (await page.request.get("/api/admin/qr")).json();
    const c7 = codigos.find((c: { numero: number }) => c.numero === n);
    await page.goto(new URL(c7.url).pathname);
    await expect(page.getByRole("heading", { level: 1, name: `Mesa ${n}` })).toBeVisible();
  });

  test("módulos futuros muestran hito y fecha exactos", async ({ page }) => {
    await ingresar(page, "admin");
    const riel = page.locator("#contenido");
    await expect(riel.getByText("Programado para el Hito 3 — 30/10/2026").first()).toBeVisible();
    await expect(riel.getByText("Programado para el Hito 4 — 06/11/2026").first()).toBeVisible();
    await expect(riel.getByText("Programado para el Hito 5 — 13/11/2026")).toBeVisible();
  });

  test("el mozo no ve ni alcanza la administración (RNF-3) y el intento queda auditado", async ({ page }) => {
    await ingresar(page, "mozo");
    await expect(page.getByRole("link", { name: "Parámetros" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Usuarios y roles" })).toHaveCount(0);
    const r = await page.request.get("/api/admin/parametros");
    expect(r.status()).toBe(403);
    await page.getByRole("link", { name: "Mesas y QR" }).click();
    await expect(page.getByRole("button", { name: "Agregar" })).toHaveCount(0);
    await page.getByRole("button", { name: "Salir" }).click();

    await ingresar(page, "admin");
    await page.getByRole("link", { name: "Usuarios y roles" }).click();
    await expect(page.getByText(/acceso:parametros:ver/).first()).toBeVisible();
  });

  test("parámetros: el Encargado edita y valida; Administración no puede validar", async ({ page }, info) => {
    await ingresar(page, "encargado");
    await page.getByRole("link", { name: "Parámetros" }).click();
    await expect(page.getByRole("heading", { name: "Aforo por franja" })).toBeVisible();
    const aforo = page.getByLabel("Aforo 12:00 a 14:00");
    await aforo.fill(info.project.name === "desktop" ? "90" : "85");
    await aforo.blur();
    await expect(page.getByText("Aforo guardado.")).toBeVisible();
    const validar = page.getByRole("button", { name: "Validar" }).first();
    await validar.click();
    await expect(page.getByText("Marcado como validado.")).toBeVisible();
    await page.getByRole("button", { name: "Salir" }).click();

    await ingresar(page, "admin");
    await page.getByRole("link", { name: "Parámetros" }).click();
    await expect(page.getByRole("button", { name: "Validar" })).toHaveCount(0);
  });

  test("accesibilidad (axe) en las pantallas del administrador", async ({ page }) => {
    await ingresar(page, "encargado");
    for (const ruta of ["/admin", "/admin/reservas", "/admin/mesas", "/admin/parametros", "/admin/usuarios"]) {
      await page.goto(ruta);
      await page.waitForTimeout(1200);
      expect(await axe(page), `violaciones en ${ruta}`).toEqual([]);
    }
  });
});
