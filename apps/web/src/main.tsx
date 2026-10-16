import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource-variable/instrument-sans";
import "./styles/tokens.css";
import "./styles/base.css";
// El estilo del hero va en el CSS inicial: el esqueleto de index.html se pinta igual que el hero real.
import "./styles/hero.css";
import { App } from "./App.tsx";
// El scroll suave (Lenis + GSAP) se carga aparte, cuando el navegador queda libre: no demora el primer cuadro.
const cargarScroll = () => void import("./lib/scroll.ts").then((m) => m.iniciarScrollSuave());
if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(cargarScroll, { timeout: 1500 });
else setTimeout(cargarScroll, 600);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {import.meta.env.VITE_PREVIEW ? (
      <HashRouter>
        <p className="vista-previa">
          Vista previa estática · datos reales de la carta · sin reservas ni administración
        </p>
        <App />
      </HashRouter>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
);
