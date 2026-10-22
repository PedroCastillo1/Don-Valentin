import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../lib/api.ts";
import { useSesion } from "../lib/sesion.tsx";
import { precio, UNICA } from "../lib/formato.ts";
import { Cabecera, Mensaje } from "../components/ui.tsx";

interface Producto {
  id: number;
  categoria: string;
  grupo: string;
  nombre: string;
  sector: "cocina" | "parrilla" | "barra";
  disponible: boolean;
  variantes: { id: number; etiqueta: string; precio: number | null }[];
}
const SECTOR = { cocina: "Cocina", parrilla: "Parrilla", barra: "Barra" } as const;

/** Hito 4: precios y disponibilidad. Lo que se cambia acá se ve en el sitio y en el QR en menos de un minuto. */
export function AdminCarta() {
  const { puede } = useSesion();
  const editable = puede("carta:editar");
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [filtro, setFiltro] = useState("");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ productos: Producto[] }>("/admin/carta")
      .then((r) => setProductos(r.productos))
      .catch(() => setError("No pudimos cargar la carta."));
  }, []);

  const grupos = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const lista = (productos ?? []).filter((p) => !q || p.nombre.toLowerCase().includes(q));
    const m = new Map<string, Producto[]>();
    for (const p of lista) {
      const k = `${p.grupo} · ${p.categoria}`;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.entries()];
  }, [productos, filtro]);

  async function guardarPrecio(p: Producto, v: Producto["variantes"][number], texto: string) {
    const valor = texto.trim() === "" ? null : Number(texto.replace(",", "."));
    if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
      setAviso({ tipo: "error", texto: "El precio tiene que ser un número mayor o igual a cero." });
      return;
    }
    if (valor === v.precio) return;
    try {
      await api(`/admin/carta/variantes/${v.id}`, { method: "PUT", body: { precio: valor } });
      setProductos((ps) =>
        ps!.map((x) =>
          x.id === p.id
            ? { ...x, variantes: x.variantes.map((y) => (y.id === v.id ? { ...y, precio: valor } : y)) }
            : x,
        ),
      );
      setAviso({
        tipo: "ok",
        texto: `Precio de ${p.nombre}${!UNICA.has(v.etiqueta) ? ` (${v.etiqueta})` : ""}: ${precio(valor)}.`,
      });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ApiError ? e.message : "No pudimos guardar el precio." });
    }
  }

  async function cambiarDisponible(p: Producto) {
    try {
      await api(`/admin/carta/productos/${p.id}`, { method: "PUT", body: { disponible: !p.disponible } });
      setProductos((ps) => ps!.map((x) => (x.id === p.id ? { ...x, disponible: !p.disponible } : x)));
      setAviso({
        tipo: "ok",
        texto: p.disponible
          ? `${p.nombre} quedó agotado: ya no se ve en la carta ni se puede pedir.`
          : `${p.nombre} vuelve a estar disponible.`,
      });
    } catch (e) {
      setAviso({ tipo: "error", texto: e instanceof ApiError ? e.message : "No pudimos guardar el cambio." });
    }
  }

  const total = productos?.length ?? 0;
  const agotados = productos?.filter((p) => !p.disponible).length ?? 0;
  return (
    <>
      <Cabecera
        titulo="Carta y precios"
        bajada="La misma carta alimenta el sitio y el pedido por QR: un cambio acá se ve allá en menos de un minuto."
      />
      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {!productos && !error && <p className="cargando">Cargando la carta…</p>}
      {productos && (
        <section className="panel" aria-labelledby="t-carta-adm">
          <div className="panel__cab">
            <h2 id="t-carta-adm">Carta vigente</h2>
            <p>
              {total} productos · {agotados} agotados · precios en pesos
              {editable ? ". Escribí el precio y salí del campo para guardarlo." : ""}
            </p>
          </div>
          <label className="buscador">
            <span>Buscar un producto</span>
            <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} autoComplete="off" />
          </label>
          <div aria-live="polite">{aviso && <Mensaje tipo={aviso.tipo}>{aviso.texto}</Mensaje>}</div>
          <div className="carta-adm">
            {grupos.map(([titulo, ps]) => (
              <section key={titulo}>
                <h3>{titulo}</h3>
                <table className="tabla tabla--carta">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Sector</th>
                      <th>Precio</th>
                      <th>Disponible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ps.map((p) => (
                      <tr key={p.id} className={p.disponible ? undefined : "fila--agotada"}>
                        <td>{p.nombre}</td>
                        <td>{SECTOR[p.sector]}</td>
                        <td className="precios-edit">
                          {p.variantes.map((v) =>
                            editable ? (
                              <label key={v.id}>
                                <span className={UNICA.has(v.etiqueta) ? "sr-only" : undefined}>
                                  {UNICA.has(v.etiqueta) ? `Precio de ${p.nombre}` : v.etiqueta}
                                </span>
                                {!UNICA.has(v.etiqueta) && <span className="sr-only"> de {p.nombre}</span>}
                                <input
                                  inputMode="decimal"
                                  defaultValue={v.precio ?? ""}
                                  placeholder="Consultar"
                                  onBlur={(e) => void guardarPrecio(p, v, e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                                />
                              </label>
                            ) : (
                              <span key={v.id}>
                                {!UNICA.has(v.etiqueta) && `${v.etiqueta} `}
                                {precio(v.precio)}
                              </span>
                            ),
                          )}
                        </td>
                        <td>
                          {editable ? (
                            <label className="interruptor">
                              <input
                                type="checkbox"
                                checked={p.disponible}
                                onChange={() => void cambiarDisponible(p)}
                              />
                              <span className="sr-only">{p.nombre} disponible</span>
                              <span aria-hidden="true">{p.disponible ? "Sí" : "Agotado"}</span>
                            </label>
                          ) : p.disponible ? (
                            "Sí"
                          ) : (
                            "Agotado"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
