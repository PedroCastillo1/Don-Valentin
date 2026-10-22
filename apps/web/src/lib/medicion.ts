import type { EventoSitio } from "@dv/shared";

/*
 * RF-W3: medición del sitio.
 * 1) Propia: cada evento suma 1 a un contador del día y la página. Sin cookies, sin IP, sin datos de la persona.
 * 2) Google Analytics 4: solo si el local cargó su ID (VITE_GA4_ID al publicar) y la persona lo aceptó.
 * Nunca se manda nombre, teléfono, código de reserva ni el código de la mesa.
 */

export const GA4_ID: string = import.meta.env.VITE_GA4_ID ?? "";
const CLAVE_CONSENTIMIENTO = "dv-analitica";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function consentimiento(): "si" | "no" | null {
  try {
    const v = localStorage.getItem(CLAVE_CONSENTIMIENTO);
    return v === "si" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

export function guardarConsentimiento(v: "si" | "no"): void {
  try {
    localStorage.setItem(CLAVE_CONSENTIMIENTO, v);
  } catch {
    // Sin almacenamiento (modo privado): se vuelve a preguntar la próxima vez.
  }
  if (v === "si") cargarGa4();
}

let gaCargado = false;
/** Carga gtag.js con IP anonimizada y sin señales publicitarias. */
export function cargarGa4(): void {
  if (!GA4_ID || gaCargado || consentimiento() !== "si") return;
  gaCargado = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag necesita el objeto `arguments` tal cual.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: false,
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
  document.head.appendChild(s);
}

const esPanel = () => location.pathname.startsWith("/admin");

/** Registra un evento (nunca en el panel de administración). No bloquea ni falla: si no se puede, se pierde. */
export function medir(evento: EventoSitio, ruta: string = location.pathname): void {
  if (esPanel() || import.meta.env.VITE_PREVIEW || navigator.webdriver) return;
  const rutaSegura = ruta.startsWith("/m/") ? "/m" : ruta;
  const cuerpo = JSON.stringify({ evento, ruta: rutaSegura });
  try {
    const ok = navigator.sendBeacon?.("/api/public/eventos", new Blob([cuerpo], { type: "application/json" }));
    if (!ok)
      void fetch("/api/public/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => undefined);
  } catch {
    // La medición nunca rompe la página.
  }
  if (window.gtag && consentimiento() === "si") {
    if (evento === "pagina_vista") window.gtag("event", "page_view", { page_path: rutaSegura });
    else window.gtag("event", evento, { page_path: rutaSegura });
  }
}
