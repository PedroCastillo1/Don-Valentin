import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LOCAL, PARRILLA_LIBRE } from "@dv/shared";
import { estadoDelLocal } from "../lib/horario.ts";
import { precio } from "../lib/formato.ts";
import "../styles/hero.css";

gsap.registerPlugin(ScrollTrigger);

const BARRAS_ESCRITORIO = 9;
const BARRAS_MOVIL = 5;

/** Videos del hero. Escritorio: horizontales 720p. Vertical (celulares): 540x960. Ver docs/direccion-artistica.md. */
const VIDEO = {
  horizontal: { a: "/media/video/hero-a.mp4", b: "/media/video/hero-b.mp4" },
  vertical: { a: "/media/video/hero-a-m.mp4", b: "/media/video/hero-b-m.mp4" },
};

function sinMovimiento() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  );
}

/**
 * Portada de Don Valentín: el fuego visto a través de la parrilla, en tres escenas apiladas que se recorren con
 * el scroll normal del navegador (sin pin, sin snap, sin listeners que intercepten rueda, toque ni teclado).
 * Escena 1: video del fuego + comanda. Escena 2: segundo plano con la mesa. Escena 3: persiana con la foto del asador.
 * El scroll solo mueve cosas (parallax suave, tiras de la persiana); nunca lo retiene.
 */
export function Hero() {
  const raiz = useRef<HTMLDivElement>(null);
  const quieto = useMemo(() => typeof window !== "undefined" && sinMovimiento(), []);
  const [pausado, setPausado] = useState(false);
  const pausadoRef = useRef(false);
  const estado = useMemo(() => estadoDelLocal(), []);
  const vertical = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
    [],
  );
  const n = vertical ? BARRAS_MOVIL : BARRAS_ESCRITORIO;
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  const src = vertical ? VIDEO.vertical : VIDEO.horizontal;
  const posterA = vertical ? "/media/video/hero-a-m.webp" : "/media/video/hero-a.webp";
  const posterB = vertical ? "/media/video/hero-b-m.webp" : "/media/video/hero-b.webp";

  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const escena1 = el.querySelector<HTMLElement>(".hero")!;
    const escena2 = el.querySelector<HTMLElement>(".portada__fuego")!;
    const escena3 = el.querySelector<HTMLElement>(".asador")!;
    const va = el.querySelector<HTMLVideoElement>(".hero__v--a")!;
    const vb = el.querySelector<HTMLVideoElement>(".portada__fuego-v")!;

    const raizHtml = document.documentElement;
    raizHtml.classList.add("nav-claro");
    // El póster de la escena 2 se pide recién cuando el scroll se acerca (o enseguida si no hay movimiento).
    const ponerPoster = () => {
      if (!vb.getAttribute("poster")) vb.setAttribute("poster", posterB);
    };
    if (quieto) ponerPoster();
    // El nav es claro mientras la portada (fondo oscuro) ocupa la pantalla y pasa a sólido al salir de ella.
    const navClaro = ScrollTrigger.create({
      trigger: el,
      start: "bottom 70px",
      onEnter: () => raizHtml.classList.remove("nav-claro"),
      onLeaveBack: () => raizHtml.classList.add("nav-claro"),
    });

    if (quieto) {
      return () => {
        navClaro.kill();
        raizHtml.classList.remove("nav-claro");
      };
    }

    const reproducir = (v: HTMLVideoElement) => {
      if (!pausadoRef.current) void v.play().catch(() => undefined);
    };
    const cargar = (v: HTMLVideoElement, url: string) => {
      if (!v.getAttribute("src")) v.setAttribute("src", url);
    };

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const arrancar = () => {
        cargar(va, src.a);
        reproducir(va);
      };
      if (document.readyState === "complete") arrancar();
      else window.addEventListener("load", arrancar, { once: true });

      // Entrada (por tiempo, no por scroll): las barras caen sobre el fuego, se abren y sube la comanda.
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(q(".barra"), { yPercent: -105, duration: 0.9, stagger: { each: 0.06, from: "start" } }, 0)
        .from(va, { opacity: 0, duration: 1.1 }, 0)
        .to(
          q(".barra"),
          { scaleX: 0, duration: 1.1, ease: "power2.inOut", stagger: { each: 0.07, from: "center" } },
          0.9,
        )
        .from(q(".hero__ticket"), { y: 48, opacity: 0, duration: 0.9, clearProps: "transform,opacity" }, 1.1)
        .from(q("[data-in]"), { y: 16, opacity: 0, duration: 0.6, stagger: 0.07 }, 1.25);

      // Parallax suave de cada escena mientras pasa por la pantalla (scrub sin pin: no retiene el scroll).
      gsap.to(va, {
        yPercent: 9,
        scale: 1.08,
        ease: "none",
        scrollTrigger: { trigger: escena1, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.fromTo(
        vb,
        { yPercent: -7, scale: 1.1 },
        {
          yPercent: 7,
          scale: 1.02,
          ease: "none",
          immediateRender: false,
          scrollTrigger: { trigger: escena2, start: "top bottom", end: "bottom top", scrub: true },
        },
      );

      // Videos: cada uno se reproduce solo mientras su escena está en pantalla.
      ScrollTrigger.create({
        trigger: escena1,
        start: "top bottom",
        end: "bottom top",
        onToggle: (st) => (st.isActive ? reproducir(va) : va.pause()),
      });
      ScrollTrigger.create({
        trigger: escena2,
        start: "top 180%",
        once: true,
        onEnter: () => {
          ponerPoster();
          cargar(vb, src.b);
        },
      });
      ScrollTrigger.create({
        trigger: escena2,
        start: "top bottom",
        end: "bottom top",
        onToggle: (st) => {
          if (st.isActive) {
            cargar(vb, src.b);
            reproducir(vb);
          } else vb.pause();
        },
      });

      // Escena 2: el rótulo aparece una vez cuando la escena ocupa la pantalla.
      gsap.from(q(".portada__fuego-texto > *"), {
        y: 34,
        opacity: 0,
        duration: 0.9,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: { trigger: escena2, start: "top 55%", toggleActions: "play none none reverse" },
      });

      // Escena 3: la persiana sube con el scroll (rango corto, sin pin) y el texto entra al completarse.
      gsap.fromTo(
        q(".tira"),
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          ease: "none",
          stagger: { each: 0.1, from: "start" },
          immediateRender: true,
          scrollTrigger: { trigger: escena3, start: "top 85%", end: "top 15%", scrub: 0.4 },
        },
      );
      gsap.fromTo(
        q(".tira img"),
        { scale: 1.2 },
        {
          scale: 1,
          ease: "none",
          stagger: { each: 0.1, from: "start" },
          scrollTrigger: { trigger: escena3, start: "top 85%", end: "top 15%", scrub: 0.4 },
        },
      );
      gsap.from(q(".asador__texto > *"), {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: escena3, start: "top 30%", toggleActions: "play none none reverse" },
      });
    });

    return () => {
      mm.revert();
      navClaro.kill();
      va.pause();
      vb.pause();
      raizHtml.classList.remove("nav-claro");
    };
  }, [src.a, src.b, posterB, vertical, quieto]);

  /** Pausa o reanuda los videos de la portada (accesibilidad: WCAG 2.2.2). */
  function alternarMovimiento() {
    const el = raiz.current;
    if (!el) return;
    const nuevo = !pausadoRef.current;
    pausadoRef.current = nuevo;
    setPausado(nuevo);
    el.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (nuevo) v.pause();
      else if (v.getAttribute("src")) {
        const r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) void v.play().catch(() => undefined);
      }
    });
  }

  const barras = Array.from({ length: n }, (_, i) => i);

  return (
    <div ref={raiz} className="portada" style={{ ["--n" as string]: n }}>
      <section className="hero" aria-label="Don Valentín, parrilla en San Miguel">
        <div className="hero__film" aria-hidden="true">
          <video
            className="hero__v hero__v--a"
            muted
            loop
            playsInline
            preload="none"
            poster={posterA}
            disablePictureInPicture
          />
          <div className="hero__tono" />
        </div>

        <div className="hero__barras" aria-hidden="true">
          {barras.map((i) => (
            <i key={i} className="barra" />
          ))}
        </div>

        <div className="hero__ticket">
          <div className="hero__ticket-cuerpo">
            <p className="hero__estado" data-in>
              <span className={estado.abierto ? "punto punto--on" : "punto"} aria-hidden="true" />
              {estado.texto}
            </p>
            <h1 className="hero__titulo" data-in>
              La parrilla de siempre, con la mesa puesta.
            </h1>
            <p className="hero__bajada" data-in>
              Parrilla libre en el salón, a cargo de la misma familia desde {LOCAL.desde}. Elegí día y horario y te
              guardamos el lugar.
            </p>
          </div>
          <div className="hero__ticket-pie">
            <div className="hero__acciones" data-in>
              <Link className="btn btn--brasa" to="/reservar">
                Reservar mesa
              </Link>
              <Link className="btn" to="/carta">
                Ver la carta
              </Link>
            </div>
            <p className="hero__datos" data-in>
              {LOCAL.direccion}, {LOCAL.localidad}
            </p>
          </div>
        </div>

        {!quieto && (
          <button
            type="button"
            className="hero__pausa"
            aria-pressed={pausado}
            aria-label={pausado ? "Reanudar los videos de la portada" : "Pausar los videos de la portada"}
            onClick={alternarMovimiento}
          >
            <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" focusable="false">
              {pausado ? (
                <path d="M5 3l12 7-12 7z" fill="currentColor" />
              ) : (
                <path d="M4 3h4v14H4zM12 3h4v14h-4z" fill="currentColor" />
              )}
            </svg>
          </button>
        )}
      </section>

      <section className="portada__fuego" aria-label="El fuego y la mesa">
        <video
          className="portada__fuego-v"
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        />
        <div className="portada__fuego-tono" aria-hidden="true" />
        <div className="portada__fuego-texto">
          <p className="rotulo__mono">Parrilla libre desde {precio(desde)} por persona</p>
          <p className="rotulo__t">Una mesa larga, el fuego a la vista.</p>
        </div>
      </section>

      <section className="asador" aria-label="El asador">
        <div className="asador__persiana">
          {barras.map((i) => (
            <div key={i} className="tira" style={{ ["--i" as string]: i }}>
              <img
                src="/media/foto-5-1600.webp"
                srcSet="/media/foto-5-900.webp 900w, /media/foto-5-1600.webp 1600w"
                sizes="100vw"
                width={1600}
                height={1054}
                alt={i === 0 ? "El asador del local preparando costillares a la estaca sobre fuego de leña" : ""}
                aria-hidden={i === 0 ? undefined : true}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
        <div className="asador__velo" aria-hidden="true" />
        <div className="asador__texto">
          <p className="rotulo__mono">El asador, a la vista</p>
          <h2>Costillares a la estaca, sobre fuego de leña.</h2>
          <Link className="btn btn--brasa" to="/parrilla-libre">
            Cómo funciona la parrilla libre
          </Link>
        </div>
      </section>
    </div>
  );
}
