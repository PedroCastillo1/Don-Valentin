import { Route, Routes } from "react-router";
import { SiteNav } from "./components/SiteNav.tsx";
import { Hero } from "./components/Hero.tsx";
import { Pie } from "./components/Pie.tsx";
import { PARRILLA_LIBRE, LOCAL } from "@dv/shared";
import { precio } from "./lib/formato.ts";
import { Link } from "react-router";
import { Carta } from "./pages/Carta.tsx";
import { ParrillaLibre } from "./pages/ParrillaLibre.tsx";
import { ComoLlegar } from "./pages/ComoLlegar.tsx";
import { Reservar } from "./pages/Reservar.tsx";
import { MesaQr } from "./pages/MesaQr.tsx";
import { ProveedorSesion } from "./lib/sesion.tsx";
import { AdminLayout } from "./pages/AdminLayout.tsx";
import { AdminInicio } from "./pages/AdminInicio.tsx";
import { Login } from "./pages/Login.tsx";
import { AdminReservas } from "./pages/AdminReservas.tsx";
import { AdminMesas } from "./pages/AdminMesas.tsx";
import { AdminParametros } from "./pages/AdminParametros.tsx";
import { AdminUsuarios } from "./pages/AdminUsuarios.tsx";

function Publica() {
  return (
    <>
      <SiteNav />
      <main id="contenido">
        <Hero />
        <section className="esencial" aria-labelledby="t-esencial">
          <h2 id="t-esencial">Lo que tenés que saber</h2>
          <ul className="libro">
            <li>
              <span className="libro__k">Parrilla libre</span>
              <span className="libro__p" aria-hidden="true" />
              <span className="libro__v">
                desde {precio(Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona)))} por persona ·{" "}
                <Link to="/parrilla-libre">cómo funciona</Link>
              </span>
            </li>
            <li>
              <span className="libro__k">Horario</span>
              <span className="libro__p" aria-hidden="true" />
              <span className="libro__v">
                todos los días, de {LOCAL.horario.apertura} a {LOCAL.horario.cierre}
              </span>
            </li>
            <li>
              <span className="libro__k">Dónde estamos</span>
              <span className="libro__p" aria-hidden="true" />
              <span className="libro__v">
                {LOCAL.direccion}, {LOCAL.localidad} · <Link to="/como-llegar">cómo llegar</Link>
              </span>
            </li>
            <li>
              <span className="libro__k">Reservas</span>
              <span className="libro__p" aria-hidden="true" />
              <span className="libro__v">
                <Link to="/reservar">online</Link> o al {LOCAL.telefonos[0].valor}
              </span>
            </li>
          </ul>
        </section>
      </main>
      <Pie />
    </>
  );
}

export function App() {
  return (
    <ProveedorSesion>
      <Routes>
        <Route path="/" element={<Publica />} />
        <Route path="/carta" element={<Carta />} />
        <Route path="/parrilla-libre" element={<ParrillaLibre />} />
        <Route path="/como-llegar" element={<ComoLlegar />} />
        <Route path="/reservar" element={<Reservar />} />
        <Route path="/m/:token" element={<MesaQr />} />
        <Route path="/admin/ingresar" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminInicio />} />
          <Route path="reservas" element={<AdminReservas />} />
          <Route path="mesas" element={<AdminMesas />} />
          <Route path="parametros" element={<AdminParametros />} />
          <Route path="usuarios" element={<AdminUsuarios />} />
        </Route>
        <Route path="*" element={<p className="cargando">Página no encontrada.</p>} />
      </Routes>
    </ProveedorSesion>
  );
}
