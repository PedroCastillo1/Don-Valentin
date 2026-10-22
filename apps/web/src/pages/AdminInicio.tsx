import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { ORIGEN } from "../lib/fechas.ts";
import { useSesion } from "../lib/sesion.tsx";
import { Link, Navigate } from "react-router";
import { MODULOS, textoProgramado } from "@dv/shared";

/** Pantalla de cada módulo en construcción (con su cartel de obra y el prototipo). */
const RUTA_MODULO: Record<string, string> = {
  "medicion-sitio": "/admin/medicion",
};
import { Icono } from "../components/Iconos.tsx";
import { PulsoDelDia, estadoDeAforo } from "../components/PulsoDelDia.tsx";

interface Franja {
  id: number;
  nombre: string;
  desde: string;
  hasta: string;
  reservas: number;
  personas: number;
  aforo: number;
}
interface Resumen {
  fecha: string;
  reservas: number;
  personas: number;
  franjas: Franja[];
}
interface Reserva {
  id: number;
  codigo: string;
  franja: { desde: string; nombre: string };
  personas: number;
  aNombreDe: string;
  mesa: number;
  origen: string;
  estado: string;
  comentarios: string | null;
}
interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  sesionAbierta: boolean;
  activa: boolean;
}

const diaLargo = (iso: string): string => {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, d ?? 1));
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    f,
  );
};
const sumar = (iso: string, n: number): string => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a ?? 2026, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
};

/** Los puestos de cocina, parrilla y barra no ven reservas: entran directo a su panel. */
export function AdminInicio() {
  const { puede } = useSesion();
  if (!puede("reservas:ver")) return <Navigate to="/admin/sectores" replace />;
  return <InicioTablero />;
}

function InicioTablero() {
  const { usuario, puede } = useSesion();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [error, setError] = useState("");
  const [fecha, setFecha] = useState<string | undefined>(undefined);

  useEffect(() => {
    const ctl = new AbortController();
    void (async () => {
      try {
        const r = await api<Resumen>(`/admin/resumen${fecha ? `?fecha=${fecha}` : ""}`);
        setResumen(r);
        // Las canceladas y los no-show no ocupan lugar: no se listan en el día.
        const dia = (await api<{ reservas: Reserva[] }>(`/admin/reservas?fecha=${r.fecha}`)).reservas;
        setReservas(dia.filter((x) => x.estado === "confirmada" || x.estado === "cumplida"));
        if (puede("mesas:ver")) setMesas((await api<{ mesas: Mesa[] }>("/admin/mesas")).mesas);
        else if (puede("sesion_mesa:abrir"))
          setMesas((await api<{ mesas: Mesa[] }>("/admin/sesiones/mesas")).mesas as unknown as Mesa[]);
      } catch (e) {
        if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : "No pudimos cargar el día.");
      }
    })();
    return () => ctl.abort();
  }, [puede, fecha]);

  if (error)
    return (
      <p className="aviso aviso--error" role="alert">
        {error}
      </p>
    );
  if (!resumen) return <p className="cargando">Cargando el día…</p>;

  const aforoTotal = resumen.franjas.reduce((a, f) => a + f.aforo, 0);
  const ocupacion = aforoTotal ? Math.round((resumen.personas / aforoTotal) * 100) : 0;
  const activas = mesas.filter((m) => m.activa);
  const abiertas = activas.filter((m) => m.sesionAbierta).length;
  const pico = resumen.franjas.reduce<Franja | null>((m, f) => (f.personas > (m?.personas ?? 0) ? f : m), null);
  const primerNombre = usuario?.nombre.split(" ")[0] ?? "";
  const porFranja = new Map(resumen.franjas.map((f) => [f.desde, estadoDeAforo(f.personas, f.aforo)]));

  return (
    <div className="tablero">
      <header className="tablero__cab">
        <div>
          <p className="tablero__fecha">{diaLargo(resumen.fecha)}</p>
          <h1>Hola, {primerNombre}.</h1>
        </div>
        <div className="tablero__acciones">
          <div className="dia" role="group" aria-label="Día">
            <button type="button" aria-label="Día anterior" onClick={() => setFecha(sumar(resumen.fecha, -1))}>
              ‹
            </button>
            <button type="button" aria-pressed={!fecha} onClick={() => setFecha(undefined)}>
              Hoy
            </button>
            <button type="button" aria-label="Día siguiente" onClick={() => setFecha(sumar(resumen.fecha, 1))}>
              ›
            </button>
          </div>
          {puede("reservas:crear") && (
            <Link className="btn btn--brasa btn--chico" to="/admin/reservas">
              <Icono nombre="mas" tam={18} /> Nueva reserva
            </Link>
          )}
        </div>
      </header>

      <ul className="kpis" aria-label="Resumen del día">
        <li className="kpi">
          <span className="kpi__ic">
            <Icono nombre="reservas" />
          </span>
          <p className="kpi__v">{resumen.reservas}</p>
          <p className="kpi__t">Reservas</p>
          <p className="kpi__n">{resumen.reservas === 1 ? "confirmada" : "confirmadas"} para el día</p>
        </li>
        <li className="kpi">
          <span className="kpi__ic">
            <Icono nombre="gente" />
          </span>
          <p className="kpi__v">{resumen.personas}</p>
          <p className="kpi__t">Personas</p>
          <p className="kpi__n">
            {ocupacion}% del aforo del día ({aforoTotal})
          </p>
        </li>
        <li className="kpi">
          <span className="kpi__ic">
            <Icono nombre="mesas" />
          </span>
          <p className="kpi__v">
            {abiertas}
            <small>/{activas.length}</small>
          </p>
          <p className="kpi__t">Mesas con sesión</p>
          <p className="kpi__n">abiertas en el salón</p>
        </li>
        <li className="kpi">
          <span className="kpi__ic">
            <Icono nombre="fuego" />
          </span>
          <p className="kpi__v">{pico && pico.personas > 0 ? pico.desde : "—"}</p>
          <p className="kpi__t">Franja más cargada</p>
          <p className="kpi__n">{pico && pico.personas > 0 ? `${pico.personas} personas` : "sin reservas todavía"}</p>
        </li>
      </ul>

      <section className="panel panel--pulso" aria-labelledby="t-pulso">
        <div className="panel__cab">
          <h2 id="t-pulso">Pulso del día</h2>
          <p>
            Personas reservadas en cada franja contra su aforo. El aforo (
            {Math.round(aforoTotal / (resumen.franjas.length || 1))} por franja) es un valor provisorio, pendiente de
            validar con el Encargado.
          </p>
        </div>
        <PulsoDelDia franjas={resumen.franjas} />
      </section>

      <div className="tablero__dos">
        <section className="panel" aria-labelledby="t-res">
          <div className="panel__cab">
            <h2 id="t-res">Reservas del día</h2>
            <Link to="/admin/reservas" className="panel__ver">
              Ver todas
            </Link>
          </div>
          {reservas.length === 0 ? (
            <p className="vacio">No hay reservas para este día.</p>
          ) : (
            <ul className="reservas">
              {reservas.slice(0, 8).map((r) => {
                const est = porFranja.get(r.franja.desde);
                return (
                  <li key={r.id}>
                    <time>{r.franja.desde}</time>
                    <span className="avatar avatar--chico" aria-hidden="true">
                      {r.aNombreDe.slice(0, 1)}
                    </span>
                    <div>
                      <strong>{r.aNombreDe}</strong>
                      <small>
                        {r.personas} personas · mesa {r.mesa} · {ORIGEN[r.origen] ?? r.origen}
                      </small>
                    </div>
                    {est && <span className={`etq etq--${est.clase}`}>{est.texto}</span>}
                    <code>{r.codigo}</code>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="panel" aria-labelledby="t-mesas">
          <div className="panel__cab">
            <h2 id="t-mesas">Salón</h2>
            {puede("sesion_mesa:abrir") && (
              <Link to="/admin/mesas" className="panel__ver">
                Administrar mesas
              </Link>
            )}
          </div>
          <ul className="mapa" aria-label="Mesas">
            {activas.map((m) => (
              <li
                key={m.id}
                className={m.sesionAbierta ? "mesa mesa--abierta" : "mesa"}
                title={`Mesa ${m.numero}${m.sesionAbierta ? " · sesión abierta" : ""}`}
              >
                <b>{m.numero}</b>
                <small>{m.capacidad} p.</small>
              </li>
            ))}
          </ul>
          <p className="leyenda">
            <span className="mesa mesa--abierta" aria-hidden="true" /> Sesión abierta
            <span className="mesa" aria-hidden="true" /> Sin sesión
          </p>
          {puede("salon:operar") && (
            <p className="nota">
              <Link to="/admin/salon">Ver el estado del salón por franja</Link>: mesas libres, reservadas y ocupadas.
            </p>
          )}
        </section>
      </div>

      {MODULOS.some((m) => !m.disponible) && (
        <section className="panel" aria-labelledby="t-prox">
          <div className="panel__cab">
            <h2 id="t-prox">Próximos módulos</h2>
            <p>Lo que se suma al panel en los próximos hitos del proyecto.</p>
          </div>
          <ul className="proximos">
            {MODULOS.filter((m) => !m.disponible).map((m) => (
              <li key={m.id}>
                <Link to={RUTA_MODULO[m.id] ?? "/admin"}>
                  <span className="adm__badge">{m.hito}</span>
                  <span>{m.nombre}</span>
                  <small>En construcción · {textoProgramado(m.hito)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
