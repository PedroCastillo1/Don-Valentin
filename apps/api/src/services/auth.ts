import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { Rol } from "@dv/shared";
import type { Db } from "../db/pool.ts";
import { exec, one } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { registrarAuditoria } from "./auditoria.ts";

export interface UsuarioSesion {
  id: number;
  usuario: string;
  nombre: string;
  rol: Rol;
}

export interface SesionActiva {
  usuario: UsuarioSesion;
  csrfToken: string;
}

const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 15;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Hash de relleno: el login de un usuario inexistente tarda lo mismo que el de uno existente.
let hashRelleno: string | undefined;
async function relleno(): Promise<string> {
  hashRelleno ??= await hash("relleno-sin-usuario");
  return hashRelleno;
}

export async function hashPassword(p: string): Promise<string> {
  return hash(p);
}

export interface ResultadoLogin extends SesionActiva {
  token: string;
  expiraEn: Date;
}

export async function iniciarSesion(db: Db, i: { usuario: string; password: string; ip?: string | undefined; userAgent?: string | undefined; ttlHoras: number; ahora?: Date }): Promise<ResultadoLogin> {
  const ahora = i.ahora ?? new Date();
  const fila = await one(db, "SELECT u.id, u.usuario, u.nombre, u.password_hash, u.activo, u.intentos_fallidos, u.bloqueado_hasta, r.codigo AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.usuario = ?", [i.usuario]);
  const generico = new ErrorDeDominio(401, "CREDENCIALES", "Usuario o contraseña incorrectos.");
  if (!fila) {
    await verify(await relleno(), i.password).catch(() => false);
    await registrarAuditoria(db, { usuarioId: null, accion: "login", recurso: i.usuario.slice(0, 40), resultado: "denegado", detalle: { motivo: "usuario_inexistente" }, ip: i.ip });
    throw generico;
  }
  const bloqueadoHasta = fila.bloqueado_hasta ? new Date(`${String(fila.bloqueado_hasta).replace(" ", "T")}Z`) : null;
  if (bloqueadoHasta && bloqueadoHasta > ahora) {
    await registrarAuditoria(db, { usuarioId: fila.id, accion: "login", recurso: fila.usuario, resultado: "denegado", detalle: { motivo: "bloqueado" }, ip: i.ip });
    throw new ErrorDeDominio(429, "BLOQUEADO", "Demasiados intentos. Probá de nuevo en unos minutos.");
  }
  const ok = fila.activo === 1 && (await verify(fila.password_hash, i.password).catch(() => false));
  if (!ok) {
    const intentos = Number(fila.intentos_fallidos) + 1;
    const bloqueo = intentos >= MAX_INTENTOS ? new Date(ahora.getTime() + BLOQUEO_MIN * 60_000) : null;
    await exec(db, "UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?", [bloqueo ? 0 : intentos, bloqueo, fila.id]);
    await registrarAuditoria(db, { usuarioId: fila.id, accion: "login", recurso: fila.usuario, resultado: "denegado", detalle: { motivo: fila.activo === 1 ? "password" : "inactivo", intentos }, ip: i.ip });
    throw generico;
  }
  await exec(db, "UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = ? WHERE id = ?", [ahora, fila.id]);
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const expiraEn = new Date(ahora.getTime() + i.ttlHoras * 3_600_000);
  await exec(db, "INSERT INTO sesiones_usuario (token_hash, csrf_token, usuario_id, expira_en, ip, user_agent) VALUES (?,?,?,?,?,?)", [sha256(token), csrfToken, fila.id, expiraEn, i.ip?.slice(0, 45) ?? null, i.userAgent?.slice(0, 255) ?? null]);
  await registrarAuditoria(db, { usuarioId: fila.id, accion: "login", recurso: fila.usuario, resultado: "permitido", ip: i.ip });
  return { token, csrfToken, expiraEn, usuario: { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol as Rol } };
}

export async function sesionPorToken(db: Db, token: string, ahora = new Date()): Promise<SesionActiva | null> {
  const f = await one(db, "SELECT s.csrf_token, s.expira_en, u.id, u.usuario, u.nombre, u.activo, r.codigo AS rol FROM sesiones_usuario s JOIN usuarios u ON u.id = s.usuario_id JOIN roles r ON r.id = u.rol_id WHERE s.token_hash = ?", [sha256(token)]);
  if (!f || f.activo !== 1) return null;
  if (new Date(`${String(f.expira_en).replace(" ", "T")}Z`) <= ahora) return null;
  return { csrfToken: f.csrf_token, usuario: { id: f.id, usuario: f.usuario, nombre: f.nombre, rol: f.rol as Rol } };
}

export async function cerrarSesion(db: Db, token: string): Promise<void> {
  await exec(db, "DELETE FROM sesiones_usuario WHERE token_hash = ?", [sha256(token)]);
}

export function csrfValido(esperado: string, recibido: string | undefined): boolean {
  if (!recibido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  return a.length === b.length && timingSafeEqual(a, b);
}
