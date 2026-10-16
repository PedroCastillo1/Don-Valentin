import { Route, Routes } from "react-router";
import { SiteNav } from "./components/SiteNav.tsx";
import { Hero } from "./components/Hero.tsx";
import { ProveedorSesion } from "./lib/sesion.tsx";
import { AdminLayout } from "./pages/AdminLayout.tsx";
import { AdminInicio } from "./pages/AdminInicio.tsx";
import { Login } from "./pages/Login.tsx";

function Publica() {
  return (
    <>
      <SiteNav />
      <main id="contenido">
        <Hero />
      </main>
    </>
  );
}

export function App() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/" element={<Publica />} />
        <Route path="/admin/ingresar" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminInicio />} />
        </Route>
        <Route path="*" element={<p className="cargando">Página no encontrada.</p>} />
      </Routes>
    </ProveedorSesion>
  );
}
