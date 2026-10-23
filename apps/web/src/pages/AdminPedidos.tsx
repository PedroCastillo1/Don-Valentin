import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api, ApiError } from "../lib/api.ts";
import { coincideBusqueda, precio, puntajeBusqueda, UNICA } from "../lib/formato.ts";
import { useSesion } from "../lib/sesion.tsx";
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
      <div className="ticket-s__cuerpo">
        <div className="ticket-s__cab">
          <b>Mesa {i.mesa}</b>
          <span className="ticket-s__min" title={`Tiempo máximo: ${i.tiempoMaximo} min`}>
            {i.minutos} min{i.demorado && <strong> · demorado</strong>}
          </span>
          <span className="ticket-s__pie">
            {SECTOR[i.sector]} · {i.origen === "mozo" ? "mozo" : "QR"}
          </span>
        </div>
        <p className="ticket-s__plato">
          <span className="ticket-s__cant">{i.cantidad} ×</span> {i.producto}
          {i.variante && <small> ({i.variante})</small>}
        </p>
        {i.nota && <p className="ticket-s__nota">{i.nota}</p>}
        {error && <p className="ticket-s__error">{error}</p>}
      </div>
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
  const [mesaFiltro, setMesaFiltro] = useState<number | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const { items, sectorFijo, error, cargar } = useItems(elegido);
  const sector = sectorFijo ?? elegido;
  const delSectorBase = useMemo(() => items.filter((i) => i.sector === sector), [items, sector]);
  const mesasDelSector = useMemo(
    () => [...new Set(delSectorBase.map((i) => i.mesa))].sort((a, b) => a - b),
    [delSectorBase],
  );
  const delSector = useMemo(() => {
    const q = busqueda.trim();
    return delSectorBase.filter((i) => {
      if (mesaFiltro !== "todas" && i.mesa !== mesaFiltro) return false;
      if (!q) return true;
      return coincideBusqueda(`mesa ${i.mesa} ${i.mesa} ${i.producto} ${i.variante} ${i.nota ?? ""}`, q);
    });
  }, [delSectorBase, mesaFiltro, busqueda]);
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
      {delSectorBase.length > 0 && (
        <div className="filtros-pedidos filtros-pedidos--compacto" role="region" aria-label="Filtrar sector">
          <label>
            Mesa
            <select
              value={mesaFiltro}
              onChange={(e) => setMesaFiltro(e.target.value === "todas" ? "todas" : Number(e.target.value))}
            >
              <option value="todas">Todas las mesas ({mesasDelSector.length})</option>
              {mesasDelSector.map((num) => (
                <option key={num} value={num}>
                  Mesa {num} ({delSectorBase.filter((i) => i.mesa === num).length})
                </option>
              ))}
            </select>
          </label>
          <label>
            Buscar plato o mesa
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej. mesa 1, asado, jugoso…"
              autoComplete="off"
            />
          </label>
        </div>
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
              <ul className="tickets tickets--scroll">
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
  precio: number;
  cantidad: number;
  nota: string;
}

const ETQ_ESTADO: Record<EstadoItem, string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ACCION_ITEM: Partial<Record<EstadoItem, { texto: string; siguiente: EstadoItem; principal?: boolean }>> = {
  recibido: { texto: "Empezar", siguiente: "en_preparacion" },
  en_preparacion: { texto: "Listo", siguiente: "listo" },
  listo: { texto: "Entregado", siguiente: "entregado", principal: true },
};

/** RF-Q4: el mozo carga el pedido de una mesa (mismo circuito que el QR) y registra lo que entrega. */
export function AdminMozo() {
  const [searchParams] = useSearchParams();
  const mesaUrl = Number(searchParams.get("mesa") ?? 0);
  const [mesas, setMesas] = useState<MesaAbierta[]>([]);
  const [mesaId, setMesaId] = useState<number | "">("");
  const [filtroMesaListos, setFiltroMesaListos] = useState<number | "todas">("todas");
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [filtro, setFiltro] = useState("");
  const [lineas, setLineas] = useState<LineaMozo[]>([]);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const { items, cargar } = useItems(null);

  useEffect(() => {
    void api<{ mesas: MesaAbierta[] }>("/admin/pedidos/mesas").then((r) => {
      setMesas(r.mesas);
      if (mesaUrl) {
        const encontrada = r.mesas.find((m) => m.numero === mesaUrl || m.mesaId === mesaUrl);
        if (encontrada) setMesaId(encontrada.mesaId);
      }
    });
    void api<CartaPublica>("/public/carta").then(setCarta);
  }, [mesaUrl]);

  const mesaElegida = useMemo(() => mesas.find((m) => m.mesaId === mesaId) ?? null, [mesas, mesaId]);

  const opciones = useMemo(() => {
    const q = filtro.trim();
    if (!carta || q.length < 1) return [];
    return carta.grupos
      .flatMap((g) =>
        g.categorias.flatMap((c) =>
          c.productos
            .map((p) => ({
              p,
              categoria: c.nombre,
              puntaje: puntajeBusqueda(p.nombre, c.nombre, q),
            }))
            .filter((x) => x.puntaje > 0),
        ),
      )
      .sort((a, b) => b.puntaje - a.puntaje || a.p.nombre.localeCompare(b.p.nombre, "es"))
      .flatMap(({ p, categoria }) =>
        p.variantes
          .filter((v) => v.precio !== null)
          .map((v) => ({
            id: v.id,
            nombre: `${p.nombre}${!UNICA.has(v.etiqueta) ? ` (${v.etiqueta})` : ""}`,
            categoria,
            precio: v.precio!,
          })),
      )
      .slice(0, 40);
  }, [carta, filtro]);

  const cambiarCantidad = (varianteId: number, delta: number) =>
    setLineas((ls) =>
      ls
        .map((l) => (l.varianteId === varianteId ? { ...l, cantidad: Math.min(20, l.cantidad + delta) } : l))
        .filter((l) => l.cantidad > 0),
    );

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

  const mesasConListos = useMemo(
    () => [...new Set(items.filter((i) => i.estado === "listo").map((i) => i.mesa))].sort((a, b) => a - b),
    [items],
  );
  const listos = useMemo(
    () => items.filter((i) => i.estado === "listo" && (filtroMesaListos === "todas" || i.mesa === filtroMesaListos)),
    [items, filtroMesaListos],
  );
  const pendientesMesaElegida = useMemo(
    () => (mesaElegida ? items.filter((i) => i.mesa === mesaElegida.numero) : []),
    [items, mesaElegida],
  );
  const totalLineas = lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0);

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
              <select value={mesaId} onChange={(e) => setMesaId(e.target.value ? Number(e.target.value) : "")}>
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
                placeholder="Buscá por plato, bebida o categoría (ej. vacío, milanesa, pizza, coca)"
                autoComplete="off"
              />
            </label>
            {filtro.trim().length >= 1 && opciones.length === 0 && (
              <p className="nota">No encontramos platos ni bebidas para «{filtro.trim()}».</p>
            )}
            {opciones.length > 0 && (
              <ul className="opciones opciones--resultados" aria-label="Resultados de la carta">
                {opciones.map((o) => (
                  <li key={o.id}>
                    <span>
                      {o.nombre}{" "}
                      <small>
                        {o.categoria} · {precio(o.precio)}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="btn btn--chico"
                      onClick={() =>
                        setLineas((ls) =>
                          ls.some((l) => l.varianteId === o.id)
                            ? ls.map((l) =>
                                l.varianteId === o.id ? { ...l, cantidad: Math.min(20, l.cantidad + 1) } : l,
                              )
                            : [...ls, { varianteId: o.id, nombre: o.nombre, precio: o.precio, cantidad: 1, nota: "" }],
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
              <>
                <ul className="opciones opciones--pedido" aria-label="Pedido">
                  {lineas.map((l) => (
                    <li key={l.varianteId}>
                      <div className="pedido-linea__cab">
                        <span>
                          <b>{l.cantidad} ×</b> {l.nombre} <small>{precio(l.precio * l.cantidad)}</small>
                        </span>
                        <div className="pedido-linea__controles">
                          <span className="pedido-cant" role="group" aria-label={`Cantidad de ${l.nombre}`}>
                            <button
                              type="button"
                              className="pedido-cant__btn"
                              onClick={() => cambiarCantidad(l.varianteId, -1)}
                              aria-label={`Restar uno de ${l.nombre}`}
                            >
                              −
                            </button>
                            <b aria-live="polite">{l.cantidad}</b>
                            <button
                              type="button"
                              className="pedido-cant__btn"
                              disabled={l.cantidad >= 20}
                              onClick={() => cambiarCantidad(l.varianteId, 1)}
                              aria-label={`Sumar uno de ${l.nombre}`}
                            >
                              +
                            </button>
                          </span>
                          <button
                            type="button"
                            className="btn btn--chico"
                            onClick={() => setLineas((ls) => ls.filter((x) => x.varianteId !== l.varianteId))}
                          >
                            Quitar<span className="sr-only"> {l.nombre}</span>
                          </button>
                        </div>
                      </div>
                      <input
                        aria-label={`Aclaración para ${l.nombre}`}
                        placeholder="Aclaración (opcional): punto de cocción, sin sal…"
                        value={l.nota}
                        maxLength={140}
                        onChange={(e) =>
                          setLineas((ls) =>
                            ls.map((x) => (x.varianteId === l.varianteId ? { ...x, nota: e.target.value } : x)),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
                <p className="pedido-total">
                  Total a enviar <b>{precio(totalLineas)}</b>
                </p>
              </>
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
          <div className="cab-seccion">
            <h2 id="t-entregar">Listos para entregar</h2>
            {mesasConListos.length > 1 && (
              <label className="filtro-mesa-inline">
                <span>Mesa</span>
                <select
                  value={filtroMesaListos}
                  onChange={(e) => setFiltroMesaListos(e.target.value === "todas" ? "todas" : Number(e.target.value))}
                >
                  <option value="todas">Todas ({mesasConListos.length})</option>
                  {mesasConListos.map((num) => (
                    <option key={num} value={num}>
                      Mesa {num}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
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

          {mesaElegida && (
            <div className="panel panel--sub" aria-labelledby="t-mesa-actual">
              <h3 id="t-mesa-actual">En curso en Mesa {mesaElegida.numero}</h3>
              {pendientesMesaElegida.length === 0 ? (
                <p className="vacio">Esta mesa no tiene platos pendientes en este momento.</p>
              ) : (
                <ul className="lista-items">
                  {pendientesMesaElegida.map((i) => (
                    <ItemMesaFila key={i.id} item={i} puedeCancelar={false} onCambio={() => void cargar()} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ItemMesaFila({
  item: i,
  puedeCancelar,
  onCambio,
}: {
  item: ItemSector;
  puedeCancelar: boolean;
  onCambio: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [err, setErr] = useState("");
  const accion = ACCION_ITEM[i.estado];

  async function cambiarEstado(nuevo: EstadoItem) {
    setOcupado(true);
    setErr("");
    try {
      await mover(i.id, nuevo);
      onCambio();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo actualizar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <li className={i.demorado ? "lista-items--demorado" : undefined}>
      <div className="lista-items__tope">
        <div className="lista-items__info">
          <span className="lista-items__plato">
            <b>{i.cantidad} ×</b> {i.producto}
            {i.variante && ` (${i.variante})`}
          </span>
          {i.nota && <small className="lista-items__nota">Nota: {i.nota}</small>}
          <small>
            {SECTOR[i.sector]} · {i.origen === "mozo" ? "mozo" : "QR"} · {i.minutos} min
            {i.demorado ? " · demorado" : ""}
          </small>
          {err && <small className="ticket-s__error">{err}</small>}
        </div>
        <span className={`seg-estado seg-estado--${i.estado}`}>{ETQ_ESTADO[i.estado]}</span>
      </div>
      {(accion || (puedeCancelar && (i.estado === "recibido" || i.estado === "en_preparacion"))) && (
        <div className="lista-items__acciones">
          {accion && (
            <button
              type="button"
              className={accion.principal ? "btn btn--brasa btn--chico" : "btn btn--chico"}
              disabled={ocupado}
              onClick={() => void cambiarEstado(accion.siguiente)}
            >
              {accion.texto}
              <span className="sr-only">
                {" "}
                {i.cantidad} {i.producto} de mesa {i.mesa}
              </span>
            </button>
          )}
          {puedeCancelar && (i.estado === "recibido" || i.estado === "en_preparacion") && (
            <button
              type="button"
              className="btn btn--chico btn--peligro"
              disabled={ocupado}
              onClick={() => void cambiarEstado("cancelado")}
            >
              Cancelar
              <span className="sr-only">
                {" "}
                {i.cantidad} {i.producto} de mesa {i.mesa}
              </span>
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Resumen y gestión por mesa: buscá o elegí cualquier mesa, avanzá estados o cargale nuevos platos. */
export function AdminPedidosQr() {
  const { usuario } = useSesion();
  const puedeCancelar = usuario?.rol === "admin" || usuario?.rol === "encargado";
  const { items, error, cargar } = useItems(null);
  const [mesasAbiertasLista, setMesasAbiertasLista] = useState<MesaAbierta[]>([]);
  const [mesaFiltro, setMesaFiltro] = useState<number | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoItem | "todos" | "demorados">("todos");

  useEffect(() => {
    void api<{ mesas: MesaAbierta[] }>("/admin/pedidos/mesas")
      .then((r) => setMesasAbiertasLista(r.mesas))
      .catch(() => {});
  }, []);

  const todasLasMesas = useMemo(() => {
    const n = new Set<number>();
    for (const i of items) n.add(i.mesa);
    for (const m of mesasAbiertasLista) n.add(m.numero);
    return [...n].sort((a, b) => a - b);
  }, [items, mesasAbiertasLista]);

  const porMesa = useMemo(() => {
    const m = new Map<number, ItemSector[]>();
    for (const i of items) m.set(i.mesa, [...(m.get(i.mesa) ?? []), i]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  const porMesaFiltradas = useMemo(() => {
    const q = busqueda.trim();
    const listaBase: [number, ItemSector[]][] =
      mesaFiltro !== "todas" && !porMesa.some(([num]) => num === mesaFiltro) ? [[mesaFiltro, []]] : porMesa;

    return listaBase
      .filter(([mesa]) => mesaFiltro === "todas" || mesa === mesaFiltro)
      .map(([mesa, its]): [number, ItemSector[]] => {
        const filtrados = its.filter((i) => {
          if (estadoFiltro === "demorados" && !i.demorado) return false;
          if (estadoFiltro !== "todos" && estadoFiltro !== "demorados" && i.estado !== estadoFiltro) return false;
          if (!q) return true;
          return coincideBusqueda(
            `mesa ${mesa} ${mesa} ${i.producto} ${i.variante} ${i.nota ?? ""} ${SECTOR[i.sector]}`,
            q,
          );
        });
        return [mesa, filtrados];
      })
      .filter(([mesa, its]) => its.length > 0 || mesaFiltro === mesa);
  }, [porMesa, mesaFiltro, busqueda, estadoFiltro]);

  const demorados = items.filter((i) => i.demorado).length;
  return (
    <>
      <Cabecera
        titulo="Pedidos"
        bajada="Buscá o elegí cualquier mesa para gestionar sus platos en curso o sumarle un pedido."
      />
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

      <div className="filtros-pedidos" role="region" aria-label="Filtrar y buscar mesas">
        <label>
          Mesa
          <select
            value={mesaFiltro}
            onChange={(e) => setMesaFiltro(e.target.value === "todas" ? "todas" : Number(e.target.value))}
          >
            <option value="todas">Todas las mesas ({porMesa.length} con pedido)</option>
            {todasLasMesas.map((num) => {
              const cant = items.filter((i) => i.mesa === num).length;
              return (
                <option key={num} value={num}>
                  Mesa {num} {cant > 0 ? `(${cant} ${cant === 1 ? "ítem" : "ítems"})` : "(abierta, sin pendientes)"}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Buscar mesa o producto
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. mesa 4, vacío, bebida…"
            autoComplete="off"
          />
        </label>
        <div className="franjas franjas--compacta" role="group" aria-label="Estado del pedido">
          {(
            [
              ["todos", "Todos"],
              ["recibido", "Recibidos"],
              ["en_preparacion", "En preparación"],
              ["listo", "Listos"],
              ["demorados", "Demorados"],
            ] as const
          ).map(([id, etq]) => (
            <button key={id} type="button" aria-pressed={estadoFiltro === id} onClick={() => setEstadoFiltro(id)}>
              {etq}
            </button>
          ))}
        </div>
      </div>

      {porMesaFiltradas.length === 0 ? (
        <p className="vacio">
          {items.length === 0 ? "No hay pedidos pendientes." : "No hay pedidos que coincidan con ese filtro."}
        </p>
      ) : (
        <div className="mesas-pedidos">
          {porMesaFiltradas.map(([mesa, its]) => (
            <section key={mesa} className="panel" aria-labelledby={`m-${mesa}`}>
              <div className="panel__cab panel__cab--fila">
                <h2 id={`m-${mesa}`}>Mesa {mesa}</h2>
                <Link className="btn btn--chico" to={`/admin/mozo?mesa=${mesa}`}>
                  + Cargar pedido
                </Link>
              </div>
              {its.length === 0 ? (
                <p className="vacio">Esta mesa no tiene platos pendientes en este momento.</p>
              ) : (
                <ul className="lista-items">
                  {its.map((i) => (
                    <ItemMesaFila key={i.id} item={i} puedeCancelar={puedeCancelar} onCambio={() => void cargar()} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
