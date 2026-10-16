/**
 * Entrada de la API en Vercel (una sola función que atiende /api/*).
 * El sitio lo sirve Vercel como archivos estáticos; la base es Supabase (DATABASE_URL).
 * La arma scripts/vercel-build.mjs.
 */
import { loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { createApp } from "./http/app.ts";

const cfg = loadConfig();
if (cfg.isProd && !cfg.PUBLIC_BASE_URL)
  throw new Error("PUBLIC_BASE_URL es obligatoria en producción: es la base de los códigos QR.");
if (!cfg.DATABASE_URL) throw new Error("Falta DATABASE_URL (cadena de conexión de Supabase).");

const db = createPool(cfg);
export default createApp({ db, cfg });
