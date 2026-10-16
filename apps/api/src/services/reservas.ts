import { randomInt } from "node:crypto";
import type { OrigenReserva } from "@dv/shared";
import { DIA_NOMBRE, diaDeSemana, localAbre, parsearFechas } from "@dv/shared";
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

export async function leerConfigLocal(db: Db): Promise<ConfigLocal> {
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
      const libres = await mesasLibres(db, s.id, fecha, f.id, personas);
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

async function mesasLibres(db: Db | Tx, sectorId: number, fecha: string, franjaId: number, personas: number) {
  const r = await rows(
    db,
    `SELECT m.id, m.numero, m.capacidad FROM mesas m
      WHERE m.sector_salon_id = ? AND m.activa = 1 AND m.capacidad >= ?
        AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.mesa_id = m.id AND r.fecha_servicio = ? AND r.franja_id = ? AND r.estado = 'confirmada')`,
    [sectorId, personas, fecha, franjaId],
  );
  return r.map((x) => ({ id: x.id as number, numero: x.numero as number, capacidad: x.capacidad as number }));
}

const ALFABETO = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
function nuevoCodigo(): string {
  return Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
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

export interface ReservaDto {
  id: number;
  codigo: string;
  fecha: string;
  franja: FranjaDto;
  personas: number;
  aNombreDe: string;
  telefono: string;
  mesa: number;
  estado: string;
  origen: string;
  comentarios: string | null;
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
  const sectores = await rows(db, "SELECT id FROM sectores_salon WHERE activo = 1 ORDER BY id");
  // Las filas contador se crean antes de la transacción para que el bloqueo posterior sea de registro y no de rango.
  for (const s of sectores) {
    await exec(
      db,
      "INSERT INTO ocupacion_franja (fecha_servicio, franja_id, sector_salon_id, personas_confirmadas) VALUES (?,?,?,0) ON CONFLICT DO NOTHING",
      [n.fecha, n.franjaId, s.id],
    );
  }
  return withTx(db, async (tx) => {
    let huboAforo = false;
    for (const s of sectores) {
      const ocup = await one(
        tx,
        "SELECT personas_confirmadas FROM ocupacion_franja WHERE fecha_servicio = ? AND franja_id = ? AND sector_salon_id = ? FOR UPDATE",
        [n.fecha, n.franjaId, s.id],
      );
      const aforo = await one(tx, "SELECT aforo_personas FROM aforos WHERE franja_id = ? AND sector_salon_id = ?", [
        n.franjaId,
        s.id,
      ]);
      if ((aforo?.aforo_personas ?? 0) - (ocup?.personas_confirmadas ?? 0) < n.personas) continue;
      huboAforo = true;
      const mesa = elegirMesa(await mesasLibres(tx, s.id, n.fecha, n.franjaId, n.personas), n.personas);
      if (!mesa) continue;
      const cli = await exec(
        tx,
        "INSERT INTO clientes (nombre, telefono) VALUES (?,?) ON CONFLICT (telefono) DO UPDATE SET telefono = EXCLUDED.telefono RETURNING id",
        [n.nombre, n.telefono],
      );
      let codigo = nuevoCodigo();
      for (let i = 0; i < 5 && (await one(tx, "SELECT 1 FROM reservas WHERE codigo = ?", [codigo])); i++)
        codigo = nuevoCodigo();
      const res = await exec(
        tx,
        "INSERT INTO reservas (codigo, fecha_servicio, franja_id, sector_salon_id, mesa_id, cliente_id, a_nombre_de, personas, origen, comentarios, creada_por) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          codigo,
          n.fecha,
          n.franjaId,
          s.id,
          mesa.id,
          cli.insertId,
          n.nombre,
          n.personas,
          n.origen,
          n.comentarios ?? null,
          n.creadaPor ?? null,
        ],
      );
      await exec(
        tx,
        "UPDATE ocupacion_franja SET personas_confirmadas = personas_confirmadas + ? WHERE fecha_servicio = ? AND franja_id = ? AND sector_salon_id = ?",
        [n.personas, n.fecha, n.franjaId, s.id],
      );
      return {
        id: res.insertId,
        codigo,
        fecha: n.fecha,
        franja: franjaDto(franja),
        personas: n.personas,
        aNombreDe: n.nombre,
        telefono: n.telefono,
        mesa: mesa.numero,
        estado: "confirmada",
        origen: n.origen,
        comentarios: n.comentarios ?? null,
      };
    }
    throw huboAforo
      ? new ErrorDeDominio(
          409,
          "SIN_MESA_PARA_GRUPO",
          `No tenemos una mesa libre para ${n.personas} ${n.personas === 1 ? "persona" : "personas"} en ese horario. Probá con otro horario o llamanos.`,
        )
      : new ErrorDeDominio(
          409,
          "SIN_AFORO",
          "Para ese horario ya no tenemos lugar. Probá con otro horario o con otro día.",
        );
  });
}

export async function reservasDelDia(db: Db, fecha: string): Promise<ReservaDto[]> {
  const r = await rows(
    db,
    `SELECT r.id, r.codigo, r.fecha_servicio, r.personas, r.a_nombre_de, c.telefono, r.estado, r.origen, r.comentarios,
            f.id AS franja_id, f.hora_inicio, f.duracion_min, m.numero AS mesa
       FROM reservas r JOIN franjas f ON f.id = r.franja_id JOIN mesas m ON m.id = r.mesa_id JOIN clientes c ON c.id = r.cliente_id
      WHERE r.fecha_servicio = ? ORDER BY f.orden, m.numero`,
    [fecha],
  );
  return r.map((x) => ({
    id: Number(x.id),
    codigo: x.codigo,
    fecha: x.fecha_servicio,
    franja: franjaDto({ id: x.franja_id, hora_inicio: x.hora_inicio, duracion_min: x.duracion_min }),
    personas: x.personas,
    aNombreDe: x.a_nombre_de,
    telefono: x.telefono,
    mesa: x.mesa,
    estado: x.estado,
    origen: x.origen,
    comentarios: x.comentarios,
  }));
}

export interface ResumenFranja extends FranjaDto {
  reservas: number;
  personas: number;
  aforo: number;
}

/** Inicio del panel: cuánto del aforo de cada franja está comprometido (control de aforo; no es el estado de mesas del Hito 3). */
export async function resumenDia(
  db: Db,
  fecha: string,
): Promise<{ fecha: string; reservas: number; personas: number; franjas: ResumenFranja[] }> {
  const franjas = await rows(
    db,
    `SELECT f.id, f.hora_inicio, f.duracion_min,
            COALESCE((SELECT SUM(a.aforo_personas) FROM aforos a WHERE a.franja_id = f.id), 0) AS aforo,
            COALESCE((SELECT COUNT(*) FROM reservas r WHERE r.franja_id = f.id AND r.fecha_servicio = ? AND r.estado = 'confirmada'), 0) AS reservas,
            COALESCE((SELECT SUM(r.personas) FROM reservas r WHERE r.franja_id = f.id AND r.fecha_servicio = ? AND r.estado = 'confirmada'), 0) AS personas
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
