import { lazy, Suspense, useEffect, useState } from "react";
import { SiteNav } from "../components/SiteNav.tsx";
import { Hero } from "../components/Hero.tsx";
import { Pie } from "../components/Pie.tsx";

const HomeResto = lazy(() => import("../components/HomeResto.tsx"));

/**
 * Lo que está bajo la portada se monta recién cuando el navegador queda libre (o al primer gesto de scroll):
 * así el primer cuadro solo procesa el hero.
 */
function useMontarDespues() {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (listo) return;
    const ya = () => setListo(true);
    const eventos = ["wheel", "touchstart", "keydown", "scroll"] as const;
    eventos.forEach((e) => window.addEventListener(e, ya, { once: true, passive: true }));
    // Si nadie scrollea, se monta igual a los pocos segundos, en un momento libre del navegador.
    let ric: number | undefined;
    const t = window.setTimeout(() => {
      ric = window.requestIdleCallback?.(ya, { timeout: 2000 });
      if (ric === undefined) ya();
    }, 3000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, ya));
      window.clearTimeout(t);
      if (ric !== undefined) window.cancelIdleCallback(ric);
    };
  }, [listo]);
  return listo;
}

export default function Inicio() {
  const resto = useMontarDespues();
  return (
    <>
      <SiteNav />
      <main id="contenido">
        <Hero />
        <Suspense fallback={<div aria-hidden="true" style={{ minHeight: "100svh" }} />}>
          {resto ? <HomeResto /> : <div aria-hidden="true" style={{ minHeight: "100svh" }} />}
        </Suspense>
      </main>
      <Pie />
    </>
  );
}
