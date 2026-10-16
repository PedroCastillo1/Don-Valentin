# Lighthouse — medición informativa (15/10/2026, móvil simulado, build local servida por Express, sin HTTP/2 ni CDN)
| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Inicio | 75 | 100 | 96 | 100 | 4,9 s | 0,002 |
| Carta | 82 | 100 | 96 | 100 | 3,9 s | 0,002 |
| Reservar | 83 | 100 | 96 | 100 | 3,8 s | 0,046 |
Antes de separar el código por ruta y quitar la consulta de sesión del sitio público: 59–75 / 100 / 92 / 91–92. Línea base del sitio actual del local: 54/57 (Alcance). **Meta RNF-1/RNF-2 (≥90 / ≥95) se mide en H5 (13/11) en ambiente de prueba**; el rendimiento todavía no llega a 90 (bundle base de 260 kB, hero con imagen de 149 kB). Los JSON crudos están en esta carpeta.
