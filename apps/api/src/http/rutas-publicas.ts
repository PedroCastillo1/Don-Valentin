import { Router } from "express";
import type { RequestHandler } from "express";
import { LOCAL, disponibilidadQuerySchema, eventoSitioSchema, pedidoSchema, reservaPublicaSchema } from "@dv/shared";
import type { Db } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { cartaPublica } from "../services/carta.ts";
import { mesaPorToken } from "../services/mesas.ts";
import { crearReserva, disponibilidad, leerConfigLocal } from "../services/reservas.ts";
import { crearPedido, ingresoComensal, pedidosDeSesion, sesionDelComensal } from "../services/pedidos.ts";
import { registrarEvento } from "../services/medicion.ts";
import { leerCookie, parsear } from "./middleware.ts";

const COOKIE_MESA = "dv_mesa";

export function rutasPublicas(
  db: Db,
  ahora: () => Date,
  limitarReservas: RequestHandler,
  limitarPedidos: RequestHandler,
  cookieSegura: boolean,
  limitarEventos: RequestHandler,
): Router {
  const r = Router();

  // RF-W3: medición propia, anónima (sin cookies ni datos personales). Llega con sendBeacon, sin esperar respuesta.
  r.post("/eventos", limitarEventos, async (req, res) => {
    const d = parsear(eventoSitioSchema, req.body);
    await registrarEvento(db, d.evento, d.ruta, ahora());
    res.status(204).end();
  });

  r.get("/info", async (_req, res) => {
    const cfg = await leerConfigLocal(db);
    res.json({
      ...LOCAL,
      horario: { apertura: cfg.apertura, cierre: cfg.cierre },
      reservaDiasMax: cfg.diasMax,
      diasAtencion: cfg.diasAtencion,
      diasCerrados: cfg.diasCerrados,
    });
  });

  r.get("/carta", async (_req, res) => {
    // Un minuto: un cambio de precio desde el panel llega rápido al sitio y al QR.
    res.set("Cache-Control", "public, max-age=60");
    res.json(await cartaPublica(db));
  });

  r.get("/disponibilidad", async (req, res) => {
    const q = parsear(disponibilidadQuerySchema, req.query);
    res.json({ fecha: q.fecha, personas: q.personas, franjas: await disponibilidad(db, q.fecha, q.personas, ahora()) });
  });

  r.post("/reservas", limitarReservas, async (req, res) => {
    const d = parsear(reservaPublicaSchema, req.body);
    const reserva = await crearReserva(
      db,
      {
        nombre: d.nombre,
        telefono: d.telefono,
        personas: d.personas,
        fecha: d.fecha,
        franjaId: d.franjaId,
        comentarios: d.comentarios,
        origen: "web",
      },
      ahora(),
    );
    // El comensal ve su código y el horario; el número de mesa es interno.
    res.status(201).json({
      codigo: reserva.codigo,
      fecha: reserva.fecha,
      franja: reserva.franja,
      personas: reserva.personas,
      nombre: reserva.aNombreDe,
    });
  });

  r.get("/mesa/:token", async (req, res) => {
    const m = await mesaPorToken(db, String(req.params.token));
    if (!m) throw new ErrorDeDominio(404, "QR_NO_VALIDO", "Este código no corresponde a ninguna mesa.");
    res.json(m);
  });

  // RF-Q1/Q2: el celular del comensal recibe un permiso atado a la sesión abierta de esa mesa.
  r.post("/mesa/:token/ingreso", async (req, res) => {
    const i = await ingresoComensal(db, String(req.params.token));
    res.cookie(COOKIE_MESA, i.credencial, {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSegura,
      path: "/api/public/mesa",
      maxAge: 8 * 3_600_000,
    });
    res.json({ numero: i.numero });
  });
  r.get("/mesa/:token/pedidos", async (req, res) => {
    const sesion = await sesionDelComensal(db, String(req.params.token), leerCookie(req, COOKIE_MESA));
    res.set("Cache-Control", "no-store");
    res.json({ pedidos: await pedidosDeSesion(db, sesion) });
  });
  r.post("/mesa/:token/pedidos", limitarPedidos, async (req, res) => {
    const sesion = await sesionDelComensal(db, String(req.params.token), leerCookie(req, COOKIE_MESA));
    const d = parsear(pedidoSchema, req.body);
    res.status(201).json(await crearPedido(db, sesion, d.items, "qr"));
  });

  return r;
}
