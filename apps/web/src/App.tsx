import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import { PAGINAS_PUBLICAS } from "@dv/shared";
import { Telon } from "./components/Telon.tsx";
import { Metadatos } from "./components/Metadatos.tsx";

// La portada va en el paquete inicial (es la página más visitada y su título es el LCP).
import Inicio from "./pages/Inicio.tsx";
const AdminRoutes = lazy(() => import("./pages/AdminRoutes.tsx"));
const Carta = lazy(() => import("./pages/Carta.tsx").then((m) => ({ default: m.Carta })));
const ParrillaLibre = lazy(() => import("./pages/ParrillaLibre.tsx").then((m) => ({ default: m.ParrillaLibre })));
const ComoLlegar = lazy(() => import("./pages/ComoLlegar.tsx").then((m) => ({ default: m.ComoLlegar })));
const Reservar = lazy(() => import("./pages/Reservar.tsx").then((m) => ({ default: m.Reservar })));
const MesaQr = lazy(() => import("./pages/MesaQr.tsx").then((m) => ({ default: m.MesaQr })));

/**
 * Mientras llega el código de una página interior se muestra su portada (la misma foto del HTML inicial):
 * es lo primero que se ve y su elemento más grande, así que no se reemplaza por un «Cargando…».
 */
function Espera() {
  const { pathname } = useLocation();
  const portada = PAGINAS_PUBLICAS[pathname.replace(/\/+$/, "") || "/"]?.portada;
  if (!portada)
    return (
      <p className="cargando" role="status">
        Cargando…
      </p>
    );
  const src = "poster" in portada ? portada.poster : `/media/foto-${portada.foto}-1600.webp`;
  const srcSet =
    "foto" in portada
      ? `/media/foto-${portada.foto}-900.webp 900w, /media/foto-${portada.foto}-1600.webp 1600w`
      : undefined;
  return (
    <div className="espera-portada" role="status" aria-label="Cargando">
      <img src={src} srcSet={srcSet} sizes={srcSet ? "100vw" : undefined} alt="" fetchPriority="high" />
    </div>
  );
}

export function App() {
  return (
    <>
      <Telon />
      <Metadatos />
      <Suspense fallback={<Espera />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/carta" element={<Carta />} />
          <Route path="/parrilla-libre" element={<ParrillaLibre />} />
          <Route path="/como-llegar" element={<ComoLlegar />} />
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/m/:token" element={<MesaQr />} />
          <Route path="/admin/*" element={<AdminRoutes />} />
          <Route path="*" element={<p className="cargando">Página no encontrada.</p>} />
        </Routes>
      </Suspense>
    </>
  );
}
