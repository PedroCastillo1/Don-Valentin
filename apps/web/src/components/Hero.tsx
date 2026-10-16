import { useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LOCAL } from "@dv/shared";
import { estadoDelLocal } from "../lib/horario.ts";
import "../styles/hero.css";

gsap.registerPlugin(ScrollTrigger);

/** Hero de Don Valentín: la parrillada circular real como "brasero" que se abre hacia el asador. */
export function Hero() {
  const raiz = useRef<HTMLElement>(null);
  const estado = useMemo(() => estadoDelLocal(), []);

  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(el);
      // Entrada: el texto sube con escalonado y el disco gira desde la brasa.
      const entrada = gsap.timeline({ defaults: { ease: "power3.out" } });
      entrada
        .from(q("[data-in]"), { y: 28, opacity: 0, duration: 0.9, stagger: 0.09 })
        .from(q(".hero__disco"), { scale: 0.86, opacity: 0, duration: 1.3 }, 0)
        .from(q(".hero__anillo"), { rotate: -40, opacity: 0, duration: 1.6 }, 0.1);

      gsap.to(q(".hero__disco-img"), { rotate: 360, duration: 220, ease: "none", repeat: -1 });
      gsap.to(q(".hero__anillo"), { rotate: 360, duration: 90, ease: "none", repeat: -1 });

      // Scroll: la brasa se abre en círculo y deja ver el asador a pantalla completa.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=140%",
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (st) => document.documentElement.classList.toggle("nav-claro", st.progress > 0.55),
        },
      });
      tl.to(q(".hero__texto"), { y: -60, opacity: 0, duration: 0.35, ease: "power2.in" }, 0)
        .to(q(".hero__ticket"), { opacity: 0, duration: 0.2 }, 0)
        .to(q(".hero__disco"), { scale: 1.12, duration: 0.5, ease: "power1.in" }, 0)
        .fromTo(
          q(".hero__asador"),
          { clipPath: "circle(0% at var(--cx) var(--cy))" },
          { clipPath: "circle(150% at var(--cx) var(--cy))", duration: 0.75, ease: "power2.inOut" },
          0.1,
        )
        .fromTo(q(".hero__asador-img"), { scale: 1.25 }, { scale: 1, duration: 0.75, ease: "power2.out" }, 0.1)
        .fromTo(
          q(".hero__asador-texto > *"),
          { y: 36, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.08 },
          0.7,
        );
    });
    return () => {
      mm.revert();
      document.documentElement.classList.remove("nav-claro");
    };
  }, []);

  return (
    <section ref={raiz} className="hero" aria-label="Don Valentín, parrilla en San Miguel">
      <div className="hero__fondo" aria-hidden="true" />

      <div className="hero__escena">
        <div className="hero__texto">
          <p className="hero__ojo" data-in>
            San Miguel · desde {LOCAL.desde}
          </p>
          <h1 className="hero__titulo" data-in>
            La parrilla de siempre, <span>con la mesa puesta.</span>
          </h1>
          <p className="hero__bajada" data-in>
            Parrilla libre en el salón, a cargo de la misma familia desde {LOCAL.desde}. Elegí el día y el horario y te
            guardamos tu lugar.
          </p>
          <div className="hero__acciones" data-in>
            <Link className="btn btn--brasa" to="/reservar">
              Reservar mesa
            </Link>
            <Link className="btn" to="/carta">
              Ver la carta
            </Link>
          </div>
        </div>

        <div className="hero__brasero" data-in>
          <svg className="hero__anillo" viewBox="0 0 400 400" aria-hidden="true">
            <defs>
              <path id="circ" d="M200,200 m-184,0 a184,184 0 1,1 368,0 a184,184 0 1,1 -368,0" />
            </defs>
            <text>
              <textPath href="#circ" startOffset="0">
                PARRILLA LIBRE · SAN MIGUEL · DESDE {LOCAL.desde} · A LAS BRASAS · EN FAMILIA ·
              </textPath>
            </text>
          </svg>
          <div className="hero__disco">
            <img
              className="hero__disco-img"
              src="/media/foto-6-900.webp"
              srcSet="/media/foto-6-900.webp 900w, /media/foto-6-1600.webp 1600w"
              sizes="(min-width: 900px) 46vw, 80vw"
              width={900}
              height={600}
              alt="Parrillada circular del salón con achuras, pollo, cortes y verduras sobre las brasas"
              fetchPriority="high"
            />
          </div>
        </div>

        <aside className="hero__ticket" data-in aria-label="Horario y ubicación">
          <p className="hero__ticket-estado">
            <span className={estado.abierto ? "punto punto--on" : "punto"} aria-hidden="true" />
            {estado.texto}
          </p>
          <p>
            {LOCAL.direccion}, {LOCAL.localidad}
          </p>
        </aside>
      </div>

      <div className="hero__asador" aria-hidden="false">
        <img
          className="hero__asador-img"
          src="/media/foto-5-1600.webp"
          srcSet="/media/foto-5-900.webp 900w, /media/foto-5-1600.webp 1600w"
          sizes="100vw"
          width={1600}
          height={1054}
          alt="El asador del local preparando costillares a la estaca sobre fuego de leña"
          loading="lazy"
        />
        <div className="hero__asador-velo" aria-hidden="true" />
        <div className="hero__asador-texto">
          <p className="hero__ojo hero__ojo--claro">El asador, a la vista</p>
          <h2>Costillares a la estaca, sobre fuego de leña.</h2>
          <Link className="btn btn--claro" to="/parrilla-libre">
            Cómo funciona la parrilla libre
          </Link>
        </div>
      </div>
    </section>
  );
}
