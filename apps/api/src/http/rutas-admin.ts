import { Router } from "express";
import type { Request } from "express";
import { PERMISOS_POR_ROL, aforoEdicionSchema, mesaEdicionSchema, mesaNuevaSchema, parametroEdicionSchema, reservaInternaSchema, tipoSolicitudEdicionSchema, usuarioNuevoSchema } from "@dv/shared";
import { z } from "zod";
import type { Config } from "../config.ts";
import type { Db } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { listarAuditoria, registrarAuditoria } from "../services/auditoria.ts";
import { abrirSesion, cerrarSesion, crearMesa, editarMesa, listarMesas, qrDeTodas, qrSvgDeMesa, regenerarQr } from "../services/mesas.ts";
import { editarAforo, editarParametro, editarTipoSolicitud, planilla, validarElemento } from "../services/parametros.ts";
import { crearReserva, leerConfigLocal, reservasDelDia, resumenDia } from "../services/reservas.ts";
import { cambiarActivo, crearUsuario, listarUsuarios } from "../services/usuarios.ts";
import { fechaServicioActual } from "../domain/tiempo.ts";
import { exigirPermiso, idParam, parsear } from "./middleware.ts";

const fechaQuery = z.object({ fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export function rutasAdmin(db: Db, cfg: Config, ahora: () => Date): Router {
  const r = Router();
  const base = (req: Request): string => cfg.PUBLIC_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  const diaActual = async (): Promise<string> => {
    const c = await leerConfigLocal(db);
    return fechaServicioActual(ahora(), c.apertura, c.cierre);
  };
  const actor = (req: Request): number => req.sesion!.usuario.id;

  // Reservas (RF-R1, RF-R2)
  r.get("/resumen", exigirPermiso(db, "reservas:ver"), async (req, res) => {
    const q = parsear(fechaQuery, req.query);
    res.json(await resumenDia(db, q.fecha ?? (await diaActual())));
  });
  r.get("/reservas", exigirPermiso(db, "reservas:ver"), async (req, res) => {
    const q = parsear(fechaQuery, req.query);
    const fecha = q.fecha ?? (await diaActual());
    res.json({ fecha, reservas: await reservasDelDia(db, fecha) });
  });
  r.post("/reservas", exigirPermiso(db, "reservas:crear"), async (req, res) => {
    const d = parsear(reservaInternaSchema, req.body);
    const reserva = await crearReserva(db, { ...d, creadaPor: actor(req) }, ahora());
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "reserva:crear", recurso: reserva.codigo, resultado: "permitido", ip: req.ip });
    res.status(201).json(reserva);
  });

  // Mesas, QR y sesión de mesa
  r.get("/mesas", exigirPermiso(db, "mesas:ver"), async (_req, res) => {
    res.json({ mesas: await listarMesas(db) });
  });
  r.post("/mesas", exigirPermiso(db, "mesas:administrar"), async (req, res) => {
    const mesa = await crearMesa(db, parsear(mesaNuevaSchema, req.body));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "mesa:crear", recurso: `mesa ${mesa.numero}`, resultado: "permitido", ip: req.ip });
    res.status(201).json(mesa);
  });
  r.patch("/mesas/:id", exigirPermiso(db, "mesas:administrar"), async (req, res) => {
    const id = idParam(req.params.id);
    const mesa = await editarMesa(db, id, parsear(mesaEdicionSchema, req.body));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "mesa:editar", recurso: `mesa ${mesa.numero}`, resultado: "permitido", detalle: req.body as Record<string, unknown>, ip: req.ip });
    res.json(mesa);
  });
  r.post("/mesas/:id/qr", exigirPermiso(db, "qr:generar"), async (req, res) => {
    const mesa = await regenerarQr(db, idParam(req.params.id));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "qr:regenerar", recurso: `mesa ${mesa.numero}`, resultado: "permitido", ip: req.ip });
    res.json(mesa);
  });
  r.get("/mesas/:id/qr.svg", exigirPermiso(db, "qr:generar"), async (req, res) => {
    const q = await qrSvgDeMesa(db, idParam(req.params.id), base(req));
    res.type("image/svg+xml").set("Content-Disposition", `inline; filename="mesa-${q.numero}.svg"`).send(q.svg);
  });
  r.get("/qr", exigirPermiso(db, "qr:generar"), async (req, res) => {
    res.json({ codigos: await qrDeTodas(db, base(req)) });
  });
  r.get("/sesiones/mesas", exigirPermiso(db, "sesion_mesa:abrir"), async (_req, res) => {
    res.json({ mesas: (await listarMesas(db)).filter((m) => m.activa).map((m) => ({ id: m.id, numero: m.numero, sesionAbierta: m.sesionAbierta })) });
  });
  r.post("/mesas/:id/sesion", exigirPermiso(db, "sesion_mesa:abrir"), async (req, res) => {
    const s = await abrirSesion(db, idParam(req.params.id), actor(req));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "sesion_mesa:abrir", recurso: `mesa ${s.numero}`, resultado: "permitido", detalle: { yaExistia: s.yaExistia }, ip: req.ip });
    res.status(s.yaExistia ? 200 : 201).json(s);
  });
  r.delete("/mesas/:id/sesion", exigirPermiso(db, "sesion_mesa:cerrar"), async (req, res) => {
    await cerrarSesion(db, idParam(req.params.id));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "sesion_mesa:cerrar", recurso: `mesa id ${req.params.id}`, resultado: "permitido", ip: req.ip });
    res.status(204).end();
  });

  // Planilla de parametrización (H2)
  r.get("/parametros", exigirPermiso(db, "parametros:ver"), async (_req, res) => {
    res.json(await planilla(db));
  });
  r.put("/parametros/:clave", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const { valor } = parsear(parametroEdicionSchema, req.body);
    await editarParametro(db, String(req.params.clave), valor, actor(req));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "parametro:editar", recurso: String(req.params.clave), resultado: "permitido", detalle: { valor }, ip: req.ip });
    res.status(204).end();
  });
  r.put("/aforos/:franjaId/:sectorId", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const { aforoPersonas } = parsear(aforoEdicionSchema, req.body);
    await editarAforo(db, idParam(req.params.franjaId), idParam(req.params.sectorId), aforoPersonas);
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "aforo:editar", recurso: `franja ${req.params.franjaId} sector ${req.params.sectorId}`, resultado: "permitido", detalle: { aforoPersonas }, ip: req.ip });
    res.status(204).end();
  });
  r.put("/tipos-solicitud/:id", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const { tiempoMaximoMin } = parsear(tipoSolicitudEdicionSchema, req.body);
    await editarTipoSolicitud(db, idParam(req.params.id), tiempoMaximoMin);
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "tipo_solicitud:editar", recurso: `tipo ${req.params.id}`, resultado: "permitido", detalle: { tiempoMaximoMin }, ip: req.ip });
    res.status(204).end();
  });
  r.post("/parametros-validar", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const d = parsear(z.object({ tipo: z.enum(["parametro", "mesa", "franja", "aforo", "tipo_solicitud", "sector_salon"]), id: z.string().min(1).max(60) }), req.body);
    await validarElemento(db, d.tipo, d.id, actor(req));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "parametro:validar", recurso: `${d.tipo} ${d.id}`, resultado: "permitido", ip: req.ip });
    res.status(204).end();
  });

  // Usuarios y roles
  r.get("/usuarios", exigirPermiso(db, "usuarios:administrar"), async (_req, res) => {
    res.json({ usuarios: await listarUsuarios(db), permisosPorRol: PERMISOS_POR_ROL });
  });
  r.post("/usuarios", exigirPermiso(db, "usuarios:administrar"), async (req, res) => {
    const u = await crearUsuario(db, parsear(usuarioNuevoSchema, req.body));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: "usuario:crear", recurso: u.usuario, resultado: "permitido", detalle: { rol: u.rol }, ip: req.ip });
    res.status(201).json(u);
  });
  r.patch("/usuarios/:id/activo", exigirPermiso(db, "usuarios:administrar"), async (req, res) => {
    const { activo } = parsear(z.object({ activo: z.boolean() }), req.body);
    await cambiarActivo(db, idParam(req.params.id), activo, actor(req));
    await registrarAuditoria(db, { usuarioId: actor(req), accion: activo ? "usuario:activar" : "usuario:desactivar", recurso: `usuario ${req.params.id}`, resultado: "permitido", ip: req.ip });
    res.status(204).end();
  });

  r.get("/auditoria", exigirPermiso(db, "auditoria:ver"), async (req, res) => {
    res.json({ eventos: await listarAuditoria(db, 100, req.query.denegados === "1") });
  });

  r.use((_req, _res) => {
    throw new ErrorDeDominio(404, "NO_ENCONTRADO", "Ruta inexistente.");
  });
  return r;
}
