import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { Telon } from "./components/Telon.tsx";

// La portada va en el paquete inicial (es la página más visitada y su título es el LCP).
import Inicio from "./pages/Inicio.tsx";
const AdminRoutes = lazy(() => import("./pages/AdminRoutes.tsx"));
const Carta = lazy(() => import("./pages/Carta.tsx").then((m) => ({ default: m.Carta })));
const ParrillaLibre = lazy(() => import("./pages/ParrillaLibre.tsx").then((m) => ({ default: m.ParrillaLibre })));
const ComoLlegar = lazy(() => import("./pages/ComoLlegar.tsx").then((m) => ({ default: m.ComoLlegar })));
const Reservar = lazy(() => import("./pages/Reservar.tsx").then((m) => ({ default: m.Reservar })));
const MesaQr = lazy(() => import("./pages/MesaQr.tsx").then((m) => ({ default: m.MesaQr })));

export function App() {
  return (
    <>
      <Telon />
      <Suspense
        fallback={
          <p className="cargando" role="status">
            Cargando…
          </p>
        }
      >
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
