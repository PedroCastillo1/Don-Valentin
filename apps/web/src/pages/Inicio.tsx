import { lazy, Suspense } from "react";
import { SiteNav } from "../components/SiteNav.tsx";
import { Hero } from "../components/Hero.tsx";
import { Pie } from "../components/Pie.tsx";

const HomeResto = lazy(() => import("../components/HomeResto.tsx"));

export default function Inicio() {
  return (
    <>
      <SiteNav />
      <main id="contenido">
        <Hero />
        <Suspense fallback={<div aria-hidden="true" style={{ minHeight: "100svh" }} />}>
          <HomeResto />
        </Suspense>
      </main>
      <Pie />
    </>
  );
}
