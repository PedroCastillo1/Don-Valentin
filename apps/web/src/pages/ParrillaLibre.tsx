import { Link } from "react-router";
import { PARRILLA_LIBRE, SALSAS } from "@dv/shared";
import { precio } from "../lib/formato.ts";
import { PaginaPublica } from "../components/PaginaPublica.tsx";
import "../styles/parrilla.css";

export function ParrillaLibre() {
  return (
    <PaginaPublica
      titulo="Parrilla libre"
      ojo="Entrada, principal y postre"
      medio={{
        tipo: "foto",
        n: 1,
        alt: "Clientes sirviéndose en el buffet de entradas del salón",
        posicion: "50% 40%",
      }}
    >
      <p className="lead">
        Pagás un precio por persona y comés a gusto: parrilla, pastas con la salsa que elijas y pizzas. Entra una
        entrada y un postre.
      </p>
      <figure className="pl__foto">
        <img
          src="/media/foto-6-1600.webp"
          srcSet="/media/foto-6-900.webp 900w, /media/foto-6-1600.webp 1600w"
          sizes="(max-width: 900px) 100vw, 78rem"
          width={1600}
          height={1066}
          alt="La parrilla del local con cortes, pollo, verduras y papas asadas sobre las chapas"
          decoding="async"
        />
      </figure>
      <div className="tickets">
        {PARRILLA_LIBRE.formulas.map((f) => (
          <article key={f.id} className="ticket">
            <h2>{f.nombre}</h2>
            <p className="ticket__precio">
              {precio(f.precioPorPersona)} <small>por persona</small>
            </p>
          </article>
        ))}
      </div>
      <div className="dos-col">
        <section>
          <h2>Qué incluye</h2>
          <ol className="pl__pasos">
            {PARRILLA_LIBRE.incluye.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ol>
          <p>{PARRILLA_LIBRE.postreIncluido}.</p>
          <p>{PARRILLA_LIBRE.menores}</p>
        </section>
        <section>
          <h2>Salsas para las pastas</h2>
          <p>Sin cargo: {SALSAS.sinCargo.join(", ").toLowerCase()}.</p>
          <p>
            Con adicional de {precio(SALSAS.adicionales.precio)}: {SALSAS.adicionales.items.join(", ").toLowerCase()}.
            El estofado suma {precio(SALSAS.adicionalEstofado)}.
          </p>
        </section>
      </div>
      <p className="acciones-pag">
        <Link className="btn btn--brasa" to="/reservar">
          Reservar mesa
        </Link>
        <Link className="btn" to="/carta">
          Ver la carta completa
        </Link>
      </p>
    </PaginaPublica>
  );
}
