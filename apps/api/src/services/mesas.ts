import { createHash } from "node:crypto";
import QRCode from "qrcode";
import type { Db } from "../db/pool.ts";
import { exec, one, rows } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { nuevoTokenQr } from "../db/seed.ts";

export interface MesaDto {
  id: number;
  numero: number;
  sector: string;
  sectorId: number;
  capacidad: number;
  activa: boolean;
  validacion: string;
  sesionAbierta: boolean;
  qrGeneradoEn: string;
  /** Huella corta del código vigente (no es el token): cambia cada vez que se genera un QR nuevo. */
  qrCodigo: string;
}

/** "a1b2c3d4…" → "A1B2-C3": se imprime debajo del QR y se ve en el panel para comprobar cuál está vigente. */
export function codigoQr(token: string): string {
  const h = createHash("sha256").update(token).digest("hex").slice(0, 6).toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4)}`;
}

const SELECT_MESA = `SELECT m.id, m.numero, m.sector_salon_id, s.nombre AS sector, m.capacidad, m.activa, m.estado_validacion, m.qr_generado_en, m.qr_token,
  EXISTS (SELECT 1 FROM sesiones_mesa x WHERE x.mesa_id = m.id AND x.estado = 'abierta') AS sesion_abierta
  FROM mesas m JOIN sectores_salon s ON s.id = m.sector_salon_id`;

function dto(x: Record<string, unknown>): MesaDto {
  return {
    id: Number(x.id),
    numero: Number(x.numero),
    sector: String(x.sector),
    sectorId: Number(x.sector_salon_id),
    capacidad: Number(x.capacidad),
    activa: x.activa === 1,
    validacion: String(x.estado_validacion),
    sesionAbierta: Number(x.sesion_abierta) === 1,
    qrGeneradoEn: `${String(x.qr_generado_en).replace(" ", "T")}Z`,
    qrCodigo: codigoQr(String(x.qr_token)),
  };
}

export async function listarMesas(db: Db): Promise<MesaDto[]> {
  return (await rows(db, `${SELECT_MESA} ORDER BY m.numero`)).map(dto);
}

export async function crearMesa(
  db: Db,
  i: { numero: number; sectorSalonId: number; capacidad: number },
): Promise<MesaDto> {
  const sector = await one(db, "SELECT id FROM sectores_salon WHERE id = ? AND activo = 1", [i.sectorSalonId]);
  if (!sector) throw new ErrorDeDominio(400, "SECTOR_INVALIDO", "El sector no existe.");
  try {
    const r = await exec(
      db,
      "INSERT INTO mesas (numero, sector_salon_id, capacidad, qr_token, estado_validacion) VALUES (?,?,?,?, 'provisorio')",
      [i.numero, i.sectorSalonId, i.capacidad, nuevoTokenQr()],
    );
    return dto((await one(db, `${SELECT_MESA} WHERE m.id = ?`, [r.insertId]))!);
  } catch (e) {
    if ((e as { errno?: number }).errno === 1062)
      throw new ErrorDeDominio(409, "MESA_DUPLICADA", `Ya existe la mesa ${i.numero}.`);
    throw e;
  }
}

export async function editarMesa(
  db: Db,
  id: number,
  i: { sectorSalonId?: number | undefined; capacidad?: number | undefined; activa?: boolean | undefined },
): Promise<MesaDto> {
  const m = await one(db, "SELECT id FROM mesas WHERE id = ?", [id]);
  if (!m) throw new ErrorDeDominio(404, "MESA_NO_ENCONTRADA", "La mesa no existe.");
  if (i.activa === false) {
    const reservas = await one(
      db,
      "SELECT COUNT(*) AS n FROM reservas WHERE mesa_id = ? AND estado = 'confirmada' AND fecha_servicio >= CURRENT_DATE - 1",
      [id],
    );
    if (Number(reservas?.n) > 0)
      throw new ErrorDeDominio(409, "MESA_CON_RESERVAS", "No podés desactivar esta mesa: tiene reservas confirmadas.");
    const sesion = await one(db, "SELECT 1 FROM sesiones_mesa WHERE mesa_id = ? AND estado = 'abierta'", [id]);
    if (sesion)
      throw new ErrorDeDominio(409, "MESA_CON_SESION", "No podés desactivar esta mesa: tiene una sesión abierta.");
  }
  const sets: string[] = [];
  const params: unknown[] = [];
  if (i.sectorSalonId !== undefined) {
    sets.push("sector_salon_id = ?");
    params.push(i.sectorSalonId);
  }
  if (i.capacidad !== undefined) {
    sets.push("capacidad = ?");
    params.push(i.capacidad);
  }
  if (i.activa !== undefined) {
    sets.push("activa = ?");
    params.push(i.activa ? 1 : 0);
  }
  if (sets.length)
    await exec(db, `UPDATE mesas SET ${sets.join(", ")}, estado_validacion = 'provisorio' WHERE id = ?`, [
      ...params,
      id,
    ]);
  return dto((await one(db, `${SELECT_MESA} WHERE m.id = ?`, [id]))!);
}

/** Genera un QR nuevo: el anterior deja de resolver la mesa. */
export async function regenerarQr(db: Db, id: number): Promise<MesaDto> {
  const r = await exec(db, "UPDATE mesas SET qr_token = ?, qr_generado_en = CURRENT_TIMESTAMP(3) WHERE id = ?", [
    nuevoTokenQr(),
    id,
  ]);
  if (r.affectedRows === 0) throw new ErrorDeDominio(404, "MESA_NO_ENCONTRADA", "La mesa no existe.");
  return dto((await one(db, `${SELECT_MESA} WHERE m.id = ?`, [id]))!);
}

/** Agrega debajo del QR el número de mesa y el código vigente, para verificar a simple vista el impreso. */
function conRotulo(svg: string, numero: number, codigo: string): string {
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!m) return svg;
  const w = Number(m[1]);
  const h = Number(m[2]);
  const extra = Math.max(4, Math.round(w * 0.16));
  const fs = Math.max(2, Math.round(extra * 0.42));
  return svg
    .replace(`viewBox="0 0 ${w} ${h}"`, `viewBox="0 0 ${w} ${h + extra}"`)
    .replace(
      "</svg>",
      `<rect y="${h}" width="${w}" height="${extra}" fill="#ffffff"/><text x="${w / 2}" y="${h + extra * 0.62}" font-family="monospace" font-size="${fs}" text-anchor="middle" fill="#000000">Mesa ${numero} · ${codigo}</text></svg>`,
    );
}

export function urlQr(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/m/${token}`;
}

export async function qrSvgDeMesa(
  db: Db,
  id: number,
  baseUrl: string,
): Promise<{ svg: string; url: string; numero: number }> {
  const m = await one(db, "SELECT numero, qr_token FROM mesas WHERE id = ?", [id]);
  if (!m) throw new ErrorDeDominio(404, "MESA_NO_ENCONTRADA", "La mesa no existe.");
  const url = urlQr(baseUrl, m.qr_token);
  const svg = conRotulo(
    await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 }),
    m.numero as number,
    codigoQr(m.qr_token as string),
  );
  return { svg, url, numero: m.numero };
}

export async function qrDeTodas(db: Db, baseUrl: string): Promise<{ numero: number; url: string; svg: string }[]> {
  const ms = await rows(db, "SELECT numero, qr_token FROM mesas WHERE activa = 1 ORDER BY numero");
  return Promise.all(
    ms.map(async (m) => {
      const url = urlQr(baseUrl, m.qr_token);
      return {
        numero: m.numero as number,
        url,
        svg: conRotulo(
          await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 }),
          m.numero as number,
          codigoQr(m.qr_token as string),
        ),
      };
    }),
  );
}

export interface MesaPublica {
  numero: number;
  sesionAbierta: boolean;
}

/** Lo que el comensal ve al escanear: la mesa y si tiene sesión abierta. Nada más. */
export async function mesaPorToken(db: Db, token: string): Promise<MesaPublica | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const m = await one(
    db,
    "SELECT m.numero, EXISTS (SELECT 1 FROM sesiones_mesa x WHERE x.mesa_id = m.id AND x.estado = 'abierta') AS abierta FROM mesas m WHERE m.qr_token = ? AND m.activa = 1",
    [token],
  );
  return m ? { numero: m.numero, sesionAbierta: Number(m.abierta) === 1 } : null;
}

export interface SesionMesaDto {
  id: number;
  mesaId: number;
  numero: number;
  abiertaEn: string;
  yaExistia: boolean;
}

/** Dos mozos que abren a la vez la misma mesa generan una única sesión (índice único en la base). */
export async function abrirSesion(db: Db, mesaId: number, usuarioId: number): Promise<SesionMesaDto> {
  const mesa = await one(db, "SELECT id, numero FROM mesas WHERE id = ? AND activa = 1", [mesaId]);
  if (!mesa) throw new ErrorDeDominio(404, "MESA_NO_ENCONTRADA", "La mesa no existe o está desactivada.");
  try {
    const r = await exec(db, "INSERT INTO sesiones_mesa (mesa_id, abierta_por) VALUES (?, ?)", [mesaId, usuarioId]);
    const s = (await one(db, "SELECT id, abierta_en FROM sesiones_mesa WHERE id = ?", [r.insertId]))!;
    return {
      id: Number(s.id),
      mesaId,
      numero: mesa.numero,
      abiertaEn: `${String(s.abierta_en).replace(" ", "T")}Z`,
      yaExistia: false,
    };
  } catch (e) {
    if ((e as { errno?: number }).errno !== 1062) throw e;
    const s = (await one(db, "SELECT id, abierta_en FROM sesiones_mesa WHERE mesa_id = ? AND estado = 'abierta'", [
      mesaId,
    ]))!;
    return {
      id: Number(s.id),
      mesaId,
      numero: mesa.numero,
      abiertaEn: `${String(s.abierta_en).replace(" ", "T")}Z`,
      yaExistia: true,
    };
  }
}

export async function cerrarSesion(db: Db, mesaId: number): Promise<void> {
  const r = await exec(
    db,
    "UPDATE sesiones_mesa SET estado = 'cerrada', cerrada_en = CURRENT_TIMESTAMP(3) WHERE mesa_id = ? AND estado = 'abierta'",
    [mesaId],
  );
  if (r.affectedRows === 0) throw new ErrorDeDominio(409, "SIN_SESION", "Esa mesa no tiene una sesión abierta.");
}
