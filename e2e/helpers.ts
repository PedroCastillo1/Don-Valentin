import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Page } from "@playwright/test";

export const CLAVE = "E2e-clave-segura-1";
const require = createRequire(import.meta.url);
const axeSrc = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

export async function ingresar(page: Page, usuario: string) {
  await page.goto("/admin/ingresar");
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/admin");
}

/** Ejecuta axe-core (WCAG 2.x A y AA) y devuelve las violaciones. */
export async function axe(page: Page) {
  await page.evaluate(axeSrc);
  return page.evaluate(async () => {
    // @ts-expect-error axe lo inyecta el script
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return r.violations.map((v: { id: string; impact: string; nodes: { target: string[] }[] }) => ({
      id: v.id,
      impact: v.impact,
      nodos: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
  });
}

export const manana = (): string => {
  const d = new Date(Date.now() - 3 * 3600_000 + 24 * 3600_000);
  return d.toISOString().slice(0, 10);
};
