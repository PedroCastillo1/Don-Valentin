import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { api, ApiError } from "../lib/api.ts";
import { CartaVista } from "./Carta.tsx";
import type { CartaPublica } from "./Carta.tsx";
import { SiteNav } from "../components/SiteNav.tsx";
import { Pie } from "../components/Pie.tsx";

export function MesaQr() {
  const { token = "" } = useParams();
  const [mesa, setMesa] = useState<{ numero: number } | null>(null);
  const [carta, setCarta] = useState<CartaPublica | null>(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    api<{ numero: number }>(`/public/mesa/${encodeURIComponent(token)}`)
      .then((m) => {
        setMesa(m);
        return api<CartaPublica>("/public/carta").then(setCarta);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 404
            ? "Este código no corresponde a ninguna mesa. Pedile ayuda al mozo."
            : "No pudimos cargar la mesa. Probá de nuevo.",
        ),
      );
  }, [token]);

  return (
    <>
      <SiteNav />
      <main id="contenido" className="pag">
        <header className="pag__cab">
          <p className="pag__ojo">Bienvenidos a Don Valentín</p>
          <h1>{mesa ? `Mesa ${mesa.numero}` : "Tu mesa"}</h1>
        </header>
        <div className="pag__cuerpo pag__cuerpo--ancha">
          {error && (
            <p className="mensaje mensaje--error" role="alert">
              {error}
            </p>
          )}
          {mesa && carta && (
            <>
              <p className="lead">Esta es la carta del local. Para pedir, avisale al mozo.</p>
              <label className="carta__buscar">
                <span className="sr-only">Buscar en la carta</span>
                <input
                  type="search"
                  placeholder="Buscar un plato o una bebida"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </label>
              <CartaVista carta={carta} filtro={filtro} />
            </>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
