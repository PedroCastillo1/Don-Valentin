import type { Db, Tx } from "../db/pool.ts";
import { exec, rows } from "../db/pool.ts";

export interface EventoAuditoria {
  usuarioId: number | null;
  accion: string;
  recurso: string;
  resultado: "permitido" | "denegado" | "error";
  detalle?: Record<string, unknown>;
  ip?: string | undefined;
}

export async function registrarAuditoria(db: Db | Tx, e: EventoAuditoria): Promise<void> {
  await exec(db, "INSERT INTO auditoria (usuario_id, accion, recurso, resultado, detalle, ip) VALUES (?,?,?,?,?,?)", [
    e.usuarioId,
    e.accion.slice(0, 60),
    e.recurso.slice(0, 160),
    e.resultado,
    e.detalle ? JSON.stringify(e.detalle) : null,
    e.ip?.slice(0, 45) ?? null,
  ]);
}

export interface FilaAuditoria {
  id: number;
  usuario: string | null;
  accion: string;
  recurso: string;
  resultado: string;
  detalle: unknown;
  creadaEn: string;
}

export async function listarAuditoria(db: Db, limite = 100, soloDenegados = false): Promise<FilaAuditoria[]> {
  const r = await rows(
    db,
    `SELECT a.id, u.usuario, a.accion, a.recurso, a.resultado, a.detalle, a.creada_en
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
      ${soloDenegados ? "WHERE a.resultado = 'denegado'" : ""}
      ORDER BY a.id DESC LIMIT ?`,
    [Math.min(limite, 500)],
  );
  return r.map((x) => ({
    id: Number(x.id),
    usuario: x.usuario ?? null,
    accion: x.accion,
    recurso: x.recurso,
    resultado: x.resultado,
    detalle: x.detalle,
    creadaEn: `${String(x.creada_en).replace(" ", "T")}Z`,
  }));
}
