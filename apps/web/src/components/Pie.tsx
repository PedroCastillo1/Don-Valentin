import { Link } from "react-router";
import { LOCAL } from "@dv/shared";
import "../styles/publico.css";

export function Pie() {
  return (
    <footer className="pie">
      <div>
        <p className="pie__marca">{LOCAL.nombre}</p>
        <p>{LOCAL.descriptor}</p>
        <p>
          {LOCAL.direccion}, {LOCAL.localidad}, {LOCAL.provincia}
        </p>
      </div>
      <div>
        <p className="pie__t">Horario</p>
        <p>
          Todos los días de {LOCAL.horario.apertura} a {LOCAL.horario.cierre}
        </p>
        <p className="pie__t">Reservas y consultas</p>
        {LOCAL.telefonos.map((t) => (
          <p key={t.tel}>
            <a href={`tel:${t.tel}`}>{t.valor}</a> <small>{t.etiqueta}</small>
          </p>
        ))}
      </div>
      <div>
        <p className="pie__t">Seguinos</p>
        <p>
          <a href={LOCAL.instagram} rel="noopener noreferrer" target="_blank">
            Instagram @parrilladonvalentin
          </a>
        </p>
        <p>
          <Link to="/reservar">Reservar mesa</Link>
        </p>
        <p>
          <Link to="/admin/ingresar" className="pie__staff">
            Ingreso del personal
          </Link>
        </p>
      </div>
    </footer>
  );
}
