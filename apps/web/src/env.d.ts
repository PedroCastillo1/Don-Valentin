/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Vista previa en un solo archivo (sin API). */
  readonly VITE_PREVIEW?: string;
  /** ID de medición de Google Analytics 4 del local (G-XXXXXXX). Vacío = sin GA4, solo la medición propia. */
  readonly VITE_GA4_ID?: string;
  /** URL pública del sitio, base de las canónicas y del sitemap. */
  readonly VITE_SITIO_URL?: string;
  /** Código de verificación de Google Search Console (método «etiqueta HTML»). */
  readonly VITE_GSC_VERIFICACION?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
