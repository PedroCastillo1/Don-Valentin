import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { diaLargo, ORIGEN, sumarDias } from "../lib/fechas.ts";
import { ESTADO_RESERVA, fechaCorta, MOTIVO_FRANJA } from "../lib/reservas.ts";
import type { FranjaDisp, ReservaAdmin } from "../lib/reservas.ts";
import { Cabecera, Mensaje } from "../components/ui.tsx";

type Aviso = { tipo: "ok" | "error"; texto: string } | null;
const mensajeDe = (e: unknown, defecto: string) => (e instanceof ApiError ? e.message : defecto);

export function AdminReservas() {
  const { puede } = useSesion();
  const [searchParams] = useSearchParams();
  const idUrl = Number(searchParams.get("id") ?? 0);
  const [fecha, setFecha] = useState<string>("");
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [busqueda, setBusqueda] = useState<{ q: string; reservas: ReservaAdmin[] } | null>(null);
  const [q, setQ] = useState("");
  const [elegida, setElegida] = useState<ReservaAdmin | null>(null);
  const [error, setError] = useState("");

  const seleccionar = useCallback((r: ReservaAdmin) => {
    setElegida(r);
    setTimeout(() => {
      document.getElementById("t-detalle")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 40);
  }, []);

  const cargar = useCallback(
    async (f: string) => {
      try {
        const r = await api<{ fecha: string; reservas: ReservaAdmin[] }>(`/admin/reservas${f ? `?fecha=${f}` : ""}`);
        setFecha(r.fecha);
        setReservas(r.reservas);
        if (idUrl) {
          const encontrada = r.reservas.find((x) => x.id === idUrl);
          if (encontrada) setElegida((actual) => actual ?? encontrada);
        }
        setError("");
      } catch (e) {
        setError(mensajeDe(e, "No pudimos cargar las reservas."));
      }
    },
    [idUrl],
  );
  useEffect(() => {
    void cargar("");
  }, [cargar]);

  async function buscar(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ q: string; reservas: ReservaAdmin[] }>(
        `/admin/reservas/buscar?q=${encodeURIComponent(q.trim())}`,
      );
      setBusqueda(r);
      setError("");
    } catch (err) {
      setError(mensajeDe(err, "No pudimos buscar."));
    }
  }

  /** Tras una acción: refresca el día, la búsqueda y el detalle. */
  async function actualizar(r: ReservaAdmin) {
    setElegida(r);
    await cargar(fecha);
    if (busqueda) setBusqueda({ ...busqueda, reservas: busqueda.reservas.map((x) => (x.id === r.id ? r : x)) });
  }

  const lista = busqueda?.reservas ?? reservas;
  return (
    <>
      <Cabecera titulo="Reservas" bajada={busqueda ? `Resultados de «${busqueda.q}»` : fecha ? diaLargo(fecha) : ""}>
        <div className="dia" role="group" aria-label="Día">
          <button
            type="button"
            disabled={!fecha}
            aria-label="Día anterior"
            onClick={() => {
              setBusqueda(null);
              void cargar(sumarDias(fecha, -1));
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => {
              setBusqueda(null);
              void cargar("");
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            disabled={!fecha}
            aria-label="Día siguiente"
            onClick={() => {
              setBusqueda(null);
              void cargar(sumarDias(fecha, 1));
            }}
          >
            ›
          </button>
          <label className="dia__fecha">
            <span className="sr-only">Ir a la fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => {
                if (!e.target.value) return;
                setBusqueda(null);
                void cargar(e.target.value);
              }}
              aria-label="Ir a la fecha"
            />
          </label>
        </div>
      </Cabecera>

      <form className="buscador" role="search" onSubmit={buscar}>
        <label htmlFor="buscar-reserva">Buscar en todas las fechas</label>
        <div className="buscador__fila">
          <input
            id="buscar-reserva"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, teléfono o código"
            minLength={2}
            maxLength={80}
            required
            autoComplete="off"
          />
          <button className="btn btn--brasa btn--chico">Buscar</button>
          {busqueda && (
            <button
              type="button"
              className="btn btn--chico"
              onClick={() => {
                setBusqueda(null);
                setQ("");
              }}
            >
              Volver al día
            </button>
          )}
        </div>
      </form>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <div className="dos">
        <section aria-labelledby="t-lista">
          <h2 id="t-lista">
            {lista.length} {lista.length === 1 ? "reserva" : "reservas"}
          </h2>
          {lista.length > 0 && (
            <p className="nota nota--arriba">
              Tocá una reserva o su botón <strong>Gestionar / Modificar</strong> para registrar la llegada, cambiar
              datos, marcar no-show o cancelar.
            </p>
          )}
          {lista.length === 0 ? (
            <p className="vacio">
              {busqueda ? "No encontramos reservas con esos datos." : "No hay reservas para este día."}
            </p>
          ) : (
            <div className="tabla-wrap">
              <table className="tabla tabla--tarjetas">
                <thead>
                  <tr>
                    <th>{busqueda ? "Día y hora" : "Hora"}</th>
                    <th>A nombre de</th>
                    <th>Pers.</th>
                    <th>Mesa</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr
                      key={r.id}
                      className={elegida?.id === r.id ? "fila--elegida fila--clicable" : "fila--clicable"}
                      onClick={() => seleccionar(r)}
                    >
                      <td className="hora" data-etiqueta={busqueda ? "Día y hora" : "Hora"}>
                        {busqueda && <small>{fechaCorta(r.fecha)}</small>}
                        {r.franja.desde}
                      </td>
                      <td data-etiqueta="A nombre de">
                        <button
                          type="button"
                          className="enlace-fila"
                          onClick={(e) => {
                            e.stopPropagation();
                            seleccionar(r);
                          }}
                        >
                          <strong>{r.aNombreDe}</strong>
                        </button>
                        <small>
                          {r.telefono || "—"} · {ORIGEN[r.origen] ?? r.origen} · <code>{r.codigo}</code>
                        </small>
                      </td>
                      <td data-etiqueta="Personas">{r.personas}</td>
                      <td data-etiqueta="Mesa">{r.mesa}</td>
                      <td data-etiqueta="Estado">
                        <span className={`estado-r estado-r--${ESTADO_RESERVA[r.estado].clase}`}>
                          {ESTADO_RESERVA[r.estado].texto}
                        </span>
                      </td>
                      <td className="acciones" data-etiqueta="Acción">
                        <button
                          type="button"
                          className={elegida?.id === r.id ? "btn btn--chico" : "btn btn--brasa btn--chico"}
                          onClick={(e) => {
                            e.stopPropagation();
                            seleccionar(r);
                          }}
                        >
                          {elegida?.id === r.id ? "Abierta" : r.estado === "confirmada" ? "Modificar" : "Ver"}
                          <span className="sr-only"> reserva de {r.aNombreDe}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {elegida ? (
          <DetalleReserva
            key={elegida.id}
            reserva={elegida}
            onCambio={(r) => void actualizar(r)}
            onCerrar={() => setElegida(null)}
          />
        ) : (
          puede("reservas:crear") && <NuevaReserva fechaInicial={fecha} onCreada={(f) => void cargar(f)} />
        )}
      </div>
    </>
  );
}

/** RF-R4: detalle con las acciones que la reserva admite en este momento (el servidor vuelve a controlarlas). */
function DetalleReserva({
  reserva: r,
  onCambio,
  onCerrar,
}: {
  reserva: ReservaAdmin;
  onCambio: (r: ReservaAdmin) => void;
  onCerrar: () => void;
}) {
  const { puede } = useSesion();
  const [modo, setModo] = useState<"ver" | "editar" | "cancelar">("ver");
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);

  async function accion(ruta: string, ok: string) {
    setOcupado(true);
    setAviso(null);
    try {
      const nueva = await api<ReservaAdmin>(`/admin/reservas/${r.id}/${ruta}`, { method: "POST" });
      setAviso({ tipo: "ok", texto: ok });
      setModo("ver");
      onCambio(nueva);
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeDe(e, "No pudimos hacer el cambio.") });
    } finally {
      setOcupado(false);
    }
  }

  const editar = puede("reservas:editar");
  const estado = ESTADO_RESERVA[r.estado];
  return (
    <section className="detalle" aria-labelledby="t-detalle">
      <div className="detalle__cab">
        <h2 id="t-detalle">{r.aNombreDe}</h2>
        <button type="button" className="btn btn--chico" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      <p>
        <span className={`estado-r estado-r--${estado.clase}`}>{estado.texto}</span> <code>{r.codigo}</code>
      </p>
      <dl className="datos">
        <div>
          <dt>Día</dt>
          <dd>{diaLargo(r.fecha)}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>{r.franja.nombre}</dd>
        </div>
        <div>
          <dt>Personas</dt>
          <dd>{r.personas}</dd>
        </div>
        <div>
          <dt>Mesa</dt>
          <dd>
            {r.mesa} · {r.sector}
          </dd>
        </div>
        <div>
          <dt>Teléfono</dt>
          <dd>{r.telefono || "—"}</dd>
        </div>
        <div>
          <dt>Cómo llegó</dt>
          <dd>{ORIGEN[r.origen] ?? r.origen}</dd>
        </div>
        {r.comentarios && (
          <div className="datos__ancho">
            <dt>Comentarios</dt>
            <dd>{r.comentarios}</dd>
          </div>
        )}
      </dl>
      {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}

      {modo === "editar" && (
        <EditarReserva
          reserva={r}
          onListo={(n) => {
            setModo("ver");
            setAviso({ tipo: "ok", texto: "Cambios guardados." });
            onCambio(n);
          }}
        />
      )}
      {modo === "cancelar" && (
        <div className="confirmar" role="group" aria-labelledby="t-confirmar">
          <p id="t-confirmar">
            ¿Cancelar la reserva de <strong>{r.aNombreDe}</strong>? La mesa {r.mesa} queda libre para otra reserva.
          </p>
          <div className="acciones-fila">
            <button
              type="button"
              className="btn btn--brasa btn--chico"
              disabled={ocupado}
              onClick={() => void accion("cancelar", "Reserva cancelada. La mesa quedó libre.")}
            >
              Sí, cancelar
            </button>
            <button type="button" className="btn btn--chico" onClick={() => setModo("ver")}>
              No, volver
            </button>
          </div>
        </div>
      )}
      {modo === "ver" && (
        <div className="acciones-fila">
          {puede("salon:operar") && r.acciones.llegada && (
            <button
              type="button"
              className="btn btn--brasa btn--chico"
              disabled={ocupado}
              onClick={() => void accion("llegada", `Llegada registrada. La mesa ${r.mesa} quedó ocupada.`)}
            >
              Registrar llegada
            </button>
          )}
          {editar && r.acciones.modificar && (
            <button type="button" className="btn btn--chico" onClick={() => setModo("editar")}>
              Modificar
            </button>
          )}
          {editar && r.acciones.noShow && (
            <button
              type="button"
              className="btn btn--chico"
              disabled={ocupado}
              onClick={() => void accion("no-show", "Marcada como no-show. La mesa quedó libre.")}
            >
              Marcar no-show
            </button>
          )}
          {editar && r.acciones.cancelar && (
            <button type="button" className="btn btn--chico btn--peligro" onClick={() => setModo("cancelar")}>
              Cancelar reserva
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function EditarReserva({ reserva: r, onListo }: { reserva: ReservaAdmin; onListo: (r: ReservaAdmin) => void }) {
  const [nombre, setNombre] = useState(r.aNombreDe);
  const [telefono, setTelefono] = useState(r.telefono);
  const [personas, setPersonas] = useState(r.personas);
  const [fecha, setFecha] = useState(r.fecha);
  const [franjaId, setFranjaId] = useState<number>(r.franja.id);
  const [comentarios, setComentarios] = useState(r.comentarios ?? "");
  const [franjas, setFranjas] = useState<FranjaDisp[]>([]);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api<{ franjas: FranjaDisp[] }>(`/public/disponibilidad?fecha=${fecha}&personas=${personas}`)
      .then((x) => vivo && setFranjas(x.franjas))
      .catch(() => vivo && setFranjas([]));
    return () => {
      vivo = false;
    };
  }, [fecha, personas]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const cambios: Record<string, unknown> = {};
    if (nombre !== r.aNombreDe) cambios.nombre = nombre;
    if (telefono !== r.telefono) cambios.telefono = telefono;
    if (personas !== r.personas) cambios.personas = personas;
    if (fecha !== r.fecha) cambios.fecha = fecha;
    if (franjaId !== r.franja.id) cambios.franjaId = franjaId;
    if (comentarios !== (r.comentarios ?? "")) cambios.comentarios = comentarios || null;
    if (!Object.keys(cambios).length) return setAviso({ tipo: "error", texto: "No cambiaste ningún dato." });
    setEnviando(true);
    setAviso(null);
    try {
      const n = await api<ReservaAdmin>(`/admin/reservas/${r.id}`, { method: "PATCH", body: cambios });
      onListo(n);
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeDe(err, "No pudimos guardar los cambios.") });
    } finally {
      setEnviando(false);
    }
  }

  // La franja actual de la reserva siempre se puede conservar, aunque la disponibilidad la cuente ocupada.
  const propia = (id: number) => fecha === r.fecha && id === r.franja.id;
  return (
    <form className="form" onSubmit={guardar} aria-label="Modificar reserva">
      <label>
        A nombre de
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} />
      </label>
      <label>
        Teléfono
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" required={!!r.telefono} />
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
          />
        </label>
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
      </div>
      <label>
        Horario
        <select value={franjaId} onChange={(e) => setFranjaId(Number(e.target.value))}>
          {franjas.map((f) => (
            <option key={f.id} value={f.id} disabled={f.estado !== "disponible" && !propia(f.id)}>
              {f.nombre}
              {f.estado !== "disponible" && !propia(f.id) ? ` — ${MOTIVO_FRANJA[f.estado]}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Comentarios (opcional)
        <input value={comentarios} onChange={(e) => setComentarios(e.target.value)} maxLength={300} />
      </label>
      {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}
      <button className="btn btn--brasa" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
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
  const [msg, setMsg] = useState<Aviso>(null);
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
      const r = await api<ReservaAdmin>("/admin/reservas", {
        method: "POST",
        body: { nombre, telefono, personas, fecha, franjaId, origen, comentarios: comentarios || undefined },
      });
      setMsg({ tipo: "ok", texto: `Reserva guardada: mesa ${r.mesa}, ${r.franja.nombre}. Código ${r.codigo}.` });
      setNombre("");
      setTelefono("");
      setComentarios("");
      onCreada(fecha);
    } catch (err) {
      setMsg({ tipo: "error", texto: mensajeDe(err, "No pudimos guardar la reserva.") });
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
                {f.estado !== "disponible" ? ` — ${MOTIVO_FRANJA[f.estado]}` : ""}
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
          <input value={comentarios} onChange={(e) => setComentarios(e.target.value)} maxLength={300} />
        </label>
        {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
        <button className="btn btn--brasa" disabled={enviando || !franjaId}>
          {enviando ? "Guardando…" : "Guardar reserva"}
        </button>
      </form>
    </section>
  );
}
