import { Fragment, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SiteNav } from "./SiteNav.tsx";
import { Pie } from "./Pie.tsx";
import { LOCAL } from "@dv/shared";
import { estadoDelLocal } from "../lib/horario.ts";
import { VideoLoop } from "./VideoLoop.tsx";

gsap.registerPlugin(ScrollTrigger);

/** Imagen o video de portada de cada página. */
export type MedioPortada =
  | { tipo: "foto"; n: number; alt: string; posicion?: string }
  | { tipo: "video"; src: string; poster: string; posicion?: string };

/**
 * Página pública con portada cinematográfica: el medio ocupa la cabecera, el título sube palabra por palabra
 * y, al bajar, la imagen se aleja más lento que el texto. El cuerpo aparece por bloques cuando entra en pantalla.
 * Sin movimiento, todo queda visible y quieto.
 */
export function PaginaPublica({
  titulo,
  ojo,
  children,
  ancha = false,
  medio,
}: {
  titulo: string;
  ojo?: string;
  children: ReactNode;
  ancha?: boolean;
  medio?: MedioPortada;
}) {
  const e = estadoDelLocal();
  const raiz = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const mm = gsap.matchMedia(el);
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const cab = el.querySelector<HTMLElement>(".pag__cab")!;
      gsap.from(el.querySelectorAll(".pag__w > span"), {
        yPercent: 110,
        duration: 1.1,
        stagger: 0.07,
        ease: "power4.out",
        delay: 0.15,
      });
      gsap.from(el.querySelectorAll(".pag__sub, .pag__estado"), {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        delay: 0.45,
        ease: "power3.out",
      });
      const fondo = el.querySelector(".pag__fondo");
      if (fondo) {
        gsap.fromTo(fondo, { scale: 1.18 }, { scale: 1, duration: 1.8, ease: "power3.out" });
        gsap.to(fondo, {
          yPercent: 18,
          ease: "none",
          scrollTrigger: { trigger: cab, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(el.querySelector(".pag__tit"), {
          yPercent: -35,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: { trigger: cab, start: "top top", end: "bottom top", scrub: true },
        });
      }
      // Letras de fondo: cada fila corre en sentido contrario a la anterior mientras se baja.
      el.querySelectorAll<HTMLElement>(".pag__fondo-letras p").forEach((p, i) => {
        gsap.fromTo(
          p,
          { xPercent: i % 2 ? -30 : 0 },
          {
            xPercent: i % 2 ? 0 : -30,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 1 },
          },
        );
      });
      // Cuerpo: cada bloque sube al entrar; las fotos se destapan con una máscara.
      const bloques = gsap.utils.toArray<HTMLElement>(el.querySelectorAll(".pag__cuerpo > *:not(.cartapag)"));
      gsap.set(bloques, { y: 48, opacity: 0 });
      ScrollTrigger.batch(bloques, {
        start: "top 92%",
        once: true,
        onEnter: (lote) =>
          gsap.to(lote, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, ease: "power3.out", overwrite: true }),
      });
      el.querySelectorAll<HTMLElement>(".pag__cuerpo figure img").forEach((img) => {
        gsap.fromTo(
          img,
          { clipPath: "inset(12% 12% 12% 12%)", scale: 1.15 },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: img, start: "top 95%", end: "top 35%", scrub: true },
          },
        );
      });
    });
    return () => mm.revert();
  }, []);

  const palabras = titulo.split(" ");
  return (
    <>
      <SiteNav />
      <main id="contenido" className="pag" ref={raiz}>
        <header className={medio ? "pag__cab pag__cab--medio" : "pag__cab"}>
          {medio?.tipo === "foto" && (
            <img
              className="pag__fondo"
              src={`/media/foto-${medio.n}-1600.webp`}
              srcSet={`/media/foto-${medio.n}-900.webp 900w, /media/foto-${medio.n}-1600.webp 1600w`}
              sizes="100vw"
              width={1600}
              height={1066}
              alt={medio.alt}
              fetchPriority="high"
              style={medio.posicion ? { objectPosition: medio.posicion } : undefined}
            />
          )}
          {medio?.tipo === "video" && (
            <>
              <img
                className="pag__fondo pag__fondo--poster"
                src={medio.poster}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                style={medio.posicion ? { objectPosition: medio.posicion } : undefined}
              />
              <VideoLoop className="pag__fondo" src={medio.src} poster={medio.poster} />
            </>
          )}
          <div className="pag__tit">
            <h1 aria-label={titulo}>
              {palabras.map((p, i) => (
                <Fragment key={`${p}-${i}`}>
                  <span className="pag__w" aria-hidden="true">
                    <span>{p}</span>
                  </span>
                  {i < palabras.length - 1 ? " " : null}
                </Fragment>
              ))}
            </h1>
            {ojo && <p className="pag__sub">{ojo}</p>}
          </div>
          <p className="pag__estado">
            <span className={e.abierto ? "punto punto--on" : "punto"} aria-hidden="true" />
            <span>
              <span className="pag__estado-t">{e.texto}</span>
              <br />
              <span className="pag__dir">
                {LOCAL.direccion}, {LOCAL.localidad}
              </span>
            </span>
          </p>
        </header>
        <div className="pag__fondo-letras" aria-hidden="true">
          <p>{`${titulo} · ${titulo} · ${titulo}`}</p>
          <p>{`${titulo} · ${titulo} · ${titulo}`}</p>
          <p>{`${titulo} · ${titulo} · ${titulo}`}</p>
        </div>
        <div className={ancha ? "pag__cuerpo pag__cuerpo--ancha" : "pag__cuerpo"}>{children}</div>
      </main>
      <Pie />
    </>
  );
}
