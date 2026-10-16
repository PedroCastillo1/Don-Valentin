import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { diaLargo, ORIGEN, sumarDias } from "../lib/fechas.ts";
import { EnConstruccion } from "../components/EnConstruccion.tsx";
import { Cabecera, Mensaje } from "../components/ui.tsx";

interface Reserva {
  id: number;
  codigo: string;
  franja: { desde: string; nombre: string };
  personas: number;
  aNombreDe: string;
  telefono: string;
  mesa: number;
  origen: string;
  comentarios: string | null;
}
interface FranjaDisp {
  id: number;
  nombre: string;
  estado: "disponible" | "completa" | "sin_mesa" | "cerrada";
}
const MOTIVO: Record<string, string> = {
  completa: "sin aforo",
  sin_mesa: "sin mesa para ese grupo",
  cerrada: "cerrada",
};

export function AdminReservas() {
  const { puede } = useSesion();
  const [fecha, setFecha] = useState<string>("");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState("");

  const cargar = useCallback(async (f: string) => {
    try {
      const r = await api<{ fecha: string; reservas: Reserva[] }>(`/admin/reservas${f ? `?fecha=${f}` : ""}`);
      setFecha(r.fecha);
      setReservas(r.reservas);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar las reservas.");
    }
  }, []);
  useEffect(() => {
    void cargar("");
  }, [cargar]);

  return (
    <>
      <Cabecera titulo="Reservas" bajada={fecha ? diaLargo(fecha) : ""}>
        <div className="dia" role="group" aria-label="Día">
          <button
            type="button"
            disabled={!fecha}
            aria-label="Día anterior"
            onClick={() => void cargar(sumarDias(fecha, -1))}
          >
            ‹
          </button>
          <button type="button" onClick={() => void cargar("")}>
            Hoy
          </button>
          <button
            type="button"
            disabled={!fecha}
            aria-label="Día siguiente"
            onClick={() => void cargar(sumarDias(fecha, 1))}
          >
            ›
          </button>
          <label className="dia__fecha">
            <span className="sr-only">Ir a la fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && void cargar(e.target.value)}
              aria-label="Ir a la fecha"
            />
          </label>
        </div>
      </Cabecera>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <EnConstruccion
        compacto
        hito="H3"
        titulo="Buscar, modificar y cancelar reservas"
        descripcion="Búsqueda por nombre o teléfono en todas las fechas, ver el detalle de una reserva, cambiarle día, horario o personas, cancelarla (libera el cupo) y marcar no-show. Hoy podés ver cualquier fecha con el calendario de arriba y cargar reservas nuevas."
      />
      <div className="dos">
        <section aria-labelledby="t-lista">
          <h2 id="t-lista">{reservas.length} reservas</h2>
          {reservas.length === 0 ? (
            <p className="vacio">No hay reservas para este día.</p>
          ) : (
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>A nombre de</th>
                    <th>Pers.</th>
                    <th>Mesa</th>
                    <th>Origen</th>
                    <th>Código</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((r) => (
                    <tr key={r.id}>
                      <td className="hora">{r.franja.desde}</td>
                      <td>
                        <strong>{r.aNombreDe}</strong>
                        <small>{r.telefono}</small>
                      </td>
                      <td>{r.personas}</td>
                      <td>{r.mesa}</td>
                      <td>{ORIGEN[r.origen] ?? r.origen}</td>
                      <td>
                        <code>{r.codigo}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {puede("reservas:crear") && <NuevaReserva fechaInicial={fecha} onCreada={(f) => void cargar(f)} />}
      </div>
    </>
  );
}

function NuevaReserva({ fechaInicial, onCreada }: { fechaInicial: string; onCreada: (fecha: string) => void }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [personas, setPersonas] = useState(2);
  const [fecha, setFecha] = useState(fechaInicial);
  const [franjaId, setFranjaId] = useState<number | "">("");
  const [origen, setOrigen] = useState("telefono");
  const [comentarios, setComentarios] = useState("");
  const [franjas, setFranjas] = useState<FranjaDisp[]>([]);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!fechaInicial) return;
    setFecha((f) => f || fechaInicial);
  }, [fechaInicial]);

  useEffect(() => {
    if (!fecha) return;
    let vivo = true;
    api<{ franjas: FranjaDisp[] }>(`/public/disponibilidad?fecha=${fecha}&personas=${personas}`)
      .then((r) => {
        if (!vivo) return;
        setFranjas(r.franjas);
        setFranjaId((id) => (r.franjas.some((f) => f.id === id && f.estado === "disponible") ? id : ""));
      })
      .catch(() => vivo && setFranjas([]));
    return () => {
      vivo = false;
    };
  }, [fecha, personas]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setEnviando(true);
    try {
      const r = await api<{ codigo: string; mesa: number; franja: { nombre: string } }>("/admin/reservas", {
        method: "POST",
        body: { nombre, telefono, personas, fecha, franjaId, origen, comentarios: comentarios || undefined },
      });
      setMsg({ tipo: "ok", texto: `Reserva guardada: mesa ${r.mesa}, ${r.franja.nombre}. Código ${r.codigo}.` });
      setNombre("");
      setTelefono("");
      setComentarios("");
      onCreada(fecha);
    } catch (err) {
      setMsg({ tipo: "error", texto: err instanceof ApiError ? err.message : "No pudimos guardar la reserva." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby="t-nueva">
      <h2 id="t-nueva">Nueva reserva</h2>
      <form className="form" onSubmit={enviar}>
        <label>
          A nombre de
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={80}
            autoComplete="off"
          />
        </label>
        <label>
          Teléfono
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
            inputMode="tel"
            autoComplete="off"
          />
        </label>
        <div className="fila">
          <label>
            Personas
            <input
              type="number"
              min={1}
              max={40}
              value={personas}
              onChange={(e) => setPersonas(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
        </div>
        <label>
          Horario
          <select value={franjaId} onChange={(e) => setFranjaId(Number(e.target.value))} required>
            <option value="">Elegí una franja</option>
            {franjas.map((f) => (
              <option key={f.id} value={f.id} disabled={f.estado !== "disponible"}>
                {f.nombre}
                {f.estado !== "disponible" ? ` — ${MOTIVO[f.estado]}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cómo llegó
          <select value={origen} onChange={(e) => setOrigen(e.target.value)}>
            <option value="telefono">Teléfono</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="presencial">En persona</option>
          </select>
        </label>
        <label>
          Comentarios (opcional)
          <input value={comentarios} onChange={(e) => setComentarios(e.target.value)} maxLength={200} />
        </label>
        {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
        <button className="btn btn--brasa" disabled={enviando || !franjaId}>
          {enviando ? "Guardando…" : "Guardar reserva"}
        </button>
      </form>
    </section>
  );
}
