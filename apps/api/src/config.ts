import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("don_valentin"),
  DB_SOCKET: z.string().optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(72).default(10),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  /** Orígenes permitidos para peticiones con cookie (CSRF por Origin). Vacío = mismo host. */
  ALLOWED_ORIGINS: z.string().default(""),
  WEB_DIST: z.string().optional(),
  /** URL pública del sitio: es la base de los códigos QR. Obligatoria en producción. */
  PUBLIC_BASE_URL: z.string().url().optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
});

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const e = envSchema.parse(env);
  return {
    ...e,
    isProd: e.NODE_ENV === "production",
    cookieSecure: e.COOKIE_SECURE ? e.COOKIE_SECURE === "true" : e.NODE_ENV === "production",
    allowedOrigins: e.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxy: e.TRUST_PROXY === "true",
  };
}
