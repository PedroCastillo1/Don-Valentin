import { SiteNav } from "../components/SiteNav.tsx";
import { Hero } from "../components/Hero.tsx";
import { Cinta, Fuego, Precios, Ubicacion, CierreReserva } from "../components/HomeSecciones.tsx";
import { Pie } from "../components/Pie.tsx";

export default function Inicio() {
  return (
    <>
      <SiteNav />
      <main id="contenido">
        <Hero />
        <Cinta />
        <Fuego />
        <Precios />
        <Ubicacion />
        <CierreReserva />
      </main>
      <Pie />
    </>
  );
}
