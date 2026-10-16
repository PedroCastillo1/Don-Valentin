import { Link } from "react-router";
import { LOCAL, PARRILLA_LIBRE } from "@dv/shared";
import { SiteNav } from "../components/SiteNav.tsx";
import { Hero } from "../components/Hero.tsx";
import { Pie } from "../components/Pie.tsx";
import { precio } from "../lib/formato.ts";

export default function Inicio() {
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
