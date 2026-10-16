import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

/**
 * Transición entre páginas: al cambiar de ruta, un telón brasa con la marca cubre la pantalla y se levanta
 * revelando la página nueva. En la primera carga no aparece (el hero tiene su propia entrada). Sin movimiento, nada.
 * En el panel aparece una sola vez (al entrar o al ingresar): entre secciones del panel no se repite.
 */
const enPanel = (ruta: string) => ruta.startsWith("/admin") && !ruta.startsWith("/admin/ingresar");

export function Telon() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const primera = useRef(true);
  const anterior = useRef(pathname);
  useLayoutEffect(() => {
    const previa = anterior.current;
    anterior.current = pathname;
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (enPanel(previa) && enPanel(pathname)) {
      window.scrollTo(0, 0);
      return;
    }
    window.scrollTo(0, 0);
    void import("../lib/scroll.ts").then((m) => m.scrollA(0, { inmediato: true }));
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.display = "grid"; // cubre ya; la animación de salida llega con GSAP
    let tl: { kill: () => void } | null = null;
    let cancelado = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelado) return;
      tl = gsap
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
    });
    return () => {
      cancelado = true;
      tl?.kill();
      el.style.display = "none";
    };
  }, [pathname]);
  return (
    <div ref={ref} className="telon" aria-hidden="true">
      <p>Don Valentín</p>
    </div>
  );
}
