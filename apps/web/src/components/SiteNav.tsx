import { Link } from "react-router";
import "../styles/nav.css";

export function SiteNav() {
  return (
    <header className="nav">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <Link to="/" className="nav__marca" aria-label="Don Valentín, inicio">
        Don Valentín
      </Link>
      <nav className="nav__links" aria-label="Principal">
        <Link to="/parrilla-libre">Parrilla libre</Link>
        <Link to="/carta">Carta</Link>
        <Link to="/como-llegar">Cómo llegar</Link>
      </nav>
      <Link className="btn btn--brasa nav__cta" to="/reservar">
        Reservar
      </Link>
    </header>
  );
}
