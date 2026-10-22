import { Route, Routes } from "react-router";
import { ProveedorSesion } from "../lib/sesion.tsx";
import { AdminLayout } from "./AdminLayout.tsx";
import { AdminInicio } from "./AdminInicio.tsx";
import { Login } from "./Login.tsx";
import { AdminReservas } from "./AdminReservas.tsx";
import { AdminMesas } from "./AdminMesas.tsx";
import { AdminParametros } from "./AdminParametros.tsx";
import { AdminUsuarios } from "./AdminUsuarios.tsx";
import { AdminSalon } from "./AdminSalon.tsx";
import { AdminCarta, AdminMedicion, AdminMozo, AdminPedidosQr, AdminSectores } from "./AdminProximos.tsx";

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
          <Route path="carta" element={<AdminCarta />} />
          <Route path="salon" element={<AdminSalon />} />
          <Route path="pedidos" element={<AdminPedidosQr />} />
          <Route path="sectores" element={<AdminSectores />} />
          <Route path="mozo" element={<AdminMozo />} />
          <Route path="medicion" element={<AdminMedicion />} />
        </Route>
      </Routes>
    </ProveedorSesion>
  );
}
