import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { LOCAL, PARRILLA_LIBRE } from "@dv/shared";
import { precio } from "../lib/formato.ts";
import { estadoDelLocal } from "../lib/horario.ts";
import { MapaLocal } from "./MapaLocal.tsx";
import { VideoLoop } from "./VideoLoop.tsx";
import "../styles/home.css";

/** Cinta con datos reales del local. Estática: el dato importante no debe correr. */
export function Cinta() {
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  const items = [
    `Todos los días de ${LOCAL.horario.apertura} a ${LOCAL.horario.cierre}`,
    `${LOCAL.localidad}, desde ${LOCAL.desde}`,
    `Parrilla libre desde ${precio(desde)} por persona`,
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

/** Hace visible un bloque cuando entra en pantalla (una sola vez). Sin movimiento, todo se ve de entrada. */
function useVisto<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(
    () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || visto) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisto(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visto]);
  return [ref, visto] as const;
}

function Foto({ n, alt, clase }: { n: number; alt: string; clase?: string }) {
  return (
    <img
      className={clase}
      src={`/media/foto-${n}-1600.webp`}
      srcSet={`/media/foto-${n}-900.webp 900w, /media/foto-${n}-1600.webp 1600w`}
      sizes="(max-width: 900px) 100vw, 60vw"
      width={1600}
      height={1066}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

function Capitulo({
  clase,
  momento,
  titulo,
  children,
  medio,
}: {
  clase: string;
  momento: string;
  titulo: string;
  children: ReactNode;
  medio: ReactNode;
}) {
  const [ref, visto] = useVisto<HTMLElement>();
  return (
    <article ref={ref} className={`cap ${clase}${visto ? " cap--visto" : ""}`}>
      <figure className="cap__medio">{medio}</figure>
      <div className="cap__texto">
        <p className="cap__momento">{momento}</p>
        <h3>{titulo}</h3>
        {children}
      </div>
    </article>
  );
}

/** Del fuego a la mesa: tres momentos, un solo video y dos fotos del local. Mucho aire, una idea por bloque. */
export function Fuego() {
  return (
    <section className="fuego" aria-labelledby="t-fuego">
      <header className="fuego__cab">
        <h2 id="t-fuego">Del fuego a la mesa</h2>
        <p>Primero la brasa, después la parrilla, al final la mesa.</p>
      </header>

      <Capitulo
        clase="cap--1"
        momento="Primero"
        titulo="El fuego"
        medio={
          <>
            <VideoLoop src="/media/video/reel-1.mp4" poster="/media/video/reel-1.webp" />
            <figcaption>Imagen ilustrativa</figcaption>
          </>
        }
      >
        <p>
          La parrilla está encendida todos los días, de {LOCAL.horario.apertura} a {LOCAL.horario.cierre}.
        </p>
      </Capitulo>

      <Capitulo
        clase="cap--2"
        momento="Después"
        titulo="La parrilla"
        medio={<Foto n={6} alt="La parrilla del local con cortes, pollo, verduras y papas asadas sobre las chapas" />}
      >
        <p>
          Con la parrilla libre pagás un precio por persona y comés a gusto: parrilla, pastas con la salsa que elijas y
          pizzas.
        </p>
      </Capitulo>

      <Capitulo
        clase="cap--3"
        momento="Al final"
        titulo="La mesa"
        medio={<Foto n={7} alt="Una parrillada servida en brasero sobre la mesa, con papas fritas" />}
      >
        <p>
          La parrillada llega a la mesa en brasero. Y cada persona se lleva un postre: flan, budín de pan, tarantela o
          helado.
        </p>
        <p>
          <Link className="cap__link" to="/carta">
            Ver la carta
          </Link>
        </p>
      </Capitulo>
    </section>
  );
}

/** Precios de la parrilla libre, tal como están en la carta, con su contexto de día y horario. */
export function Precios() {
  const [ref, visto] = useVisto<HTMLDivElement>();
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  return (
    <section className="precios" aria-labelledby="t-precios">
      <div ref={ref} className={`precios__in${visto ? " precios__in--visto" : ""}`}>
        <header className="precios__cab">
          <p className="precios__mono" aria-hidden="true">
            Parrilla libre · desde
          </p>
          <h2 id="t-precios">
            <span className="sr-only">Parrilla libre desde </span>
            <span className="precios__monto">{precio(desde)}</span>
            <small>por persona</small>
          </h2>
          <p>Entrada, principal y postre. El valor depende del día y del horario.</p>
        </header>
        <ul className="precios__lista">
          {PARRILLA_LIBRE.formulas.map((f) => (
            <li key={f.id} className="comanda">
              <p className="comanda__cuando">{f.nombre.replace(/^Parrilla libre, /, "")}</p>
              <p className="comanda__precio">
                {precio(f.precioPorPersona)}
                <small> por persona</small>
              </p>
            </li>
          ))}
        </ul>
        <div className="precios__pie">
          <p>{PARRILLA_LIBRE.menores}</p>
          <p className="precios__acciones">
            <Link className="btn btn--brasa" to="/reservar">
              Reservar mesa
            </Link>
            <Link className="btn btn--claro" to="/parrilla-libre">
              Cómo funciona
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Dónde estamos: el mapa propio y los datos prácticos, en una sola composición. */
export function Ubicacion() {
  const e = estadoDelLocal();
  return (
    <section className="ubic" aria-labelledby="t-ubic">
      <div className="ubic__texto">
        <p className="ubic__mono">
          <span className={e.abierto ? "punto punto--on" : "punto"} aria-hidden="true" />
          {e.texto}
        </p>
        <h2 id="t-ubic">Estamos en la Av. Illia</h2>
        <p className="ubic__bajada">
          Sobre la Ruta 8, en San Miguel, frente al shopping Terrazas de Mayo, del otro lado de la avenida.
        </p>
        <ul className="libro">
          <li>
            <span className="libro__k">Dirección</span>
            <span className="libro__v">
              {LOCAL.direccion}, {LOCAL.localidad}
            </span>
          </li>
          <li>
            <span className="libro__k">Horario</span>
            <span className="libro__v">
              Todos los días, {LOCAL.horario.apertura} a {LOCAL.horario.cierre}
            </span>
          </li>
          <li>
            <span className="libro__k">Reservas</span>
            <span className="libro__v">
              <Link to="/reservar">Online</Link> o al {LOCAL.telefonos[0].valor}
            </span>
          </li>
        </ul>
        <p className="ubic__acciones">
          <Link className="btn btn--brasa" to="/como-llegar">
            Cómo llegar
          </Link>
        </p>
      </div>
      <MapaLocal controles={false} nivelInicial="cerca" />
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
