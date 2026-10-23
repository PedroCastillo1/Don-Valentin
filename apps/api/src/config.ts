import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  /** Cadena de conexión de PostgreSQL (Supabase: "Transaction pooler"). Si está, manda sobre DB_HOST/DB_*. */
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("don_valentin"),
  /** TLS hacia la base (obligatorio con Supabase). */
  DB_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** Conexiones por instancia: en funciones de Vercel conviene 1–3. */
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(10),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  /** Orígenes permitidos para peticiones con cookie (CSRF por Origin). Vacío = mismo host. */
  ALLOWED_ORIGINS: z.string().default(""),
  WEB_DIST: z.string().optional(),
  /** URL pública del sitio: es la base de los códigos QR. Obligatoria en producción. */
  PUBLIC_BASE_URL: z.string().url().optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  /** Ingresos permitidos por IP cada 15 minutos (las pruebas de punta a punta entran muchas veces seguidas). */
  LIMITE_INGRESOS: z.coerce.number().int().min(5).max(1000).default(20),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const e = envSchema.parse(env);
  return {
    ...e,
    DB_POOL_MAX: e.DB_POOL_MAX ?? (e.DATABASE_URL ? 3 : 10),
    isProd: e.NODE_ENV === "production",
    cookieSecure: e.COOKIE_SECURE ? e.COOKIE_SECURE === "true" : e.NODE_ENV === "production",
    allowedOrigins: e.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    // Detrás de un solo proxy (Vercel): se confía en un salto, no en toda la cadena.
    trustProxy: e.TRUST_PROXY === "true" ? 1 : false,
  };
}
