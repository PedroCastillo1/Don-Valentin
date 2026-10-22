import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { api, ApiError } from "../lib/api.ts";
import { precio } from "../lib/formato.ts";
import { CartaVista } from "./Carta.tsx";
import type { CartaPublica } from "./Carta.tsx";
import { SiteNav } from "../components/SiteNav.tsx";
import { Pie } from "../components/Pie.tsx";

interface Linea {
  varianteId: number;
  nombre: string;
  etiqueta: string;
  precio: number;
  cantidad: number;
  nota: string;
}
interface ItemPedido {
  id: number;
  producto: string;
  variante: string;
  cantidad: number;
  nota: string | null;
  estado: "recibido" | "en_preparacion" | "listo" | "entregado" | "cancelado";
}
interface Pedido {
  id: number;
  origen: "qr" | "mozo";
  estado: ItemPedido["estado"];
  creadoEn: string;
  items: ItemPedido[];
}

const ESTADO: Record<ItemPedido["estado"], string> = {
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo, ya viene",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));

/** RF-Q1/Q2: la mesa del QR. Con la mesa habilitada por el mozo, el comensal arma y envía su pedido desde acá. */
export function MesaQr() {
  const { token = "" } = useParams();
  const [mesa, setMesa] = useState<{ numero: number; sesionAbierta: boolean } | null>(null);
  const [habilitada, setHabilitada] = useState(false);
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const base = `/public/mesa/${encodeURIComponent(token)}`;

  const verPedidos = useCallback(async () => {
    try {
      setPedidos((await api<{ pedidos: Pedido[] }>(`${base}/pedidos`)).pedidos);
    } catch (e) {
      // La mesa se liberó (se fue el grupo): este celular ya no puede pedir.
      if (e instanceof ApiError && e.status === 403) setHabilitada(false);
    }
  }, [base]);

  useEffect(() => {
    api<{ numero: number; sesionAbierta: boolean }>(base)
      .then(async (m) => {
        setMesa(m);
        if (m.sesionAbierta) {
          try {
            await api(`${base}/ingreso`, { method: "POST" });
            setHabilitada(true);
          } catch {
            setHabilitada(false);
          }
        }
        setCarta(await api<CartaPublica>("/public/carta"));
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 404
            ? "Este código no corresponde a ninguna mesa. Pedile ayuda al mozo."
            : "No pudimos cargar la mesa. Probá de nuevo.",
        ),
      );
  }, [base]);

  // Seguimiento: cada 10 segundos se actualiza el estado de lo pedido.
  useEffect(() => {
    if (!habilitada) return;
    void verPedidos();
    const t = setInterval(() => void verPedidos(), 10_000);
    return () => clearInterval(t);
  }, [habilitada, verPedidos]);

  function agregar(nombre: string, v: { id: number; etiqueta: string; precio: number | null }) {
    if (v.precio === null) return;
    setAviso(null);
    setLineas((ls) => {
      const ya = ls.find((l) => l.varianteId === v.id);
      if (ya) return ls.map((l) => (l === ya ? { ...l, cantidad: Math.min(20, l.cantidad + 1) } : l));
      return [
        ...ls,
        {
          varianteId: v.id,
          nombre,
          etiqueta: v.etiqueta === "única" || v.etiqueta === "único" ? "" : v.etiqueta,
          precio: v.precio!,
          cantidad: 1,
          nota: "",
        },
      ];
    });
  }
  const cambiar = (id: number, delta: number) =>
    setLineas((ls) =>
      ls
        .map((l) => (l.varianteId === id ? { ...l, cantidad: Math.min(20, l.cantidad + delta) } : l))
        .filter((l) => l.cantidad > 0),
    );

  async function enviar() {
    setEnviando(true);
    setAviso(null);
    try {
      await api(`${base}/pedidos`, {
        method: "POST",
        body: {
          items: lineas.map((l) => ({ varianteId: l.varianteId, cantidad: l.cantidad, nota: l.nota || undefined })),
        },
      });
      setLineas([]);
      setAviso({ tipo: "ok", texto: "¡Pedido enviado! Ya lo están preparando. Abajo ves cómo va." });
      await verPedidos();
    } catch (e) {
      setAviso({
        tipo: "error",
        texto: e instanceof ApiError ? e.message : "No pudimos enviar el pedido. Probá de nuevo.",
      });
      if (e instanceof ApiError && e.status === 403) setHabilitada(false);
    } finally {
      setEnviando(false);
    }
  }

  const unidades = lineas.reduce((n, l) => n + l.cantidad, 0);
  const total = lineas.reduce((n, l) => n + l.cantidad * l.precio, 0);
  return (
    <>
      <SiteNav />
      <main id="contenido" className="pag">
        <header className="pag__cab">
          <h1>{mesa ? `Mesa ${mesa.numero}` : "Tu mesa"}</h1>
          <p className="pag__sub">Bienvenidos a Don Valentín</p>
        </header>
        <div className="pag__cuerpo pag__cuerpo--ancha">
          {error && (
            <p className="mensaje mensaje--error" role="alert">
              {error}
            </p>
          )}
          {mesa && carta && (
            <>
              <p className="lead">
                {habilitada
                  ? "Elegí lo que quieras, revisá tu pedido y envialo: va directo a la cocina, la parrilla o la barra."
                  : "Esta es la carta del local. Para pedir desde el celular, pedile al mozo que habilite la mesa."}
              </p>
              {aviso && (
                <p className={`mensaje mensaje--${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : "status"}>
                  {aviso.texto}
                </p>
              )}
              {habilitada && pedidos.length > 0 && (
                <section className="seguimiento" aria-labelledby="t-seg">
                  <h2 id="t-seg">Lo que pediste</h2>
                  {pedidos.map((p) => (
                    <div key={p.id} className="seguimiento__pedido">
                      <p className="seguimiento__hora">
                        {hora(p.creadoEn)} · {p.origen === "mozo" ? "lo cargó el mozo" : "desde tu celular"}
                      </p>
                      <ul>
                        {p.items.map((i) => (
                          <li key={i.id}>
                            <span>
                              {i.cantidad} × {i.producto}
                              {i.variante && ` (${i.variante})`}
                              {i.nota && <small> · {i.nota}</small>}
                            </span>
                            <span className={`seg-estado seg-estado--${i.estado}`}>{ESTADO[i.estado]}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}
              <label className="carta__buscar">
                <span className="sr-only">Buscar en la carta</span>
                <input
                  type="search"
                  placeholder="Buscar un plato o una bebida"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </label>
              <CartaVista
                carta={carta}
                filtro={filtro}
                agregar={habilitada ? (p, v) => agregar(p.nombre, v) : undefined}
              />
            </>
          )}
        </div>
        {habilitada && lineas.length > 0 && (
          <section className="carrito" aria-labelledby="t-carrito">
            <h2 id="t-carrito">
              Tu pedido · {unidades} {unidades === 1 ? "cosa" : "cosas"}
            </h2>
            <ul className="carrito__lista">
              {lineas.map((l) => (
                <li key={l.varianteId}>
                  <div className="carrito__fila">
                    <span className="carrito__nombre">
                      {l.nombre}
                      {l.etiqueta && <small> ({l.etiqueta})</small>}
                    </span>
                    <span className="carrito__cant" role="group" aria-label={`Cantidad de ${l.nombre}`}>
                      <button
                        type="button"
                        onClick={() => cambiar(l.varianteId, -1)}
                        aria-label={`Uno menos de ${l.nombre}`}
                      >
                        −
                      </button>
                      <b aria-live="polite">{l.cantidad}</b>
                      <button
                        type="button"
                        onClick={() => cambiar(l.varianteId, 1)}
                        aria-label={`Uno más de ${l.nombre}`}
                      >
                        +
                      </button>
                    </span>
                  </div>
                  <label className="carrito__nota">
                    <span className="sr-only">Aclaración para {l.nombre}</span>
                    <input
                      value={l.nota}
                      maxLength={140}
                      placeholder="Aclaración (opcional): jugoso, sin sal…"
                      onChange={(e) =>
                        setLineas((ls) =>
                          ls.map((x) => (x.varianteId === l.varianteId ? { ...x, nota: e.target.value } : x)),
                        )
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>
            <p className="carrito__total">
              Total de este pedido <b>{precio(total)}</b>
            </p>
            <button
              type="button"
              className="btn btn--brasa btn--grande carrito__enviar"
              disabled={enviando}
              onClick={() => void enviar()}
            >
              {enviando ? "Enviando…" : "Enviar pedido"}
            </button>
          </section>
        )}
      </main>
      <Pie />
    </>
  );
}
