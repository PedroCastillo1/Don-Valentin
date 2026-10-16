import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
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
}

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
        bajada="Abrí la sesión cuando se sientan los comensales. Cada mesa tiene un código QR único."
      />
      {msg && <Mensaje tipo={msg.tipo}>{msg.texto}</Mensaje>}
      <p className="nota nota--arriba">
        Los pedidos desde el QR: Programado para el Hito 4 — 06/11/2026. Hoy el QR lleva a la mesa correcta y muestra la
        carta.
      </p>
      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Mesa</th>
              {admin && <th>Sector</th>}
              {admin && <th>Capac.</th>}
              {admin && <th>Valores</th>}
              <th>Sesión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mesas
              .filter((m) => m.activa)
              .map((m) => (
                <tr key={m.id}>
                  <td className="hora">{m.numero}</td>
                  {admin && <td>{m.sector}</td>}
                  {admin && (
                    <td>
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
                    <td>
                      <Estado valor={m.validacion} />
                    </td>
                  )}
                  <td>
                    {m.sesionAbierta ? (
                      <span className="chip chip--on">Abierta</span>
                    ) : (
                      <span className="chip">Sin sesión</span>
                    )}
                  </td>
                  <td className="acciones">
                    {m.sesionAbierta ? (
                      puede("sesion_mesa:cerrar") && (
                        <button
                          className="mini"
                          onClick={() =>
                            void accion(
                              () => api(`/admin/mesas/${m.id}/sesion`, { method: "DELETE" }),
                              `Mesa ${m.numero}: sesión cerrada.`,
                            )
                          }
                        >
                          Cerrar sesión
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
          onRegenerar={() =>
            void accion(
              () => api(`/admin/mesas/${qr.id}/qr`, { method: "POST" }),
              `Mesa ${qr.numero}: se generó un QR nuevo. El anterior dejó de funcionar.`,
            )
          }
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

function ModalQr({ mesa, onCerrar, onRegenerar }: { mesa: Mesa; onCerrar: () => void; onRegenerar: () => void }) {
  const [version, setVersion] = useState(0);
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
          className="qr"
          src={`/api/admin/mesas/${mesa.id}/qr.svg?v=${version}`}
          alt={`Código QR de la mesa ${mesa.numero}`}
          width={260}
          height={260}
        />
        <div className="modal__acciones">
          <a className="btn" href={`/api/admin/mesas/${mesa.id}/qr.svg`} download={`mesa-${mesa.numero}.svg`}>
            Descargar SVG
          </a>
          <button
            className="btn"
            onClick={() => {
              onRegenerar();
              setVersion((v) => v + 1);
            }}
          >
            Generar uno nuevo
          </button>
          <button className="btn btn--brasa" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
