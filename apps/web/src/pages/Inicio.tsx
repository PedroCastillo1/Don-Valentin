import { SiteNav } from "../components/SiteNav.tsx";
import { Hero } from "../components/Hero.tsx";
import { Cinta, Fuego, Esencial, CierreReserva } from "../components/HomeSecciones.tsx";
import { Pie } from "../components/Pie.tsx";

export default function Inicio() {
  return (
    <>
      <SiteNav />
      <main id="contenido">
        <Hero />
        <Cinta />
        <Fuego />
        <Esencial />
        <CierreReserva />
      </main>
      <Pie />
    </>
  );
}
