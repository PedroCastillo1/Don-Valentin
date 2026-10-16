import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Precarga las fuentes latinas del primer cuadro (título del hero y texto) para que no cambien al llegar. */
function precargarFuentes(): Plugin {
  return {
    name: "dv-precargar-fuentes",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const fuentes = Object.keys(ctx.bundle ?? {}).filter((f) =>
          /(big-shoulders-display|instrument-sans)-latin-wght-normal-.*\.woff2$/.test(f),
        );
        const base = (ctx.server ? "/" : (ctx as { base?: string }).base) ?? "/";
        return {
          html,
          tags: fuentes.map((f) => ({
            tag: "link",
            attrs: { rel: "preload", as: "font", type: "font/woff2", href: `${base}${f}`, crossorigin: "" },
            injectTo: "head-prepend" as const,
          })),
        };
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), precargarFuentes()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:3000" } },
  build: { outDir: "dist", sourcemap: false, assetsInlineLimit: 0 },
});
