import { Router } from "express";
import type { Request } from "express";
import {
  PERMISOS_POR_ROL,
  aforoEdicionSchema,
  busquedaReservasSchema,
  estadoItemSchema,
  pedidoSchema,
  productoEdicionSchema,
  SECTOR_DE_ROL,
  varianteEdicionSchema,
  mesaEdicionSchema,
  mesaNuevaSchema,
  parametroEdicionSchema,
  reservaEdicionSchema,
  reservaInternaSchema,
  tipoSolicitudEdicionSchema,
  usuarioNuevoSchema,
  walkInSchema,
} from "@dv/shared";
import { z } from "zod";
import type { Config } from "../config.ts";
import type { Db } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { listarAuditoria, registrarAuditoria } from "../services/auditoria.ts";
import {
  abrirSesion,
  cerrarSesion,
  crearMesa,
  editarMesa,
  listarMesas,
  qrDeTodas,
  qrSvgDeMesa,
  regenerarQr,
} from "../services/mesas.ts";
import {
  editarAforo,
  editarParametro,
  editarTipoSolicitud,
  planilla,
  validarElemento,
} from "../services/parametros.ts";
import {
  buscarReservas,
  cancelarReserva,
  crearReserva,
  estadoSalon,
  leerConfigLocal,
  leerReserva,
  marcarNoShow,
  modificarReserva,
  registrarLlegada,
  registrarWalkIn,
  reservasDelDia,
  resumenDia,
} from "../services/reservas.ts";
import { cambiarActivo, crearUsuario, listarUsuarios } from "../services/usuarios.ts";
import { resumenMedicion } from "../services/medicion.ts";
import {
  cambiarEstadoItem,
  cartaAdmin,
  crearPedido,
  editarDisponible,
  editarPrecio,
  itemsActivos,
  mesasAbiertas,
  sesionAbiertaDeMesa,
} from "../services/pedidos.ts";
import { fechaServicioActual } from "../domain/tiempo.ts";
import { exigirPermiso, idParam, parsear } from "./middleware.ts";

const fechaQuery = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export function rutasAdmin(db: Db, cfg: Config, ahora: () => Date): Router {
  const r = Router();
  const base = (req: Request): string => cfg.PUBLIC_BASE_URL ?? `${req.protocol}://${req.get("host")}`;
  const diaActual = async (): Promise<string> => {
    const c = await leerConfigLocal(db);
    return fechaServicioActual(ahora(), c.apertura, c.cierre);
  };
  const actor = (req: Request): number => req.sesion!.usuario.id;
  /** Ejecuta la acción y, si la jerarquía la rechaza, deja el intento registrado en la auditoría (RNF-3). */
  async function conAuditoriaDenegada<T>(req: Request, accion: string, recurso: string, f: () => Promise<T>) {
    try {
      return await f();
    } catch (e) {
      if (e instanceof ErrorDeDominio && e.codigo === "JERARQUIA")
        await registrarAuditoria(db, { usuarioId: actor(req), accion, recurso, resultado: "denegado", ip: req.ip });
      throw e;
    }
  }

  // Reservas (RF-R1, RF-R2)
  r.get("/resumen", exigirPermiso(db, "reservas:ver"), async (req, res) => {
    const q = parsear(fechaQuery, req.query);
    res.json(await resumenDia(db, q.fecha ?? (await diaActual())));
  });
  r.get("/reservas", exigirPermiso(db, "reservas:ver"), async (req, res) => {
    const q = parsear(fechaQuery, req.query);
    const fecha = q.fecha ?? (await diaActual());
    res.json({ fecha, reservas: await reservasDelDia(db, fecha, ahora()) });
  });
  // RF-R4: buscar en todas las fechas, ver, modificar, cancelar y no-show
  r.get("/reservas/buscar", exigirPermiso(db, "reservas:ver"), async (req, res) => {
    const { q } = parsear(busquedaReservasSchema, req.query);
    res.json({ q, reservas: await buscarReservas(db, q, ahora()) });
  });
  r.get("/reservas/:id", exigirPermiso(db, "reservas:ver"), async (req, res) => {
    res.json(await leerReserva(db, idParam(req.params.id), ahora()));
  });
  r.patch("/reservas/:id", exigirPermiso(db, "reservas:editar"), async (req, res) => {
    const cambios = parsear(reservaEdicionSchema, req.body);
    const reserva = await modificarReserva(db, idParam(req.params.id), cambios, ahora());
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "reserva:modificar",
      recurso: reserva.codigo,
      resultado: "permitido",
      detalle: cambios as Record<string, unknown>,
      ip: req.ip,
    });
    res.json(reserva);
  });
  const transicion = (
    ruta: string,
    permiso: "reservas:editar" | "salon:operar",
    accion: string,
    f: (id: number, req: Request) => ReturnType<typeof leerReserva>,
  ) =>
    r.post(`/reservas/:id/${ruta}`, exigirPermiso(db, permiso), async (req, res) => {
      const reserva = await f(idParam(req.params.id), req);
      await registrarAuditoria(db, {
        usuarioId: actor(req),
        accion,
        recurso: reserva.codigo,
        resultado: "permitido",
        ip: req.ip,
      });
      res.json(reserva);
    });
  transicion("cancelar", "reservas:editar", "reserva:cancelar", (id) => cancelarReserva(db, id, ahora()));
  transicion("no-show", "reservas:editar", "reserva:no_show", (id) => marcarNoShow(db, id, ahora()));
  transicion("llegada", "salon:operar", "reserva:llegada", (id, req) => registrarLlegada(db, id, actor(req), ahora()));

  // RF-R3: estado del salón por franja y walk-in
  r.get("/salon", exigirPermiso(db, "salon:operar"), async (req, res) => {
    const q = parsear(fechaQuery.extend({ franjaId: z.coerce.number().int().positive().optional() }), req.query);
    res.json(await estadoSalon(db, q.fecha ?? (await diaActual()), q.franjaId, ahora()));
  });
  r.post("/salon/walk-in", exigirPermiso(db, "salon:operar"), async (req, res) => {
    const d = parsear(walkInSchema, req.body);
    const reserva = await registrarWalkIn(db, d, actor(req), ahora());
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "reserva:walk_in",
      recurso: reserva.codigo,
      resultado: "permitido",
      detalle: { personas: d.personas, mesa: reserva.mesa },
      ip: req.ip,
    });
    res.status(201).json(reserva);
  });
  r.post("/reservas", exigirPermiso(db, "reservas:crear"), async (req, res) => {
    const d = parsear(reservaInternaSchema, req.body);
    const reserva = await crearReserva(db, { ...d, creadaPor: actor(req) }, ahora());
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "reserva:crear",
      recurso: reserva.codigo,
      resultado: "permitido",
      ip: req.ip,
    });
    res.status(201).json(reserva);
  });

  // Mesas, QR y sesión de mesa
  r.get("/mesas", exigirPermiso(db, "mesas:ver"), async (_req, res) => {
    res.json({ mesas: await listarMesas(db) });
  });
  r.post("/mesas", exigirPermiso(db, "mesas:administrar"), async (req, res) => {
    const mesa = await crearMesa(db, parsear(mesaNuevaSchema, req.body));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "mesa:crear",
      recurso: `mesa ${mesa.numero}`,
      resultado: "permitido",
      ip: req.ip,
    });
    res.status(201).json(mesa);
  });
  r.patch("/mesas/:id", exigirPermiso(db, "mesas:administrar"), async (req, res) => {
    const id = idParam(req.params.id);
    const mesa = await editarMesa(db, id, parsear(mesaEdicionSchema, req.body));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "mesa:editar",
      recurso: `mesa ${mesa.numero}`,
      resultado: "permitido",
      detalle: req.body as Record<string, unknown>,
      ip: req.ip,
    });
    res.json(mesa);
  });
  r.post("/mesas/:id/qr", exigirPermiso(db, "qr:generar"), async (req, res) => {
    const mesa = await regenerarQr(db, idParam(req.params.id));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "qr:regenerar",
      recurso: `mesa ${mesa.numero}`,
      resultado: "permitido",
      ip: req.ip,
    });
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
    res.json({
      mesas: (await listarMesas(db))
        .filter((m) => m.activa)
        .map((m) => ({ id: m.id, numero: m.numero, sesionAbierta: m.sesionAbierta })),
    });
  });
  r.post("/mesas/:id/sesion", exigirPermiso(db, "sesion_mesa:abrir"), async (req, res) => {
    const s = await abrirSesion(db, idParam(req.params.id), actor(req));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "sesion_mesa:abrir",
      recurso: `mesa ${s.numero}`,
      resultado: "permitido",
      detalle: { yaExistia: s.yaExistia },
      ip: req.ip,
    });
    res.status(s.yaExistia ? 200 : 201).json(s);
  });
  r.delete("/mesas/:id/sesion", exigirPermiso(db, "sesion_mesa:cerrar"), async (req, res) => {
    await cerrarSesion(db, idParam(req.params.id));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "sesion_mesa:cerrar",
      recurso: `mesa id ${req.params.id}`,
      resultado: "permitido",
      ip: req.ip,
    });
    res.status(204).end();
  });

  // Planilla de parametrización (H2)
  r.get("/parametros", exigirPermiso(db, "parametros:ver"), async (_req, res) => {
    res.json(await planilla(db));
  });
  r.put("/parametros/:clave", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const { valor } = parsear(parametroEdicionSchema, req.body);
    await editarParametro(db, String(req.params.clave), valor, actor(req));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "parametro:editar",
      recurso: String(req.params.clave),
      resultado: "permitido",
      detalle: { valor },
      ip: req.ip,
    });
    res.status(204).end();
  });
  r.put("/aforos/:franjaId/:sectorId", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const { aforoPersonas } = parsear(aforoEdicionSchema, req.body);
    await editarAforo(db, idParam(req.params.franjaId), idParam(req.params.sectorId), aforoPersonas);
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "aforo:editar",
      recurso: `franja ${req.params.franjaId} sector ${req.params.sectorId}`,
      resultado: "permitido",
      detalle: { aforoPersonas },
      ip: req.ip,
    });
    res.status(204).end();
  });
  r.put("/tipos-solicitud/:id", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    const { tiempoMaximoMin } = parsear(tipoSolicitudEdicionSchema, req.body);
    await editarTipoSolicitud(db, idParam(req.params.id), tiempoMaximoMin);
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "tipo_solicitud:editar",
      recurso: `tipo ${req.params.id}`,
      resultado: "permitido",
      detalle: { tiempoMaximoMin },
      ip: req.ip,
    });
    res.status(204).end();
  });
  r.post("/parametros-validar", exigirPermiso(db, "parametros:editar"), async (req, res) => {
    if (req.sesion!.usuario.rol !== "encargado") {
      throw new ErrorDeDominio(
        403,
        "SOLO_ENCARGADO",
        "Solo el Encargado de Salón puede validar los valores de la planilla.",
      );
    }
    const d = parsear(
      z.object({
        tipo: z.enum(["parametro", "mesa", "franja", "aforo", "tipo_solicitud", "sector_salon"]),
        id: z.string().min(1).max(60),
      }),
      req.body,
    );
    await validarElemento(db, d.tipo, d.id, actor(req));
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "parametro:validar",
      recurso: `${d.tipo} ${d.id}`,
      resultado: "permitido",
      ip: req.ip,
    });
    res.status(204).end();
  });

  // Usuarios y roles
  r.get("/usuarios", exigirPermiso(db, "usuarios:administrar"), async (_req, res) => {
    res.json({ usuarios: await listarUsuarios(db), permisosPorRol: PERMISOS_POR_ROL });
  });
  r.post("/usuarios", exigirPermiso(db, "usuarios:administrar"), async (req, res) => {
    const datos = parsear(usuarioNuevoSchema, req.body);
    const u = await conAuditoriaDenegada(req, "usuario:crear", datos.usuario, () =>
      crearUsuario(db, datos, req.sesion!.usuario.rol),
    );
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "usuario:crear",
      recurso: u.usuario,
      resultado: "permitido",
      detalle: { rol: u.rol },
      ip: req.ip,
    });
    res.status(201).json(u);
  });
  r.patch("/usuarios/:id/activo", exigirPermiso(db, "usuarios:administrar"), async (req, res) => {
    const { activo } = parsear(z.object({ activo: z.boolean() }), req.body);
    await conAuditoriaDenegada(req, activo ? "usuario:activar" : "usuario:desactivar", `usuario ${req.params.id}`, () =>
      cambiarActivo(db, idParam(req.params.id), activo, actor(req), req.sesion!.usuario.rol),
    );
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: activo ? "usuario:activar" : "usuario:desactivar",
      recurso: `usuario ${req.params.id}`,
      resultado: "permitido",
      ip: req.ip,
    });
    res.status(204).end();
  });

  // Hito 4: paneles de cocina, parrilla y barra (RF-Q2, RF-Q3)
  r.get("/sectores/items", exigirPermiso(db, ["panel_sector:ver", "pedidos:ver"]), async (req, res) => {
    const q = parsear(z.object({ sector: z.enum(["cocina", "parrilla", "barra"]).optional() }), req.query);
    // Cada puesto ve solo su sector, aunque pida otro.
    const fijo = SECTOR_DE_ROL[req.sesion!.usuario.rol];
    const sector = fijo ?? q.sector ?? null;
    res.set("Cache-Control", "no-store");
    res.json({ sector, fijo: Boolean(fijo), items: await itemsActivos(db, sector, ahora()) });
  });
  r.post("/items/:id/estado", exigirPermiso(db, ["panel_sector:ver", "pedidos:tomar"]), async (req, res) => {
    const { estado } = parsear(estadoItemSchema, req.body);
    const item = await cambiarEstadoItem(db, idParam(req.params.id), estado, req.sesion!.usuario.rol);
    if (estado === "cancelado")
      await registrarAuditoria(db, {
        usuarioId: actor(req),
        accion: "pedido_item:cancelar",
        recurso: `ítem ${item.id}`,
        resultado: "permitido",
        ip: req.ip,
      });
    res.json(item);
  });
  // RF-Q4: el mozo carga el pedido de una mesa con sesión abierta; sigue el mismo circuito que el del QR.
  r.get("/pedidos/mesas", exigirPermiso(db, "pedidos:tomar"), async (_req, res) => {
    res.json({ mesas: await mesasAbiertas(db) });
  });
  r.post("/mesas/:id/pedidos", exigirPermiso(db, "pedidos:tomar"), async (req, res) => {
    const d = parsear(pedidoSchema, req.body);
    const sesion = await sesionAbiertaDeMesa(db, idParam(req.params.id));
    res.status(201).json(await crearPedido(db, sesion, d.items, "mozo", actor(req)));
  });

  // Carta y precios (H4): lo que se edita acá se ve en el sitio y en el QR
  r.get("/carta", exigirPermiso(db, ["carta:editar", "parametros:ver"]), async (_req, res) => {
    res.json({ productos: await cartaAdmin(db) });
  });
  r.put("/carta/variantes/:id", exigirPermiso(db, "carta:editar"), async (req, res) => {
    const { precio } = parsear(varianteEdicionSchema, req.body);
    const c = await editarPrecio(db, idParam(req.params.id), precio);
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: "carta:precio",
      recurso: `${c.producto}${c.etiqueta !== "única" && c.etiqueta !== "único" ? ` (${c.etiqueta})` : ""}`,
      resultado: "permitido",
      detalle: { antes: c.antes, despues: c.despues },
      ip: req.ip,
    });
    res.json(c);
  });
  r.put("/carta/productos/:id", exigirPermiso(db, "carta:editar"), async (req, res) => {
    const { disponible } = parsear(productoEdicionSchema, req.body);
    const nombre = await editarDisponible(db, idParam(req.params.id), disponible);
    await registrarAuditoria(db, {
      usuarioId: actor(req),
      accion: disponible ? "carta:disponible" : "carta:agotado",
      recurso: nombre,
      resultado: "permitido",
      ip: req.ip,
    });
    res.status(204).end();
  });

  // RF-W3: medición del sitio (anónima y agregada)
  r.get("/medicion", exigirPermiso(db, "medicion:ver"), async (req, res) => {
    const { dias } = parsear(z.object({ dias: z.coerce.number().int().min(1).max(90).default(30) }), req.query);
    res.json(await resumenMedicion(db, dias, ahora()));
  });

  r.get("/auditoria", exigirPermiso(db, "auditoria:ver"), async (req, res) => {
    res.json({ eventos: await listarAuditoria(db, 100, req.query.denegados === "1") });
  });

  r.use((_req, _res) => {
    throw new ErrorDeDominio(404, "NO_ENCONTRADO", "Ruta inexistente.");
  });
  return r;
}
