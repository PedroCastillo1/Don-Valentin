import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  reservaCodigo: string | null;
  reservaNombre: string | null;
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

interface MesaAbierta {
  sesionId: number;
  mesaId: number;
  numero: number;
  reservaCodigo: string | null;
  reservaNombre: string | null;
}

interface LineaMozo {
  varianteId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  nota: string;
}

interface AccionEstado {
  texto: string;
  estado: EstadoItem;
  principal?: boolean;
  peligro?: boolean;
}

const SECTOR: Record<Sector, string> = { cocina: "Cocina", parrilla: "Parrilla", barra: "Barra" };
const ETQ_ESTADO: Record<EstadoItem, string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const REFRESCO_MS = 3_000;

/**
 * Devuelve las transiciones disponibles para un ítem según su estado actual y los permisos del puesto.
 * Permite avanzar y volver atrás (y desde «listo» o «entregado» volver a cualquier estado anterior).
 */
function accionesDeItem(estado: EstadoItem, opts: { puedeEntregar: boolean; puedeCancelar: boolean }): AccionEstado[] {
  const out: AccionEstado[] = [];
  if (estado === "recibido") {
    out.push({ texto: "Empezar", estado: "en_preparacion", principal: true });
    if (opts.puedeCancelar) out.push({ texto: "Cancelar", estado: "cancelado", peligro: true });
  } else if (estado === "en_preparacion") {
    out.push({ texto: "Listo", estado: "listo", principal: true });
    out.push({ texto: "← A recibido", estado: "recibido" });
    if (opts.puedeCancelar) out.push({ texto: "Cancelar", estado: "cancelado", peligro: true });
  } else if (estado === "listo") {
    if (opts.puedeEntregar) out.push({ texto: "Entregado", estado: "entregado", principal: true });
    out.push({ texto: "← A preparación", estado: "en_preparacion" });
    out.push({ texto: "← A recibido", estado: "recibido" });
    if (opts.puedeCancelar) out.push({ texto: "Cancelar", estado: "cancelado", peligro: true });
  } else if (estado === "entregado") {
    out.push({ texto: "← Volver a listo", estado: "listo" });
    out.push({ texto: "← A preparación", estado: "en_preparacion" });
    out.push({ texto: "← A recibido", estado: "recibido" });
    if (opts.puedeCancelar) out.push({ texto: "Cancelar", estado: "cancelado", peligro: true });
  } else if (estado === "cancelado") {
    out.push({ texto: "← Reactivar a recibido", estado: "recibido", principal: true });
    out.push({ texto: "← A preparación", estado: "en_preparacion" });
    out.push({ texto: "← A listo", estado: "listo" });
  }
  return out;
}

function useItems(sector: Sector | null, incluirCerrados = false) {
  const [items, setItems] = useState<ItemSector[]>([]);
  const [sectorFijo, setSectorFijo] = useState<Sector | null>(null);
  const [error, setError] = useState("");
  const enCurso = useRef(false);
  const cargar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    try {
      const params = new URLSearchParams();
      if (sector) params.set("sector", sector);
      if (incluirCerrados) params.set("todos", "1");
      const qs = params.toString();
      const r = await api<{ sector: Sector | null; fijo: boolean; items: ItemSector[] }>(
        `/admin/sectores/items${qs ? `?${qs}` : ""}`,
      );
      setItems(r.items);
      setSectorFijo(r.fijo ? r.sector : null);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sin conexión: reintentando…");
    } finally {
      enCurso.current = false;
    }
  }, [sector, incluirCerrados]);
  useEffect(() => {
    void cargar();
    const t = setInterval(() => {
      if (!document.hidden) void cargar();
    }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);
  return { items, sectorFijo, error, cargar };
}

async function mover(id: number, estado: EstadoItem) {
  await api(`/admin/items/${id}/estado`, { method: "POST", body: { estado } });
}

function Ticket({ i, acciones, onHecho }: { i: ItemSector; acciones: AccionEstado[]; onHecho: () => void }) {
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState<AccionEstado | null>(null);

  async function confirmarCambio(nuevo: EstadoItem) {
    setOcupado(true);
    setError("");
    try {
      await mover(i.id, nuevo);
      setConfirmando(null);
      onHecho();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cambiar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <li className={i.demorado ? "ticket-s ticket-s--demorado" : "ticket-s"}>
      <div className="ticket-s__cuerpo">
        <div className="ticket-s__cab">
          <b>Mesa {i.mesa}</b>
          <span className="ticket-s__min" title={`Tiempo máximo: ${i.tiempoMaximo} min`}>
            {i.minutos} min{i.demorado && <strong> · demorado</strong>}
          </span>
          <span className="ticket-s__pie">
            Pedido #{i.pedidoId} · {SECTOR[i.sector]} · {i.origen === "mozo" ? "mozo" : "QR"}
          </span>
        </div>
        {i.reservaNombre && (
          <p className="ticket-s__reserva">
            Reserva: <strong>{i.reservaNombre}</strong>
            {i.reservaCodigo && <code>{i.reservaCodigo}</code>}
          </p>
        )}
        <p className="ticket-s__plato">
          <span className="ticket-s__cant">{i.cantidad} ×</span> {i.producto}
          {i.variante && <small> ({i.variante})</small>}
        </p>
        {i.nota && <p className="ticket-s__nota">{i.nota}</p>}
        {error && <p className="ticket-s__error">{error}</p>}
      </div>

      {confirmando ? (
        <div className="confirmar confirmar--compacto" role="group" aria-label="Confirmar cambio de estado">
          <p>
            ¿Pasar{" "}
            <strong>
              {i.cantidad} × {i.producto}
            </strong>{" "}
            (Mesa {i.mesa}) a <strong>{ETQ_ESTADO[confirmando.estado]}</strong>?
          </p>
          <div className="acciones-fila">
            <button
              type="button"
              className="btn btn--brasa btn--chico"
              disabled={ocupado}
              onClick={() => void confirmarCambio(confirmando.estado)}
            >
              Sí, confirmar
            </button>
            <button type="button" className="btn btn--chico" disabled={ocupado} onClick={() => setConfirmando(null)}>
              No, volver
            </button>
          </div>
        </div>
      ) : (
        acciones.length > 0 && (
          <div className="ticket-s__acciones">
            {acciones.map((a) => (
              <button
                key={a.estado}
                type="button"
                className={
                  a.principal
                    ? "btn btn--brasa btn--chico"
                    : a.peligro
                      ? "btn btn--chico btn--peligro"
                      : "btn btn--chico"
                }
                disabled={ocupado}
                onClick={() => setConfirmando(a)}
              >
                {a.texto}
                <span className="sr-only">
                  : {i.cantidad} {i.producto}, mesa {i.mesa}
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </li>
  );
}

/** RF-Q2/Q3: panel de un sector, en tres columnas: nuevos, en preparación y listos para entregar (más historial de sesión opcional). */
export function AdminSectores() {
  const { usuario, puede } = useSesion();
  const puedeEntregar = puede("pedidos:tomar");
  const puedeCancelar = usuario?.rol === "admin" || usuario?.rol === "encargado";
  const [elegido, setElegido] = useState<Sector>("parrilla");
  const [mesaFiltro, setMesaFiltro] = useState<number | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [verCerrados, setVerCerrados] = useState(false);
  const { items, sectorFijo, error, cargar } = useItems(elegido, verCerrados);
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
      return coincideBusqueda(
        `mesa ${i.mesa} ${i.mesa} pedido ${i.pedidoId} #${i.pedidoId} ${i.reservaNombre ?? ""} ${i.reservaCodigo ?? ""} ${i.producto} ${i.variante} ${i.nota ?? ""}`,
        q,
      );
    });
  }, [delSectorBase, mesaFiltro, busqueda]);
  const col = (e: EstadoItem) => delSector.filter((i) => i.estado === e);
  const cerrados = useMemo(
    () => delSector.filter((i) => i.estado === "entregado" || i.estado === "cancelado"),
    [delSector],
  );
  const demorados = delSector.filter(
    (i) => i.demorado && (i.estado === "recibido" || i.estado === "en_preparacion"),
  ).length;

  return (
    <>
      <Cabecera
        titulo={sectorFijo ? `Panel de ${SECTOR[sectorFijo].toLowerCase()}` : "Cocina, parrilla y barra"}
        bajada={`Se actualiza solo cada ${REFRESCO_MS / 1000} segundos. Podés avanzar o retroceder cualquier estado con confirmación.`}
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
      <div className="filtros-pedidos filtros-pedidos--compacto" role="region" aria-label="Filtrar sector">
        <label>
          Mesa
          <select
            value={mesaFiltro}
            onChange={(e) => setMesaFiltro(e.target.value === "todas" ? "todas" : Number(e.target.value))}
          >
            <option value="todas">Todas las mesas ({mesasDelSector.length})</option>
            {mesasDelSector.map((num) => {
              const delNum = delSectorBase.filter((i) => i.mesa === num);
              const resNombre = delNum.find((i) => i.reservaNombre)?.reservaNombre;
              return (
                <option key={num} value={num}>
                  Mesa {num}
                  {resNombre ? ` · ${resNombre}` : ""} ({delNum.length})
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Buscar por mesa, reserva, pedido o plato
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. mesa 4, Quiroga, #12, vacío, jugoso…"
            autoComplete="off"
          />
        </label>
        <div className="acciones-fila">
          <button
            type="button"
            className={verCerrados ? "btn btn--brasa btn--chico" : "btn btn--chico"}
            aria-pressed={verCerrados}
            onClick={() => setVerCerrados((v) => !v)}
          >
            {verCerrados ? "Ocultar entregados / cancelados" : "Ver entregados / cancelados"}
          </button>
        </div>
      </div>

      <div className="cocina">
        {(
          [
            ["recibido", "Nuevos"],
            ["en_preparacion", "En preparación"],
            ["listo", "Listos para entregar"],
          ] as const
        ).map(([estado, titulo]) => (
          <section key={estado} className="cocina__col" aria-labelledby={`c-${estado}`}>
            <h2 id={`c-${estado}`}>
              {titulo} <span>{col(estado).length}</span>
            </h2>
            {col(estado).length === 0 ? (
              <p className="vacio">Nada por ahora.</p>
            ) : (
              <ul className="tickets tickets--scroll">
                {col(estado).map((i) => (
                  <Ticket
                    key={i.id}
                    i={i}
                    acciones={accionesDeItem(i.estado, { puedeEntregar, puedeCancelar })}
                    onHecho={() => void cargar()}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {verCerrados && (
        <section className="panel panel--sub" aria-labelledby="c-cerrados">
          <h2 id="c-cerrados">Entregados y cancelados de mesas abiertas ({cerrados.length})</h2>
          {cerrados.length === 0 ? (
            <p className="vacio">No hay ítems entregados ni cancelados en las sesiones abiertas de este sector.</p>
          ) : (
            <ul className="tickets tickets--scroll">
              {cerrados.map((i) => (
                <Ticket
                  key={i.id}
                  i={i}
                  acciones={accionesDeItem(i.estado, { puedeEntregar, puedeCancelar })}
                  onHecho={() => void cargar()}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

const CLAVE_BORRADOR_MOZO = "dv-borrador-mozo";

interface BorradorMozo {
  mesaId: number | "";
  filtro: string;
  lineas: LineaMozo[];
  listaAbierta: boolean;
  modoCompacto: boolean;
  notasAbiertas: number[];
}

function leerBorradorMozo(): BorradorMozo | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_BORRADOR_MOZO);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<BorradorMozo>;
    return {
      mesaId: typeof d.mesaId === "number" ? d.mesaId : "",
      filtro: typeof d.filtro === "string" ? d.filtro : "",
      lineas: Array.isArray(d.lineas) ? d.lineas : [],
      listaAbierta: typeof d.listaAbierta === "boolean" ? d.listaAbierta : true,
      modoCompacto: typeof d.modoCompacto === "boolean" ? d.modoCompacto : true,
      notasAbiertas: Array.isArray(d.notasAbiertas) ? d.notasAbiertas : [],
    };
  } catch {
    return null;
  }
}

/** RF-Q4: el mozo carga el pedido de una mesa (mismo circuito que el QR) y gestiona/entrega los platos de las mesas. */
export function AdminMozo() {
  const { usuario } = useSesion();
  const puedeCancelar = usuario?.rol === "admin" || usuario?.rol === "encargado";
  const [searchParams] = useSearchParams();
  const mesaUrl = Number(searchParams.get("mesa") ?? 0);
  const borradorInicial = useMemo(() => leerBorradorMozo(), []);
  const [mesas, setMesas] = useState<MesaAbierta[]>([]);
  const [mesaId, setMesaId] = useState<number | "">(() => borradorInicial?.mesaId ?? "");
  const [filtroMesaListos, setFiltroMesaListos] = useState<number | "todas">("todas");
  const [busquedaListos, setBusquedaListos] = useState("");
  const [estadoVistaDerecha, setEstadoVistaDerecha] = useState<"listo" | "activos" | "todos">("listo");
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [filtro, setFiltro] = useState(() => borradorInicial?.filtro ?? "");
  const [lineas, setLineas] = useState<LineaMozo[]>(() => borradorInicial?.lineas ?? []);
  const [listaAbierta, setListaAbierta] = useState(() => borradorInicial?.listaAbierta ?? true);
  const [modoCompacto, setModoCompacto] = useState(() => borradorInicial?.modoCompacto ?? true);
  const [notasAbiertas, setNotasAbiertas] = useState<number[]>(() => borradorInicial?.notasAbiertas ?? []);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const [confirmarEnvio, setConfirmarEnvio] = useState(false);
  const [quitarConfirmId, setQuitarConfirmId] = useState<number | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const { items, cargar } = useItems(null, true);

  useEffect(() => {
    try {
      const b: BorradorMozo = { mesaId, filtro, lineas, listaAbierta, modoCompacto, notasAbiertas };
      sessionStorage.setItem(CLAVE_BORRADOR_MOZO, JSON.stringify(b));
    } catch {
      // Si el almacenamiento está restringido, el estado sigue en memoria.
    }
  }, [mesaId, filtro, lineas, listaAbierta, modoCompacto, notasAbiertas]);

  useEffect(() => {
    void api<{ mesas: MesaAbierta[] }>("/admin/pedidos/mesas").then((r) => {
      setMesas(r.mesas);
      if (mesaUrl) {
        const encontrada = r.mesas.find((m) => m.numero === mesaUrl || m.mesaId === mesaUrl);
        if (encontrada) {
          setMesaId(encontrada.mesaId);
          return;
        }
      }
      setMesaId((actual) => {
        if (actual !== "" && r.mesas.some((m) => m.mesaId === actual)) return actual;
        return r.mesas.length === 1 ? r.mesas[0]!.mesaId : "";
      });
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
      setFiltro("");
      setNotasAbiertas([]);
      setConfirmarVaciar(false);
      setConfirmarEnvio(false);
      try {
        sessionStorage.removeItem(CLAVE_BORRADOR_MOZO);
      } catch {
        // Ignorado
      }
      void cargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ApiError ? e.message : "No pudimos enviar el pedido." });
    }
  }

  const mesasConItems = useMemo(() => [...new Set(items.map((i) => i.mesa))].sort((a, b) => a - b), [items]);

  const itemsFiltradosDerecha = useMemo(() => {
    const q = busquedaListos.trim();
    return items.filter((i) => {
      if (estadoVistaDerecha === "listo" && i.estado !== "listo") return false;
      if (
        estadoVistaDerecha === "activos" &&
        i.estado !== "recibido" &&
        i.estado !== "en_preparacion" &&
        i.estado !== "listo"
      )
        return false;
      if (filtroMesaListos !== "todas" && i.mesa !== filtroMesaListos) return false;
      if (!q) return true;
      return coincideBusqueda(
        `mesa ${i.mesa} ${i.mesa} pedido ${i.pedidoId} #${i.pedidoId} ${i.reservaNombre ?? ""} ${i.reservaCodigo ?? ""} ${i.producto} ${i.variante} ${i.nota ?? ""}`,
        q,
      );
    });
  }, [items, estadoVistaDerecha, filtroMesaListos, busquedaListos]);

  const pendientesMesaElegida = useMemo(
    () => (mesaElegida ? items.filter((i) => i.mesa === mesaElegida.numero) : []),
    [items, mesaElegida],
  );
  const totalLineas = lineas.reduce((acc, l) => acc + l.cantidad * l.precio, 0);
  const totalUnidades = lineas.reduce((acc, l) => acc + l.cantidad, 0);

  return (
    <>
      <Cabecera titulo="Pedido del mozo" bajada="Cargá el pedido de una mesa y gestioná los estados de entrega." />
      <div className="dos">
        <section aria-labelledby="t-cargar">
          <h2 id="t-cargar">Cargar un pedido</h2>
          {aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}
          <div className="form">
            <label>
              Mesa
              <select
                value={mesaId}
                onChange={(e) => {
                  setMesaId(e.target.value ? Number(e.target.value) : "");
                  setConfirmarEnvio(false);
                }}
              >
                <option value="">Elegí una mesa con sesión abierta</option>
                {mesas.map((m) => (
                  <option key={m.mesaId} value={m.mesaId}>
                    Mesa {m.numero}
                    {m.reservaNombre ? ` — Reserva: ${m.reservaNombre} (${m.reservaCodigo})` : ""}
                  </option>
                ))}
              </select>
            </label>
            {mesaElegida?.reservaNombre && (
              <p className="nota">
                Mesa {mesaElegida.numero} asociada a la reserva de <strong>{mesaElegida.reservaNombre}</strong> (
                <code>{mesaElegida.reservaCodigo}</code>).
              </p>
            )}
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
                      onClick={() => {
                        setConfirmarEnvio(false);
                        setLineas((ls) =>
                          ls.some((l) => l.varianteId === o.id)
                            ? ls.map((l) =>
                                l.varianteId === o.id ? { ...l, cantidad: Math.min(20, l.cantidad + 1) } : l,
                              )
                            : [...ls, { varianteId: o.id, nombre: o.nombre, precio: o.precio, cantidad: 1, nota: "" }],
                        );
                      }}
                    >
                      Agregar<span className="sr-only"> {o.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {lineas.length > 0 && (
              <div className="pedido-bloque">
                <div className="pedido-bloque__cab">
                  <span className="pedido-bloque__titulo">
                    Pedido actual: <b>{totalUnidades} u.</b> ({lineas.length}{" "}
                    {lineas.length === 1 ? "producto" : "productos"})
                  </span>
                  <div className="acciones-fila">
                    <button
                      type="button"
                      className="btn btn--chico"
                      aria-expanded={listaAbierta}
                      onClick={() => setListaAbierta((v) => !v)}
                    >
                      {listaAbierta ? "Ocultar lista" : `Ver lista (${lineas.length})`}
                    </button>
                    {listaAbierta && (
                      <button
                        type="button"
                        className="btn btn--chico"
                        aria-pressed={!modoCompacto}
                        onClick={() => setModoCompacto((v) => !v)}
                      >
                        {modoCompacto ? "Mostrar aclaraciones" : "Compactar"}
                      </button>
                    )}
                    {confirmarVaciar ? (
                      <span className="acciones-fila">
                        <button
                          type="button"
                          className="btn btn--brasa btn--chico"
                          onClick={() => {
                            setLineas([]);
                            setNotasAbiertas([]);
                            setConfirmarVaciar(false);
                            setConfirmarEnvio(false);
                          }}
                        >
                          Sí, vaciar
                        </button>
                        <button type="button" className="btn btn--chico" onClick={() => setConfirmarVaciar(false)}>
                          No
                        </button>
                      </span>
                    ) : (
                      <button type="button" className="btn btn--chico" onClick={() => setConfirmarVaciar(true)}>
                        Vaciar
                      </button>
                    )}
                  </div>
                </div>

                {!listaAbierta ? (
                  <p className="pedido-bloque__resumen">
                    {lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(" · ")}
                  </p>
                ) : (
                  <ul className="opciones opciones--pedido" aria-label="Pedido">
                    {lineas.map((l) => {
                      const mostrarNota = !modoCompacto || Boolean(l.nota) || notasAbiertas.includes(l.varianteId);
                      return (
                        <li key={l.varianteId}>
                          <div className="pedido-linea__cab">
                            <span>
                              <b>{l.cantidad} ×</b> {l.nombre} <small>{precio(l.precio * l.cantidad)}</small>
                            </span>
                            <div className="pedido-linea__controles">
                              {modoCompacto && !mostrarNota && (
                                <button
                                  type="button"
                                  className="btn btn--chico"
                                  onClick={() =>
                                    setNotasAbiertas((ids) =>
                                      ids.includes(l.varianteId) ? ids : [...ids, l.varianteId],
                                    )
                                  }
                                >
                                  + Nota
                                </button>
                              )}
                              <span className="pedido-cant" role="group" aria-label={`Cantidad de ${l.nombre}`}>
                                <button
                                  type="button"
                                  className="pedido-cant__btn"
                                  onClick={() => {
                                    setConfirmarEnvio(false);
                                    cambiarCantidad(l.varianteId, -1);
                                  }}
                                  aria-label={`Restar uno de ${l.nombre}`}
                                >
                                  −
                                </button>
                                <b aria-live="polite">{l.cantidad}</b>
                                <button
                                  type="button"
                                  className="pedido-cant__btn"
                                  disabled={l.cantidad >= 20}
                                  onClick={() => {
                                    setConfirmarEnvio(false);
                                    cambiarCantidad(l.varianteId, 1);
                                  }}
                                  aria-label={`Sumar uno de ${l.nombre}`}
                                >
                                  +
                                </button>
                              </span>
                              {quitarConfirmId === l.varianteId ? (
                                <span className="acciones-fila">
                                  <button
                                    type="button"
                                    className="btn btn--brasa btn--chico"
                                    onClick={() => {
                                      setLineas((ls) => ls.filter((x) => x.varianteId !== l.varianteId));
                                      setQuitarConfirmId(null);
                                      setConfirmarEnvio(false);
                                    }}
                                  >
                                    Sí, quitar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--chico"
                                    onClick={() => setQuitarConfirmId(null)}
                                  >
                                    No
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn--chico"
                                  onClick={() => setQuitarConfirmId(l.varianteId)}
                                >
                                  Quitar<span className="sr-only"> {l.nombre}</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {mostrarNota && (
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
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="pedido-total">
                  Total a enviar <b>{precio(totalLineas)}</b>
                </p>
              </div>
            )}
            {confirmarEnvio ? (
              <div className="confirmar" role="group" aria-label="Confirmar envío de pedido">
                <p>
                  ¿Confirmás enviar el pedido a la <strong>Mesa {mesaElegida?.numero}</strong> (
                  {lineas.reduce((a, l) => a + l.cantidad, 0)} ítems · <strong>{precio(totalLineas)}</strong>)?
                </p>
                <div className="acciones-fila">
                  <button type="button" className="btn btn--brasa btn--chico" onClick={() => void enviar()}>
                    Sí, enviar pedido
                  </button>
                  <button type="button" className="btn btn--chico" onClick={() => setConfirmarEnvio(false)}>
                    No, revisar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--brasa"
                disabled={!mesaId || lineas.length === 0}
                onClick={() => setConfirmarEnvio(true)}
              >
                Enviar pedido
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="t-entregar">
          <div className="cab-seccion">
            <h2 id="t-entregar">Listos para entregar y seguimiento</h2>
          </div>
          <div
            className="filtros-pedidos filtros-pedidos--compacto"
            role="region"
            aria-label="Filtrar pedidos del salón"
          >
            <label>
              Mesa
              <select
                value={filtroMesaListos}
                onChange={(e) => setFiltroMesaListos(e.target.value === "todas" ? "todas" : Number(e.target.value))}
              >
                <option value="todas">Todas las mesas ({mesasConItems.length})</option>
                {mesasConItems.map((num) => {
                  const delNum = items.filter((i) => i.mesa === num);
                  const resNombre = delNum.find((i) => i.reservaNombre)?.reservaNombre;
                  return (
                    <option key={num} value={num}>
                      Mesa {num}
                      {resNombre ? ` · ${resNombre}` : ""} ({delNum.length})
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Buscar mesa, reserva o plato
              <input
                type="search"
                value={busquedaListos}
                onChange={(e) => setBusquedaListos(e.target.value)}
                placeholder="Ej. mesa 27, Quiroga, #5, molleja…"
                autoComplete="off"
              />
            </label>
            <div className="franjas franjas--compacta" role="group" aria-label="Vista de ítems">
              {(
                [
                  ["listo", "Listos para entregar"],
                  ["activos", "En curso"],
                  ["todos", "Todos (incl. entregados)"],
                ] as const
              ).map(([id, etq]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={estadoVistaDerecha === id}
                  onClick={() => setEstadoVistaDerecha(id)}
                >
                  {etq}
                </button>
              ))}
            </div>
          </div>

          {itemsFiltradosDerecha.length === 0 ? (
            <p className="vacio">No hay platos en esta vista.</p>
          ) : (
            <ul className="tickets tickets--scroll">
              {itemsFiltradosDerecha.map((i) => (
                <Ticket
                  key={i.id}
                  i={i}
                  acciones={accionesDeItem(i.estado, { puedeEntregar: true, puedeCancelar })}
                  onHecho={() => void cargar()}
                />
              ))}
            </ul>
          )}

          {mesaElegida && (
            <div className="panel panel--sub" aria-labelledby="t-mesa-actual">
              <div className="panel__cab panel__cab--fila">
                <h3 id="t-mesa-actual">
                  Pedidos de Mesa {mesaElegida.numero}
                  {mesaElegida.reservaNombre ? ` · ${mesaElegida.reservaNombre}` : ""}
                </h3>
                <span className="seg-estado">{pendientesMesaElegida.length} ítems</span>
              </div>
              {pendientesMesaElegida.length === 0 ? (
                <p className="vacio">Esta mesa no tiene platos registrados en la sesión actual.</p>
              ) : (
                <ul className="lista-items lista-items--scroll">
                  {pendientesMesaElegida.map((i) => (
                    <ItemMesaFila key={i.id} item={i} puedeCancelar={puedeCancelar} onCambio={() => void cargar()} />
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
  const [confirmando, setConfirmando] = useState<AccionEstado | null>(null);
  const acciones = useMemo(
    () => accionesDeItem(i.estado, { puedeEntregar: true, puedeCancelar }),
    [i.estado, puedeCancelar],
  );

  async function cambiarEstado(nuevo: EstadoItem) {
    setOcupado(true);
    setErr("");
    try {
      await mover(i.id, nuevo);
      setConfirmando(null);
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
          <strong>
            {i.cantidad} × {i.producto}
            {i.variante && ` (${i.variante})`}
          </strong>
          {i.nota && <small className="lista-items__nota">Nota: {i.nota}</small>}
          <small>
            Pedido #{i.pedidoId} · {SECTOR[i.sector]} · {i.origen === "mozo" ? "mozo" : "QR"} · {i.minutos} min
            {i.demorado ? " · demorado" : ""}
          </small>
          {err && <small className="ticket-s__error">{err}</small>}
        </div>
        <span className={`seg-estado seg-estado--${i.estado}`}>{ETQ_ESTADO[i.estado]}</span>
      </div>
      {confirmando ? (
        <div className="confirmar confirmar--compacto" role="group" aria-label="Confirmar cambio de estado">
          <p>
            ¿Pasar{" "}
            <strong>
              {i.cantidad} × {i.producto}
            </strong>{" "}
            (Mesa {i.mesa}) a <strong>{ETQ_ESTADO[confirmando.estado]}</strong>?
          </p>
          <div className="acciones-fila">
            <button
              type="button"
              className="btn btn--brasa btn--chico"
              disabled={ocupado}
              onClick={() => void cambiarEstado(confirmando.estado)}
            >
              Sí, confirmar
            </button>
            <button type="button" className="btn btn--chico" disabled={ocupado} onClick={() => setConfirmando(null)}>
              No, volver
            </button>
          </div>
        </div>
      ) : (
        acciones.length > 0 && (
          <div className="lista-items__acciones">
            {acciones.map((a) => (
              <button
                key={a.estado}
                type="button"
                className={
                  a.principal
                    ? "btn btn--brasa btn--chico"
                    : a.peligro
                      ? "btn btn--chico btn--peligro"
                      : "btn btn--chico"
                }
                disabled={ocupado}
                onClick={() => setConfirmando(a)}
              >
                {a.texto}
                <span className="sr-only">
                  {" "}
                  {i.cantidad} {i.producto} de mesa {i.mesa}
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </li>
  );
}

/** Resumen y gestión por mesa: buscá o elegí cualquier mesa/reserva, avanzá o retrocedé estados con confirmación o cargá nuevos platos. */
export function AdminPedidosQr() {
  const { usuario } = useSesion();
  const puedeCancelar = usuario?.rol === "admin" || usuario?.rol === "encargado";
  const { items, error, cargar } = useItems(null, true);
  const [mesasAbiertasLista, setMesasAbiertasLista] = useState<MesaAbierta[]>([]);
  const [mesaFiltro, setMesaFiltro] = useState<number | "todas">("todas");
  const [sectorFiltro, setSectorFiltro] = useState<Sector | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoItem | "activos" | "todos" | "demorados">("activos");
  const [mesasPlegadas, setMesasPlegadas] = useState<number[]>([]);

  useEffect(() => {
    void api<{ mesas: MesaAbierta[] }>("/admin/pedidos/mesas")
      .then((r) => setMesasAbiertasLista(r.mesas))
      .catch(() => {});
  }, []);

  const infoPorMesa = useMemo(() => {
    const m = new Map<number, { reservaNombre: string | null; reservaCodigo: string | null }>();
    for (const ma of mesasAbiertasLista) {
      m.set(ma.numero, { reservaNombre: ma.reservaNombre, reservaCodigo: ma.reservaCodigo });
    }
    for (const i of items) {
      if (!m.has(i.mesa) || (!m.get(i.mesa)?.reservaNombre && i.reservaNombre)) {
        m.set(i.mesa, { reservaNombre: i.reservaNombre, reservaCodigo: i.reservaCodigo });
      }
    }
    return m;
  }, [items, mesasAbiertasLista]);

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
        const info = infoPorMesa.get(mesa);
        const filtrados = its.filter((i) => {
          if (sectorFiltro !== "todos" && i.sector !== sectorFiltro) return false;
          if (estadoFiltro === "activos" && !["recibido", "en_preparacion", "listo"].includes(i.estado)) return false;
          if (estadoFiltro === "demorados" && !i.demorado) return false;
          if (
            estadoFiltro !== "todos" &&
            estadoFiltro !== "activos" &&
            estadoFiltro !== "demorados" &&
            i.estado !== estadoFiltro
          )
            return false;
          if (!q) return true;
          return coincideBusqueda(
            `mesa ${mesa} ${mesa} pedido ${i.pedidoId} #${i.pedidoId} ${info?.reservaNombre ?? ""} ${info?.reservaCodigo ?? ""} ${i.producto} ${i.variante} ${i.nota ?? ""} ${SECTOR[i.sector]}`,
            q,
          );
        });
        return [mesa, filtrados];
      })
      .filter(([mesa, its]) => its.length > 0 || mesaFiltro === mesa);
  }, [porMesa, mesaFiltro, sectorFiltro, busqueda, estadoFiltro, infoPorMesa]);

  const itemsActivosCount = items.filter((i) => ["recibido", "en_preparacion", "listo"].includes(i.estado)).length;
  const mesasActivasCount = new Set(
    items.filter((i) => ["recibido", "en_preparacion", "listo"].includes(i.estado)).map((i) => i.mesa),
  ).size;
  const demorados = items.filter((i) => i.demorado).length;

  return (
    <>
      <Cabecera
        titulo="Pedidos"
        bajada="Buscá por mesa, reserva o número de pedido; avanzá o volvé atrás cualquier estado con confirmación."
      />
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      <ul className="conteo">
        <li>
          <b>{mesasActivasCount}</b> mesas con pedidos en curso
        </li>
        <li>
          <b>{itemsActivosCount}</b> platos y bebidas sin entregar
        </li>
        <li className={demorados ? "conteo__alerta" : undefined}>
          <b>{demorados}</b> demorados
        </li>
      </ul>

      <div className="filtros-pedidos" role="region" aria-label="Filtrar y buscar mesas">
        <label>
          Mesa / Reserva
          <select
            value={mesaFiltro}
            onChange={(e) => setMesaFiltro(e.target.value === "todas" ? "todas" : Number(e.target.value))}
          >
            <option value="todas">Todas las mesas ({todasLasMesas.length})</option>
            {todasLasMesas.map((num) => {
              const cant = items.filter(
                (i) => i.mesa === num && ["recibido", "en_preparacion", "listo"].includes(i.estado),
              ).length;
              const info = infoPorMesa.get(num);
              return (
                <option key={num} value={num}>
                  Mesa {num}
                  {info?.reservaNombre ? ` · ${info.reservaNombre} (${info.reservaCodigo})` : ""}{" "}
                  {cant > 0 ? `— ${cant} en curso` : "— sin pendientes"}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          Sector
          <select value={sectorFiltro} onChange={(e) => setSectorFiltro(e.target.value as Sector | "todos")}>
            <option value="todos">Todos los sectores</option>
            <option value="parrilla">Parrilla</option>
            <option value="cocina">Cocina</option>
            <option value="barra">Barra</option>
          </select>
        </label>
        <label>
          Buscar mesa, reserva, pedido o plato
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej. mesa 4, Quiroga, #12, vacío…"
            autoComplete="off"
          />
        </label>
        <div className="franjas franjas--compacta" role="group" aria-label="Estado del pedido">
          {(
            [
              ["activos", "En curso"],
              ["todos", "Todos"],
              ["recibido", "Recibidos"],
              ["en_preparacion", "En preparación"],
              ["listo", "Listos"],
              ["entregado", "Entregados"],
              ["cancelado", "Cancelados"],
              ["demorados", "Demorados"],
            ] as const
          ).map(([id, etq]) => (
            <button key={id} type="button" aria-pressed={estadoFiltro === id} onClick={() => setEstadoFiltro(id)}>
              {etq}
            </button>
          ))}
          {porMesaFiltradas.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const todas = porMesaFiltradas.map(([m]) => m);
                const estanTodasPlegadas = todas.every((m) => mesasPlegadas.includes(m));
                setMesasPlegadas(estanTodasPlegadas ? [] : todas);
              }}
            >
              {porMesaFiltradas.every(([m]) => mesasPlegadas.includes(m))
                ? "Expandir todas las mesas"
                : "Compactar todas las mesas"}
            </button>
          )}
        </div>
      </div>

      {porMesaFiltradas.length === 0 ? (
        <p className="vacio">
          {items.length === 0 ? "No hay pedidos registrados." : "No hay pedidos que coincidan con ese filtro."}
        </p>
      ) : (
        <div className="mesas-pedidos">
          {porMesaFiltradas.map(([mesa, its]) => {
            const info = infoPorMesa.get(mesa);
            const pedidosIds = [...new Set(its.map((i) => i.pedidoId))];
            const plegada = mesasPlegadas.includes(mesa);
            return (
              <section key={mesa} className="panel" aria-labelledby={`m-${mesa}`}>
                <div className="panel__cab panel__cab--fila">
                  <div>
                    <h2 id={`m-${mesa}`}>Mesa {mesa}</h2>
                    {info?.reservaNombre && (
                      <p className="mesa-reserva-tag">
                        Reserva: <strong>{info.reservaNombre}</strong>{" "}
                        {info.reservaCodigo && <code>{info.reservaCodigo}</code>}
                      </p>
                    )}
                    {pedidosIds.length > 0 && (
                      <small className="mesa-pedidos-tag">
                        {pedidosIds.length === 1
                          ? `Pedido #${pedidosIds[0]}`
                          : `${pedidosIds.length} pedidos (${pedidosIds.map((id) => `#${id}`).join(", ")})`}{" "}
                        · {its.length} {its.length === 1 ? "ítem" : "ítems"}
                      </small>
                    )}
                  </div>
                  <div className="acciones-fila">
                    {its.length > 0 && (
                      <button
                        type="button"
                        className="btn btn--chico"
                        aria-expanded={!plegada}
                        onClick={() =>
                          setMesasPlegadas((prev) =>
                            prev.includes(mesa) ? prev.filter((x) => x !== mesa) : [...prev, mesa],
                          )
                        }
                      >
                        {plegada ? `Ver (${its.length})` : "Ocultar"}
                      </button>
                    )}
                    <Link className="btn btn--chico" to={`/admin/mozo?mesa=${mesa}`}>
                      + Cargar pedido
                    </Link>
                  </div>
                </div>
                {its.length === 0 ? (
                  <p className="vacio">Esta mesa no tiene platos en el estado seleccionado.</p>
                ) : plegada ? (
                  <p className="pedido-bloque__resumen">
                    {its.map((i) => `${i.cantidad}× ${i.producto}${i.variante ? ` (${i.variante})` : ""}`).join(" · ")}
                  </p>
                ) : (
                  <ul className="lista-items lista-items--scroll">
                    {its.map((i) => (
                      <ItemMesaFila key={i.id} item={i} puedeCancelar={puedeCancelar} onCambio={() => void cargar()} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
