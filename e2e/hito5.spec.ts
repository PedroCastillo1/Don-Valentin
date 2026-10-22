import { expect, test } from "@playwright/test";
import { PAGINAS_PUBLICAS } from "../packages/shared/src/paginas.ts";

/** Hito 5 (RF-W3, SEO técnico y local): metadatos por página, indexación, sitemap, robots y datos estructurados. */
test.describe("Hito 5: SEO y medición", () => {
  test("cada página pública trae su título, descripción y canónica ya en el HTML", async ({ request }) => {
    for (const [ruta, p] of Object.entries(PAGINAS_PUBLICAS)) {
      const r = await request.get(ruta);
      expect(r.status(), ruta).toBe(200);
      const html = await r.text();
      expect(html, ruta).toContain(`<title>${p.titulo}</title>`);
      expect(html, ruta).toContain(p.descripcion);
      expect(html, ruta).toMatch(new RegExp(`<link rel="canonical" href="https://[^"]+${ruta === "/" ? "/" : ruta}"`));
    }
  });

  test("el título cambia al navegar y el panel y la mesa del QR no se indexan", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /carta/i }).first().click();
    await expect(page).toHaveTitle("Carta y precios · Don Valentín");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await page.goto("/admin/ingresar");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await page.goto(`/m/${"0".repeat(32)}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  test("una ruta inexistente responde 404", async ({ request }) => {
    expect((await request.get("/esta-pagina-no-existe")).status()).toBe(404);
    expect((await request.get("/admin")).status()).toBe(200);
  });

  test("sitemap, robots, datos estructurados del restaurante e imagen para compartir", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const ruta of Object.keys(PAGINAS_PUBLICAS)) expect(sitemap).toContain(`${ruta === "/" ? "/" : ruta}</loc>`);
    expect(sitemap).not.toContain("/admin");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Sitemap: https:\/\/.+\/sitemap\.xml/);
    const html = await (await request.get("/")).text();
    const json = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)![1]!);
    expect(json["@type"]).toBe("Restaurant");
    expect(json.address.streetAddress).toBe("Av. Pres. Arturo Umberto Illia 3873");
    expect(json.openingHoursSpecification[0].opens).toBe("12:00");
    expect(json.priceRange).toBeUndefined(); // no confirmado por el local: no se publica
    const img = await request.get("/media/compartir.jpg");
    expect(img.status()).toBe(200);
    expect(html).toContain('property="og:image"');
  });

  test("sin GA4 configurado no aparece el aviso ni se carga Google", async ({ page }) => {
    const externos: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1")) externos.push(r.url());
    });
    await page.goto("/");
    await page.waitForTimeout(1500);
    await expect(page.getByRole("region", { name: "Aviso de analítica" })).toHaveCount(0);
    expect(externos.filter((u) => /google/.test(u))).toEqual([]);
  });
});
