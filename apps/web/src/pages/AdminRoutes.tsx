import { Route, Routes } from "react-router";
import { ProveedorSesion } from "../lib/sesion.tsx";
import { AdminLayout } from "./AdminLayout.tsx";
import { AdminInicio } from "./AdminInicio.tsx";
import { Login } from "./Login.tsx";
import { AdminReservas } from "./AdminReservas.tsx";
import { AdminMesas } from "./AdminMesas.tsx";
import { AdminParametros } from "./AdminParametros.tsx";
import { AdminUsuarios } from "./AdminUsuarios.tsx";

/** Todo el administrador (y su sesión) en un solo bloque: el sitio público no lo descarga ni consulta /auth/me. */
export default function AdminRoutes() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="ingresar" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route index element={<AdminInicio />} />
          <Route path="reservas" element={<AdminReservas />} />
          <Route path="mesas" element={<AdminMesas />} />
          <Route path="parametros" element={<AdminParametros />} />
          <Route path="usuarios" element={<AdminUsuarios />} />
        </Route>
      </Routes>
    </ProveedorSesion>
  );
}
