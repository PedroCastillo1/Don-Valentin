// Arma la salida para Vercel (Build Output API v3): sitio estático + una función Node para /api.
// Vercel lo ejecuta como "Build Command" (ver vercel.json). También se puede correr local: `node scripts/vercel-build.mjs`.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const salida = path.join(raiz, ".vercel", "output");
const estatico = path.join(salida, "static");
const funcion = path.join(salida, "functions", "api.func");

rmSync(salida, { recursive: true, force: true });

// 1. Sitio
execSync("npm run build -w @dv/web", { cwd: raiz, stdio: "inherit" });
cpSync(path.join(raiz, "apps", "web", "dist"), estatico, { recursive: true });
// El esqueleto del hero va solo en "/": el resto de las rutas usa una copia sin él (igual que hacía Express).
const html = readFileSync(path.join(estatico, "index.html"), "utf8");
writeFileSync(path.join(estatico, "resto.html"), html.replace(/<!--esqueleto-->[\s\S]*?<!--\/esqueleto-->/, ""));

// Páginas públicas con sus metadatos en el HTML (las genera el armado del sitio en dist/paginas).
const paginas = readdirSync(path.join(estatico, "paginas"))
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.replace(/\.html$/, ""));

// 2. API
mkdirSync(funcion, { recursive: true });
await build({
  entryPoints: [path.join(raiz, "apps", "api", "src", "vercel.ts")],
  outfile: path.join(funcion, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["@node-rs/argon2", "pg-native"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});
// argon2 es nativo: se copia tal cual con su binario de Linux (el que instala Vercel al construir).
for (const paquete of ["argon2", "argon2-linux-x64-gnu", "argon2-linux-x64-musl"]) {
  const origen = path.join(raiz, "node_modules", "@node-rs", paquete);
  if (existsSync(origen)) cpSync(origen, path.join(funcion, "node_modules", "@node-rs", paquete), { recursive: true });
}
writeFileSync(path.join(funcion, "package.json"), JSON.stringify({ type: "module" }));
writeFileSync(
  path.join(funcion, ".vc-config.json"),
  JSON.stringify(
    { runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false, maxDuration: 15 },
    null,
    2,
  ),
);

// 3. Rutas y cabeceras
// Google Analytics solo si el local cargó su ID (VITE_GA4_ID): recién ahí se habilitan sus dominios.
const ga = process.env.VITE_GA4_ID
  ? {
      script: " https://www.googletagmanager.com",
      connect: " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
      img: " https://*.google-analytics.com https://www.googletagmanager.com",
    }
  : { script: "", connect: "", img: "" };
const seguridad = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": `default-src 'self'; script-src 'self'${ga.script}; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:${ga.img}; media-src 'self'; font-src 'self'; connect-src 'self'${ga.connect}; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
};
writeFileSync(
  path.join(salida, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/(.*)", headers: seguridad, continue: true },
        { src: "/assets/(.*)", headers: { "Cache-Control": "public, max-age=31536000, immutable" }, continue: true },
        { src: "/media/(.*)", headers: { "Cache-Control": "public, max-age=604800" }, continue: true },
        { src: "/api/(.*)", dest: "/api" },
        { handle: "filesystem" },
        { src: "/", dest: "/index.html" },
        ...paginas.map((p) => ({ src: `/${p}/?`, dest: `/paginas/${p}.html` })),
        { src: "/(m/[^/]+|admin(/.*)?)", dest: "/resto.html" },
        // Cualquier otra ruta: la misma aplicación (dice «Página no encontrada») con código 404.
        { src: "/(.*)", dest: "/resto.html", status: 404 },
      ],
    },
    null,
    2,
  ),
);
console.log("Salida de Vercel lista en .vercel/output");
