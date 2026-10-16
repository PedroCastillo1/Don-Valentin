import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { PARRILLA_LIBRE } from "@dv/shared";
import { api } from "../lib/api.ts";
import { precio } from "../lib/formato.ts";
import { PaginaPublica } from "../components/PaginaPublica.tsx";
import "../styles/carta.css";

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
  const [activa, setActiva] = useState("");
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  useEffect(() => {
    api<CartaPublica>("/public/carta")
      .then(setCarta)
      .catch(() => setError("No pudimos cargar la carta. Probá de nuevo en un momento."));
  }, []);
  const grupos = useMemo(
    () =>
      carta?.grupos.map((g) => ({
        nombre: g.grupo,
        cats: g.categorias.map((c) => ({ id: c.id, nombre: c.nombre })),
      })) ?? [],
    [carta],
  );
  const total = useMemo(
    () => carta?.grupos.reduce((n, g) => n + g.categorias.reduce((m, c) => m + c.productos.length, 0), 0) ?? 0,
    [carta],
  );
  const coincidencias = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!carta || !q) return null;
    return carta.grupos.reduce(
      (n, g) =>
        n + g.categorias.reduce((m, c) => m + c.productos.filter((p) => p.nombre.toLowerCase().includes(q)).length, 0),
      0,
    );
  }, [carta, filtro]);

  // Resalta en el índice la categoría que se está leyendo.
  useEffect(() => {
    if (!carta) return;
    const io = new IntersectionObserver(
      (es) => {
        const e = es.find((x) => x.isIntersecting);
        if (e) setActiva(e.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    document.querySelectorAll(".carta__cat").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [carta, filtro]);

  function ir(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    setActiva(id);
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
  }

  return (
    <PaginaPublica titulo="La carta" ojo="Precios por porción, en pesos" ancha>
      {error && (
        <p className="mensaje mensaje--error" role="alert">
          {error}
        </p>
      )}
      {!carta && !error && (
        <p className="cargando" role="status">
          Cargando la carta…
        </p>
      )}
      {carta && (
        <div className="cartapag">
          <aside className="cartapag__indice" aria-label="Índice de la carta">
            <label className="carta__buscar">
              <span className="sr-only">Buscar en la carta</span>
              <input
                type="search"
                placeholder="Buscar en la carta"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </label>
            <p className="sr-only" role="status" aria-live="polite">
              {coincidencias === null ? "" : `${coincidencias} ${coincidencias === 1 ? "resultado" : "resultados"}`}
            </p>
            <nav className="cartapag__nav" aria-label="Categorías">
              {grupos.map((g) => (
                <div key={g.nombre} className="cartapag__grupo">
                  <p className="cartapag__g">{g.nombre}</p>
                  <ul>
                    {g.cats.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          aria-current={activa === c.id ? "true" : undefined}
                          onClick={() => ir(c.id)}
                        >
                          {c.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <p className="cartapag__total">{total} opciones en la carta</p>
          </aside>
          <div className="cartapag__lista">
            <aside className="carta__libre" aria-label="Parrilla libre">
              <div>
                <p className="carta__libre-k">¿Venís por la parrilla libre?</p>
                <p className="carta__libre-p">
                  Se paga por persona, desde {precio(desde)}. Incluye entrada, principal y postre.
                </p>
              </div>
              <Link className="btn btn--brasa" to="/parrilla-libre">
                Ver precios y qué incluye
              </Link>
            </aside>
            <CartaVista carta={carta} filtro={filtro} />
            {coincidencias === 0 && (
              <div className="carta__vacio">
                <p>
                  No encontramos «{filtro.trim()}» en la carta. Probá con otra palabra o mirá las categorías del índice.
                </p>
                <button type="button" className="btn" onClick={() => setFiltro("")}>
                  Borrar búsqueda
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PaginaPublica>
  );
}
