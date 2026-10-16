import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll suave de todo el sitio: la rueda y el touchpad se interpolan un poco (más lento y más parejo que el
 * nativo, sin llegar a frenar). En pantallas táctiles queda el scroll nativo. Con movimiento reducido no se usa.
 */
let lenis: Lenis | null = null;

export function iniciarScrollSuave() {
  if (lenis || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.8,
    touchMultiplier: 1,
    smoothWheel: true,
    allowNestedScroll: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/** Lleva el scroll a una posición, respetando el scroll suave si está activo. */
export function scrollA(top: number, opciones: { inmediato?: boolean } = {}) {
  if (lenis) lenis.scrollTo(top, { immediate: opciones.inmediato ?? false, duration: 1.1, force: true });
  else window.scrollTo({ top, behavior: opciones.inmediato ? "auto" : "smooth" });
}
