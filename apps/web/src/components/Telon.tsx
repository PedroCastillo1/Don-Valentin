import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Transición entre páginas: al cambiar de ruta, un telón brasa con la marca cubre la pantalla y se levanta
 * revelando la página nueva. En la primera carga no aparece (el hero tiene su propia entrada). Sin movimiento, nada.
 */
export function Telon() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const primera = useRef(true);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (primera.current) {
      primera.current = false;
      return;
    }
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap
      .timeline({ onComplete: () => ScrollTrigger.refresh() })
      .set(el, { display: "grid", yPercent: 0 })
      .fromTo(
        el.querySelector("p"),
        { y: 0, opacity: 1 },
        { y: -40, opacity: 0, duration: 0.35, ease: "power2.in" },
        0.2,
      )
      .to(el, { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, 0.3)
      .set(el, { display: "none" });
    return () => {
      tl.kill();
      gsap.set(el, { display: "none" });
    };
  }, [pathname]);
  return (
    <div ref={ref} className="telon" aria-hidden="true">
      <p>Don Valentín</p>
    </div>
  );
}
