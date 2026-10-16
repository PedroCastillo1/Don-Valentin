import { Link } from "react-router";
import { LOCAL } from "@dv/shared";
import "../styles/publico.css";

export function Pie() {
  return (
    <footer className="pie">
      <div className="pie__grid">
        <div>
          <p className="pie__t">{LOCAL.nombre}</p>
          <p>{LOCAL.descriptor}</p>
          <p>
            {LOCAL.direccion}
            <br />
            {LOCAL.localidad}, {LOCAL.provincia}
          </p>
          <p>
            <small>Parrilla familiar desde {LOCAL.desde}.</small>
          </p>
        </div>
        <div>
          <p className="pie__t">Horario</p>
          <p>
            Todos los días
            <br />
            {LOCAL.horario.apertura} a {LOCAL.horario.cierre}
          </p>
          <p className="pie__t">Reservas y consultas</p>
          {LOCAL.telefonos.map((t) => (
            <p key={t.tel}>
              <a href={`tel:${t.tel}`}>{t.valor}</a> <small>{t.etiqueta}</small>
            </p>
          ))}
        </div>
        <nav aria-label="Secciones del sitio">
          <p className="pie__t">El sitio</p>
          <ul>
            <li>
              <Link to="/parrilla-libre">Parrilla libre</Link>
            </li>
            <li>
              <Link to="/carta">La carta</Link>
            </li>
            <li>
              <Link to="/como-llegar">Cómo llegar</Link>
            </li>
            <li>
              <Link to="/reservar">Reservar mesa</Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="pie__t">Seguinos</p>
          <p>
            <a href={LOCAL.instagram} rel="noopener noreferrer" target="_blank">
              Instagram @parrilladonvalentin
            </a>
          </p>
          <p>
            <Link to="/admin/ingresar" className="pie__staff">
              Ingreso del personal
            </Link>
          </p>
        </div>
      </div>
      <p className="pie__marca" aria-hidden="true" data-t="Don Valentín" />
    </footer>
  );
}
