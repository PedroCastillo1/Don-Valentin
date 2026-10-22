import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.ts";
import { precio, UNICA } from "../lib/formato.ts";
import type { CartaPublica } from "./Carta.tsx";
import { Cabecera, Mensaje } from "../components/ui.tsx";

/*
 * Hito 4: los paneles de cocina, parrilla y barra (RF-Q2, RF-Q3), el pedido del mozo (RF-Q4) y el resumen de
 * pedidos para el Encargado. Todo consulta cada 3 segundos: un pedido aparece en su panel en menos de 5.
 */

type Sector = "cocina" | "parrilla" | "barra";
type EstadoItem = "recibido" | "en_preparacion" | "listo" | "entregado" | "cancelado";
interface ItemSector {
  id: number;
  pedidoId: number;
  mesa: number;
  producto: string;
  variante: string;
  cantidad: number;
  nota: string | null;
  sector: Sector;
  estado: EstadoItem;
  origen: "qr" | "mozo";
  creadoEn: string;
  minutos: number;
  tiempoMaximo: number;
  demorado: boolean;
}

const SECTOR: Record<Sector, string> = { cocina: "Cocina", parrilla: "Parrilla", barra: "Barra" };
const REFRESCO_MS = 3_000;

function useItems(sector: Sector | null) {
  const [items, setItems] = useState<ItemSector[]>([]);
  const [sectorFijo, setSectorFijo] = useState<Sector | null>(null);
  const [error, setError] = useState("");
  const cargar = useCallback(async () => {
    try {
      const r = await api<{ sector: Sector | null; fijo: boolean; items: ItemSector[] }>(
        `/admin/sectores/items${sector ? `?sector=${sector}` : ""}`,
      );
      setItems(r.items);
      setSectorFijo(r.fijo ? r.sector : null);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sin conexión: reintentando…");
    }
  }, [sector]);
  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);
  return { items, sectorFijo, error, cargar };
}

async function mover(id: number, estado: EstadoItem) {
  await api(`/admin/items/${id}/estado`, { method: "POST", body: { estado } });
}

function Ticket({
  i,
  accion,
  onHecho,
}: {
  i: ItemSector;
  accion?: { texto: string; estado: EstadoItem; principal?: boolean };
  onHecho: () => void;
}) {
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <li className={i.demorado ? "ticket-s ticket-s--demorado" : "ticket-s"}>
      <div className="ticket-s__cab">
        <b>Mesa {i.mesa}</b>
        <span className="ticket-s__min" title={`Tiempo máximo: ${i.tiempoMaximo} min`}>
          {i.minutos} min{i.demorado && <strong> · demorado</strong>}
        </span>
      </div>
      <p className="ticket-s__plato">
        <span className="ticket-s__cant">{i.cantidad} ×</span> {i.producto}
        {i.variante && <small> ({i.variante})</small>}
      </p>
      {i.nota && <p className="ticket-s__nota">{i.nota}</p>}
      <p className="ticket-s__pie">
        {SECTOR[i.sector]} · {i.origen === "mozo" ? "lo cargó el mozo" : "pedido desde el QR"}
      </p>
      {error && <p className="ticket-s__error">{error}</p>}
      {accion && (
        <button
          type="button"
          className={accion.principal ? "btn btn--brasa btn--chico" : "btn btn--chico"}
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            setError("");
            try {
              await mover(i.id, accion.estado);
              onHecho();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "No se pudo cambiar.");
            } finally {
              setOcupado(false);
            }
          }}
        >
          {accion.texto}
          <span className="sr-only">
            : {i.cantidad} {i.producto}, mesa {i.mesa}
          </span>
        </button>
      )}
    </li>
  );
}

/** RF-Q2/Q3: panel de un sector, en tres columnas: nuevos, en preparación y listos para entregar. */
export function AdminSectores() {
  const [elegido, setElegido] = useState<Sector>("parrilla");
  const { items, sectorFijo, error, cargar } = useItems(elegido);
  const sector = sectorFijo ?? elegido;
  const delSector = items.filter((i) => i.sector === sector);
  const col = (e: EstadoItem) => delSector.filter((i) => i.estado === e);
  const demorados = delSector.filter((i) => i.demorado && i.estado !== "listo").length;

  return (
    <>
      <Cabecera
        titulo={sectorFijo ? `Panel de ${SECTOR[sectorFijo].toLowerCase()}` : "Cocina, parrilla y barra"}
        bajada={`Se actualiza solo cada ${REFRESCO_MS / 1000} segundos.`}
      >
        {!sectorFijo && (
          <div className="franjas" role="group" aria-label="Sector">
            {(["parrilla", "cocina", "barra"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={s === elegido} onClick={() => setElegido(s)}>
                {SECTOR[s]}
              </button>
            ))}
          </div>
        )}
      </Cabecera>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {demorados > 0 && (
        <p className="alerta-demora" role="alert">
          {demorados} {demorados === 1 ? "plato superó" : "platos superaron"} el tiempo máximo
        </p>
      )}
      <div className="cocina">
        {(
          [
            ["recibido", "Nuevos", { texto: "Empezar", estado: "en_preparacion", principal: true }],
            ["en_preparacion", "En preparación", { texto: "Listo", estado: "listo", principal: true }],
            ["listo", "Listos para entregar", undefined],
          ] as const
        ).map(([estado, titulo, accion]) => (
          <section key={estado} className="cocina__col" aria-labelledby={`c-${estado}`}>
            <h2 id={`c-${estado}`}>
              {titulo} <span>{col(estado).length}</span>
            </h2>
            {col(estado).length === 0 ? (
              <p className="vacio">Nada por ahora.</p>
            ) : (
              <ul className="tickets">
                {col(estado).map((i) => (
                  <Ticket key={i.id} i={i} accion={accion} onHecho={() => void cargar()} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

interface MesaAbierta {
  sesionId: number;
  mesaId: number;
  numero: number;
}
interface LineaMozo {
  varianteId: number;
  nombre: string;
  cantidad: number;
  nota: string;
}

/** RF-Q4: el mozo carga el pedido de una mesa (mismo circuito que el QR) y registra lo que entrega. */
export function AdminMozo() {
  const [mesas, setMesas] = useState<MesaAbierta[]>([]);
  const [mesaId, setMesaId] = useState<number | "">("");
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [filtro, setFiltro] = useState("");
  const [lineas, setLineas] = useState<LineaMozo[]>([]);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const { items, cargar } = useItems(null);
  const listos = items.filter((i) => i.estado === "listo");

  useEffect(() => {
    void api<{ mesas: MesaAbierta[] }>("/admin/pedidos/mesas").then((r) => setMesas(r.mesas));
    void api<CartaPublica>("/public/carta").then(setCarta);
  }, []);

  const opciones = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!carta || q.length < 2) return [];
    return carta.grupos
      .flatMap((g) => g.categorias.flatMap((c) => c.productos))
      .filter((p) => p.nombre.toLowerCase().includes(q))
      .flatMap((p) =>
        p.variantes
          .filter((v) => v.precio !== null)
          .map((v) => ({
            id: v.id,
            nombre: `${p.nombre}${!UNICA.has(v.etiqueta) ? ` (${v.etiqueta})` : ""}`,
            precio: v.precio,
          })),
      )
      .slice(0, 12);
  }, [carta, filtro]);

  async function enviar() {
    setAviso(null);
    try {
      await api(`/admin/mesas/${mesaId}/pedidos`, {
        method: "POST",
        body: {
          items: lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, nota: l.nota || undefined })),
        },
      });
      const n = mesas.find((m) => m.mesaId === mesaId)?.numero;
      setAviso({ tipo: "ok", texto: `Pedido de la mesa ${n} enviado a los sectores.` });
      setLineas([]);
      void cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ApiError ? e.message : "No pudimos enviar el pedido." });
    }
  }

  return (
    <>
      <Cabecera titulo="Pedido del mozo" bajada="Cargá el pedido de una mesa y registrá lo que entregás." />
      <div className="dos">
        <section aria-labelledby="t-cargar">
          <h2 id="t-cargar">Cargar un pedido</h2>
          {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}
          <div className="form">
            <label>
              Mesa
              <select value={mesaId} onChange={(e) => setMesaId(Number(e.target.value))}>
                <option value="">Elegí una mesa con sesión abierta</option>
                {mesas.map((m) => (
                  <option key={m.mesaId} value={m.mesaId}>
                    Mesa {m.numero}
                  </option>
                ))}
              </select>
            </label>
            {mesas.length === 0 && <p className="nota">No hay mesas abiertas: abrí la sesión en Mesas y QR.</p>}
            <label>
              Buscar en la carta
              <input
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Escribí al menos 2 letras"
                autoComplete="off"
              />
            </label>
            {opciones.length > 0 && (
              <ul className="opciones" aria-label="Resultados de la carta">
                {opciones.map((o) => (
                  <li key={o.id}>
                    <span>
                      {o.nombre} <small>{precio(o.precio)}</small>
                    </span>
                    <button
                      type="button"
                      className="btn btn--chico"
                      onClick={() =>
                        setLineas((ls) =>
                          ls.some((l) => l.varianteId === o.id)
                            ? ls.map((l) => (l.varianteId === o.id ? { ...l, cantidad: l.cantidad + 1 } : l))
                            : [...ls, { varianteId: o.id, nombre: o.nombre, cantidad: 1, nota: "" }],
                        )
                      }
                    >
                      Agregar<span className="sr-only"> {o.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lineas.length > 0 && (
              <ul className="opciones opciones--pedido" aria-label="Pedido">
                {lineas.map((l) => (
                  <li key={l.varianteId}>
                    <span>
                      <b>{l.cantidad} ×</b> {l.nombre}
                    </span>
                    <input
                      aria-label={`Aclaración para ${l.nombre}`}
                      placeholder="Aclaración"
                      value={l.nota}
                      maxLength={140}
                      onChange={(e) =>
                        setLineas((ls) =>
                          ls.map((x) => (x.varianteId === l.varianteId ? { ...x, nota: e.target.value } : x)),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn btn--chico"
                      onClick={() => setLineas((ls) => ls.filter((x) => x.varianteId !== l.varianteId))}
                    >
                      Quitar<span className="sr-only"> {l.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="btn btn--brasa"
              disabled={!mesaId || lineas.length === 0}
              onClick={() => void enviar()}
            >
              Enviar pedido
            </button>
          </div>
        </section>
        <section aria-labelledby="t-entregar">
          <h2 id="t-entregar">Listos para entregar</h2>
          {listos.length === 0 ? (
            <p className="vacio">No hay platos esperando.</p>
          ) : (
            <ul className="tickets">
              {listos.map((i) => (
                <Ticket
                  key={i.id}
                  i={i}
                  accion={{ texto: "Entregado", estado: "entregado", principal: true }}
                  onHecho={() => void cargar()}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/** Resumen para el Encargado: qué está pendiente en cada mesa y qué se demora. */
export function AdminPedidosQr() {
  const { items, error } = useItems(null);
  const porMesa = useMemo(() => {
    const m = new Map<number, ItemSector[]>();
    for (const i of items) m.set(i.mesa, [...(m.get(i.mesa) ?? []), i]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);
  const ETQ: Record<EstadoItem, string> = {
    recibido: "Recibido",
    en_preparacion: "En preparación",
    listo: "Listo",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };
  const demorados = items.filter((i) => i.demorado).length;
  return (
    <>
      <Cabecera titulo="Pedidos" bajada="Lo pendiente de cada mesa, desde el QR o cargado por el mozo." />
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <ul className="conteo">
        <li>
          <b>{porMesa.length}</b> mesas con pedidos pendientes
        </li>
        <li>
          <b>{items.length}</b> platos y bebidas sin entregar
        </li>
        <li className={demorados ? "conteo__alerta" : undefined}>
          <b>{demorados}</b> demorados
        </li>
      </ul>
      {porMesa.length === 0 ? (
        <p className="vacio">No hay pedidos pendientes.</p>
      ) : (
        <div className="mesas-pedidos">
          {porMesa.map(([mesa, its]) => (
            <section key={mesa} className="panel" aria-labelledby={`m-${mesa}`}>
              <h2 id={`m-${mesa}`}>Mesa {mesa}</h2>
              <ul className="lista-items">
                {its.map((i) => (
                  <li key={i.id} className={i.demorado ? "lista-items--demorado" : undefined}>
                    <span>
                      {i.cantidad} × {i.producto}
                      {i.variante && ` (${i.variante})`}
                      <small>
                        {SECTOR[i.sector]} · {i.minutos} min{i.demorado ? " · demorado" : ""}
                      </small>
                    </span>
                    <span className={`seg-estado seg-estado--${i.estado}`}>{ETQ[i.estado]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
