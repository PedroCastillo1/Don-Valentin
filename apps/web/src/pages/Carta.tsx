import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.ts";
import { precio } from "../lib/formato.ts";
import { PaginaPublica } from "../components/PaginaPublica.tsx";

export interface CartaPublica {
  grupos: {
    grupo: string;
    categorias: {
      id: string;
      nombre: string;
      productos: {
        id: number;
        nombre: string;
        nota: string | null;
        sinTacc: boolean;
        variantes: { etiqueta: string; precio: number | null }[];
      }[];
    }[];
  }[];
}

export function CartaVista({ carta, filtro }: { carta: CartaPublica; filtro: string }) {
  const q = filtro.trim().toLowerCase();
  return (
    <div className="carta">
      {carta.grupos.map((g) => {
        const cats = g.categorias
          .map((c) => ({
            ...c,
            productos: q ? c.productos.filter((p) => p.nombre.toLowerCase().includes(q)) : c.productos,
          }))
          .filter((c) => c.productos.length);
        if (!cats.length) return null;
        return (
          <section key={g.grupo} className="carta__grupo" aria-labelledby={`g-${g.grupo}`}>
            <h2 id={`g-${g.grupo}`}>{g.grupo}</h2>
            {cats.map((c) => (
              <div key={c.id} id={c.id} className="carta__cat">
                <h3>{c.nombre}</h3>
                <ul>
                  {c.productos.map((p) => (
                    <li key={p.id}>
                      <div className="carta__fila">
                        <span className="carta__nombre">
                          {p.nombre}
                          {p.sinTacc && (
                            <abbr title="Sin TACC" className="tacc">
                              sin TACC
                            </abbr>
                          )}
                        </span>
                        <span className="carta__puntos" aria-hidden="true" />
                        <span className="carta__precios">
                          {p.variantes.map((v) => (
                            <span key={v.etiqueta}>
                              {v.etiqueta && v.etiqueta !== "único" && <small>{v.etiqueta}</small>} {precio(v.precio)}
                            </span>
                          ))}
                        </span>
                      </div>
                      {p.nota && <p className="carta__nota">{p.nota}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

export function Carta() {
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");
  useEffect(() => {
    api<CartaPublica>("/public/carta")
      .then(setCarta)
      .catch(() => setError("No pudimos cargar la carta. Probá de nuevo en un momento."));
  }, []);
  const chips = useMemo(
    () => carta?.grupos.flatMap((g) => g.categorias.map((c) => ({ id: c.id, nombre: c.nombre }))) ?? [],
    [carta],
  );

  return (
    <PaginaPublica titulo="La carta" ojo="Precios por porción, en pesos" ancha>
      {error && (
        <p className="mensaje mensaje--error" role="alert">
          {error}
        </p>
      )}
      {!carta && !error && <p className="cargando">Cargando la carta…</p>}
      {carta && (
        <>
          <div className="carta__barra">
            <label className="carta__buscar">
              <span className="sr-only">Buscar en la carta</span>
              <input
                type="search"
                placeholder="Buscar un plato o una bebida"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </label>
            <nav className="carta__chips" aria-label="Categorías">
              {chips.map((c) => (
                <a key={c.id} href={`#${c.id}`}>
                  {c.nombre}
                </a>
              ))}
            </nav>
          </div>
          <CartaVista carta={carta} filtro={filtro} />
        </>
      )}
    </PaginaPublica>
  );
}
