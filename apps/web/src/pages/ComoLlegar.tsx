import { LOCAL } from "@dv/shared";
import { PaginaPublica } from "../components/PaginaPublica.tsx";
import { estadoDelLocal } from "../lib/horario.ts";
import { VideoLoop } from "../components/VideoLoop.tsx";

export function ComoLlegar() {
  const e = estadoDelLocal();
  const consulta = encodeURIComponent(`${LOCAL.nombre}, ${LOCAL.direccion}, ${LOCAL.localidad}`);
  return (
    <PaginaPublica titulo="Cómo llegar" ojo={`${LOCAL.localidad}, ${LOCAL.provincia}`}>
      <div className="llegar">
        <VideoLoop className="llegar__video" src="/media/video/hero-a.mp4" poster="/media/video/hero-a.webp" />
        <div className="dos-col">
          <section>
            <h2>Dirección</h2>
            <p className="lead">
              {LOCAL.direccion}, {LOCAL.localidad}.
            </p>
            <p>
              <a
                className="btn"
                href={`https://www.google.com/maps/search/?api=1&query=${consulta}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir en Google Maps
              </a>
            </p>
          </section>
          <section>
            <h2>Horario</h2>
            <p className="lead">
              Todos los días, de {LOCAL.horario.apertura} a {LOCAL.horario.cierre}.
            </p>
            <p>
              <strong>{e.texto}.</strong>
            </p>
            <h2>Teléfonos</h2>
            {LOCAL.telefonos.map((t) => (
              <p key={t.tel}>
                <a href={`tel:${t.tel}`}>{t.valor}</a> · {t.etiqueta}
              </p>
            ))}
          </section>
        </div>
      </div>
    </PaginaPublica>
  );
}
