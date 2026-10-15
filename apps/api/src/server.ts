import { loadConfig } from "./config.ts";
import { createPool } from "./db/pool.ts";
import { createApp } from "./http/app.ts";

const cfg = loadConfig();
if (cfg.isProd && !cfg.PUBLIC_BASE_URL) throw new Error("PUBLIC_BASE_URL es obligatoria en producción: es la base de los códigos QR.");
const db = createPool(cfg);
const app = createApp({ db, cfg });
const server = app.listen(cfg.PORT, () => console.log(`API de Don Valentín escuchando en el puerto ${cfg.PORT}`));
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => server.close(() => void db.end().then(() => process.exit(0))));
}
