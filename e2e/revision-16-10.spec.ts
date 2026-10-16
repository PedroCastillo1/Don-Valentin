import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { axe, ingresar } from "./helpers.ts";

/**
 * Revisión del 16/10: una prueba por cada problema que marcó el equipo (capturas, mensajes y pedidos).
 * Si alguno vuelve a aparecer, esta prueba falla con el nombre del problema.
 */

async function recorrerHastaElPie(page: Page) {
  for (let i = 0; i < 80; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
    if (await page.evaluate(() => innerHeight + scrollY >= document.body.scrollHeight - 4)) break;
  }
  await page.waitForTimeout(600);
}

test.describe("revisión del 16/10", () => {
  test("color de marca: Rojo Bordeaux 6041 (#791f1f), sin el naranja ni el rosado anteriores", async ({ page }) => {
    for (const ruta of ["/", "/carta", "/parrilla-libre", "/reservar", "/como-llegar", "/admin/ingresar"]) {
      await page.goto(ruta);
      await recorrerHastaElPie(page);
      const r = await page.evaluate(() => {
        const brasa = getComputedStyle(document.documentElement).getPropertyValue("--brasa").trim();
        const viejos = ["rgb(232, 72, 26)", "rgb(232, 144, 138)", "rgb(255, 154, 107)"];
        const usados = [...document.querySelectorAll("body *")].filter((e) => {
          const s = getComputedStyle(e);
          return viejos.includes(s.color) || viejos.includes(s.backgroundColor) || viejos.includes(s.borderTopColor);
        });
        return { brasa, viejos: usados.length };
      });
      expect(r.brasa, ruta).toBe("#791f1f");
      expect(r.viejos, `elementos con el color viejo en ${ruta}`).toBe(0);
    }
  });

  test("títulos: ninguna línea se choca con la de abajo (interlineado mínimo 1)", async ({ page }) => {
    for (const ruta of ["/", "/carta", "/parrilla-libre", "/reservar", "/como-llegar"]) {
      await page.goto(ruta);
      await recorrerHastaElPie(page);
      const apretados = await page.evaluate(() =>
        [...document.querySelectorAll("h1,h2,h3,.rotulo__t,.hero__titulo")]
          .filter((e) => {
            const s = getComputedStyle(e);
            const lh = s.lineHeight === "normal" ? Infinity : parseFloat(s.lineHeight);
            return lh / parseFloat(s.fontSize) < 1;
          })
          .map((e) => e.textContent!.trim().slice(0, 30)),
      );
      expect(apretados, ruta).toEqual([]);
    }
  });

  test("hero: los rótulos chicos van en etiqueta de color, legibles sobre foto o video", async ({ page }) => {
    await page.goto("/");
    const rotulos = await page.evaluate(() =>
      [...document.querySelectorAll(".hero .rotulo__mono")].map((e) => {
        const s = getComputedStyle(e);
        return [s.backgroundColor, s.color];
      }),
    );
    expect(rotulos.length).toBeGreaterThanOrEqual(3);
    for (const [fondo, texto] of rotulos) {
      expect(fondo).toBe("rgb(121, 31, 31)");
      expect(texto).toBe("rgb(246, 241, 238)");
    }
  });

  test("tickets rectos en todo el sitio (hero, precios, reserva)", async ({ page }) => {
    for (const ruta of ["/", "/parrilla-libre", "/reservar"]) {
      await page.goto(ruta);
      await recorrerHastaElPie(page);
      const torcidos = await page.evaluate(() =>
        [...document.querySelectorAll(".hero__ticket, .comanda, .ticket, [class*='ticket']")]
          .filter((e) => {
            const s = getComputedStyle(e);
            const t = s.transform;
            const m = t && t !== "none" ? new DOMMatrix(t) : null;
            const ang = m ? Math.abs(Math.atan2(m.b, m.a) * (180 / Math.PI)) : 0;
            return ang > 0.1 || (s.rotate !== "none" && s.rotate !== "0deg");
          })
          .map((e) => e.className),
      );
      expect(torcidos, ruta).toEqual([]);
    }
  });

  test("del fuego a la mesa: vertical, sin videos chicos encima de las fotos", async ({ page }) => {
    await page.goto("/");
    await recorrerHastaElPie(page);
    expect(await page.locator(".rec__m--chico").count()).toBe(0);
    const tops = await page.locator(".rec__panel").evaluateAll((ps) => ps.map((p) => p.getBoundingClientRect().top));
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThan(tops[i - 1]);
  });

  test("precios: el monto grande no invade la lista de precios (iPad y computadora)", async ({ page }) => {
    for (const [w, h] of [
      [1024, 1366],
      [1180, 820],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await recorrerHastaElPie(page);
      const choca = await page.evaluate(() => {
        const a = document.querySelector(".precios__monto")!.getBoundingClientRect();
        const b = document.querySelector(".precios__lista")!.getBoundingClientRect();
        return !(a.right <= b.left || a.bottom <= b.top || b.right <= a.left || b.bottom <= a.top);
      });
      expect(choca, `${w}x${h}`).toBe(false);
    }
  });

  test("pie: «Instagram:» separado del usuario", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toContainText(/Instagram: \S/);
  });

  test("galería en celular: grilla quieta de dos columnas, sin desbordar", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await recorrerHastaElPie(page);
    const r = await page.evaluate(() => {
      const ms = [...document.querySelectorAll(".gal__m")].filter((m) => (m as HTMLElement).offsetParent);
      const xs = new Set(ms.map((m) => Math.round(m.getBoundingClientRect().left)));
      return { columnas: xs.size, desborde: document.documentElement.scrollWidth - innerWidth };
    });
    expect(r.columnas).toBeLessThanOrEqual(2);
    expect(r.desborde).toBe(0);
  });

  // Una sola entrada al panel (el servidor limita los ingresos por minuto) y solo en un proyecto: fija el ancho de celular.
  test("panel y QR: telón una sola vez, Mesas y QR en tarjetas, liberar mesa y carta del QR en celular", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "se fija el ancho a mano; alcanza con correrla una vez");
    await ingresar(page, "encargado");
    await page.waitForTimeout(1500);

    // El telón de la marca no se repite al cambiar de sección.
    await page.getByRole("link", { name: "Reservas", exact: true }).click();
    await page.waitForTimeout(150);
    expect(await page.locator(".telon").evaluate((t) => getComputedStyle(t).display)).toBe("none");

    // Mesas y QR en celular: tarjetas sin desborde; liberar la mesa deja el QR igual y la próxima cuenta en cero.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/mesas");
    await expect(page.locator(".tabla--tarjetas")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    const n = 12;
    const tarjeta = page.locator("tr", { has: page.locator("td.hora", { hasText: new RegExp(`^${n}$`) }) });
    const qrAntes = (await tarjeta.locator(".qr-codigo").textContent())!.trim();
    await tarjeta.getByRole("button", { name: "Abrir sesión" }).click();
    await expect(page.getByText(`Mesa ${n}: sesión abierta.`)).toBeVisible();
    await tarjeta.getByRole("button", { name: "Liberar mesa" }).click();
    await expect(page.getByText(`Mesa ${n} liberada`)).toBeVisible();
    await expect(tarjeta.locator(".qr-codigo")).toHaveText(qrAntes);
    await expect(tarjeta.getByRole("button", { name: "Abrir sesión" })).toBeVisible();

    // Carta que abre el QR en celular: nada se corta y ningún nombre queda en columna de letras.
    const { codigos } = await (await page.request.get("/api/admin/qr")).json();
    for (const ancho of [320, 390]) {
      await page.setViewportSize({ width: ancho, height: 800 });
      await page.goto(new URL(codigos[0].url).pathname);
      await expect(page.locator(".carta__fila").first()).toBeVisible();
      const r = await page.evaluate(() => ({
        desborde: document.documentElement.scrollWidth - innerWidth,
        angostos: [...document.querySelectorAll(".carta__nombre")].filter((x) => x.getBoundingClientRect().width < 80)
          .length,
      }));
      expect(r, `${ancho}px`).toEqual({ desborde: 0, angostos: 0 });
    }
  });
});

test.describe("modo oscuro", () => {
  test("el botón alterna claro y oscuro, lo recuerda y no deja textos ilegibles ni desbordes", async ({ page }) => {
    await page.goto("/carta");
    const boton = page.getByRole("button", { name: "Modo oscuro" });
    await expect(boton).toBeVisible();
    const inicial = await page.evaluate(() => document.documentElement.dataset.tema);
    await boton.click();
    const otro = inicial === "oscuro" ? "claro" : "oscuro";
    await expect(page.locator("html")).toHaveAttribute("data-tema", otro);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-tema", otro);
    if (otro === "claro") {
      await page.getByRole("button", { name: "Modo oscuro" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
    }
    for (const ruta of ["/", "/carta", "/parrilla-libre", "/reservar", "/como-llegar", "/admin/ingresar"]) {
      await page.goto(ruta);
      await expect(page.locator("html")).toHaveAttribute("data-tema", "oscuro");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), ruta).toBe(0);
      const v = (await axe(page)).filter((x) => x.id === "color-contrast");
      expect(v, ruta).toEqual([]);
    }
  });
});
