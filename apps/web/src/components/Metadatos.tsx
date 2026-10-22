import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { PAGINAS_PUBLICAS } from "@dv/shared";
import { cargarGa4, consentimiento, GA4_ID, guardarConsentimiento, medir } from "../lib/medicion.ts";

/** URL pública del sitio (canónicas, Open Graph y sitemap). En el ambiente de prueba es la de Vercel. */
export const SITIO_URL: string = (import.meta.env.VITE_SITIO_URL ?? "https://don-valentin.vercel.app").replace(
  /\/$/,
  "",
);

const PAGINAS = PAGINAS_PUBLICAS;

function meta(selector: string, crear: () => HTMLElement, valor: string, atributo = "content") {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = crear();
    document.head.appendChild(el);
  }
  el.setAttribute(atributo, valor);
}
const conNombre = (n: string) => () => Object.assign(document.createElement("meta"), { name: n });
const conProp = (p: string) => () => {
  const m = document.createElement("meta");
  m.setAttribute("property", p);
  return m;
};

/** Título, descripción, canónica, Open Graph e indexación de cada ruta, y la visita para la medición. */
export function Metadatos() {
  const { pathname } = useLocation();
  useEffect(() => {
    const ruta = pathname.replace(/\/+$/, "") || "/";
    const p = PAGINAS[ruta];
    const privada = ruta.startsWith("/admin") || ruta.startsWith("/m/");
    if (p) document.title = p.titulo;
    else if (ruta.startsWith("/m/")) document.title = "Tu mesa · Don Valentín";
    else if (ruta.startsWith("/admin")) document.title = "Administración · Don Valentín";
    else document.title = "Página no encontrada · Don Valentín";
    // El panel y la mesa del QR no se indexan (además, el panel exige sesión: noindex no es seguridad).
    meta('meta[name="robots"]', conNombre("robots"), p ? "index, follow" : "noindex, nofollow");
    if (p) {
      meta('meta[name="description"]', conNombre("description"), p.descripcion);
      meta(
        'link[rel="canonical"]',
        () => Object.assign(document.createElement("link"), { rel: "canonical" }),
        `${SITIO_URL}${ruta === "/" ? "/" : ruta}`,
        "href",
      );
      meta('meta[property="og:title"]', conProp("og:title"), p.titulo);
      meta('meta[property="og:description"]', conProp("og:description"), p.descripcion);
      meta('meta[property="og:url"]', conProp("og:url"), `${SITIO_URL}${ruta === "/" ? "/" : ruta}`);
    } else document.head.querySelector('link[rel="canonical"]')?.remove();
    if (!ruta.startsWith("/admin")) medir("pagina_vista", privada ? "/m" : ruta);
  }, [pathname]);

  // Clics que interesan al local: llamar, escribir por WhatsApp y cómo llegar.
  useEffect(() => {
    const f = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) medir("clic_telefono");
      else if (/wa\.me|whatsapp/i.test(href)) medir("clic_whatsapp");
      else if (/google\.[^/]+\/maps/i.test(href)) medir("clic_como_llegar");
    };
    document.addEventListener("click", f);
    cargarGa4();
    return () => document.removeEventListener("click", f);
  }, []);
  return <AvisoAnalitica />;
}

/** Solo aparece si el local configuró Google Analytics: la persona elige. La medición propia no usa cookies. */
function AvisoAnalitica() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => Boolean(GA4_ID) && consentimiento() === null);
  if (!visible || pathname.startsWith("/admin")) return null;
  const elegir = (v: "si" | "no") => {
    guardarConsentimiento(v);
    setVisible(false);
  };
  return (
    <div className="aviso-analitica" role="region" aria-label="Aviso de analítica">
      <p>
        Usamos Google Analytics para saber cuántas personas visitan el sitio y qué páginas les sirven. No usamos tus
        datos personales ni publicidad. ¿Nos dejás medir tu visita?
      </p>
      <div className="aviso-analitica__botones">
        <button type="button" className="btn btn--brasa btn--chico" onClick={() => elegir("si")}>
          Sí, acepto
        </button>
        <button type="button" className="btn btn--chico" onClick={() => elegir("no")}>
          No, gracias
        </button>
      </div>
    </div>
  );
}
