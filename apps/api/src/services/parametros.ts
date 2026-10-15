import type { Db } from "../db/pool.ts";
import { exec, one, rows } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { hhmm, sumarMinutosHhmm } from "../domain/tiempo.ts";

export interface Planilla {
  generadaEn: string;
  parametros: { clave: string; valor: string; tipo: string; unidad: string | null; descripcion: string; fuente: string; validacion: string }[];
  sectoresSalon: { id: number; nombre: string; validacion: string }[];
  mesas: { id: number; numero: number; sector: string; capacidad: number; validacion: string }[];
  franjas: { id: number; nombre: string; duracionMin: number; validacion: string }[];
  aforos: { franjaId: number; franja: string; sectorId: number; sector: string; aforoPersonas: number; validacion: string }[];
  tiposSolicitud: { id: number; sector: string; nombre: string; tiempoMaximoMin: number; validacion: string }[];
  pendientes: { documentado: number; provisorio: number; validado: number };
}

export async function planilla(db: Db): Promise<Planilla> {
  const parametros = (await rows(db, "SELECT * FROM parametros ORDER BY clave")).map((p) => ({ clave: p.clave, valor: p.valor, tipo: p.tipo, unidad: p.unidad, descripcion: p.descripcion, fuente: p.fuente, validacion: p.estado_validacion }));
  const sectoresSalon = (await rows(db, "SELECT id, nombre, estado_validacion FROM sectores_salon WHERE activo = 1 ORDER BY id")).map((s) => ({ id: s.id, nombre: s.nombre, validacion: s.estado_validacion }));
  const mesas = (await rows(db, "SELECT m.id, m.numero, s.nombre AS sector, m.capacidad, m.estado_validacion FROM mesas m JOIN sectores_salon s ON s.id = m.sector_salon_id WHERE m.activa = 1 ORDER BY m.numero")).map((m) => ({ id: m.id, numero: m.numero, sector: m.sector, capacidad: m.capacidad, validacion: m.estado_validacion }));
  const franjas = (await rows(db, "SELECT id, hora_inicio, duracion_min, estado_validacion FROM franjas WHERE activa = 1 ORDER BY orden")).map((f) => ({ id: f.id, nombre: `${hhmm(f.hora_inicio)} a ${sumarMinutosHhmm(hhmm(f.hora_inicio), f.duracion_min)}`, duracionMin: f.duracion_min, validacion: f.estado_validacion }));
  const aforos = (await rows(db, "SELECT a.franja_id, f.hora_inicio, f.duracion_min, a.sector_salon_id, s.nombre AS sector, a.aforo_personas, a.estado_validacion FROM aforos a JOIN franjas f ON f.id = a.franja_id JOIN sectores_salon s ON s.id = a.sector_salon_id WHERE f.activa = 1 ORDER BY f.orden, s.id")).map((a) => ({ franjaId: a.franja_id, franja: `${hhmm(a.hora_inicio)} a ${sumarMinutosHhmm(hhmm(a.hora_inicio), a.duracion_min)}`, sectorId: a.sector_salon_id, sector: a.sector, aforoPersonas: a.aforo_personas, validacion: a.estado_validacion }));
  const tiposSolicitud = (await rows(db, "SELECT t.id, sp.codigo AS sector, t.nombre, t.tiempo_maximo_min, t.estado_validacion FROM tipos_solicitud t JOIN sectores_preparacion sp ON sp.id = t.sector_preparacion_id ORDER BY sp.id, t.id")).map((t) => ({ id: t.id, sector: t.sector, nombre: t.nombre, tiempoMaximoMin: t.tiempo_maximo_min, validacion: t.estado_validacion }));
  const todos = [...parametros, ...sectoresSalon, ...mesas, ...franjas, ...aforos, ...tiposSolicitud];
  const cuenta = (v: string) => todos.filter((x) => x.validacion === v).length;
  return { generadaEn: new Date().toISOString(), parametros, sectoresSalon, mesas, franjas, aforos, tiposSolicitud, pendientes: { documentado: cuenta("documentado"), provisorio: cuenta("provisorio"), validado: cuenta("validado") } };
}

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function editarParametro(db: Db, clave: string, valor: string, usuarioId: number): Promise<void> {
  const p = await one(db, "SELECT tipo FROM parametros WHERE clave = ?", [clave]);
  if (!p) throw new ErrorDeDominio(404, "PARAMETRO_NO_ENCONTRADO", "El parámetro no existe.");
  if (p.tipo === "entero" && !/^\d{1,5}$/.test(valor)) throw new ErrorDeDominio(400, "VALOR_INVALIDO", "Ese parámetro es un número entero.");
  if ((clave === "local_apertura" || clave === "local_cierre") && !PATRON_HORA.test(valor)) throw new ErrorDeDominio(400, "VALOR_INVALIDO", "Usá el formato HH:MM, por ejemplo 12:00.");
  if (p.tipo === "entero" && Number(valor) === 0 && clave !== "tolerancia_no_show_min") throw new ErrorDeDominio(400, "VALOR_INVALIDO", "El valor debe ser mayor que cero.");
  await exec(db, "UPDATE parametros SET valor = ?, estado_validacion = 'provisorio', actualizado_por = ? WHERE clave = ?", [valor, usuarioId, clave]);
}

export async function editarAforo(db: Db, franjaId: number, sectorId: number, aforo: number): Promise<void> {
  const r = await exec(db, "UPDATE aforos SET aforo_personas = ?, estado_validacion = 'provisorio' WHERE franja_id = ? AND sector_salon_id = ?", [aforo, franjaId, sectorId]);
  if (r.affectedRows === 0) throw new ErrorDeDominio(404, "AFORO_NO_ENCONTRADO", "No existe ese aforo.");
}

export async function editarTipoSolicitud(db: Db, id: number, tiempoMaximoMin: number): Promise<void> {
  const r = await exec(db, "UPDATE tipos_solicitud SET tiempo_maximo_min = ?, estado_validacion = 'provisorio' WHERE id = ?", [tiempoMaximoMin, id]);
  if (r.affectedRows === 0) throw new ErrorDeDominio(404, "TIPO_NO_ENCONTRADO", "No existe ese tipo de solicitud.");
}

export type ElementoValidable = "parametro" | "mesa" | "franja" | "aforo" | "tipo_solicitud" | "sector_salon";

/** El Encargado confirma un valor de la planilla: pasa de «provisorio» a «validado». */
export async function validarElemento(db: Db, tipo: ElementoValidable, id: string, usuarioId: number): Promise<void> {
  const mapa: Record<ElementoValidable, [string, string]> = {
    parametro: ["parametros", "clave = ?"],
    mesa: ["mesas", "id = ?"],
    franja: ["franjas", "id = ?"],
    aforo: ["aforos", "CONCAT(franja_id, '-', sector_salon_id) = ?"],
    tipo_solicitud: ["tipos_solicitud", "id = ?"],
    sector_salon: ["sectores_salon", "id = ?"],
  };
  const [tabla, donde] = mapa[tipo];
  const extra = tipo === "parametro" ? ", actualizado_por = ?" : "";
  const params = tipo === "parametro" ? [usuarioId, id] : [id];
  const r = await exec(db, `UPDATE ${tabla} SET estado_validacion = 'validado'${extra} WHERE ${donde}`, params);
  if (r.affectedRows === 0) throw new ErrorDeDominio(404, "ELEMENTO_NO_ENCONTRADO", "No se encontró el elemento a validar.");
}
