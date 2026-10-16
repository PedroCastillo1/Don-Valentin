import { Cinta, Fuego, Precios, Ubicacion, CierreReserva } from "./HomeSecciones.tsx";

/** Todo lo que está debajo de la portada: se carga aparte para que el hero sea lo primero que se descarga. */
export default function HomeResto() {
  return (
    <>
      <Cinta />
      <Fuego />
      <Precios />
      <Ubicacion />
      <CierreReserva />
    </>
  );
}
