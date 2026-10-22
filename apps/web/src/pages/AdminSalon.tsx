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

/** RF-R3: las mesas de una franja, libres, reservadas u ocupadas; llegada, no-show y walk-in desde la misma pantalla. */
export function AdminSalon() {
  const { puede } = useSesion();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [fecha, setFecha] = useState<string | undefined>(undefined);
  const [franjaId, setFranjaId] = useState<number | undefined>(undefined);
  const [elegida, setElegida] = useState<number | null>(null);
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
      setAviso({ tipo: "ok", texto: ok });
      await cargar();
    } catch (e) {
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
                  onClick={() => setElegida(m.id)}
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
              <div className="acciones-fila">
                {mesa.reserva?.acciones.llegada && puede("salon:operar") && (
                  <button
                    type="button"
                    className="btn btn--brasa btn--chico"
                    onClick={() =>
                      void hacer(
                        () => api(`/admin/reservas/${mesa.reserva!.id}/llegada`, { method: "POST" }),
                        `Llegada registrada: la mesa ${mesa.numero} quedó ocupada.`,
                      )
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
                      void hacer(
                        () => api(`/admin/reservas/${mesa.reserva!.id}/no-show`, { method: "POST" }),
                        `No-show registrado: la mesa ${mesa.numero} quedó libre.`,
                      )
                    }
                  >
                    Marcar no-show
                  </button>
                )}
                {mesa.estado === "ocupada" && puede("sesion_mesa:cerrar") && (
                  <Link className="btn btn--chico" to="/admin/mesas">
                    Liberar en Mesas y QR
                  </Link>
                )}
              </div>
              {mesa.estado === "libre" && salon.enCurso && puede("salon:operar") && (
                <WalkIn mesa={mesa} onListo={(m) => void hacer(async () => undefined, m)} onRecargar={cargar} />
              )}
              <button type="button" className="btn btn--chico detalle__volver" onClick={() => setElegida(null)}>
                Ver todas
              </button>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

/** RF-R3: grupo sin reserva en la franja en curso. Solo se pide cuántos son (RNF-4: datos mínimos). */
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
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await api<ReservaAdmin>("/admin/salon/walk-in", {
        method: "POST",
        body: { personas, nombre: nombre || undefined, mesaId: mesa?.id },
      });
      onListo(`Grupo de ${r.personas} sentado en la mesa ${r.mesa}.`);
      setNombre("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos sentar al grupo.");
      await onRecargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar} aria-label="Sentar sin reserva">
      <h3>{mesa ? `Sentar en la mesa ${mesa.numero}` : "Sentar sin reserva"}</h3>
      <div className="fila">
        <label>
          Personas
          <input
            type="number"
            min={1}
            max={mesa?.capacidad ?? 40}
            value={personas}
            onChange={(e) => setPersonas(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Nombre (opcional)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoComplete="off" />
        </label>
      </div>
      {!mesa && <p className="nota">Se asigna la mesa libre más ajustada al grupo.</p>}
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <button className="btn btn--brasa" disabled={enviando}>
        {enviando ? "Sentando…" : "Sentar grupo"}
      </button>
    </form>
  );
}
