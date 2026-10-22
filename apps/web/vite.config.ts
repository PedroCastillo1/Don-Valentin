import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { LOCAL } from "../../packages/shared/src/dominio.ts";
import { PAGINAS_PUBLICAS } from "../../packages/shared/src/paginas.ts";
/** Ubicación del local según OpenStreetMap (la misma del mapa de «Cómo llegar»). */
const GEO = { lat: -34.5319148, lon: -58.7030733 };

/**
 * RF-W3 y SEO local: sitemap.xml, robots.txt con el sitemap, datos estructurados del restaurante (solo datos que el
 * sitio muestra), imagen para compartir y, si el local la cargó, la verificación de Search Console.
 */
/** La imagen de portada de cada página es su LCP: se pide junto con el HTML, sin esperar al JavaScript. */
function precarga(portada: (typeof PAGINAS_PUBLICAS)[string]["portada"]): string {
  if (!portada) return "";
  if ("poster" in portada) return `<link rel="preload" as="image" href="${portada.poster}" fetchpriority="high" />`;
  const n = portada.foto;
  return `<link rel="preload" as="image" imagesrcset="/media/foto-${n}-900.webp 900w, /media/foto-${n}-1600.webp 1600w" imagesizes="100vw" fetchpriority="high" />`;
}

function seoEstatico(env: Record<string, string>): Plugin {
  const sitio = (env.VITE_SITIO_URL || "https://don-valentin.vercel.app").replace(/\/$/, "");
  const restaurante = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: LOCAL.nombre,
    description: `${LOCAL.descriptor}. Parrilla familiar en ${LOCAL.localidad} desde ${LOCAL.desde}.`,
    url: `${sitio}/`,
    image: `${sitio}/media/compartir.jpg`,
    telephone: LOCAL.telefonos[0].tel,
    servesCuisine: "Parrilla",
    acceptsReservations: `${sitio}/reservar`,
    hasMenu: `${sitio}/carta`,
    foundingDate: String(LOCAL.desde),
    address: {
      "@type": "PostalAddress",
      streetAddress: LOCAL.direccion,
      addressLocality: LOCAL.localidad,
      addressRegion: LOCAL.provincia,
      addressCountry: "AR",
    },
    geo: { "@type": "GeoCoordinates", latitude: GEO.lat, longitude: GEO.lon },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: LOCAL.horario.apertura,
        closes: LOCAL.horario.cierre,
      },
    ],
    sameAs: [LOCAL.instagram],
  };
  return {
    name: "dv-seo-estatico",
    apply: "build",
    transformIndexHtml(html) {
      const tags = [
        { tag: "link", attrs: { rel: "canonical", href: `${sitio}/` } },
        { tag: "meta", attrs: { property: "og:type", content: "restaurant" } },
        { tag: "meta", attrs: { property: "og:locale", content: "es_AR" } },
        { tag: "meta", attrs: { property: "og:site_name", content: LOCAL.nombre } },
        { tag: "meta", attrs: { property: "og:title", content: "Don Valentín · Parrilla libre en San Miguel" } },
        {
          tag: "meta",
          attrs: {
            property: "og:description",
            content: "Parrilla familiar en San Miguel desde 1994. Parrilla libre en el salón. Reservá tu mesa.",
          },
        },
        { tag: "meta", attrs: { property: "og:url", content: `${sitio}/` } },
        { tag: "meta", attrs: { property: "og:image", content: `${sitio}/media/compartir.jpg` } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        {
          tag: "meta",
          attrs: { property: "og:image:alt", content: "La parrilla de Don Valentín con carnes, pollo y guarniciones" },
        },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        { tag: "script", attrs: { type: "application/ld+json" }, children: JSON.stringify(restaurante) },
      ];
      if (env.VITE_GSC_VERIFICACION)
        tags.push({ tag: "meta", attrs: { name: "google-site-verification", content: env.VITE_GSC_VERIFICACION } });
      return { html, tags: tags.map((t) => ({ ...t, injectTo: "head" as const })) };
    },
    // Cada página pública sale con su título, descripción y canónica en el HTML, sin esperar al JavaScript
    // (dist/paginas/<ruta>.html; el servidor y Vercel los entregan en su ruta).
    writeBundle(opciones) {
      const dir = opciones.dir ?? "dist";
      // Sin el esqueleto del hero ni la precarga de su imagen: en las páginas interiores no se usan.
      const base = readFileSync(path.join(dir, "index.html"), "utf8")
        .replace(/<!--esqueleto-->[\s\S]*?<!--\/esqueleto-->/, "")
        .replace(/<link\s+rel="preload"\s+as="image"\s+href="\/media\/video\/hero-[^>]*>\s*/g, "");
      mkdirSync(path.join(dir, "paginas"), { recursive: true });
      for (const [ruta, p] of Object.entries(PAGINAS_PUBLICAS)) {
        if (ruta === "/") continue;
        const url = `${sitio}${ruta}`;
        const html = base
          .replace(/<title>[^<]*<\/title>/, `<title>${p.titulo}</title>`)
          .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${p.descripcion}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${p.titulo}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${p.descripcion}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
          .replace("</head>", `${precarga(p.portada)}</head>`);
        writeFileSync(path.join(dir, "paginas", `${ruta.slice(1)}.html`), html);
      }
    },
    generateBundle() {
      const hoy = new Date().toISOString().slice(0, 10);
      const urls = Object.keys(PAGINAS_PUBLICAS)
        .map((r) => `  <url><loc>${sitio}${r}</loc><lastmod>${hoy}</lastmod></url>`)
        .join("\n");
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /m/\n\nSitemap: ${sitio}/sitemap.xml\n`,
      });
    },
  };
}

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

export default defineConfig(({ mode }) => ({
  plugins: [react(), precargarFuentes(), seoEstatico(loadEnv(mode, process.cwd(), "VITE_"))],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:3000" } },
  build: { outDir: "dist", sourcemap: false, assetsInlineLimit: 0 },
}));
