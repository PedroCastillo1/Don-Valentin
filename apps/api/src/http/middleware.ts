import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { puede } from "@dv/shared";
import type { Permiso } from "@dv/shared";
import type { Db } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { registrarAuditoria } from "../services/auditoria.ts";
import { csrfValido, sesionPorToken } from "../services/auth.ts";
import type { SesionActiva } from "../services/auth.ts";

declare module "express-serve-static-core" {
  interface Request {
    sesion?: SesionActiva;
  }
}

export const COOKIE_SESION = "dv_sid";

export function leerCookie(req: Request, nombre: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const parte of raw.split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nombre) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return undefined;
}

export function parsear<T>(schema: ZodType<T>, datos: unknown): T {
  const r = schema.safeParse(datos);
  if (r.success) return r.data;
  const campos: Record<string, string> = {};
  for (const issue of r.error.issues) campos[issue.path.join(".") || "_"] ??= issue.message;
  throw new ErrorDeDominio(400, "DATOS_INVALIDOS", Object.values(campos)[0] ?? "Datos inválidos.", campos);
}

export function cargarSesion(db: Db): RequestHandler {
  return async (req, _res, next) => {
    const token = leerCookie(req, COOKIE_SESION);
    if (token) req.sesion = (await sesionPorToken(db, token)) ?? undefined;
    next();
  };
}

export function exigirSesion(req: Request, _res: Response, next: NextFunction): void {
  if (!req.sesion) throw new ErrorDeDominio(401, "SIN_SESION", "Iniciá sesión para continuar.");
  next();
}

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Defensa CSRF: SameSite=Strict + token por sesión en cabecera + verificación de Origin. */
export function exigirCsrf(origenesPermitidos: string[]): RequestHandler {
  return (req, _res, next) => {
    if (METODOS_SEGUROS.has(req.method)) return next();
    const origin = req.headers.origin;
    if (origin) {
      const propio = `${req.protocol}://${req.get("host")}`;
      if (origin !== propio && !origenesPermitidos.includes(origin))
        throw new ErrorDeDominio(403, "ORIGEN_NO_PERMITIDO", "Origen no permitido.");
    }
    if (!req.sesion || !csrfValido(req.sesion.csrfToken, req.header("x-csrf-token")))
      throw new ErrorDeDominio(403, "CSRF", "La sesión venció o la petición no es válida. Recargá la página.");
    next();
  };
}

/** RNF-3: sin permiso, 403 y el intento queda registrado en la auditoría. */
export function exigirPermiso(db: Db, permiso: Permiso): RequestHandler {
  return async (req, _res, next) => {
    const s = req.sesion;
    if (!s) throw new ErrorDeDominio(401, "SIN_SESION", "Iniciá sesión para continuar.");
    if (puede(s.usuario.rol, permiso)) return next();
    await registrarAuditoria(db, {
      usuarioId: s.usuario.id,
      accion: `acceso:${permiso}`,
      recurso: `${req.method} ${req.originalUrl.split("?")[0]}`,
      resultado: "denegado",
      detalle: { rol: s.usuario.rol },
      ip: req.ip,
    });
    throw new ErrorDeDominio(403, "SIN_PERMISO", "No tenés permiso para esta sección.");
  };
}

export function idParam(valor: unknown): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorDeDominio(400, "ID_INVALIDO", "Identificador inválido.");
  return n;
}
