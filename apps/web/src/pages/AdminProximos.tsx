import { Cabecera } from "../components/ui.tsx";
import { EnConstruccion } from "../components/EnConstruccion.tsx";

/*
 * Módulos que la línea base v4 entrega en hitos posteriores al H2.
 * Cada pantalla dice qué falta, en qué hito y fecha se completa, y muestra el prototipo de la pantalla (H2: prototipo
 * UX/UI) rotulado como tal. Lo que ya existe de verdad (la carta con sus precios reales) se muestra como real.
 */

/** H5 — Medición del sitio (RF-W3). */
export function AdminMedicion() {
  return (
    <>
      <Cabecera titulo="Medición del sitio" bajada="Visitas al sitio y presencia en Google." />
      <EnConstruccion
        hito="H5"
        titulo="Google Analytics 4 y Search Console"
        descripcion="Con el sitio publicado en el ambiente de prueba se conectan GA4 (visitas y reservas iniciadas) y Search Console con el sitemap. No se muestran datos hasta que existan mediciones reales."
        requisitos={["RF-W3"]}
      />
    </>
  );
}
