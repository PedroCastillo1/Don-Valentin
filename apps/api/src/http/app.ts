import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import type { ErrorRequestHandler } from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { PERMISOS_POR_ROL, loginSchema } from "@dv/shared";
import type { Config } from "../config.ts";
import type { Db } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { cerrarSesion, iniciarSesion } from "../services/auth.ts";
import { COOKIE_SESION, cargarSesion, exigirCsrf, exigirSesion, leerCookie, parsear } from "./middleware.ts";
import { rutasAdmin } from "./rutas-admin.ts";
import { rutasPublicas } from "./rutas-publicas.ts";

export interface AppDeps {
  db: Db;
  cfg: Config;
  /** Reloj inyectable: las pruebas fijan la fecha. */
  ahora?: () => Date;
  /** Los límites de tasa se desactivan en pruebas que no los verifican. */
  limitarTasa?: boolean;
}

export function createApp({ db, cfg, ahora = () => new Date(), limitarTasa = true }: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", cfg.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          styleSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          mediaSrc: ["'self'"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: cfg.isProd ? undefined : false,
    }),
  );
  app.use(express.json({ limit: "20kb" }));

  const pasar: express.RequestHandler = (_req, _res, next) => next();
  const limite = (windowMs: number, max: number, mensaje: string): express.RequestHandler =>
    limitarTasa
      ? rateLimit({
          windowMs,
          limit: max,
          standardHeaders: "draft-8",
          legacyHeaders: false,
          handler: (_req, _res) => {
            throw new ErrorDeDominio(429, "DEMASIADAS_PETICIONES", mensaje);
          },
        })
      : pasar;

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  const api = express.Router();
  api.use(limite(60_000, 300, "Demasiadas peticiones. Esperá un momento."));
  api.use(cargarSesion(db));

  api.use(
    "/public",
    rutasPublicas(
      db,
      ahora,
      limite(10 * 60_000, 8, "Hiciste muchos intentos de reserva. Probá en unos minutos o llamanos."),
    ),
  );

  api.post(
    "/auth/login",
    limite(15 * 60_000, 20, "Demasiados intentos de ingreso. Probá en unos minutos."),
    async (req, res) => {
      const d = parsear(loginSchema, req.body);
      const s = await iniciarSesion(db, {
        usuario: d.usuario,
        password: d.password,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        ttlHoras: cfg.SESSION_TTL_HOURS,
        ahora: ahora(),
      });
      res.cookie(COOKIE_SESION, s.token, {
        httpOnly: true,
        sameSite: "strict",
        secure: cfg.cookieSecure,
        path: "/",
        expires: s.expiraEn,
      });
      res.json({ usuario: s.usuario, csrfToken: s.csrfToken, permisos: PERMISOS_POR_ROL[s.usuario.rol] });
    },
  );
  api.get("/auth/me", exigirSesion, (req, res) => {
    const s = req.sesion!;
    res.json({ usuario: s.usuario, csrfToken: s.csrfToken, permisos: PERMISOS_POR_ROL[s.usuario.rol] });
  });
  api.post("/auth/logout", exigirSesion, exigirCsrf(cfg.allowedOrigins), async (req, res) => {
    const token = leerCookie(req, COOKIE_SESION);
    if (token) await cerrarSesion(db, token);
    res.clearCookie(COOKIE_SESION, { path: "/" });
    res.status(204).end();
  });

  api.use("/admin", exigirSesion, exigirCsrf(cfg.allowedOrigins), rutasAdmin(db, cfg, ahora));
  api.use((_req, _res) => {
    throw new ErrorDeDominio(404, "NO_ENCONTRADO", "Ruta inexistente.");
  });
  app.use("/api", api);

  const dist = cfg.WEB_DIST ? path.resolve(cfg.WEB_DIST) : undefined;
  if (dist && existsSync(dist)) {
    app.use(
      express.static(dist, {
        index: false,
        maxAge: cfg.isProd ? "1h" : 0,
        setHeaders: (res, file) => {
          if (/\/assets\//.test(file)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      }),
    );
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  const manejarError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ErrorDeDominio) {
      res
        .status(err.status)
        .json({ error: { codigo: err.codigo, mensaje: err.message, ...(err.campos ? { campos: err.campos } : {}) } });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res
        .status(400)
        .json({ error: { codigo: "JSON_INVALIDO", mensaje: "El cuerpo de la petición no es JSON válido." } });
      return;
    }
    if (cfg.NODE_ENV !== "test") console.error(err);
    res
      .status(500)
      .json({ error: { codigo: "ERROR_INTERNO", mensaje: "Algo salió mal de nuestro lado. Probá de nuevo." } });
  };
  app.use(manejarError);
  return app;
}
