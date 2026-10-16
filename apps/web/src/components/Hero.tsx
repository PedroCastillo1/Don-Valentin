import { useLayoutEffect, useMemo, useRef } from "react";
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
 * Hero de Don Valentín: el fuego visto a través de la parrilla.
 * Las barras de hierro se abren con el scroll, el video del fuego queda a pantalla completa,
 * pasa al segundo plano y termina en una persiana que revela la foto del asador.
 */
export function Hero() {
  const raiz = useRef<HTMLElement>(null);
  const estado = useMemo(() => estadoDelLocal(), []);
  const vertical = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(max-aspect-ratio: 1/1)").matches,
    [],
  );
  const n = vertical ? BARRAS_MOVIL : BARRAS_ESCRITORIO;
  const desde = Math.min(...PARRILLA_LIBRE.formulas.map((f) => f.precioPorPersona));
  const src = vertical ? VIDEO.vertical : VIDEO.horizontal;
  const posterA = vertical ? "/media/video/hero-a-m.webp" : "/media/video/hero-a.webp";

  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const q = gsap.utils.selector(el);
    const quieto = sinMovimiento();
    const va = el.querySelector<HTMLVideoElement>(".hero__v--a")!;
    const vb = el.querySelector<HTMLVideoElement>(".hero__v--b")!;

    const reproducir = (v: HTMLVideoElement) => v.play().catch(() => undefined);
    const cargar = (v: HTMLVideoElement, url: string) => {
      if (!v.getAttribute("src")) v.setAttribute("src", url);
    };

    // El nav es claro mientras el hero ocupa la pantalla (fondo oscuro) y se vuelve sólido después.
    const raizHtml = document.documentElement;
    raizHtml.classList.add("nav-claro");
    // Con movimiento, el pin del hero decide cuándo se suelta (onLeave/onEnterBack); sin movimiento no hay pin.
    const navClaro = quieto
      ? ScrollTrigger.create({
          trigger: el,
          start: "bottom 70px",
          onEnter: () => raizHtml.classList.remove("nav-claro"),
          onLeaveBack: () => raizHtml.classList.add("nav-claro"),
        })
      : { kill: () => undefined };

    if (quieto) {
      return () => {
        navClaro.kill();
        document.documentElement.classList.remove("nav-claro");
      };
    }

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // El primer video arranca apenas la página está lista; el segundo, cuando el scroll se acerca.
      const arrancar = () => {
        cargar(va, src.a);
        void reproducir(va);
      };
      if (document.readyState === "complete") arrancar();
      else window.addEventListener("load", arrancar, { once: true });

      // Entrada: las barras caen sobre el fuego, el ticket sube.
      const entrada = gsap.timeline({ defaults: { ease: "power3.out" } });
      entrada
        .from(q(".barra"), { yPercent: -105, duration: 1.1, stagger: { each: 0.07, from: "start" } }, 0)
        .from(q(".hero__v--a"), { opacity: 0, duration: 1.2 }, 0)
        .from(q(".hero__ticket"), { y: 48, opacity: 0, duration: 1, clearProps: "transform,opacity" }, 0.7)
        .from(q("[data-in]"), { y: 18, opacity: 0, duration: 0.7, stagger: 0.07 }, 0.9);

      // Scroll: las barras se abren, el fuego pasa a pantalla completa, luego la persiana trae al asador.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * (vertical ? 3 : 3.6))}`,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onLeave: () => raizHtml.classList.remove("nav-claro"),
          onEnterBack: () => raizHtml.classList.add("nav-claro"),
          onUpdate: (st) => {
            if (st.progress > 0.3) {
              cargar(vb, src.b);
              if (st.progress < 0.9 && vb.paused) void reproducir(vb);
            }
            if (st.progress > 0.78 && !va.paused) va.pause();
            if (st.progress <= 0.78 && va.paused && va.getAttribute("src")) void reproducir(va);
            if (st.progress > 0.95 && !vb.paused) vb.pause();
          },
          onToggle: (st) => {
            if (!st.isActive) {
              va.pause();
              vb.pause();
            }
          },
        },
      });

      tl.to(q(".hero__ticket"), { y: -80, opacity: 0, duration: 1.4, ease: "power2.in" }, 0)
        .to(
          q(".barra"),
          { scaleX: 0, duration: 1.8, ease: "power2.inOut", stagger: { each: 0.1, from: "center" } },
          0.5,
        )
        .to(q(".hero__v--a"), { scale: 1.12, duration: 6.5 }, 0)
        .fromTo(
          q(".hero__rotulo--1 > *"),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" },
          2.2,
        )
        .to(q(".hero__rotulo--1"), { y: -40, opacity: 0, duration: 0.8, ease: "power2.in" }, 4.4)
        .to(q(".hero__v--b"), { opacity: 1, duration: 1.2 }, 4.2)
        .fromTo(
          q(".hero__rotulo--2 > *"),
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" },
          5.1,
        )
        .to(q(".hero__rotulo--2"), { y: -40, opacity: 0, duration: 0.7, ease: "power2.in" }, 6.5)
        .fromTo(
          q(".tira"),
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.5,
            ease: "power3.inOut",
            stagger: { each: 0.14, from: "start" },
          },
          6.7,
        )
        .fromTo(
          q(".tira img"),
          { scale: 1.25 },
          { scale: 1, duration: 2.6, ease: "power2.out", stagger: { each: 0.14, from: "start" } },
          6.7,
        )
        .fromTo(
          q(".hero__asador-texto > *"),
          { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" },
          8.6,
        )
        .to({}, { duration: 0.9 }); // pausa final: la foto queda un momento en pantalla antes de soltar el pin
    });

    return () => {
      mm.revert();
      navClaro.kill();
      va.pause();
      vb.pause();
      document.documentElement.classList.remove("nav-claro");
    };
  }, [src.a, src.b, vertical]);

  const barras = Array.from({ length: n }, (_, i) => i);

  return (
    <section
      ref={raiz}
      className="hero"
      aria-label="Don Valentín, parrilla en San Miguel"
      style={{ ["--n" as string]: n }}
    >
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
        <video className="hero__v hero__v--b" muted loop playsInline preload="none" disablePictureInPicture />
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

      <div className="hero__rotulo hero__rotulo--1" aria-hidden="true">
        <p className="rotulo__mono">San Miguel · desde {LOCAL.desde}</p>
        <p className="rotulo__t">A las brasas, todos los días.</p>
      </div>
      <div className="hero__rotulo hero__rotulo--2" aria-hidden="true">
        <p className="rotulo__mono">Parrilla libre desde {precio(desde)} por persona</p>
        <p className="rotulo__t">Una mesa larga, el fuego a la vista.</p>
      </div>

      <div className="hero__persiana">
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
        <div className="hero__asador-velo" aria-hidden="true" />
        <div className="hero__asador-texto">
          <p className="rotulo__mono">El asador, a la vista</p>
          <h2>Costillares a la estaca, sobre fuego de leña.</h2>
          <Link className="btn btn--brasa" to="/parrilla-libre">
            Cómo funciona la parrilla libre
          </Link>
        </div>
      </div>
    </section>
  );
}
