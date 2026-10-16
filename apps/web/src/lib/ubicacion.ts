import { LOCAL } from "@dv/shared";
import { MAPA } from "./mapa-datos.ts";

/** Ubicación del local según OpenStreetMap (way 1463836465, Av. Illia 3873). El mapa se dibuja en metros con el local en (0, 0). */
export const UBICACION = { lat: -34.5319148, lon: -58.7030733 } as const;

const consulta = encodeURIComponent(`${LOCAL.nombre}, ${LOCAL.direccion}, ${LOCAL.localidad}`);
export const URL_MAPS = `https://www.google.com/maps/search/?api=1&query=${consulta}`;
export const URL_RUTA_SIMPLE = `https://www.google.com/maps/dir/?api=1&destination=${UBICACION.lat},${UBICACION.lon}`;

/** Distancia en línea recta desde el local, redondeada a 10 m. */
export const distancia = (xy: readonly [number, number] | readonly number[]): number =>
  Math.round(Math.hypot(xy[0] ?? 0, xy[1] ?? 0) / 10) * 10;

export interface Referencia {
  id: "terrazas" | "parada" | "estacion";
  nombre: string;
  detalle: string;
  xy: readonly [number, number];
  metros: number;
}

const p = MAPA.poi;
export const REFERENCIAS: Referencia[] = [
  {
    id: "terrazas",
    nombre: "Shopping Terrazas de Mayo",
    detalle: "Del otro lado de la avenida",
    xy: [p.terrazas[0], p.terrazas[1]],
    metros: distancia(p.terrazas),
  },
  {
    id: "parada",
    nombre: "Parada «Lemos / Ruta 8»",
    detalle: "Colectivos, sobre la Av. Lemos",
    xy: [p.parada[0], p.parada[1]],
    metros: distancia(p.parada),
  },
  {
    id: "estacion",
    nombre: "Estación General Lemos",
    detalle: "Tren, línea Urquiza",
    xy: [p.estacion[0], p.estacion[1]],
    metros: distancia(p.estacion),
  },
];
export const METROS_BINDA = distancia(p.binda);
