import { randomInt } from "node:crypto";
import type { OrigenReserva } from "@dv/shared";
import { DIA_NOMBRE, diaDeSemana, localAbre, normalizarTelefono, parsearFechas } from "@dv/shared";
import type { Db, Row, Tx } from "../db/pool.ts";
import { exec, one, rows, withTx } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { elegirMesa, estadoDeFranja } from "../domain/disponibilidad.ts";
import type { EstadoFranja } from "../domain/disponibilidad.ts";
import { fechaServicioActual, hhmm, inicioFranjaUtc, sumarDias, sumarMinutosHhmm } from "../domain/tiempo.ts";

export interface ConfigLocal {
  apertura: string;
  cierre: string;
  diasMax: number;
  toleranciaNoShowMin: number;
  diasAtencion: string;
  diasCerrados: string;
}

export async function leerConfigLocal(db: Db | Tx): Promise<ConfigLocal> {
  const r = await rows(
    db,
    "SELECT clave, valor FROM parametros WHERE clave IN ('local_apertura','local_cierre','reserva_dias_max','tolerancia_no_show_min','dias_atencion','dias_cerrados')",
  );
  const m = new Map(r.map((x) => [x.clave as string, x.valor as string]));
  return {
    apertura: m.get("local_apertura") ?? "12:00",
    cierre: m.get("local_cierre") ?? "02:00",
    diasMax: Number(m.get("reserva_dias_max") ?? 30),
    toleranciaNoShowMin: Number(m.get("tolerancia_no_show_min") ?? 15),
    diasAtencion: m.get("dias_atencion") ?? "lun,mar,mie,jue,vie,sab,dom",
    diasCerrados: m.get("dias_cerrados") ?? "",
  };
}

export interface FranjaDto {
  id: number;
  nombre: string;
  desde: string;
  hasta: string;
}

function franjaDto(f: { id: number; hora_inicio: string; duracion_min: number } | Row): FranjaDto {
  const desde = hhmm(f.hora_inicio as string);
  const hasta = sumarMinutosHhmm(desde, f.duracion_min as number);
  return { id: f.id as number, nombre: `${desde} a ${hasta}`, desde, hasta };
}

function validarFecha(fecha: string, cfg: ConfigLocal, ahora: Date): void {
  const hoy = fechaServicioActual(ahora, cfg.apertura, cfg.cierre);
  if (fecha < hoy) throw new ErrorDeDominio(400, "FECHA_FUERA_DE_RANGO", "Esa fecha ya pasó. Elegí otro día.");
  if (fecha > sumarDias(hoy, cfg.diasMax))
    throw new ErrorDeDominio(
      400,
      "FECHA_FUERA_DE_RANGO",
      `Se puede reservar con hasta ${cfg.diasMax} días de anticipación.`,
    );
  if (!localAbre(fecha, cfg.diasAtencion, cfg.diasCerrados))
    throw new ErrorDeDominio(
      400,
      "LOCAL_CERRADO",
      parsearFechas(cfg.diasCerrados).includes(fecha)
        ? "Ese día el local está cerrado. Elegí otra fecha."
        : `Los ${DIA_NOMBRE[diaDeSemana(fecha)]} el local no abre. Elegí otro día.`,
    );
}

export interface FranjaDisponible extends FranjaDto {
  estado: EstadoFranja;
}

/** Estados que ocupan la mesa y el aforo de la franja: reservada (confirmada) o con el grupo sentado (cumplida). */
const OCUPA = "('confirmada','cumplida')";

export async function disponibilidad(
  db: Db,
  fecha: string,
  personas: number,
  ahora = new Date(),
): Promise<FranjaDisponible[]> {
  const cfg = await leerConfigLocal(db);
  validarFecha(fecha, cfg, ahora);
  const franjas = await rows(db, "SELECT id, hora_inicio, duracion_min FROM franjas WHERE activa = 1 ORDER BY orden");
  const sectores = await rows(db, "SELECT id FROM sectores_salon WHERE activo = 1 ORDER BY id");
  const salida: FranjaDisponible[] = [];
  for (const f of franjas) {
    const yaEmpezo = ahora >= inicioFranjaUtc(fecha, f.hora_inicio, cfg.apertura);
    const estados: EstadoFranja[] = [];
    for (const s of sectores) {
      const aforo = await one(db, "SELECT aforo_personas FROM aforos WHERE franja_id = ? AND sector_salon_id = ?", [
        f.id,
        s.id,
      ]);
      const ocup = await one(
        db,
        "SELECT personas_confirmadas FROM ocupacion_franja WHERE fecha_servicio = ? AND franja_id = ? AND sector_salon_id = ?",
        [fecha, f.id, s.id],
      );
      const libres = await mesasLibres(db, { sectorId: s.id, fecha, franjaId: f.id, personas });
      estados.push(
        estadoDeFranja({
          personas,
          aforoRestante: (aforo?.aforo_personas ?? 0) - (ocup?.personas_confirmadas ?? 0),
          hayMesaParaGrupo: elegirMesa(libres, personas) !== undefined,
          yaEmpezo,
        }),
      );
    }
    const estado: EstadoFranja = estados.includes("disponible")
      ? "disponible"
      : yaEmpezo
        ? "cerrada"
        : estados.includes("sin_mesa")
          ? "sin_mesa"
          : "completa";
    salida.push({ ...franjaDto(f), estado });
  }
  return salida;
}

interface FiltroMesas {
  sectorId: number;
  fecha: string;
  franjaId: number;
  personas: number;
  /** Al modificar, la propia reserva no cuenta como ocupación. */
  excluirReservaId?: number | undefined;
  /** Walk-in: la mesa además tiene que estar sin un grupo sentado ahora. */
  sinSesionAbierta?: boolean | undefined;
  soloMesaId?: number | undefined;
}

async function mesasLibres(db: Db | Tx, f: FiltroMesas) {
  const params: unknown[] = [f.sectorId, f.personas, f.fecha, f.franjaId, f.excluirReservaId ?? 0];
  let extra = "";
  if (f.sinSesionAbierta)
    extra += " AND NOT EXISTS (SELECT 1 FROM sesiones_mesa x WHERE x.mesa_id = m.id AND x.estado = 'abierta')";
  if (f.soloMesaId) {
    extra += " AND m.id = ?";
    params.push(f.soloMesaId);
  }
  const r = await rows(
    db,
    `SELECT m.id, m.numero, m.capacidad FROM mesas m
      WHERE m.sector_salon_id = ? AND m.activa = 1 AND m.capacidad >= ?
        AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.mesa_id = m.id AND r.fecha_servicio = ? AND r.franja_id = ?
                          AND r.estado IN ${OCUPA} AND r.id <> ?)${extra}`,
    params,
  );
  return r.map((x) => ({ id: x.id as number, numero: x.numero as number, capacidad: x.capacidad as number }));
}

const ALFABETO = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function nuevoCodigo(): string {
  return Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

async function codigoLibre(tx: Tx): Promise<string> {
  let codigo = nuevoCodigo();
  for (let i = 0; i < 5 && (await one(tx, "SELECT 1 FROM reservas WHERE codigo = ?", [codigo])); i++)
    codigo = nuevoCodigo();
  return codigo;
}

/** Filas contador de la franja: se crean fuera de la transacción para que el bloqueo sea de registro y no de rango. */
async function asegurarContadores(db: Db, fecha: string, franjaId: number): Promise<number[]> {
  const sectores = (await rows(db, "SELECT id FROM sectores_salon WHERE activo = 1 ORDER BY id")).map(
    (s) => s.id as number,
  );
  for (const s of sectores)
    await exec(
      db,
      "INSERT INTO ocupacion_franja (fecha_servicio, franja_id, sector_salon_id, personas_confirmadas) VALUES (?,?,?,0) ON CONFLICT DO NOTHING",
      [fecha, franjaId, s],
    );
  return sectores;
}

/**
 * Bloquea los contadores de una o dos franjas (al modificar, la vieja y la nueva) siempre en el mismo orden
 * —fecha, franja, sector— para que dos operaciones cruzadas no se traben entre sí.
 */
async function bloquearContadores(tx: Tx, franjas: { fecha: string; franjaId: number }[]): Promise<void> {
  const unicas = [...new Map(franjas.map((f) => [`${f.fecha}|${f.franjaId}`, f])).values()];
  const cond = unicas.map(() => "(fecha_servicio = ? AND franja_id = ?)").join(" OR ");
  await rows(
    tx,
    `SELECT 1 FROM ocupacion_franja WHERE ${cond} ORDER BY fecha_servicio, franja_id, sector_salon_id FOR UPDATE`,
    unicas.flatMap((f) => [f.fecha, f.franjaId]),
  );
}

async function moverAforo(tx: Tx, fecha: string, franjaId: number, sectorId: number, personas: number) {
  await exec(
    tx,
    "UPDATE ocupacion_franja SET personas_confirmadas = GREATEST(personas_confirmadas + ?, 0) WHERE fecha_servicio = ? AND franja_id = ? AND sector_salon_id = ?",
    [personas, fecha, franjaId, sectorId],
  );
}

/**
 * RF-R2: busca sector con aforo y mesa para el grupo (los contadores ya tienen que estar bloqueados).
 * Si se indica una mesa preferida y sigue sirviendo, se mantiene (al modificar, el cliente conserva su mesa).
 */
async function buscarLugar(
  tx: Tx,
  o: {
    sectores: number[];
    fecha: string;
    franjaId: number;
    personas: number;
    excluirReservaId?: number;
    preferida?: { mesaId: number; sectorId: number };
    sinSesionAbierta?: boolean;
    soloMesaId?: number;
  },
): Promise<{ sectorId: number; mesa: { id: number; numero: number; capacidad: number } }> {
  const orden = o.preferida
    ? [o.preferida.sectorId, ...o.sectores.filter((s) => s !== o.preferida!.sectorId)]
    : o.sectores;
  let huboAforo = false;
  for (const sectorId of orden) {
    const ocup = await one(
      tx,
      "SELECT personas_confirmadas FROM ocupacion_franja WHERE fecha_servicio = ? AND franja_id = ? AND sector_salon_id = ?",
      [o.fecha, o.franjaId, sectorId],
    );
    const aforo = await one(tx, "SELECT aforo_personas FROM aforos WHERE franja_id = ? AND sector_salon_id = ?", [
      o.franjaId,
      sectorId,
    ]);
    if ((aforo?.aforo_personas ?? 0) - (ocup?.personas_confirmadas ?? 0) < o.personas) continue;
    huboAforo = true;
    const libres = await mesasLibres(tx, {
      sectorId,
      fecha: o.fecha,
      franjaId: o.franjaId,
      personas: o.personas,
      excluirReservaId: o.excluirReservaId,
      sinSesionAbierta: o.sinSesionAbierta,
      soloMesaId: o.soloMesaId,
    });
    const misma = o.preferida && libres.find((m) => m.id === o.preferida!.mesaId);
    const mesa = misma ?? elegirMesa(libres, o.personas);
    if (mesa) return { sectorId, mesa };
  }
  if (o.soloMesaId)
    throw new ErrorDeDominio(
      409,
      "MESA_NO_DISPONIBLE",
      huboAforo
        ? `Esa mesa no está libre o no alcanza para ${o.personas} ${o.personas === 1 ? "persona" : "personas"}. Elegí otra.`
        : "En esta franja ya no queda aforo para ese grupo.",
    );
  throw huboAforo
    ? new ErrorDeDominio(
        409,
        "SIN_MESA_PARA_GRUPO",
        `No tenemos una mesa libre para ${o.personas} ${o.personas === 1 ? "persona" : "personas"} en ese horario. Probá con otro horario o llamanos.`,
      )
    : new ErrorDeDominio(
        409,
        "SIN_AFORO",
        "Para ese horario ya no tenemos lugar. Probá con otro horario o con otro día.",
      );
}

async function clienteId(tx: Tx, nombre: string, telefono: string): Promise<number> {
  const cli = await exec(
    tx,
    "INSERT INTO clientes (nombre, telefono) VALUES (?,?) ON CONFLICT (telefono) DO UPDATE SET telefono = EXCLUDED.telefono RETURNING id",
    [nombre, telefono],
  );
  return cli.insertId;
}

export interface NuevaReserva {
  nombre: string;
  telefono: string;
  personas: number;
  fecha: string;
  franjaId: number;
  comentarios?: string | undefined;
  origen: OrigenReserva;
  creadaPor?: number | null;
}

/** Qué se puede hacer con la reserva en este momento (el servidor vuelve a controlarlo en cada acción). */
export interface AccionesReserva {
  modificar: boolean;
  cancelar: boolean;
  llegada: boolean;
  noShow: boolean;
}

export interface ReservaDto {
  id: number;
  codigo: string;
  fecha: string;
  franja: FranjaDto;
  personas: number;
  aNombreDe: string;
  telefono: string;
  mesa: number;
  mesaId: number;
  sector: string;
  estado: string;
  origen: string;
  comentarios: string | null;
  llegadaEn: string | null;
  acciones: AccionesReserva;
}

const SELECT_RESERVA = `SELECT r.id, r.codigo, r.fecha_servicio, r.personas, r.a_nombre_de, c.telefono, r.estado, r.origen, r.comentarios,
       r.llegada_en, r.mesa_id, r.sector_salon_id, s.nombre AS sector,
       f.id AS franja_id, f.hora_inicio, f.duracion_min, m.numero AS mesa
  FROM reservas r JOIN franjas f ON f.id = r.franja_id JOIN mesas m ON m.id = r.mesa_id
  JOIN sectores_salon s ON s.id = r.sector_salon_id LEFT JOIN clientes c ON c.id = r.cliente_id`;

function acciones(x: Row, cfg: ConfigLocal, ahora: Date): AccionesReserva {
  const inicio = inicioFranjaUtc(x.fecha_servicio, x.hora_inicio, cfg.apertura);
  const fin = new Date(inicio.getTime() + Number(x.duracion_min) * 60_000);
  const hoy = fechaServicioActual(ahora, cfg.apertura, cfg.cierre);
  const confirmada = x.estado === "confirmada";
  return {
    modificar: confirmada && ahora < inicio,
    cancelar: confirmada && ahora < fin,
    llegada: confirmada && x.fecha_servicio === hoy && ahora < fin,
    noShow: confirmada && ahora >= new Date(inicio.getTime() + cfg.toleranciaNoShowMin * 60_000),
  };
}

function reservaDto(x: Row, cfg: ConfigLocal, ahora: Date): ReservaDto {
  return {
    id: Number(x.id),
    codigo: x.codigo,
    fecha: x.fecha_servicio,
    franja: franjaDto({ id: x.franja_id, hora_inicio: x.hora_inicio, duracion_min: x.duracion_min }),
    personas: x.personas,
    aNombreDe: x.a_nombre_de,
    telefono: x.telefono ?? "",
    mesa: x.mesa,
    mesaId: x.mesa_id,
    sector: x.sector,
    estado: x.estado,
    origen: x.origen,
    comentarios: x.comentarios,
    llegadaEn: x.llegada_en ? `${String(x.llegada_en).replace(" ", "T")}Z` : null,
    acciones: acciones(x, cfg, ahora),
  };
}

export async function leerReserva(db: Db | Tx, id: number, ahora = new Date()): Promise<ReservaDto> {
  const x = await one(db, `${SELECT_RESERVA} WHERE r.id = ?`, [id]);
  if (!x) throw new ErrorDeDominio(404, "RESERVA_NO_ENCONTRADA", "Esa reserva no existe.");
  return reservaDto(x, await leerConfigLocal(db), ahora);
}

export async function crearReserva(db: Db, n: NuevaReserva, ahora = new Date()): Promise<ReservaDto> {
  const cfg = await leerConfigLocal(db);
  validarFecha(n.fecha, cfg, ahora);
  const franja = await one(db, "SELECT id, hora_inicio, duracion_min FROM franjas WHERE id = ? AND activa = 1", [
    n.franjaId,
  ]);
  if (!franja) throw new ErrorDeDominio(400, "FRANJA_INVALIDA", "Ese horario no existe. Elegí uno de la lista.");
  if (ahora >= inicioFranjaUtc(n.fecha, franja.hora_inicio, cfg.apertura)) {
    throw new ErrorDeDominio(409, "FRANJA_PASADA", "Ese horario ya empezó. Elegí uno posterior.");
  }
  const sectores = await asegurarContadores(db, n.fecha, n.franjaId);
  const id = await withTx(db, async (tx) => {
    await bloquearContadores(tx, [{ fecha: n.fecha, franjaId: n.franjaId }]);
    const lugar = await buscarLugar(tx, { sectores, fecha: n.fecha, franjaId: n.franjaId, personas: n.personas });
    const cli = await clienteId(tx, n.nombre, n.telefono);
    const res = await exec(
      tx,
      "INSERT INTO reservas (codigo, fecha_servicio, franja_id, sector_salon_id, mesa_id, cliente_id, a_nombre_de, personas, origen, comentarios, creada_por) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [
        await codigoLibre(tx),
        n.fecha,
        n.franjaId,
        lugar.sectorId,
        lugar.mesa.id,
        cli,
        n.nombre,
        n.personas,
        n.origen,
        n.comentarios ?? null,
        n.creadaPor ?? null,
      ],
    );
    await moverAforo(tx, n.fecha, n.franjaId, lugar.sectorId, n.personas);
    return res.insertId;
  });
  return leerReserva(db, id, ahora);
}

export async function reservasDelDia(db: Db, fecha: string, ahora = new Date()): Promise<ReservaDto[]> {
  const cfg = await leerConfigLocal(db);
  const r = await rows(db, `${SELECT_RESERVA} WHERE r.fecha_servicio = ? ORDER BY f.orden, m.numero`, [fecha]);
  return r.map((x) => reservaDto(x, cfg, ahora));
}

/** RF-R4: búsqueda por nombre o teléfono en todas las fechas; primero las próximas, después las pasadas. */
export async function buscarReservas(db: Db, q: string, ahora = new Date()): Promise<ReservaDto[]> {
  const cfg = await leerConfigLocal(db);
  const hoy = fechaServicioActual(ahora, cfg.apertura, cfg.cierre);
  const digitos = normalizarTelefono(q);
  const sinAcentos = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const params: unknown[] = [`%${sinAcentos(q)}%`, q.trim().toUpperCase()];
  let porTelefono = "";
  if (digitos.length >= 4) {
    porTelefono = " OR c.telefono LIKE ?";
    params.push(`%${digitos}%`);
  }
  const r = await rows(
    db,
    `${SELECT_RESERVA}
      WHERE translate(lower(r.a_nombre_de), 'áéíóúüñ', 'aeiouun') LIKE ? OR r.codigo = ?${porTelefono}
      ORDER BY (r.fecha_servicio < ?), CASE WHEN r.fecha_servicio >= ? THEN r.fecha_servicio END ASC,
               r.fecha_servicio DESC, f.orden
      LIMIT 50`,
    [...params, hoy, hoy],
  );
  return r.map((x) => reservaDto(x, cfg, ahora));
}

async function reservaBloqueada(tx: Tx, id: number): Promise<Row> {
  const r = await one(
    tx,
    "SELECT r.*, f.hora_inicio, f.duracion_min FROM reservas r JOIN franjas f ON f.id = r.franja_id WHERE r.id = ?",
    [id],
  );
  if (!r) throw new ErrorDeDominio(404, "RESERVA_NO_ENCONTRADA", "Esa reserva no existe.");
  return r;
}

/** Los contadores se bloquearon con la franja leída antes de la transacción: si otra operación la movió, se reintenta. */
function exigirSinCambios(r: Row, leida: Row): void {
  if (r.fecha_servicio !== leida.fecha_servicio || r.franja_id !== leida.franja_id)
    throw new ErrorDeDominio(409, "RESERVA_CAMBIADA", "La reserva cambió mientras la editabas. Volvé a intentar.");
}

function exigirConfirmada(r: Row): void {
  const estados: Record<string, string> = {
    cancelada: "Esa reserva ya está cancelada.",
    no_show: "Esa reserva quedó como no-show.",
    cumplida: "El grupo de esa reserva ya llegó.",
  };
  if (r.estado !== "confirmada")
    throw new ErrorDeDominio(409, "RESERVA_NO_EDITABLE", estados[r.estado] ?? "Esa reserva no se puede cambiar.");
}

export interface CambiosReserva {
  nombre?: string | undefined;
  telefono?: string | undefined;
  personas?: number | undefined;
  fecha?: string | undefined;
  franjaId?: number | undefined;
  comentarios?: string | null | undefined;
}

/**
 * RF-R4: cambia día, horario o personas liberando el cupo anterior y tomando el nuevo en una sola transacción.
 * Si la mesa original sigue sirviendo, se conserva.
 */
export async function modificarReserva(db: Db, id: number, c: CambiosReserva, ahora = new Date()): Promise<ReservaDto> {
  const cfg = await leerConfigLocal(db);
  const actual = await one(db, "SELECT fecha_servicio, franja_id FROM reservas WHERE id = ?", [id]);
  if (!actual) throw new ErrorDeDominio(404, "RESERVA_NO_ENCONTRADA", "Esa reserva no existe.");
  const fecha = c.fecha ?? (actual.fecha_servicio as string);
  const franjaId = c.franjaId ?? (actual.franja_id as number);
  const cambiaLugar = c.fecha !== undefined || c.franjaId !== undefined || c.personas !== undefined;
  if (cambiaLugar) {
    validarFecha(fecha, cfg, ahora);
    const franja = await one(db, "SELECT hora_inicio FROM franjas WHERE id = ? AND activa = 1", [franjaId]);
    if (!franja) throw new ErrorDeDominio(400, "FRANJA_INVALIDA", "Ese horario no existe. Elegí uno de la lista.");
    if (ahora >= inicioFranjaUtc(fecha, franja.hora_inicio, cfg.apertura))
      throw new ErrorDeDominio(409, "FRANJA_PASADA", "Ese horario ya empezó. Elegí uno posterior.");
  }
  const sectores = await asegurarContadores(db, fecha, franjaId);
  await withTx(db, async (tx) => {
    // Contadores primero (mismo orden que el alta) y después la reserva.
    await bloquearContadores(tx, [
      { fecha: actual.fecha_servicio as string, franjaId: actual.franja_id as number },
      { fecha, franjaId },
    ]);
    await rows(tx, "SELECT id FROM reservas WHERE id = ? FOR UPDATE", [id]);
    const r = await reservaBloqueada(tx, id);
    exigirSinCambios(r, actual);
    exigirConfirmada(r);
    if (ahora >= inicioFranjaUtc(r.fecha_servicio, r.hora_inicio, cfg.apertura))
      throw new ErrorDeDominio(
        409,
        "RESERVA_EN_CURSO",
        "La franja de esa reserva ya empezó: se puede registrar la llegada, cancelar o marcar no-show, pero no cambiarla.",
      );
    const personas = c.personas ?? (r.personas as number);
    let sectorId = r.sector_salon_id as number;
    let mesaId = r.mesa_id as number;
    if (cambiaLugar) {
      await moverAforo(tx, r.fecha_servicio, r.franja_id, r.sector_salon_id, -r.personas);
      const lugar = await buscarLugar(tx, {
        sectores,
        fecha,
        franjaId,
        personas,
        excluirReservaId: id,
        preferida: { mesaId: r.mesa_id, sectorId: r.sector_salon_id },
      });
      sectorId = lugar.sectorId;
      mesaId = lugar.mesa.id;
      await moverAforo(tx, fecha, franjaId, sectorId, personas);
    }
    const nombre = c.nombre ?? (r.a_nombre_de as string);
    let cliente = r.cliente_id as number | null;
    if (c.telefono !== undefined) cliente = await clienteId(tx, nombre, c.telefono);
    await exec(
      tx,
      `UPDATE reservas SET fecha_servicio = ?, franja_id = ?, sector_salon_id = ?, mesa_id = ?, personas = ?,
              a_nombre_de = ?, cliente_id = ?, comentarios = ? WHERE id = ?`,
      [
        fecha,
        franjaId,
        sectorId,
        mesaId,
        personas,
        nombre,
        cliente,
        c.comentarios === undefined ? r.comentarios : c.comentarios || null,
        id,
      ],
    );
  });
  return leerReserva(db, id, ahora);
}

async function cambiarEstado(
  db: Db,
  id: number,
  ahora: Date,
  validar: (r: Row, cfg: ConfigLocal) => void,
  nuevo: "cancelada" | "no_show",
): Promise<ReservaDto> {
  const cfg = await leerConfigLocal(db);
  const actual = await one(db, "SELECT fecha_servicio, franja_id FROM reservas WHERE id = ?", [id]);
  if (!actual) throw new ErrorDeDominio(404, "RESERVA_NO_ENCONTRADA", "Esa reserva no existe.");
  await withTx(db, async (tx) => {
    await bloquearContadores(tx, [{ fecha: actual.fecha_servicio as string, franjaId: actual.franja_id as number }]);
    await rows(tx, "SELECT id FROM reservas WHERE id = ? FOR UPDATE", [id]);
    const r = await reservaBloqueada(tx, id);
    exigirSinCambios(r, actual);
    exigirConfirmada(r);
    validar(r, cfg);
    // El cupo vuelve a quedar disponible para otra reserva o para un walk-in.
    await moverAforo(tx, r.fecha_servicio, r.franja_id, r.sector_salon_id, -r.personas);
    await exec(
      tx,
      `UPDATE reservas SET estado = ?${nuevo === "cancelada" ? ", cancelada_en = CURRENT_TIMESTAMP(3)" : ""} WHERE id = ?`,
      [nuevo, id],
    );
  });
  return leerReserva(db, id, ahora);
}

/** RF-R4: cancelar libera la mesa y el aforo. */
export function cancelarReserva(db: Db, id: number, ahora = new Date()): Promise<ReservaDto> {
  return cambiarEstado(
    db,
    id,
    ahora,
    (r, cfg) => {
      const fin = inicioFranjaUtc(r.fecha_servicio, r.hora_inicio, cfg.apertura).getTime() + r.duracion_min * 60_000;
      if (ahora.getTime() >= fin)
        throw new ErrorDeDominio(409, "RESERVA_PASADA", "Esa franja ya terminó: si no vinieron, marcala como no-show.");
    },
    "cancelada",
  );
}

/** RF-R3: no-show recién cuando pasó la tolerancia desde el inicio de la franja; libera la mesa. */
export function marcarNoShow(db: Db, id: number, ahora = new Date()): Promise<ReservaDto> {
  return cambiarEstado(
    db,
    id,
    ahora,
    (r, cfg) => {
      const desde =
        inicioFranjaUtc(r.fecha_servicio, r.hora_inicio, cfg.apertura).getTime() + cfg.toleranciaNoShowMin * 60_000;
      if (ahora.getTime() < desde)
        throw new ErrorDeDominio(
          409,
          "NO_SHOW_ANTICIPADO",
          `Todavía no pasó la tolerancia de ${cfg.toleranciaNoShowMin} minutos desde el inicio de la franja.`,
        );
    },
    "no_show",
  );
}

/** RF-R3: llega el grupo de la reserva → la mesa pasa a ocupada y se abre su sesión (base del pedido por QR). */
export async function registrarLlegada(db: Db, id: number, usuarioId: number, ahora = new Date()): Promise<ReservaDto> {
  const cfg = await leerConfigLocal(db);
  await withTx(db, async (tx) => {
    await rows(tx, "SELECT id FROM reservas WHERE id = ? FOR UPDATE", [id]);
    const r = await reservaBloqueada(tx, id);
    exigirConfirmada(r);
    const hoy = fechaServicioActual(ahora, cfg.apertura, cfg.cierre);
    const fin = inicioFranjaUtc(r.fecha_servicio, r.hora_inicio, cfg.apertura).getTime() + r.duracion_min * 60_000;
    if (r.fecha_servicio !== hoy || ahora.getTime() >= fin)
      throw new ErrorDeDominio(
        409,
        "LLEGADA_FUERA_DE_FECHA",
        "La llegada se registra el día de la reserva, durante su franja o antes.",
      );
    await abrirSesionDeMesa(tx, r.mesa_id, id, usuarioId);
    await exec(tx, "UPDATE reservas SET estado = 'cumplida', llegada_en = CURRENT_TIMESTAMP(3) WHERE id = ?", [id]);
  });
  return leerReserva(db, id, ahora);
}

async function abrirSesionDeMesa(tx: Tx, mesaId: number, reservaId: number, usuarioId: number): Promise<void> {
  const abierta = await one(
    tx,
    "SELECT s.id, s.reserva_id, m.numero FROM sesiones_mesa s JOIN mesas m ON m.id = s.mesa_id WHERE s.mesa_id = ? AND s.estado = 'abierta'",
    [mesaId],
  );
  if (abierta) {
    if (abierta.reserva_id)
      throw new ErrorDeDominio(409, "MESA_OCUPADA", `La mesa ${abierta.numero} ya tiene un grupo sentado.`);
    // El mozo ya había abierto la mesa para este grupo: se vincula la sesión con la reserva.
    await exec(tx, "UPDATE sesiones_mesa SET reserva_id = ? WHERE id = ?", [reservaId, abierta.id]);
    return;
  }
  await exec(tx, "INSERT INTO sesiones_mesa (mesa_id, reserva_id, abierta_por) VALUES (?,?,?)", [
    mesaId,
    reservaId,
    usuarioId,
  ]);
}

/** Franja que está corriendo en `ahora` (o null si el local está entre franjas o cerrado). */
export async function franjaActual(db: Db | Tx, ahora = new Date()): Promise<{ fecha: string; franja: Row } | null> {
  const cfg = await leerConfigLocal(db);
  const fecha = fechaServicioActual(ahora, cfg.apertura, cfg.cierre);
  if (!localAbre(fecha, cfg.diasAtencion, cfg.diasCerrados)) return null;
  const franjas = await rows(
    db,
    "SELECT id, hora_inicio, duracion_min, orden FROM franjas WHERE activa = 1 ORDER BY orden",
  );
  for (const f of franjas) {
    const ini = inicioFranjaUtc(fecha, f.hora_inicio, cfg.apertura).getTime();
    if (ahora.getTime() >= ini && ahora.getTime() < ini + Number(f.duracion_min) * 60_000) return { fecha, franja: f };
  }
  return null;
}

/** RF-R3: grupo sin reserva. Toma aforo y mesa de la franja en curso, y la mesa queda ocupada con su sesión. */
export async function registrarWalkIn(
  db: Db,
  w: { personas: number; nombre?: string | undefined; mesaId?: number | undefined },
  usuarioId: number,
  ahora = new Date(),
): Promise<ReservaDto> {
  const actual = await franjaActual(db, ahora);
  if (!actual) throw new ErrorDeDominio(409, "SIN_FRANJA", "Ahora no hay una franja de atención en curso.");
  const { fecha, franja } = actual;
  const sectores = await asegurarContadores(db, fecha, franja.id);
  const id = await withTx(db, async (tx) => {
    await bloquearContadores(tx, [{ fecha, franjaId: franja.id }]);
    const lugar = await buscarLugar(tx, {
      sectores,
      fecha,
      franjaId: franja.id,
      personas: w.personas,
      sinSesionAbierta: true,
      soloMesaId: w.mesaId,
    });
    const res = await exec(
      tx,
      `INSERT INTO reservas (codigo, fecha_servicio, franja_id, sector_salon_id, mesa_id, cliente_id, a_nombre_de, personas, origen, estado, llegada_en, creada_por)
       VALUES (?,?,?,?,?,NULL,?,?,'walk_in','cumplida',CURRENT_TIMESTAMP(3),?)`,
      [
        await codigoLibre(tx),
        fecha,
        franja.id,
        lugar.sectorId,
        lugar.mesa.id,
        w.nombre || "Sin reserva",
        w.personas,
        usuarioId,
      ],
    );
    await moverAforo(tx, fecha, franja.id, lugar.sectorId, w.personas);
    await abrirSesionDeMesa(tx, lugar.mesa.id, res.insertId, usuarioId);
    return res.insertId;
  });
  return leerReserva(db, id, ahora);
}

export type EstadoMesa = "libre" | "reservada" | "ocupada";

export interface MesaSalon {
  id: number;
  numero: number;
  capacidad: number;
  sector: string;
  estado: EstadoMesa;
  /** Reserva confirmada o grupo sentado en esa franja. */
  reserva: ReservaDto | null;
  /** Hay un grupo sentado ahora sin reserva vinculada (lo abrió el mozo). */
  sesionSinReserva: boolean;
}

export interface EstadoSalon {
  fecha: string;
  franja: FranjaDto;
  franjas: (FranjaDto & { enCurso: boolean })[];
  enCurso: boolean;
  aforo: number;
  personas: number;
  conteo: Record<EstadoMesa, number>;
  mesas: MesaSalon[];
}

/** RF-R3: cada mesa libre, reservada u ocupada en una franja. «Ocupada» = grupo sentado (llegada o walk-in) o, en la franja en curso, sesión abierta. */
export async function estadoSalon(
  db: Db,
  fecha: string,
  franjaId: number | undefined,
  ahora = new Date(),
): Promise<EstadoSalon> {
  const cfg = await leerConfigLocal(db);
  const franjas = await rows(db, "SELECT id, hora_inicio, duracion_min FROM franjas WHERE activa = 1 ORDER BY orden");
  if (!franjas.length) throw new ErrorDeDominio(409, "SIN_FRANJAS", "No hay franjas activas en la planilla.");
  const actual = await franjaActual(db, ahora);
  const enCursoId = actual && actual.fecha === fecha ? (actual.franja.id as number) : null;
  // Por defecto: la franja en curso, o la próxima del día, o la primera.
  const proxima = franjas.find((f) => ahora < inicioFranjaUtc(fecha, f.hora_inicio, cfg.apertura));
  const f = franjas.find((x) => x.id === (franjaId ?? enCursoId ?? proxima?.id ?? franjas[0]!.id));
  if (!f) throw new ErrorDeDominio(400, "FRANJA_INVALIDA", "Ese horario no existe.");
  const enCurso = f.id === enCursoId;
  const mesas = await rows(
    db,
    `SELECT m.id, m.numero, m.capacidad, s.nombre AS sector,
            EXISTS (SELECT 1 FROM sesiones_mesa x WHERE x.mesa_id = m.id AND x.estado = 'abierta' AND x.reserva_id IS NULL) AS sesion_sin_reserva
       FROM mesas m JOIN sectores_salon s ON s.id = m.sector_salon_id WHERE m.activa = 1 ORDER BY m.numero`,
  );
  const reservas = await rows(
    db,
    `${SELECT_RESERVA} WHERE r.fecha_servicio = ? AND r.franja_id = ? AND r.estado IN ${OCUPA}`,
    [fecha, f.id],
  );
  const porMesa = new Map(reservas.map((x) => [x.mesa_id as number, reservaDto(x, cfg, ahora)]));
  const salida: MesaSalon[] = mesas.map((m) => {
    const reserva = porMesa.get(m.id as number) ?? null;
    const sesionSinReserva = enCurso && Number(m.sesion_sin_reserva) === 1;
    const estado: EstadoMesa =
      reserva?.estado === "cumplida" || sesionSinReserva ? "ocupada" : reserva ? "reservada" : "libre";
    return {
      id: m.id,
      numero: m.numero,
      capacidad: m.capacidad,
      sector: m.sector,
      estado,
      reserva,
      sesionSinReserva,
    };
  });
  const aforo = await one(db, "SELECT COALESCE(SUM(aforo_personas), 0) AS n FROM aforos WHERE franja_id = ?", [f.id]);
  return {
    fecha,
    franja: franjaDto(f),
    franjas: franjas.map((x) => ({ ...franjaDto(x), enCurso: x.id === enCursoId })),
    enCurso,
    aforo: Number(aforo?.n ?? 0),
    personas: reservas.reduce((a, x) => a + Number(x.personas), 0),
    conteo: {
      libre: salida.filter((m) => m.estado === "libre").length,
      reservada: salida.filter((m) => m.estado === "reservada").length,
      ocupada: salida.filter((m) => m.estado === "ocupada").length,
    },
    mesas: salida,
  };
}

export interface ResumenFranja extends FranjaDto {
  reservas: number;
  personas: number;
  aforo: number;
}

/** Inicio del panel: cuánto del aforo de cada franja está comprometido (reservas confirmadas y grupos sentados). */
export async function resumenDia(
  db: Db,
  fecha: string,
): Promise<{ fecha: string; reservas: number; personas: number; franjas: ResumenFranja[] }> {
  const franjas = await rows(
    db,
    `SELECT f.id, f.hora_inicio, f.duracion_min,
            COALESCE((SELECT SUM(a.aforo_personas) FROM aforos a WHERE a.franja_id = f.id), 0) AS aforo,
            COALESCE((SELECT COUNT(*) FROM reservas r WHERE r.franja_id = f.id AND r.fecha_servicio = ? AND r.estado IN ${OCUPA}), 0) AS reservas,
            COALESCE((SELECT SUM(r.personas) FROM reservas r WHERE r.franja_id = f.id AND r.fecha_servicio = ? AND r.estado IN ${OCUPA}), 0) AS personas
       FROM franjas f WHERE f.activa = 1 ORDER BY f.orden`,
    [fecha, fecha],
  );
  const out = franjas.map((f) => ({
    ...franjaDto({ id: f.id, hora_inicio: f.hora_inicio, duracion_min: f.duracion_min }),
    reservas: Number(f.reservas),
    personas: Number(f.personas),
    aforo: Number(f.aforo),
  }));
  return {
    fecha,
    reservas: out.reduce((a, b) => a + b.reservas, 0),
    personas: out.reduce((a, b) => a + b.personas, 0),
    franjas: out,
  };
}
