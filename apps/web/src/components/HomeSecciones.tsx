import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LOCAL, PARRILLA_LIBRE } from "@dv/shared";
import { precio } from "../lib/formato.ts";
import { estadoDelLocal } from "../lib/horario.ts";
import { MapaLocal } from "./MapaLocal.tsx";
import { VideoLoop } from "./VideoLoop.tsx";
import "../styles/home.css";

gsap.registerPlugin(ScrollTrigger);

/** Con movimiento (lo normal). Sin movimiento todo queda visible y quieto: nada se anima. */
const MOV = "(prefers-reduced-motion: no-preference)";

/**
 * Engancha una escena animada a un elemento. Las animaciones viven en un gsap.matchMedia con el elemento como
 * alcance: se crean solo con movimiento y se revierten solas al desmontar.
 */
function useEscena<T extends HTMLElement>(armar: (el: T, mm: gsap.MatchMedia) => void) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    armar(el, mm);
    return () => mm.revert();
  }, []);
  return ref;
}

function Foto({ n, alt, sizes = "(max-width: 900px) 100vw, 60vw" }: { n: number; alt: string; sizes?: string }) {
  return (
    <img
      src={`/media/foto-${n}-1600.webp`}
      srcSet={`/media/foto-${n}-900.webp 900w, /media/foto-${n}-1600.webp 1600w`}
      sizes={sizes}
      width={1600}
      height={1066}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

/* ─────────────────────────────── Cinta ─────────────────────────────── */

/** Cinta con datos reales. Corre sola y acelera (o cambia de sentido) con el scroll. */
export function Cinta() {
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  const items = [
    `Todos los días de ${LOCAL.horario.apertura} a ${LOCAL.horario.cierre}`,
    `${LOCAL.localidad}, desde ${LOCAL.desde}`,
    `Parrilla libre desde ${precio(desde)} por persona`,
    "Reservá online",
  ];
  const ref = useEscena<HTMLElement>((el, mm) => {
    mm.add(MOV, () => {
      el.classList.add("cinta--viva");
      const riel = el.querySelector<HTMLElement>(".cinta__riel")!;
      const tw = gsap.to(riel, { xPercent: -50, ease: "none", duration: 34, repeat: -1 });
      tw.totalTime(tw.duration() * 50); // margen para poder ir hacia atrás
      let volver: gsap.core.Tween | null = null;
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (st) => {
          const v = Math.min(5, 1 + Math.abs(st.getVelocity()) / 500);
          volver?.kill();
          tw.timeScale(st.direction * v);
          volver = gsap.to(tw, { timeScale: st.direction, duration: 0.9, ease: "power2.out" });
        },
      });
      return () => el.classList.remove("cinta--viva");
    });
  });
  const lista = (oculta: boolean) => (
    <ul className="cinta__tira" aria-hidden={oculta || undefined}>
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
    <section ref={ref} className="cinta" aria-label="Datos del local">
      <div className="cinta__riel">
        {lista(false)}
        {lista(true)}
      </div>
    </section>
  );
}

/* ───────────────────────── Del fuego a la mesa ───────────────────────── */

/**
 * Recorrido vertical: cuatro paneles apilados (portada, fuego, parrilla, mesa). Cada panel destapa su imagen de
 * abajo hacia arriba y sube su texto al entrar en pantalla. Sin fijar la pantalla ni mover nada de costado.
 */
export function Recorrido() {
  const ref = useEscena<HTMLElement>((el, mm) => {
    const paneles = Array.from(el.querySelectorAll<HTMLElement>(".rec__panel"));
    mm.add(MOV, () => {
      paneles.forEach((p, i) => {
        gsap.fromTo(
          p.querySelectorAll(".rec__m"),
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.2,
            ease: "power3.inOut",
            stagger: 0.15,
            scrollTrigger: { trigger: p, start: "top 75%" },
          },
        );
        gsap.from(p.querySelectorAll(".rec__t > *"), {
          y: 44,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: p, start: i === 0 ? "top 85%" : "top 70%" },
        });
      });
    });
  });

  return (
    <section ref={ref} className="rec" aria-labelledby="t-rec">
      <div className="rec__pista">
        <div className="rec__panel rec__panel--portada">
          <div className="rec__t">
            <p className="rec__mono">San Miguel, desde {LOCAL.desde}</p>
            <h2 id="t-rec">
              Del fuego
              <br />a la mesa
            </h2>
            <p className="rec__bajada">Primero la brasa, después la parrilla, al final la mesa.</p>
          </div>
        </div>

        <article className="rec__panel rec__panel--fuego">
          <figure className="rec__m rec__m--grande">
            <VideoLoop src="/media/video/reel-2.mp4" poster="/media/video/reel-2.webp" />
          </figure>
          <div className="rec__t">
            <p className="rec__mono">Primero</p>
            <h3>El fuego</h3>
            <p>
              La parrilla está encendida todos los días, de {LOCAL.horario.apertura} a {LOCAL.horario.cierre}. Leña,
              brasa y el asador a la vista.
            </p>
          </div>
        </article>

        <article className="rec__panel rec__panel--parrilla">
          <figure className="rec__m rec__m--grande">
            <Foto n={6} alt="La parrilla del local con cortes, pollo, verduras y papas asadas sobre las chapas" />
          </figure>
          <figure className="rec__m rec__m--chico">
            <VideoLoop src="/media/video/reel-1.mp4" poster="/media/video/reel-1.webp" />
          </figure>
          <div className="rec__t">
            <p className="rec__mono">Después</p>
            <h3>La parrilla</h3>
            <p>
              Con la parrilla libre pagás un precio por persona y comés a gusto: parrilla, pastas con la salsa que
              elijas y pizzas.
            </p>
          </div>
        </article>

        <article className="rec__panel rec__panel--mesa">
          <figure className="rec__m rec__m--alto">
            <Foto
              n={7}
              alt="Una parrillada servida en brasero sobre la mesa, con papas fritas"
              sizes="(max-width: 900px) 100vw, 40vw"
            />
          </figure>
          <figure className="rec__m rec__m--chico">
            <VideoLoop src="/media/video/reel-3.mp4" poster="/media/video/reel-3.webp" />
          </figure>
          <div className="rec__t">
            <p className="rec__mono">Al final</p>
            <h3>La mesa</h3>
            <p>
              La parrillada llega en brasero. Y cada persona se lleva un postre: flan, budín de pan, tarantela o helado.
            </p>
            <p>
              <Link className="btn btn--brasa" to="/carta">
                Ver la carta
              </Link>
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

/* ─────────────────────────────── El salón ─────────────────────────────── */

/** La foto del salón se destapa de abajo hacia arriba y el texto sube detrás. Sin fijar la pantalla. */
export function Salon() {
  const ref = useEscena<HTMLElement>((el, mm) => {
    mm.add(MOV, () => {
      gsap.fromTo(
        ".salon__ventana",
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.3,
          ease: "power3.inOut",
          scrollTrigger: { trigger: el, start: "top 70%" },
        },
      );
      gsap.fromTo(
        ".salon__ventana img",
        { scale: 1.12 },
        { scale: 1, duration: 1.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 70%" } },
      );
      gsap.from(".salon__texto > *", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 55%" },
      });
    });
  });
  return (
    <section ref={ref} className="salon" aria-labelledby="t-salon">
      <figure className="salon__ventana">
        <Foto
          n={4}
          alt="Una pareja almorzando en el salón de Don Valentín, con la parrillada en brasero sobre la mesa"
          sizes="100vw"
        />
      </figure>
      <div className="salon__velo" aria-hidden="true" />
      <div className="salon__texto">
        <p className="rec__mono">El salón</p>
        <h2 id="t-salon">Una mesa larga, como en casa.</h2>
        <p>
          La parrilla libre se sirve en el salón: entrada, principal y postre, a cargo de la misma familia desde{" "}
          {LOCAL.desde}.
        </p>
        <p>
          <Link className="btn btn--brasa" to="/parrilla-libre">
            Cómo funciona la parrilla libre
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Galería ─────────────────────────────── */

/** Tres columnas de fotos y videos que corren a distinta velocidad con el scroll, con la carta en el centro. */
export function Galeria() {
  const ref = useEscena<HTMLElement>((el, mm) => {
    // Las columnas con parallax son solo de pantallas anchas; en celular la grilla queda quieta.
    mm.add(`${MOV} and (min-width: 701px)`, () => {
      const cols = el.querySelectorAll<HTMLElement>(".gal__col");
      const rangos: [number, number][] = [
        [12, -22],
        [-18, 10],
        [20, -28],
      ];
      cols.forEach((c, i) => {
        const [a, b] = rangos[i] ?? [0, 0];
        gsap.fromTo(
          c,
          { yPercent: a },
          {
            yPercent: b,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    });
    mm.add(MOV, () => {
      gsap.from(el.querySelector(".gal__tarjeta"), {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: "back.out(1.6)",
        scrollTrigger: { trigger: el, start: "top 80%" },
      });
    });
  });
  return (
    <section ref={ref} className="gal" aria-labelledby="t-gal">
      <div className="gal__cols" aria-hidden="true">
        <div className="gal__col">
          <figure className="gal__m gal__m--v">
            <VideoLoop src="/media/video/reel-4.mp4" poster="/media/video/reel-4.webp" />
          </figure>
          <figure className="gal__m">
            <Foto n={3} alt="" sizes="33vw" />
          </figure>
        </div>
        <div className="gal__col">
          <figure className="gal__m">
            <Foto n={2} alt="" sizes="33vw" />
          </figure>
          <figure className="gal__m gal__m--v">
            <VideoLoop src="/media/video/reel-5.mp4" poster="/media/video/reel-5.webp" />
          </figure>
          <figure className="gal__m">
            <Foto n={1} alt="" sizes="33vw" />
          </figure>
        </div>
        <div className="gal__col">
          <figure className="gal__m">
            <VideoLoop src="/media/video/reel-3.mp4" poster="/media/video/reel-3.webp" />
          </figure>
          <figure className="gal__m gal__m--v">
            <Foto n={5} alt="" sizes="33vw" />
          </figure>
        </div>
      </div>
      <div className="gal__tarjeta comanda">
        <p className="comanda__cuando">La carta</p>
        <h2 id="t-gal">Además de la parrilla libre</h2>
        <p>Carnes en porciones, sándwiches, pizzas, pastas caseras y postres, con precio por porción.</p>
        <Link className="btn btn--brasa" to="/carta">
          Ver la carta completa
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Precios ─────────────────────────────── */

/** Precios de la parrilla libre, tal como están en la carta. El monto cuenta hasta su valor y las comandas se imprimen. */
export function Precios() {
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  const ref = useEscena<HTMLElement>((el, mm) => {
    mm.add(MOV, () => {
      const monto = el.querySelector<HTMLElement>(".precios__monto")!;
      const n = { v: 0 };
      const st = { trigger: el, start: "top 70%" };
      gsap.to(n, {
        v: desde,
        duration: 1.6,
        ease: "power3.out",
        scrollTrigger: st,
        onUpdate: () => {
          monto.textContent = precio(Math.round(n.v / 100) * 100);
        },
        onComplete: () => {
          monto.textContent = precio(desde);
        },
      });
      gsap.from(el.querySelectorAll(".precios__cab > *"), {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: st,
      });
      gsap.fromTo(
        el.querySelectorAll(".comanda"),
        { clipPath: "inset(0% 0% 100% 0%)", y: -24 },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          y: 0,
          duration: 1,
          stagger: 0.25,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 60%" },
        },
      );
      gsap.fromTo(
        el.querySelector(".precios__fondo"),
        { scale: 1.25 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
      );
    });
  });
  return (
    <section ref={ref} className="precios" aria-labelledby="t-precios">
      <VideoLoop className="precios__fondo" src="/media/video/brasas.mp4" poster="/media/video/brasas.webp" />
      <div className="precios__in">
        <header className="precios__cab">
          <p className="precios__mono" aria-hidden="true">
            Parrilla libre · desde
          </p>
          <h2 id="t-precios">
            <span className="sr-only">Parrilla libre desde {precio(desde)} por persona</span>
            <span className="precios__monto" aria-hidden="true">
              {precio(desde)}
            </span>
            <small aria-hidden="true">por persona</small>
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

/* ─────────────────────────────── Ubicación ─────────────────────────────── */

/** Dónde estamos: el mapa se destapa desde el pin y los datos llegan uno por uno. */
export function Ubicacion() {
  const e = estadoDelLocal();
  const ref = useEscena<HTMLElement>((el, mm) => {
    mm.add(MOV, () => {
      gsap.fromTo(
        el.querySelector(".mapa"),
        { clipPath: "circle(0% at 50% 50%)" },
        {
          clipPath: "circle(75% at 50% 50%)",
          duration: 1.6,
          ease: "power3.inOut",
          scrollTrigger: { trigger: el, start: "top 65%" },
          clearProps: "clipPath",
        },
      );
      gsap.from(el.querySelectorAll(".ubic__texto > *, .libro li"), {
        x: -40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 65%" },
      });
    });
  });
  return (
    <section ref={ref} className="ubic" aria-labelledby="t-ubic">
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

/* ─────────────────────────────── Cierre ─────────────────────────────── */

/** Cierre: las brasas se acercan y el pedido sube palabra por palabra. */
export function CierreReserva() {
  const palabras = ["Guardá", "tu", "mesa."];
  const ref = useEscena<HTMLElement>((el, mm) => {
    mm.add(MOV, () => {
      gsap.fromTo(
        el.querySelector(".cierre__video"),
        { scale: 1.35 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: true },
        },
      );
      gsap.from(el.querySelectorAll(".cierre__p"), {
        yPercent: 110,
        duration: 1,
        stagger: 0.09,
        ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 55%" },
      });
      gsap.from(el.querySelectorAll(".cierre__in > :not(h2)"), {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.35,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 55%" },
      });
    });
  });
  return (
    <section ref={ref} className="cierre" aria-labelledby="t-cierre">
      <VideoLoop className="cierre__video" src="/media/video/brasas.mp4" poster="/media/video/brasas.webp" />
      <div className="cierre__velo" aria-hidden="true" />
      <div className="cierre__in">
        <h2 id="t-cierre" aria-label="Guardá tu mesa.">
          {palabras.map((p) => (
            <span key={p} className="cierre__linea" aria-hidden="true">
              <span className="cierre__p">{p}</span>
            </span>
          ))}
        </h2>
        <p>Elegí el día, el horario y cuántos son. Te confirmamos en el momento.</p>
        <Link className="btn btn--brasa" to="/reservar">
          Reservar mesa
        </Link>
      </div>
    </section>
  );
}
