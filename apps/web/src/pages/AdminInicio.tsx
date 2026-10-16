import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";

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
const ORIGEN: Record<string, string> = {
  web: "Web",
  telefono: "Teléfono",
  presencial: "En persona",
  whatsapp: "WhatsApp",
};

export function AdminInicio() {
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
        setReservas((await api<{ reservas: Reserva[] }>(`/admin/reservas?fecha=${r.fecha}`)).reservas);
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

  const total = resumen.franjas.reduce((a, f) => a + f.aforo, 0);
  const abiertas = mesas.filter((m) => m.sesionAbierta).length;
  const primerNombre = usuario?.nombre.split(" ")[0] ?? "";

  return (
    <>
      <header className="inicio__cab">
        <div>
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
          <p className="inicio__fecha">{diaLargo(resumen.fecha)}</p>
          <h1>Hola, {primerNombre}.</h1>
        </div>
        <div className="inicio__cifras">
          <p>
            <b>{resumen.reservas}</b>
            <span>reservas</span>
          </p>
          <p>
            <b>{resumen.personas}</b>
            <span>personas</span>
          </p>
          <p>
            <b>{abiertas}</b>
            <span>mesas abiertas</span>
          </p>
        </div>
      </header>

      <section className="brasas" aria-labelledby="t-aforo">
        <div className="brasas__cab">
          <h2 id="t-aforo">Aforo por franja</h2>
          <p>
            Cada brasa muestra cuántas personas hay reservadas sobre el aforo de la franja (
            {total ? Math.round(total / resumen.franjas.length) : 0} por franja, valor provisorio).
          </p>
        </div>
        <ol className="brasas__lista">
          {resumen.franjas.map((f) => {
            const pct = f.aforo ? Math.min(100, Math.round((f.personas / f.aforo) * 100)) : 0;
            return (
              <li key={f.id} className="brasa" style={{ "--pct": `${pct}%` } as React.CSSProperties}>
                <div
                  className="brasa__barra"
                  role="img"
                  aria-label={`${f.nombre}: ${f.personas} de ${f.aforo} personas`}
                >
                  <span />
                </div>
                <b>{f.desde}</b>
                <small>
                  {f.personas}/{f.aforo}
                </small>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="inicio__dos">
        <section aria-labelledby="t-res">
          <h2 id="t-res">Reservas del día</h2>
          {reservas.length === 0 ? (
            <p className="vacio">No hay reservas para este día.</p>
          ) : (
            <ul className="reservas">
              {reservas.slice(0, 8).map((r) => (
                <li key={r.id}>
                  <time>{r.franja.desde}</time>
                  <div>
                    <strong>{r.aNombreDe}</strong>
                    <small>
                      {r.personas} personas · mesa {r.mesa} · {ORIGEN[r.origen] ?? r.origen}
                    </small>
                  </div>
                  <code>{r.codigo}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-mesas">
          <h2 id="t-mesas">Salón</h2>
          <ul className="mapa" aria-label="Mesas">
            {mesas
              .filter((m) => m.activa)
              .map((m) => (
                <li
                  key={m.id}
                  className={m.sesionAbierta ? "mesa mesa--abierta" : "mesa"}
                  title={`Mesa ${m.numero}${m.sesionAbierta ? " · sesión abierta" : ""}`}
                >
                  {m.numero}
                </li>
              ))}
          </ul>
          <p className="leyenda">
            <span className="mesa mesa--abierta" aria-hidden="true" /> Sesión abierta &nbsp;{" "}
            <span className="mesa" aria-hidden="true" /> Sin sesión
          </p>
          <p className="nota">El estado libre / reservada / ocupada por franja llega con el Hito 3 — 30/10/2026.</p>
        </section>
      </div>
    </>
  );
}
