import { DIAS_SEMANA, DIA_NOMBRE, parsearDias, parsearFechas } from "@dv/shared";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { Cabecera, Estado, Mensaje } from "../components/ui.tsx";

interface Planilla {
  generadaEn: string;
  parametros: {
    clave: string;
    valor: string;
    tipo: string;
    unidad: string | null;
    descripcion: string;
    fuente: string;
    validacion: string;
  }[];
  sectoresSalon: { id: number; nombre: string; validacion: string }[];
  mesas: { id: number; numero: number; sector: string; capacidad: number; validacion: string }[];
  franjas: { id: number; nombre: string; duracionMin: number; validacion: string }[];
  aforos: {
    franjaId: number;
    franja: string;
    sectorId: number;
    sector: string;
    aforoPersonas: number;
    validacion: string;
  }[];
  tiposSolicitud: { id: number; sector: string; nombre: string; tiempoMaximoMin: number; validacion: string }[];
  pendientes: { documentado: number; provisorio: number; validado: number };
}
type Tipo = "parametro" | "mesa" | "franja" | "aforo" | "tipo_solicitud" | "sector_salon";

const csv = (p: Planilla): string => {
  const f: string[][] = [["Sección", "Elemento", "Valor", "Unidad", "Estado", "Fuente"]];
  for (const x of p.parametros) f.push(["Parámetro", x.clave, x.valor, x.unidad ?? "", x.validacion, x.fuente]);
  for (const x of p.sectoresSalon) f.push(["Sector de salón", x.nombre, "", "", x.validacion, ""]);
  for (const x of p.mesas)
    f.push(["Mesa", `Mesa ${x.numero} (${x.sector})`, String(x.capacidad), "personas", x.validacion, ""]);
  for (const x of p.franjas) f.push(["Franja", x.nombre, String(x.duracionMin), "min", x.validacion, ""]);
  for (const x of p.aforos)
    f.push(["Aforo", `${x.franja} · ${x.sector}`, String(x.aforoPersonas), "personas", x.validacion, ""]);
  for (const x of p.tiposSolicitud)
    f.push(["Tipo de solicitud", `${x.sector}: ${x.nombre}`, String(x.tiempoMaximoMin), "min", x.validacion, ""]);
  return "﻿" + f.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(";")).join("\r\n");
};

export function AdminParametros() {
  const { usuario, puede } = useSesion();
  const [p, setP] = useState<Planilla | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const editar = puede("parametros:editar");
  const puedeValidar = editar && usuario?.rol === "encargado";

  const cargar = useCallback(async () => {
    try {
      setP(await api<Planilla>("/admin/parametros"));
    } catch (e) {
      setMsg({ tipo: "error", texto: e instanceof Error ? e.message : "No pudimos cargar la planilla." });
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function hacer(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ tipo: "ok", texto: ok });
      await cargar();
    } catch (e) {
      setMsg({ tipo: "error", texto: e instanceof ApiError ? e.message : "No se pudo guardar." });
    }
  }
  const validar = (tipo: Tipo, id: string | number) =>
    hacer(
      () => api("/admin/parametros-validar", { method: "POST", body: { tipo, id: String(id) } }),
      "Marcado como validado.",
    );

  if (!p)
    return msg ? <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje> : <p className="cargando">Cargando la planilla…</p>;

  const Validar = ({ tipo, id, estado }: { tipo: Tipo; id: string | number; estado: string }) =>
    puedeValidar && estado !== "validado" ? (
      <button className="mini" onClick={() => void validar(tipo, id)}>
        Validar
      </button>
    ) : null;

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([csv(p)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "planilla-de-parametros-don-valentin.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Cabecera
        titulo="Parámetros"
        bajada="Planilla de parametrización del sistema. Cada valor indica de dónde sale y si el Encargado ya lo validó."
      >
        <button className="btn" onClick={descargar}>
          Descargar planilla (CSV)
        </button>
      </Cabecera>
      <p className="resumen-val">
        <span>
          <b>{p.pendientes.validado}</b> validados
        </span>
        <span>
          <b>{p.pendientes.provisorio}</b> provisorios
        </span>
        <span>
          <b>{p.pendientes.documentado}</b> documentados
        </span>
      </p>
      <p className="nota nota--arriba">
        Provisorio: valor propuesto para trabajar, pendiente de validar con el Encargado de Salón (actividad 1.2.3.4,
        del 19 al 23/10/2026).
        {!puedeValidar && " Solo el Encargado de Salón puede marcar un valor como validado."}
      </p>
      {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}

      <h2>Parámetros generales</h2>
      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Valor</th>
              <th>Fuente</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.parametros.map((x) => (
              <tr key={x.clave}>
                <td>
                  <strong>{x.descripcion}</strong>
                  <small>{x.clave}</small>
                </td>
                <td>
                  {editar && x.clave === "dias_atencion" ? (
                    <DiasEditor
                      valor={x.valor}
                      onGuardar={(v) =>
                        hacer(
                          () => api(`/admin/parametros/${x.clave}`, { method: "PUT", body: { valor: v } }),
                          "Días de atención guardados. Las reservas web ya no aceptan los días que no atiende.",
                        )
                      }
                    />
                  ) : editar && x.clave === "dias_cerrados" ? (
                    <FechasCerradasEditor
                      valor={x.valor}
                      onGuardar={(v) =>
                        hacer(
                          () => api(`/admin/parametros/${x.clave}`, { method: "PUT", body: { valor: v } }),
                          "Fechas de cierre actualizadas.",
                        )
                      }
                    />
                  ) : editar ? (
                    <Celda
                      valor={x.valor}
                      unidad={x.unidad}
                      etiqueta={x.descripcion}
                      onGuardar={(v) =>
                        hacer(
                          () => api(`/admin/parametros/${x.clave}`, { method: "PUT", body: { valor: v } }),
                          "Valor guardado. Queda como provisorio hasta que el Encargado lo valide.",
                        )
                      }
                    />
                  ) : (
                    <>
                      {x.valor} {x.unidad}
                    </>
                  )}
                </td>
                <td className="fuente">{x.fuente}</td>
                <td>
                  <Estado valor={x.validacion} />
                </td>
                <td>
                  <Validar tipo="parametro" id={x.clave} estado={x.validacion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Aforo por franja</h2>
      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Franja</th>
              <th>Sector</th>
              <th>Personas</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.aforos.map((a) => (
              <tr key={`${a.franjaId}-${a.sectorId}`}>
                <td className="hora">{a.franja}</td>
                <td>{a.sector}</td>
                <td>
                  {editar ? (
                    <Celda
                      valor={String(a.aforoPersonas)}
                      unidad="personas"
                      etiqueta={`Aforo ${a.franja}`}
                      onGuardar={(v) =>
                        hacer(
                          () =>
                            api(`/admin/aforos/${a.franjaId}/${a.sectorId}`, {
                              method: "PUT",
                              body: { aforoPersonas: Number(v) },
                            }),
                          "Aforo guardado.",
                        )
                      }
                    />
                  ) : (
                    a.aforoPersonas
                  )}
                </td>
                <td>
                  <Estado valor={a.validacion} />
                </td>
                <td>
                  <Validar tipo="aforo" id={`${a.franjaId}-${a.sectorId}`} estado={a.validacion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tipos de solicitud y tiempo máximo</h2>
      <p className="nota">
        Cuando un pedido supere su tiempo máximo se va a destacar en el panel del sector. El panel llega con el Hito 4 —
        06/11/2026; los tiempos se definen ahora.
      </p>
      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Sector</th>
              <th>Tipo</th>
              <th>Máximo</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.tiposSolicitud.map((t) => (
              <tr key={t.id}>
                <td className="cap-sector">{t.sector}</td>
                <td>{t.nombre}</td>
                <td>
                  {editar ? (
                    <Celda
                      valor={String(t.tiempoMaximoMin)}
                      unidad="min"
                      etiqueta={`Tiempo máximo ${t.nombre}`}
                      onGuardar={(v) =>
                        hacer(
                          () =>
                            api(`/admin/tipos-solicitud/${t.id}`, {
                              method: "PUT",
                              body: { tiempoMaximoMin: Number(v) },
                            }),
                          "Tiempo guardado.",
                        )
                      }
                    />
                  ) : (
                    `${t.tiempoMaximoMin} min`
                  )}
                </td>
                <td>
                  <Estado valor={t.validacion} />
                </td>
                <td>
                  <Validar tipo="tipo_solicitud" id={t.id} estado={t.validacion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Franjas y mesas</h2>
      <p className="nota">
        {p.franjas.length} franjas de {p.franjas[0]?.duracionMin ?? 0} minutos ({p.franjas[0]?.nombre.split(" a ")[0]} a{" "}
        {p.franjas.at(-1)?.nombre.split(" a ")[1]}) · {p.mesas.length} mesas activas en {p.sectoresSalon.length}{" "}
        sector(es) de salón. Las capacidades se editan en <a href="/admin/mesas">Mesas y QR</a>.
      </p>
    </>
  );
}

function Celda({
  valor,
  unidad,
  etiqueta,
  onGuardar,
}: {
  valor: string;
  unidad: string | null;
  etiqueta: string;
  onGuardar: (v: string) => void;
}) {
  const [v, setV] = useState(valor);
  useEffect(() => setV(valor), [valor]);
  const esHora = unidad === "hh:mm";
  return (
    <span className="celda">
      <input
        type={esHora ? "time" : "text"}
        value={v}
        aria-label={etiqueta}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== valor && v.trim() !== "" && onGuardar(v.trim())}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      {unidad && !esHora && <small>{unidad}</small>}
    </span>
  );
}

const DIA_ETIQUETA: Record<(typeof DIAS_SEMANA)[number], string> = {
  lun: "Lun",
  mar: "Mar",
  mie: "Mié",
  jue: "Jue",
  vie: "Vie",
  sab: "Sáb",
  dom: "Dom",
};

/** Días de atención: cada botón indica claramente si ese día está Abierto o Cerrado. Nunca deja la semana vacía. */
function DiasEditor({ valor, onGuardar }: { valor: string; onGuardar: (v: string) => void }) {
  const activos = parsearDias(valor);
  return (
    <div className="dias-bloque">
      <span className="dias" role="group" aria-label="Días de atención">
        {DIAS_SEMANA.map((d) => {
          const on = activos.includes(d);
          return (
            <button
              key={d}
              type="button"
              className={on ? "dias__d dias__d--on" : "dias__d dias__d--off"}
              aria-pressed={on}
              title={`${DIA_NOMBRE[d]}: ${on ? "Abierto (tocá para cerrar)" : "Cerrado (tocá para abrir)"}`}
              disabled={on && activos.length === 1}
              onClick={() => onGuardar(DIAS_SEMANA.filter((x) => (x === d ? !on : activos.includes(x))).join(","))}
            >
              <strong>{DIA_ETIQUETA[d]}</strong>
              <small>{on ? "Abierto" : "Cerrado"}</small>
              <span className="sr-only"> ({DIA_NOMBRE[d]})</span>
            </button>
          );
        })}
      </span>
      <small className="dias-ayuda">Tocá un día para cambiarlo entre Abierto y Cerrado.</small>
    </div>
  );
}

const formatearIso = (iso: string): string => {
  const [a, m, d] = iso.split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
};

/** Fechas puntuales sin atención: selector de calendario con etiquetas para agregar o quitar sin escribir a mano. */
function FechasCerradasEditor({ valor, onGuardar }: { valor: string; onGuardar: (v: string) => void }) {
  const fechas = parsearFechas(valor);
  const [nueva, setNueva] = useState("");

  function agregarFecha() {
    if (!nueva) return;
    const siguiente = [...new Set([...fechas, nueva])].sort();
    setNueva("");
    onGuardar(siguiente.join(","));
  }

  function quitarFecha(iso: string) {
    const siguiente = fechas.filter((f) => f !== iso);
    onGuardar(siguiente.join(","));
  }

  return (
    <div className="fechas-editor">
      {fechas.length === 0 ? (
        <small className="fechas-editor__vacio">Sin cierres programados</small>
      ) : (
        <ul className="fechas-editor__lista" aria-label="Fechas cerradas">
          {fechas.map((iso) => (
            <li key={iso} className="fechas-editor__chip">
              <span>{formatearIso(iso)}</span>
              <button
                type="button"
                onClick={() => quitarFecha(iso)}
                aria-label={`Quitar cierre del ${formatearIso(iso)}`}
                title="Quitar fecha"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="fechas-editor__agregar">
        <input
          type="date"
          value={nueva}
          aria-label="Elegir fecha de cierre"
          onChange={(e) => {
            const val = e.target.value;
            setNueva(val);
          }}
        />
        <button type="button" className="btn btn--chico" disabled={!nueva} onClick={agregarFecha}>
          + Agregar cierre
        </button>
      </div>
    </div>
  );
}
