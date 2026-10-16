import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Cinta, Recorrido, Salon, Galeria, Precios, Ubicacion, CierreReserva } from "./HomeSecciones.tsx";

/** Todo lo que está debajo de la portada: se carga aparte para que el hero sea lo primero que se descarga. */
export default function HomeResto() {
  // Las escenas se montan después del hero: recalculamos posiciones cuando terminan de cargar fuentes e imágenes.
  useEffect(() => {
    const refrescar = () => ScrollTrigger.refresh();
    const t = window.setTimeout(refrescar, 300);
    void document.fonts?.ready.then(refrescar);
    window.addEventListener("load", refrescar);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("load", refrescar);
    };
  }, []);
  return (
    <>
      <Cinta />
      <Recorrido />
      <Salon />
      <Precios />
      <Galeria />
      <Ubicacion />
      <CierreReserva />
    </>
  );
}
