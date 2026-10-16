import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { EnConstruccion } from "../components/EnConstruccion.tsx";
import { Cabecera, Estado, Mensaje } from "../components/ui.tsx";

interface Mesa {
  id: number;
  numero: number;
  sector: string;
  sectorId: number;
  capacidad: number;
  activa: boolean;
  validacion: string;
  sesionAbierta: boolean;
  qrCodigo?: string;
  qrGeneradoEn?: string;
}

const fechaHora = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "";

export function AdminMesas() {
  const { puede } = useSesion();
  const admin = puede("mesas:administrar");
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [qr, setQr] = useState<Mesa | null>(null);

  const cargar = useCallback(async () => {
    try {
      if (puede("mesas:ver")) setMesas((await api<{ mesas: Mesa[] }>("/admin/mesas")).mesas);
      else
        setMesas(
          (await api<{ mesas: Pick<Mesa, "id" | "numero" | "sesionAbierta">[] }>("/admin/sesiones/mesas")).mesas.map(
            (m) => ({ ...m, sector: "", sectorId: 0, capacidad: 0, activa: true, validacion: "" }),
          ),
        );
    } catch (e) {
      setMsg({ tipo: "error", texto: e instanceof Error ? e.message : "No pudimos cargar las mesas." });
    }
  }, [puede]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function accion(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ tipo: "ok", texto: ok });
      await cargar();
    } catch (e) {
      setMsg({ tipo: "error", texto: e instanceof ApiError ? e.message : "No se pudo completar la acción." });
    }
  }

  return (
    <>
      <Cabecera
        titulo="Mesas y QR"
        bajada="Abrí la sesión cuando se sientan los comensales y liberá la mesa cuando se van: el QR queda fijo y el próximo grupo empieza con la cuenta en cero."
      />
      {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
      <EnConstruccion
        compacto
        hito="H4"
        titulo="Pedidos desde el QR"
        descripcion="Hoy cada QR abre la mesa correcta y muestra la carta. El pedido desde la mesa y su envío a cocina, parrilla o barra se completan en el Hito 4."
      />
      <div className="tabla-wrap">
        <table className="tabla tabla--tarjetas">
          <thead>
            <tr>
              <th>Mesa</th>
              {admin && <th>Sector</th>}
              {admin && <th>Capac.</th>}
              {admin && <th>Valores</th>}
              {admin && <th>Código QR</th>}
              <th>Sesión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mesas
              .filter((m) => m.activa)
              .map((m) => (
                <tr key={m.id}>
                  <td className="hora" data-etiqueta="Mesa">
                    {m.numero}
                  </td>
                  {admin && <td data-etiqueta="Sector">{m.sector}</td>}
                  {admin && (
                    <td data-etiqueta="Capacidad">
                      <CapacidadEditable
                        mesa={m}
                        onGuardar={(c) =>
                          accion(
                            () => api(`/admin/mesas/${m.id}`, { method: "PATCH", body: { capacidad: c } }),
                            `Mesa ${m.numero}: capacidad actualizada.`,
                          )
                        }
                      />
                    </td>
                  )}
                  {admin && (
                    <td data-etiqueta="Valores">
                      <Estado valor={m.validacion} />
                    </td>
                  )}
                  {admin && (
                    <td data-etiqueta="Código QR">
                      <code className="qr-codigo">{m.qrCodigo}</code>
                    </td>
                  )}
                  <td data-etiqueta="Sesión">
                    {m.sesionAbierta ? (
                      <span className="chip chip--on">Abierta</span>
                    ) : (
                      <span className="chip">Sin sesión</span>
                    )}
                  </td>
                  <td className="acciones" data-etiqueta="Acciones">
                    {m.sesionAbierta ? (
                      puede("sesion_mesa:cerrar") && (
                        <button
                          className="mini"
                          onClick={() =>
                            void accion(
                              () => api(`/admin/mesas/${m.id}/sesion`, { method: "DELETE" }),
                              `Mesa ${m.numero} liberada: la próxima cuenta empieza en cero. El QR no cambia.`,
                            )
                          }
                        >
                          Liberar mesa
                        </button>
                      )
                    ) : (
                      <button
                        className="mini mini--brasa"
                        onClick={() =>
                          void accion(
                            () => api(`/admin/mesas/${m.id}/sesion`, { method: "POST" }),
                            `Mesa ${m.numero}: sesión abierta.`,
                          )
                        }
                      >
                        Abrir sesión
                      </button>
                    )}
                    {puede("qr:generar") && (
                      <button className="mini" onClick={() => setQr(m)}>
                        Ver QR
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {admin && <NuevaMesa onCreada={() => void cargar()} />}
      {qr && (
        <ModalQr
          mesa={qr}
          onCerrar={() => setQr(null)}
          onRegenerado={(nueva) => {
            setQr(nueva);
            void cargar();
          }}
        />
      )}
    </>
  );
}

function CapacidadEditable({ mesa, onGuardar }: { mesa: Mesa; onGuardar: (c: number) => void }) {
  const [v, setV] = useState(String(mesa.capacidad));
  useEffect(() => setV(String(mesa.capacidad)), [mesa.capacidad]);
  return (
    <input
      className="cap"
      type="number"
      min={1}
      max={40}
      value={v}
      aria-label={`Capacidad de la mesa ${mesa.numero}`}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => Number(v) !== mesa.capacidad && Number(v) >= 1 && onGuardar(Number(v))}
    />
  );
}

function NuevaMesa({ onCreada }: { onCreada: () => void }) {
  const [numero, setNumero] = useState("");
  const [capacidad, setCapacidad] = useState("4");
  const [msg, setMsg] = useState<string>("");
  async function enviar(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/admin/mesas", {
        method: "POST",
        body: { numero: Number(numero), sectorSalonId: 1, capacidad: Number(capacidad) },
      });
      setNumero("");
      onCreada();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "No se pudo crear la mesa.");
    }
  }
  return (
    <form className="form form--linea" onSubmit={enviar}>
      <h2>Agregar mesa</h2>
      <label>
        Número
        <input type="number" min={1} value={numero} onChange={(e) => setNumero(e.target.value)} required />
      </label>
      <label>
        Capacidad
        <input
          type="number"
          min={1}
          max={40}
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
          required
        />
      </label>
      <button className="btn">Agregar</button>
      {msg && <Mensaje tipo="error">{msg}</Mensaje>}
    </form>
  );
}

function ModalQr({
  mesa,
  onCerrar,
  onRegenerado,
}: {
  mesa: Mesa;
  onCerrar: () => void;
  onRegenerado: (m: Mesa) => void;
}) {
  const [version, setVersion] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  const [cambio, setCambio] = useState<{ antes?: string; ahora?: string } | null>(null);
  const [error, setError] = useState("");
  async function regenerar() {
    setError("");
    try {
      const nueva = await api<Mesa>(`/admin/mesas/${mesa.id}/qr`, { method: "POST" });
      setCambio({ antes: mesa.qrCodigo, ahora: nueva.qrCodigo });
      setConfirmar(false);
      setVersion((v) => v + 1);
      onRegenerado(nueva);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo generar el QR nuevo.");
    }
  }
  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Código QR de la mesa ${mesa.numero}`}
      onClick={onCerrar}
    >
      <div className="modal__caja" onClick={(e) => e.stopPropagation()}>
        <h2>Mesa {mesa.numero}</h2>
        <img
          key={mesa.qrCodigo}
          className={cambio ? "qr qr--nuevo" : "qr"}
          src={`/api/admin/mesas/${mesa.id}/qr.svg?v=${version}-${mesa.qrCodigo ?? ""}`}
          alt={`Código QR de la mesa ${mesa.numero}, código ${mesa.qrCodigo ?? ""}`}
          width={260}
          height={260}
        />
        <p className="qr-vigente">
          Código vigente <code className="qr-codigo">{mesa.qrCodigo}</code>
          <small>Generado el {fechaHora(mesa.qrGeneradoEn)} · el mismo código va impreso debajo del QR</small>
        </p>
        {cambio && (
          <p className="mensaje mensaje--ok" role="status">
            QR nuevo generado: <code className="qr-codigo">{cambio.antes}</code> →{" "}
            <code className="qr-codigo">{cambio.ahora}</code>. El QR impreso anterior ya no abre la mesa: imprimí este.
          </p>
        )}
        {error && (
          <p className="mensaje mensaje--error" role="alert">
            {error}
          </p>
        )}
        {confirmar ? (
          <div className="modal__confirmar" role="group" aria-label="Confirmar QR nuevo">
            <p>
              <strong>¿Generar un QR nuevo para la mesa {mesa.numero}?</strong> El que está impreso ahora (código{" "}
              {mesa.qrCodigo}) va a dejar de funcionar.
            </p>
            <div className="modal__acciones">
              <button className="btn btn--brasa" onClick={() => void regenerar()}>
                Sí, generar QR nuevo
              </button>
              <button className="btn" onClick={() => setConfirmar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="modal__acciones">
            <a
              className="btn"
              href={`/api/admin/mesas/${mesa.id}/qr.svg`}
              download={`mesa-${mesa.numero}-${mesa.qrCodigo ?? "qr"}.svg`}
            >
              Descargar SVG
            </a>
            <button className="btn" onClick={() => setConfirmar(true)}>
              Generar uno nuevo
            </button>
            <button className="btn btn--brasa" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
