import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import express from "express";
import type { ErrorRequestHandler } from "express";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { PAGINAS_PUBLICAS, PERMISOS_POR_ROL, loginSchema } from "@dv/shared";
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

  app.use(compression());
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
  // Holgado: en el local, los paneles de cocina, parrilla, barra y los mozos comparten la misma IP pública
  // y consultan cada pocos segundos.
  api.use(limite(60_000, 1500, "Demasiadas peticiones. Esperá un momento."));
  api.use(cargarSesion(db, ahora));

  api.use(
    "/public",
    rutasPublicas(
      db,
      ahora,
      limite(10 * 60_000, 8, "Hiciste muchos intentos de reserva. Probá en unos minutos o llamanos."),
      limite(5 * 60_000, 20, "Enviaste muchos pedidos seguidos. Esperá un momento o avisale al mozo."),
      cfg.cookieSecure,
      limite(60_000, 120, "Demasiados eventos."),
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
        // Duración relativa (Max-Age) y no fecha absoluta: el vencimiento real lo controla la base con el mismo reloj.
        maxAge: cfg.SESSION_TTL_HOURS * 3_600_000,
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
    // La portada sale con un esqueleto estático (el póster del hero) para pintar antes de que cargue el JS;
    // el resto de las rutas recibe el mismo HTML sin ese esqueleto.
    let paginas: { inicio: string; resto: string } | null = null;
    const leer = () => {
      if (!paginas || !cfg.isProd) {
        const html = readFileSync(path.join(dist, "index.html"), "utf8");
        paginas = { inicio: html, resto: html.replace(/<!--esqueleto-->[\s\S]*?<!--\/esqueleto-->/, "") };
      }
      return paginas;
    };
    // Rutas que la aplicación conoce; cualquier otra devuelve 404 (con la misma página, que dice «no encontrada»).
    const publicas = new Set(Object.keys(PAGINAS_PUBLICAS));
    const conocida = (ruta: string) => publicas.has(ruta) || /^\/(m\/[^/]+|admin(\/.*)?)$/.test(ruta);
    app.get(/^\/(?!api\/).*/, (req, res) => {
      const p = leer();
      const ruta = req.path.replace(/\/+$/, "") || "/";
      const propia = path.join(dist, "paginas", `${ruta.slice(1)}.html`);
      if (ruta !== "/" && /^\/[a-z-]+$/.test(ruta) && existsSync(propia)) {
        res.type("html").send(readFileSync(propia, "utf8"));
        return;
      }
      res
        .status(conocida(ruta) ? 200 : 404)
        .type("html")
        .send(ruta === "/" ? p.inicio : p.resto);
    });
  }

  const manejarError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ErrorDeDominio) {
      res
        .status(err.status)
        .json({ error: { codigo: err.codigo, mensaje: err.message, ...(err.campos ? { campos: err.campos } : {}) } });
      return;
    }
    if (typeof err === "object" && err && (err as { type?: string }).type === "entity.too.large") {
      res.status(413).json({ error: { codigo: "PETICION_MUY_GRANDE", mensaje: "La petición es demasiado grande." } });
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
