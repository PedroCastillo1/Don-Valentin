import { Link } from "react-router";
import { LOCAL, PARRILLA_LIBRE } from "@dv/shared";
import { precio } from "../lib/formato.ts";
import { VideoLoop } from "./VideoLoop.tsx";

/** Cinta con datos reales del local. Estática: el dato importante no debe correr. */
export function Cinta() {
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  const items = [
    "Parrilla libre",
    `Todos los días de ${LOCAL.horario.apertura} a ${LOCAL.horario.cierre}`,
    `${LOCAL.localidad}, desde ${LOCAL.desde}`,
    `Desde ${precio(desde)} por persona`,
    "Reservá online",
  ];
  const tira = (
    <ul className="cinta__tira">
      {items.map((t) => (
        <li key={t}>
          {t}
          <span className="cinta__sep" aria-hidden="true">
            ✺
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="cinta" aria-label="Datos del local">
      <div className="cinta__riel">{tira}</div>
    </section>
  );
}

const CLIPS = [
  { id: "reel-1", clase: "mosaico__a", rotulo: "Parrilla" },
  { id: "reel-4", clase: "mosaico__b", rotulo: "Fuego" },
  { id: "reel-2", clase: "mosaico__c", rotulo: "Brasas y humo" },
  { id: "reel-5", clase: "mosaico__d", rotulo: "Cortes" },
  { id: "reel-3", clase: "mosaico__e", rotulo: "A la mesa" },
] as const;

/** Mosaico de videos: el fuego es el protagonista; cada clip se reproduce solo mientras se ve. */
export function Fuego() {
  return (
    <section className="fuego" aria-labelledby="t-fuego">
      <header className="fuego__cab">
        <h2 id="t-fuego">Del fuego a la mesa</h2>
        <p>La parrilla encendida es lo primero que se ve desde el salón.</p>
      </header>
      <div className="mosaico">
        {CLIPS.map((c) => (
          <figure key={c.id} className={`mosaico__item ${c.clase}`}>
            <VideoLoop src={`/media/video/${c.id}.mp4`} poster={`/media/video/${c.id}.webp`} />
            <figcaption>{c.rotulo}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Datos prácticos en formato libro de cuentas, sobre fondo brasa. */
export function Esencial() {
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  return (
    <section className="esencial" aria-labelledby="t-esencial">
      <div className="esencial__in">
        <h2 id="t-esencial">Lo que tenés que saber</h2>
        <ul className="libro">
          <li>
            <span className="libro__k">Parrilla libre</span>
            <span className="libro__p" aria-hidden="true" />
            <span className="libro__v">
              desde {precio(desde)} por persona · <Link to="/parrilla-libre">cómo funciona</Link>
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
      </div>
    </section>
  );
}

/** Cierre: brasas de fondo y un solo pedido. */
export function CierreReserva() {
  return (
    <section className="cierre" aria-labelledby="t-cierre">
      <VideoLoop className="cierre__video" src="/media/video/brasas.mp4" poster="/media/video/brasas.webp" />
      <div className="cierre__velo" aria-hidden="true" />
      <div className="cierre__in">
        <h2 id="t-cierre">Guardá tu mesa.</h2>
        <p>Elegí el día, el horario y cuántos son. Te confirmamos en el momento.</p>
        <Link className="btn btn--brasa" to="/reservar">
          Reservar mesa
        </Link>
      </div>
    </section>
  );
}
