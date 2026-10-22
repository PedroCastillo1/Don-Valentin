/** Título y descripción de cada página pública (los usan el sitio, el sitemap y el armado para Vercel). */
export interface PaginaPublica {
  titulo: string;
  descripcion: string;
  /** Imagen de la portada (su LCP): se precarga en el HTML de la página. Foto = número de foto con srcset. */
  portada?: { poster: string } | { foto: number };
}

export const PAGINAS_PUBLICAS: Record<string, PaginaPublica> = {
  "/": {
    titulo: "Don Valentín · Parrilla libre en San Miguel",
    descripcion:
      "Don Valentín, parrilla familiar en San Miguel desde 1994. Parrilla libre en el salón. Reservá tu mesa.",
  },
  "/carta": {
    titulo: "Carta y precios · Don Valentín",
    descripcion:
      "La carta completa de Don Valentín con precios: carnes a la parrilla, minutas, pastas, postres y bebidas.",
    portada: { poster: "/media/video/reel-1.webp" },
  },
  "/parrilla-libre": {
    titulo: "Parrilla libre · Don Valentín",
    descripcion:
      "Cómo funciona la parrilla libre de Don Valentín en San Miguel: qué incluye cada fórmula y su precio por persona.",
    portada: { foto: 1 },
  },
  "/reservar": {
    titulo: "Reservar mesa · Don Valentín",
    descripcion: "Reservá tu mesa en Don Valentín: elegí día, horario y cuántos son, y te guardamos el lugar.",
    portada: { poster: "/media/video/reel-3.webp" },
  },
  "/como-llegar": {
    titulo: "Cómo llegar · Don Valentín",
    descripcion:
      "Don Valentín está en Av. Pres. Arturo Umberto Illia 3873, San Miguel. Mapa, referencias y cómo llegar.",
    portada: { poster: "/media/video/brasas.webp" },
  },
};
