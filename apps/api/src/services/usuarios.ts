import type { Rol } from "@dv/shared";
import type { Db } from "../db/pool.ts";
import { exec, one, rows } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { hashPassword } from "./auth.ts";

export async function listarUsuarios(db: Db) {
  const r = await rows(db, "SELECT u.id, u.usuario, u.nombre, r.codigo AS rol, u.activo, u.ultimo_acceso FROM usuarios u JOIN roles r ON r.id = u.rol_id ORDER BY u.id");
  return r.map((u) => ({ id: u.id as number, usuario: u.usuario as string, nombre: u.nombre as string, rol: u.rol as Rol, activo: u.activo === 1, ultimoAcceso: u.ultimo_acceso ? `${String(u.ultimo_acceso).replace(" ", "T")}Z` : null }));
}

export async function crearUsuario(db: Db, i: { usuario: string; nombre: string; rol: Rol; password: string }) {
  const rol = await one(db, "SELECT id FROM roles WHERE codigo = ?", [i.rol]);
  if (!rol) throw new ErrorDeDominio(400, "ROL_INVALIDO", "El rol no existe.");
  try {
    const r = await exec(db, "INSERT INTO usuarios (usuario, nombre, rol_id, password_hash) VALUES (?,?,?,?)", [i.usuario, i.nombre, rol.id, await hashPassword(i.password)]);
    return { id: r.insertId, usuario: i.usuario, nombre: i.nombre, rol: i.rol, activo: true, ultimoAcceso: null };
  } catch (e) {
    if ((e as { errno?: number }).errno === 1062) throw new ErrorDeDominio(409, "USUARIO_DUPLICADO", "Ya existe un usuario con ese nombre.");
    throw e;
  }
}

export async function cambiarActivo(db: Db, id: number, activo: boolean, actorId: number): Promise<void> {
  if (id === actorId && !activo) throw new ErrorDeDominio(409, "AUTO_BAJA", "No podés desactivar tu propio usuario.");
  const r = await exec(db, "UPDATE usuarios SET activo = ? WHERE id = ?", [activo ? 1 : 0, id]);
  if (r.affectedRows === 0) throw new ErrorDeDominio(404, "USUARIO_NO_ENCONTRADO", "El usuario no existe.");
  if (!activo) await exec(db, "DELETE FROM sesiones_usuario WHERE usuario_id = ?", [id]);
}
