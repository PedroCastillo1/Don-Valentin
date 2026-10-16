import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";

const Inicio = lazy(() => import("./pages/Inicio.tsx"));
const AdminRoutes = lazy(() => import("./pages/AdminRoutes.tsx"));
const Carta = lazy(() => import("./pages/Carta.tsx").then((m) => ({ default: m.Carta })));
const ParrillaLibre = lazy(() => import("./pages/ParrillaLibre.tsx").then((m) => ({ default: m.ParrillaLibre })));
const ComoLlegar = lazy(() => import("./pages/ComoLlegar.tsx").then((m) => ({ default: m.ComoLlegar })));
const Reservar = lazy(() => import("./pages/Reservar.tsx").then((m) => ({ default: m.Reservar })));
const MesaQr = lazy(() => import("./pages/MesaQr.tsx").then((m) => ({ default: m.MesaQr })));

export function App() {
  return (
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
  );
}
