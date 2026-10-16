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
 * Hero de Don Valentín: el fuego visto a través de la parrilla.
 * Las barras de hierro se abren con el scroll, el video del fuego queda a pantalla completa,
 * pasa al segundo plano y termina en una persiana que revela la foto del asador.
 */
export function Hero() {
  const raiz = useRef<HTMLElement>(null);
  const [pausado, setPausado] = useState(false);
  const pausadoRef = useRef(false);
  const quieto = useMemo(() => typeof window !== "undefined" && sinMovimiento(), []);
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
    const va = el.querySelector<HTMLVideoElement>(".hero__v--a")!;
    const vb = el.querySelector<HTMLVideoElement>(".hero__v--b")!;

    const reproducir = (v: HTMLVideoElement) =>
      pausadoRef.current ? Promise.resolve() : v.play().catch(() => undefined);
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

      // Scroll: cuatro paradas (inicio · fuego · mesa · asador). Con snap direccional, un gesto rápido siempre
      // termina en la parada siguiente y nunca "pasa volando" el hero.
      const paradas = ["inicio", "fuego", "mesa", "asador"] as const;
      const tl: gsap.core.Timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * (vertical ? 3 : 3.2))}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
          snap: {
            // Parada direccional con tolerancia: si ya estás sobre una parada te quedás; si no, vas a la siguiente
            // en el sentido en que venías scrolleando (aunque el gesto haya sido fuerte).
            snapTo: (valor: number, st?: ScrollTrigger) => {
              const total = tl.duration();
              const marcas = paradas.map((n) => (tl.labels[n] ?? 0) / total);
              const cerca = marcas.find((m) => Math.abs(m - valor) < 0.02);
              if (cerca !== undefined) return cerca;
              const dir = st?.direction ?? 1;
              if (dir > 0) return marcas.find((m) => m > valor) ?? 1;
              return [...marcas].reverse().find((m) => m < valor) ?? 0;
            },
            duration: { min: 0.4, max: 0.9 },
            delay: 0.08,
            ease: "power2.inOut",
          },
          onLeave: () => raizHtml.classList.remove("nav-claro"),
          onEnterBack: () => raizHtml.classList.add("nav-claro"),
          onLeaveBack: () => raizHtml.classList.add("nav-claro"),
          onUpdate: (st) => {
            if (st.progress > 0.2) {
              cargar(vb, src.b);
              if (st.progress < 0.9 && vb.paused) void reproducir(vb);
            }
            if (st.progress > 0.72 && !va.paused) va.pause();
            if (st.progress <= 0.72 && va.paused && va.getAttribute("src")) void reproducir(va);
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

      tl.addLabel("inicio", 0)
        .fromTo(
          q(".hero__ticket"),
          { y: 0, autoAlpha: 1 },
          { y: -70, autoAlpha: 0, duration: 1.2, ease: "power2.in", immediateRender: false },
          0,
        )
        .to(
          q(".barra"),
          { scaleX: 0, duration: 1.7, ease: "power2.inOut", stagger: { each: 0.1, from: "center" } },
          0.3,
        )
        .to(q(".hero__v--a"), { scale: 1.1, duration: 7 }, 0)
        .fromTo(
          q(".hero__rotulo--1 > *"),
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" },
          1.9,
        )
        .addLabel("fuego", 3.4)
        .to(q(".hero__rotulo--1"), { y: -36, opacity: 0, duration: 0.8, ease: "power2.in" }, 4.4)
        .to(q(".hero__v--b"), { opacity: 1, duration: 1.2 }, 4.3)
        .fromTo(
          q(".hero__rotulo--2 > *"),
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" },
          5.3,
        )
        .addLabel("mesa", 6.9)
        .to(q(".hero__rotulo--2"), { y: -36, opacity: 0, duration: 0.7, ease: "power2.in" }, 7.9)
        .fromTo(
          q(".tira"),
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.4,
            ease: "power3.inOut",
            stagger: { each: 0.12, from: "start" },
          },
          8.1,
        )
        .fromTo(q(".hero__asador-velo"), { opacity: 0 }, { opacity: 1, duration: 1.6, ease: "power2.inOut" }, 8.4)
        .fromTo(
          q(".tira img"),
          { scale: 1.25 },
          { scale: 1, duration: 2.4, ease: "power2.out", stagger: { each: 0.12, from: "start" } },
          8.1,
        )
        .fromTo(q(".hero__asador-texto"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 9.9)
        .fromTo(
          q(".hero__asador-texto > *"),
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.12, ease: "power3.out" },
          9.9,
        )
        .addLabel("asador", 11.2)
        .to({}, { duration: 0.01 }, 11.2);

      // Control del gesto: cada gesto (rueda, toque o teclado) mueve UNA parada, sin importar la fuerza ni la inercia.
      // Fuera de las paradas (primera hacia arriba, última hacia abajo) el scroll sigue siendo el normal del navegador.
      const st = tl.scrollTrigger!;
      const marcas = () => paradas.map((n) => st.start + ((tl.labels[n] ?? 0) / tl.duration()) * (st.end - st.start));
      const indice = () => {
        const y = window.scrollY;
        let k = 0;
        let d = Infinity;
        marcas().forEach((v, i) => {
          if (Math.abs(v - y) < d) {
            d = Math.abs(v - y);
            k = i;
          }
        });
        return k;
      };
      const enZona = () => window.scrollY >= st.start - 2 && window.scrollY <= st.end + 2;
      let animando = false;
      let bloqueado = false; // el gesto en curso ya movió una parada: se ignora hasta que pare la rueda
      let ultimoGesto = 0;
      let girar: gsap.core.Tween | null = null;

      const mover = (destino: number) => {
        girar?.kill();
        const prox = { y: window.scrollY };
        animando = true;
        girar = gsap.to(prox, {
          y: destino,
          duration: 1.05,
          ease: "power3.inOut",
          onUpdate: () => window.scrollTo(0, prox.y),
          onComplete: () => {
            // enfriamiento: la inercia de la rueda puede seguir un rato más
            window.setTimeout(() => {
              animando = false;
            }, 300);
          },
        });
      };
      const aParada = (i: number) => mover(marcas()[i] ?? st.start);

      const siguiente = (dir: 1 | -1) => {
        const sig = indice() + dir;
        return sig < 0 || sig >= paradas.length ? null : sig;
      };

      const alRueda = (e: WheelEvent) => {
        if (!enZona() || e.ctrlKey) return;
        const ahora = performance.now();
        if (ahora - ultimoGesto > 220) bloqueado = false;
        ultimoGesto = ahora;
        if (animando || bloqueado) {
          e.preventDefault();
          return;
        }
        if (Math.abs(e.deltaY) < 1) return;
        const sig = siguiente(e.deltaY > 0 ? 1 : -1);
        if (sig === null) return;
        e.preventDefault();
        bloqueado = true;
        aParada(sig);
      };

      let y0 = 0;
      let tocado = false;
      const alTocar = (e: TouchEvent) => {
        y0 = e.touches[0]?.clientY ?? 0;
        tocado = false;
      };
      const alArrastrar = (e: TouchEvent) => {
        if (!enZona()) return;
        const dy = y0 - (e.touches[0]?.clientY ?? y0);
        if (animando || tocado) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        if (Math.abs(dy) < 8) return;
        const sig = siguiente(dy > 0 ? 1 : -1);
        if (sig === null) return;
        if (e.cancelable) e.preventDefault();
        if (Math.abs(dy) >= 28) {
          tocado = true;
          aParada(sig);
        }
      };

      const alTeclear = (e: KeyboardEvent) => {
        if (!enZona() || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target as HTMLElement | null;
        if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
        const dir =
          e.key === "ArrowDown" || e.key === "PageDown" ? 1 : e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 0;
        if (!dir) return;
        if (animando) {
          e.preventDefault();
          return;
        }
        const sig = siguiente(dir);
        if (sig === null) return;
        e.preventDefault();
        aParada(sig);
      };

      window.addEventListener("wheel", alRueda, { passive: false });
      window.addEventListener("touchstart", alTocar, { passive: true });
      window.addEventListener("touchmove", alArrastrar, { passive: false });
      window.addEventListener("keydown", alTeclear);
      return () => {
        window.removeEventListener("wheel", alRueda);
        window.removeEventListener("touchstart", alTocar);
        window.removeEventListener("touchmove", alArrastrar);
        window.removeEventListener("keydown", alTeclear);
        girar?.kill();
      };
    });

    return () => {
      mm.revert();
      navClaro.kill();
      va.pause();
      vb.pause();
      document.documentElement.classList.remove("nav-claro");
    };
  }, [src.a, src.b, vertical, quieto]);

  /** Pausa o reanuda los videos (WCAG 2.2.2). Solo aparece al llegar con el teclado: no es un control visible. */
  function alternarVideos() {
    const el = raiz.current;
    if (!el) return;
    const nuevo = !pausadoRef.current;
    pausadoRef.current = nuevo;
    setPausado(nuevo);
    el.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (nuevo) v.pause();
      else if (v.getAttribute("src") && parseFloat(getComputedStyle(v).opacity) > 0.05)
        void v.play().catch(() => undefined);
    });
  }

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

      {!quieto && (
        <button
          type="button"
          className="hero__pausa"
          aria-pressed={pausado}
          aria-label={pausado ? "Reanudar los videos de la portada" : "Pausar los videos de la portada"}
          onClick={alternarVideos}
        >
          {pausado ? "Reanudar videos" : "Pausar videos"}
        </button>
      )}

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
