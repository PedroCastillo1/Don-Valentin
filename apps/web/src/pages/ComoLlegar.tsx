import { useMemo, useState } from "react";
import { Link } from "react-router";
import { LOCAL } from "@dv/shared";
import { PaginaPublica } from "../components/PaginaPublica.tsx";
import { MapaLocal } from "../components/MapaLocal.tsx";
import { VideoLoop } from "../components/VideoLoop.tsx";
import { METROS_BINDA, REFERENCIAS, URL_MAPS, URL_RUTA_SIMPLE, type Referencia } from "../lib/ubicacion.ts";
import "../styles/llegar.css";

type Modo = "auto" | "tren" | "colectivo";

export function ComoLlegar() {
  const [sel, setSel] = useState<Referencia["id"] | null>(null);
  const [modo, setModo] = useState<Modo>("auto");
  const [copiado, setCopiado] = useState(false);
  const est = REFERENCIAS.find((r) => r.id === "estacion")!;
  const par = REFERENCIAS.find((r) => r.id === "parada")!;
  const direccion = `${LOCAL.direccion}, ${LOCAL.localidad}, ${LOCAL.provincia}`;

  const modos = useMemo(
    () =>
      ({
        auto: {
          titulo: "En auto",
          cuerpo: (
            <>
              <p>
                Estamos sobre la <strong>Av. Illia (Ruta Provincial 8)</strong>, muy cerca del cruce con la{" "}
                <strong>Av. Lemos (Ruta Provincial 23)</strong>. El local queda en la vereda opuesta al shopping
                Terrazas de Mayo.
              </p>
              <p>Para el recorrido exacto desde donde estés, abrí la ruta en Google Maps.</p>
            </>
          ),
          ref: null,
        },
        tren: {
          titulo: "En tren",
          cuerpo: (
            <>
              <p>
                Bajás en <strong>General Lemos</strong>, línea Urquiza. La estación está a unos{" "}
                <strong>{est.metros} m</strong> en línea recta; de ahí, a pie por la Av. Illia.
              </p>
              <p>Confirmá horarios y frecuencias en la app oficial de la línea: cambian.</p>
            </>
          ),
          ref: "estacion" as const,
        },
        colectivo: {
          titulo: "En colectivo",
          cuerpo: (
            <>
              <p>
                Las paradas más cercanas son <strong>«Lemos / Ruta 8»</strong> (a unos {par.metros} m) e{" "}
                <strong>«Illia y Binda»</strong> (a unos {METROS_BINDA} m).
              </p>
              <p>No listamos recorridos porque cambian: fijate qué líneas paran ahí en tu app de transporte.</p>
            </>
          ),
          ref: "parada" as const,
        },
      }) as const,
    [est.metros, par.metros],
  );

  async function copiar() {
    try {
      await navigator.clipboard.writeText(direccion);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <PaginaPublica titulo="Cómo llegar" ojo={`${LOCAL.direccion}, ${LOCAL.localidad}`} ancha>
      <section className="llegar" aria-labelledby="t-mapa">
        <h2 id="t-mapa" className="sr-only">
          Mapa y dirección
        </h2>
        <MapaLocal seleccion={sel} onSeleccion={setSel} />

        <div className="llegar__comanda">
          <div className="llegar__cuerpo">
            <p className="llegar__mono">Dirección</p>
            <p className="llegar__calle">Av. Illia 3873</p>
            <p className="llegar__ciudad">
              {LOCAL.direccion}
              <br />
              {LOCAL.localidad}, {LOCAL.provincia}
            </p>
            <div className="llegar__acciones">
              <a className="btn btn--brasa" href={URL_RUTA_SIMPLE} target="_blank" rel="noopener noreferrer">
                Cómo llegar en Google Maps
              </a>
              <a className="btn" href={URL_MAPS} target="_blank" rel="noopener noreferrer">
                Ver en Google Maps
              </a>
              <button type="button" className="btn llegar__copiar" onClick={() => void copiar()}>
                {copiado ? "Dirección copiada" : "Copiar dirección"}
              </button>
              <span className="sr-only" role="status">
                {copiado ? "Dirección copiada" : ""}
              </span>
            </div>
          </div>
          <div className="llegar__pie">
            <p className="llegar__mono">Referencias cerca</p>
            <ul className="llegar__refs">
              {REFERENCIAS.map((r) => (
                <li key={r.id}>
                  <button type="button" aria-pressed={sel === r.id} onClick={() => setSel(sel === r.id ? null : r.id)}>
                    <span className="llegar__ref-n">{r.nombre}</span>
                    <span className="llegar__ref-d">{r.detalle}</span>
                    <span className="llegar__ref-m">≈ {r.metros} m</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="llegar__nota">Distancias en línea recta, a partir de datos de OpenStreetMap.</p>
          </div>
        </div>
      </section>

      <section className="venir" aria-labelledby="t-venir">
        <h2 id="t-venir">¿Cómo venís?</h2>
        <div className="venir__tabs" role="tablist" aria-label="Medio de transporte">
          {(Object.keys(modos) as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              id={`tab-${m}`}
              aria-selected={modo === m}
              aria-controls={`panel-${m}`}
              tabIndex={modo === m ? 0 : -1}
              onClick={() => {
                setModo(m);
                setSel(modos[m].ref);
              }}
              onKeyDown={(ev) => {
                const orden = Object.keys(modos) as Modo[];
                const i = orden.indexOf(m);
                const sig =
                  ev.key === "ArrowRight" ? orden[(i + 1) % 3] : ev.key === "ArrowLeft" ? orden[(i + 2) % 3] : null;
                if (sig) {
                  ev.preventDefault();
                  setModo(sig);
                  setSel(modos[sig].ref);
                  document.getElementById(`tab-${sig}`)?.focus();
                }
              }}
            >
              {modos[m].titulo}
            </button>
          ))}
        </div>
        <div className="venir__panel" role="tabpanel" id={`panel-${modo}`} aria-labelledby={`tab-${modo}`}>
          {modos[modo].cuerpo}
        </div>
      </section>

      <section className="datos" aria-label="Horario y teléfonos">
        <div>
          <p className="llegar__mono">Horario</p>
          <p className="datos__g">
            Todos los días
            <br />
            {LOCAL.horario.apertura} a {LOCAL.horario.cierre}
          </p>
        </div>
        <div>
          <p className="llegar__mono">Reservas y consultas</p>
          {LOCAL.telefonos.map((t) => (
            <p key={t.tel} className="datos__tel">
              <a href={`tel:${t.tel}`}>{t.valor}</a> <small>{t.etiqueta}</small>
            </p>
          ))}
        </div>
        <div className="datos__reserva">
          <VideoLoop className="datos__video" src="/media/video/brasas.mp4" poster="/media/video/brasas.webp" />
          <div className="datos__velo" aria-hidden="true" />
          <div className="datos__in">
            <p>¿Ya sabés cuándo venís?</p>
            <Link className="btn btn--brasa" to="/reservar">
              Reservar mesa
            </Link>
          </div>
        </div>
      </section>
    </PaginaPublica>
  );
}
