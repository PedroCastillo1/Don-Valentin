import { NavLink, Navigate, Outlet } from "react-router";
import type { Permiso } from "@dv/shared";
import { ROL_NOMBRE } from "@dv/shared";
import { useSesion } from "../lib/sesion.tsx";
import { Icono } from "../components/Iconos.tsx";
import "../styles/admin.css";

const ACTIVOS: {
  to: string;
  nombre: string;
  /** Alcanza con tener uno de estos permisos. */
  permiso: Permiso | Permiso[];
  grupo: string;
  icono: "inicio" | "reservas" | "mesas" | "parametros" | "usuarios" | "fuego" | "reloj";
  end?: boolean;
  /** Hito en el que se completa (módulos todavía en construcción). */
  hito?: string;
}[] = [
  { to: "/admin", nombre: "Inicio", permiso: "reservas:ver", grupo: "Operación", icono: "inicio", end: true },
  { to: "/admin/reservas", nombre: "Reservas", permiso: "reservas:ver", grupo: "Operación", icono: "reservas" },
  { to: "/admin/mesas", nombre: "Mesas y QR", permiso: "sesion_mesa:abrir", grupo: "Operación", icono: "mesas" },
  {
    to: "/admin/parametros",
    nombre: "Parámetros",
    permiso: "parametros:ver",
    grupo: "Configuración",
    icono: "parametros",
  },
  {
    to: "/admin/usuarios",
    nombre: "Usuarios y roles",
    permiso: "usuarios:administrar",
    grupo: "Configuración",
    icono: "usuarios",
  },
  { to: "/admin/carta", nombre: "Carta y precios", permiso: "parametros:ver", grupo: "Configuración", icono: "fuego" },
  {
    to: "/admin/salon",
    nombre: "Estado del salón",
    permiso: "reservas:ver",
    grupo: "Próximos hitos",
    icono: "mesas",
    hito: "H3",
  },
  {
    to: "/admin/pedidos",
    nombre: "Pedidos por QR",
    permiso: "mesas:ver",
    grupo: "Próximos hitos",
    icono: "fuego",
    hito: "H4",
  },
  {
    to: "/admin/sectores",
    nombre: "Cocina, parrilla y barra",
    permiso: ["panel_sector:ver", "mesas:ver"],
    grupo: "Próximos hitos",
    icono: "reloj",
    hito: "H4",
  },
  {
    to: "/admin/mozo",
    nombre: "Pedido del mozo",
    permiso: ["sesion_mesa:abrir"],
    grupo: "Próximos hitos",
    icono: "reservas",
    hito: "H4",
  },
  {
    to: "/admin/medicion",
    nombre: "Medición del sitio",
    permiso: "parametros:ver",
    grupo: "Próximos hitos",
    icono: "parametros",
    hito: "H5",
  },
];

export function AdminLayout() {
  const { usuario, cargando, puede, salir } = useSesion();
  if (cargando) return <p className="cargando">Cargando…</p>;
  if (!usuario) return <Navigate to="/admin/ingresar" replace />;
  const grupos = ["Operación", "Configuración", "Próximos hitos"];
  const tiene = (p: Permiso | Permiso[]) => (Array.isArray(p) ? p.some((x) => puede(x)) : puede(p));

  return (
    <div className="adm">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="adm__tope">
        <p className="adm__marca">Don Valentín</p>
        <span className="adm__ambiente">Ambiente de prueba</span>
        <button className="adm__salir" onClick={() => void salir()} aria-label="Salir">
          <Icono nombre="salir" />
        </button>
      </header>
      <aside className="adm__riel">
        <div className="adm__cab">
          <p className="adm__marca">
            Don Valentín
            <small>Administración</small>
          </p>
          <p className="adm__ambiente">Ambiente de prueba</p>
        </div>
        <nav aria-label="Administración" className="adm__nav">
          {grupos.map((g) => {
            const items = ACTIVOS.filter((a) => a.grupo === g && tiene(a.permiso));
            if (!items.length) return null;
            return (
              <div key={g} className="adm__grupo">
                <p className="adm__grupo-t">{g}</p>
                {items.map((a) => (
                  <NavLink
                    key={a.to}
                    to={a.to}
                    end={a.end}
                    className={a.hito ? "adm__link adm__link--obra" : "adm__link"}
                  >
                    <Icono nombre={a.icono} />
                    <span>{a.nombre}</span>
                    {a.hito && (
                      <span className="adm__badge" title={`En construcción: se completa en el ${a.hito}`}>
                        {a.hito}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="adm__usuario">
          <span className="avatar" aria-hidden="true">
            {usuario.nombre.slice(0, 1)}
          </span>
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
