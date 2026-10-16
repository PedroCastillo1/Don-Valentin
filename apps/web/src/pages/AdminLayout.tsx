import { NavLink, Navigate, Outlet } from "react-router";
import { MODULOS, textoProgramado } from "@dv/shared";
import type { Permiso } from "@dv/shared";
import { ROL_NOMBRE } from "@dv/shared";
import { useSesion } from "../lib/sesion.tsx";
import "../styles/admin.css";

const ACTIVOS: { to: string; nombre: string; permiso: Permiso; grupo: string; end?: boolean }[] = [
  { to: "/admin", nombre: "Inicio", permiso: "reservas:ver", grupo: "Operación", end: true },
  { to: "/admin/reservas", nombre: "Reservas", permiso: "reservas:ver", grupo: "Operación" },
  { to: "/admin/mesas", nombre: "Mesas y QR", permiso: "sesion_mesa:abrir", grupo: "Operación" },
  { to: "/admin/parametros", nombre: "Parámetros", permiso: "parametros:ver", grupo: "Configuración" },
  { to: "/admin/usuarios", nombre: "Usuarios y roles", permiso: "usuarios:administrar", grupo: "Configuración" },
];

export function AdminLayout() {
  const { usuario, cargando, puede, salir } = useSesion();
  if (cargando) return <p className="cargando">Cargando…</p>;
  if (!usuario) return <Navigate to="/admin/ingresar" replace />;
  const futuros = MODULOS.filter((m) => !m.disponible);
  const grupos = ["Operación", "Configuración"];

  return (
    <div className="adm">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="adm__riel">
        <p className="adm__marca">Don Valentín</p>
        <p className="adm__ambiente">Ambiente de prueba</p>
        <nav aria-label="Administración">
          {grupos.map((g) => {
            const items = ACTIVOS.filter((a) => a.grupo === g && puede(a.permiso));
            if (!items.length) return null;
            return (
              <div key={g} className="adm__grupo">
                <p className="adm__grupo-t">{g}</p>
                {items.map((a) => (
                  <NavLink key={a.to} to={a.to} end={a.end} className="adm__link">
                    {a.nombre}
                  </NavLink>
                ))}
              </div>
            );
          })}
          <div className="adm__grupo">
            <p className="adm__grupo-t">Próximos módulos</p>
            {futuros.map((m) => (
              <div key={m.id} className="adm__futuro">
                <span>{m.nombre}</span>
                <small>{textoProgramado(m.hito)}</small>
              </div>
            ))}
          </div>
        </nav>
        <div className="adm__usuario">
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{ROL_NOMBRE[usuario.rol]}</small>
          </div>
          <button className="adm__salir" onClick={() => void salir()}>
            Salir
          </button>
        </div>
      </aside>
      <main className="adm__main" id="contenido">
        <Outlet />
      </main>
    </div>
  );
}
