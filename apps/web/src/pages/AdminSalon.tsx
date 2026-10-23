import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { diaLargo, ORIGEN, sumarDias } from "../lib/fechas.ts";
import type { ReservaAdmin } from "../lib/reservas.ts";
import { Cabecera, Mensaje } from "../components/ui.tsx";

type EstadoMesa = "libre" | "reservada" | "ocupada";
interface MesaSalon {
  id: number;
  numero: number;
  capacidad: number;
  sector: string;
  estado: EstadoMesa;
  reserva: ReservaAdmin | null;
  sesionSinReserva: boolean;
}
interface Salon {
  fecha: string;
  franja: { id: number; nombre: string; desde: string };
  franjas: { id: number; nombre: string; desde: string; enCurso: boolean }[];
  enCurso: boolean;
  aforo: number;
  personas: number;
  conteo: Record<EstadoMesa, number>;
  mesas: MesaSalon[];
}

const TEXTO: Record<EstadoMesa, string> = { libre: "Libre", reservada: "Reservada", ocupada: "Ocupada" };
type Aviso = { tipo: "ok" | "error"; texto: string } | null;

/** RF-R3: las mesas de una franja, libres, reservadas u ocupadas; llegada, no-show, deshacer y walk-in con confirmación. */
export function AdminSalon() {
  const { puede } = useSesion();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [fecha, setFecha] = useState<string | undefined>(undefined);
  const [franjaId, setFranjaId] = useState<number | undefined>(undefined);
  const [elegida, setElegida] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState<{
    pregunta: string;
    ejecutar: () => Promise<unknown>;
    ok: string;
  } | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const p = new URLSearchParams();
    if (fecha) p.set("fecha", fecha);
    if (franjaId) p.set("franjaId", String(franjaId));
    try {
      setSalon(await api<Salon>(`/admin/salon${p.size ? `?${p}` : ""}`));
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar el salón.");
    }
  }, [fecha, franjaId]);

  useEffect(() => {
    void cargar();
    // El salón cambia solo (otros mozos, reservas web): se actualiza cada 30 segundos.
    const t = setInterval(() => void cargar(), 30_000);
    return () => clearInterval(t);
  }, [cargar]);

  async function hacer(f: () => Promise<unknown>, ok: string) {
    setAviso(null);
    try {
      await f();
      setConfirmando(null);
      setAviso({ tipo: "ok", texto: ok });
      await cargar();
    } catch (e) {
      setConfirmando(null);
      setAviso({ tipo: "error", texto: e instanceof ApiError ? e.message : "No pudimos hacer el cambio." });
    }
  }

  if (error) return <Mensaje tipo="error">{error}</Mensaje>;
  if (!salon) return <p className="cargando">Cargando el salón…</p>;
  const mesa = salon.mesas.find((m) => m.id === elegida) ?? null;

  return (
    <>
      <Cabecera titulo="Estado del salón" bajada={`${diaLargo(salon.fecha)} · ${salon.franja.nombre}`}>
        <div className="dia" role="group" aria-label="Día">
          <button
            type="button"
            aria-label="Día anterior"
            onClick={() => {
              setFranjaId(undefined);
              setFecha(sumarDias(salon.fecha, -1));
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-pressed={!fecha}
            onClick={() => {
              setFranjaId(undefined);
              setFecha(undefined);
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Día siguiente"
            onClick={() => {
              setFranjaId(undefined);
              setFecha(sumarDias(salon.fecha, 1));
            }}
          >
            ›
          </button>
        </div>
      </Cabecera>

      <div className="franjas" role="group" aria-label="Franja horaria">
        {salon.franjas.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === salon.franja.id}
            onClick={() => {
              setElegida(null);
              setConfirmando(null);
              setFranjaId(f.id);
            }}
          >
            {f.desde}
            {f.enCurso && <span className="franjas__ahora">ahora</span>}
          </button>
        ))}
      </div>

      <ul className="conteo" aria-label="Resumen de la franja">
        {(["libre", "reservada", "ocupada"] as const).map((e) => (
          <li key={e} className={`conteo__${e}`}>
            <b>{salon.conteo[e]}</b> {TEXTO[e].toLowerCase()}
            {salon.conteo[e] === 1 ? "" : "s"}
          </li>
        ))}
        <li>
          <b>{salon.personas}</b> de {salon.aforo} personas
        </li>
      </ul>
      {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}

      <div className="salon">
        <section className="panel" aria-labelledby="t-mesas">
          <div className="panel__cab">
            <h2 id="t-mesas">Mesas</h2>
            <p className="leyenda">
              <span className="mesa" aria-hidden="true" /> Libre
              <span className="mesa mesa--reservada" aria-hidden="true" /> Reservada
              <span className="mesa mesa--abierta" aria-hidden="true" /> Ocupada
            </p>
          </div>
          <ul className="mapa mapa--salon">
            {salon.mesas.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={
                    m.estado === "libre" ? "mesa" : `mesa mesa--${m.estado === "ocupada" ? "abierta" : "reservada"}`
                  }
                  aria-pressed={m.id === elegida}
                  onClick={() => {
                    setElegida(m.id);
                    setConfirmando(null);
                  }}
                >
                  <b>{m.numero}</b>
                  <small>{m.reserva ? `${m.reserva.personas}/${m.capacidad} p.` : `${m.capacidad} p.`}</small>
                  <span className="sr-only">
                    {`, mesa ${TEXTO[m.estado].toLowerCase()}`}
                    {m.reserva ? `: ${m.reserva.aNombreDe}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="panel" aria-live="polite" aria-labelledby="t-mesa">
          {!mesa ? (
            <>
              <h2 id="t-mesa">Elegí una mesa</h2>
              <p className="nota">
                Tocá una mesa para ver su reserva, registrar la llegada o sentar a un grupo sin reserva.
              </p>
              {salon.enCurso && puede("salon:operar") && (
                <WalkIn onListo={(m) => void hacer(async () => undefined, m)} onRecargar={cargar} />
              )}
              {!salon.enCurso && <p className="nota">Los grupos sin reserva se sientan en la franja en curso.</p>}
            </>
          ) : (
            <>
              <h2 id="t-mesa">
                Mesa {mesa.numero} · {TEXTO[mesa.estado]}
              </h2>
              <p className="nota">
                {mesa.capacidad} personas · {mesa.sector}
              </p>
              {mesa.reserva && (
                <dl className="datos">
                  <div>
                    <dt>A nombre de</dt>
                    <dd>{mesa.reserva.aNombreDe}</dd>
                  </div>
                  <div>
                    <dt>Personas</dt>
                    <dd>{mesa.reserva.personas}</dd>
                  </div>
                  <div>
                    <dt>Cómo llegó</dt>
                    <dd>{ORIGEN[mesa.reserva.origen] ?? mesa.reserva.origen}</dd>
                  </div>
                  <div>
                    <dt>Código</dt>
                    <dd>
                      <code>{mesa.reserva.codigo}</code>
                    </dd>
                  </div>
                </dl>
              )}
              {mesa.sesionSinReserva && <p className="nota">El mozo abrió la mesa sin una reserva vinculada.</p>}
              {confirmando ? (
                <div className="confirmar" role="group" aria-label="Confirmar cambio en el salón">
                  <p>{confirmando.pregunta}</p>
                  <div className="acciones-fila">
                    <button
                      type="button"
                      className="btn btn--brasa btn--chico"
                      onClick={() => void hacer(confirmando.ejecutar, confirmando.ok)}
                    >
                      Sí, confirmar
                    </button>
                    <button type="button" className="btn btn--chico" onClick={() => setConfirmando(null)}>
                      No, volver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="acciones-fila">
                  {mesa.reserva?.acciones.llegada && puede("salon:operar") && (
                    <button
                      type="button"
                      className="btn btn--brasa btn--chico"
                      onClick={() =>
                        setConfirmando({
                          pregunta: `¿Confirmás registrar la llegada de ${mesa.reserva!.aNombreDe} en la Mesa ${mesa.numero}?`,
                          ejecutar: () => api(`/admin/reservas/${mesa.reserva!.id}/llegada`, { method: "POST" }),
                          ok: `Llegada registrada: la mesa ${mesa.numero} quedó ocupada.`,
                        })
                      }
                    >
                      Registrar llegada
                    </button>
                  )}
                  {mesa.reserva?.acciones.noShow && puede("reservas:editar") && (
                    <button
                      type="button"
                      className="btn btn--chico"
                      onClick={() =>
                        setConfirmando({
                          pregunta: `¿Confirmás marcar no-show para ${mesa.reserva!.aNombreDe} en la Mesa ${mesa.numero}?`,
                          ejecutar: () => api(`/admin/reservas/${mesa.reserva!.id}/no-show`, { method: "POST" }),
                          ok: `No-show registrado: la mesa ${mesa.numero} quedó libre.`,
                        })
                      }
                    >
                      Marcar no-show
                    </button>
                  )}
                  {mesa.reserva?.estado === "cumplida" && (puede("reservas:editar") || puede("salon:operar")) && (
                    <button
                      type="button"
                      className="btn btn--chico"
                      onClick={() =>
                        setConfirmando({
                          pregunta: `¿Confirmás deshacer la llegada de ${mesa.reserva!.aNombreDe} y volver la reserva a Confirmada?`,
                          ejecutar: () => api(`/admin/reservas/${mesa.reserva!.id}/reabrir`, { method: "POST" }),
                          ok: `Se deshizo la llegada y la reserva de ${mesa.reserva!.aNombreDe} volvió a estar confirmada.`,
                        })
                      }
                    >
                      Volver a confirmada
                    </button>
                  )}
                  {mesa.reserva && puede("reservas:ver") && (
                    <Link className="btn btn--chico" to={`/admin/reservas?id=${mesa.reserva.id}`}>
                      Modificar reserva
                    </Link>
                  )}
                  {mesa.estado === "ocupada" && puede("sesion_mesa:cerrar") && (
                    <Link className="btn btn--chico" to="/admin/mesas">
                      Liberar en Mesas y QR
                    </Link>
                  )}
                </div>
              )}
              {mesa.estado === "libre" && salon.enCurso && puede("salon:operar") && (
                <WalkIn mesa={mesa} onListo={(m) => void hacer(async () => undefined, m)} onRecargar={cargar} />
              )}
              <button
                type="button"
                className="btn btn--chico detalle__volver"
                onClick={() => {
                  setElegida(null);
                  setConfirmando(null);
                }}
              >
                Ver todas
              </button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

/** RF-R3: grupo sin reserva en la franja en curso. Solo se pide cuántos son (RNF-4: datos mínimos) y pide confirmación. */
function WalkIn({
  mesa,
  onListo,
  onRecargar,
}: {
  mesa?: MesaSalon;
  onListo: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}) {
  const [personas, setPersonas] = useState(2);
  const [nombre, setNombre] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  function pedirConfirmacion(e: FormEvent) {
    e.preventDefault();
    setError("");
    setConfirmar(true);
  }

  async function enviar() {
    setError("");
    setEnviando(true);
    try {
      const r = await api<ReservaAdmin>("/admin/salon/walk-in", {
        method: "POST",
        body: { personas, nombre: nombre || undefined, mesaId: mesa?.id },
      });
      setConfirmar(false);
      onListo(`Grupo de ${r.personas} sentado en la mesa ${r.mesa}.`);
      setNombre("");
    } catch (err) {
      setConfirmar(false);
      setError(err instanceof ApiError ? err.message : "No pudimos sentar al grupo.");
      await onRecargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="form" onSubmit={pedirConfirmacion} aria-label="Sentar sin reserva">
      <h3>{mesa ? `Sentar en la mesa ${mesa.numero}` : "Sentar sin reserva"}</h3>
      <div className="fila">
        <label>
          Personas
          <input
            type="number"
            min={1}
            max={mesa?.capacidad ?? 40}
            value={personas}
            onChange={(e) => {
              setPersonas(Number(e.target.value));
              setConfirmar(false);
            }}
            required
          />
        </label>
        <label>
          Nombre (opcional)
          <input
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setConfirmar(false);
            }}
            maxLength={80}
            autoComplete="off"
          />
        </label>
      </div>
      {!mesa && <p className="nota">Se asigna la mesa libre más ajustada al grupo.</p>}
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {confirmar ? (
        <div className="confirmar" role="group" aria-label="Confirmar sentar grupo">
          <p>
            ¿Confirmás sentar al grupo de <strong>{personas} personas</strong>
            {mesa ? ` en la Mesa ${mesa.numero}` : ""}?
          </p>
          <div className="acciones-fila">
            <button
              type="button"
              className="btn btn--brasa btn--chico"
              disabled={enviando}
              onClick={() => void enviar()}
            >
              {enviando ? "Sentando…" : "Sí, confirmar"}
            </button>
            <button type="button" className="btn btn--chico" disabled={enviando} onClick={() => setConfirmar(false)}>
              No, revisar
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn--brasa" disabled={enviando}>
          Sentar grupo
        </button>
      )}
    </form>
  );
}
