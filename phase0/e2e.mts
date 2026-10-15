import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

const root = join(process.cwd(), "phase0/site");
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
};
const server = createServer(async (req, res) => {
  try {
    const p = req.url === "/" ? "/index.html" : (req.url ?? "/");
    const body = await readFile(join(root, p));
    res.writeHead(200, { "content-type": mime[extname(p)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("no");
  }
});
await new Promise<void>((r) => server.listen(4173, r));

const out: Record<string, unknown> = {};
const browser = await chromium.launch();
const axeSrc = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

for (const [name, vp, rm] of [
  ["desktop", { width: 1440, height: 900 }, "no-preference"],
  ["mobile", { width: 390, height: 844 }, "no-preference"],
  ["reduced", { width: 1440, height: 900 }, "reduce"],
] as const) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: rm });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:4173/");
  await page.waitForTimeout(80);
  const t0 = await page.evaluate(() => ({
    op: getComputedStyle(document.querySelector("#titulo")!).opacity,
    w: getComputedStyle(document.querySelector("#linea")!).width,
  }));
  await page.screenshot({ path: `phase0/out/${name}-inicio.png` });
  await page.waitForTimeout(1700);
  const t1 = await page.evaluate(() => ({
    op: getComputedStyle(document.querySelector("#titulo")!).opacity,
    w: getComputedStyle(document.querySelector("#linea")!).width,
  }));
  await page.screenshot({ path: `phase0/out/${name}-fin.png` });
  await page.evaluate(axeSrc);
  type AxeResult = { violations: { id: string; impact: string }[] };
  const axe = await page.evaluate(async () => {
    const w = window as unknown as { axe: { run: (c: Document, o: object) => Promise<AxeResult> } };
    const r = await w.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag22aa"] });
    return r.violations.map((v) => `${v.id}:${v.impact}`);
  });
  out[name] = {
    gsap: await page.evaluate(() => (window as unknown as { __gsap: string }).__gsap),
    inicio: t0,
    fin: t1,
    consoleErrors: errors,
    axeViolations: axe,
  };
  await ctx.close();
}
await browser.close();
server.close();
writeFileSync("phase0/out/e2e.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
