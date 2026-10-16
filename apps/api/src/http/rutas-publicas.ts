import { Router } from "express";
import type { RequestHandler } from "express";
import { LOCAL, disponibilidadQuerySchema, reservaPublicaSchema } from "@dv/shared";
import type { Db } from "../db/pool.ts";
import { ErrorDeDominio } from "../errors.ts";
import { cartaPublica } from "../services/carta.ts";
import { mesaPorToken } from "../services/mesas.ts";
import { crearReserva, disponibilidad, leerConfigLocal } from "../services/reservas.ts";
import { parsear } from "./middleware.ts";

export function rutasPublicas(db: Db, ahora: () => Date, limitarReservas: RequestHandler): Router {
  const r = Router();

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
    res.set("Cache-Control", "public, max-age=300");
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

  return r;
}
