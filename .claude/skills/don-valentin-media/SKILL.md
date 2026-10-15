---
name: don-valentin-media
description: "Tratamiento de fotos y videos 4K reales de Don Valentín: inspección con ffprobe, derivados web con ffmpeg, posters, imágenes responsive AVIF/WebP, lazy loading, preload y reproducción móvil. Usar al incorporar, convertir, optimizar o publicar cualquier foto o video, especialmente el hero."
---

# Don Valentín — Media

El material real del restaurante es un activo del cliente. No se reemplaza por imágenes generadas ni de stock, y no se inventan escenas.

## Reglas duras
1. **Originales intocables**: viven en `media/originals/` (solo lectura, fuera de git o con Git LFS). Los derivados se generan en `media/derived/` con un script reproducible; nunca se sobrescribe un original.
2. Antes de procesar: `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate,duration -of json <archivo>` y registrar resultado en `media/inventario.md`.
3. No bajar la calidad "por las dudas": definir primero el destino (ancho, dispositivo, conexión) y derivar para eso.
4. Nadie descarga un 4K si no lo necesita: el hero móvil nunca carga el archivo de escritorio.

## Videos (hero y secciones)
Versiones por destino, todas sin audio si el video es ambiental:

| Destino | Resolución | Códec | Objetivo |
|---|---|---|---|
| Móvil | 720×1280 o 1280×720 | H.264 (mp4) | ≤ 2 MB/10 s aprox. |
| Escritorio | 1920×1080 | AV1 o VP9 (webm) + H.264 (mp4) de respaldo | calidad alta, ≤ 8 MB aprox. |
| Pantallas grandes | 2560/3840 | solo si se justifica con medición | carga diferida |

Comando base (ajustar `-crf` mirando el resultado, no a ciegas):
`ffmpeg -i in.mov -an -vf "scale=-2:1080,fps=30" -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart out.mp4`
- `-movflags +faststart` siempre para mp4.
- Corte de loop: verificar que el primer y último frame empalman; si no, recortar o hacer crossfade.
- Poster por cada video: un frame representativo en AVIF/WebP, mismo aspecto, carga con `fetchpriority="high"` en el hero.
- HTML: `<video muted playsinline loop preload="metadata" poster="…">` con `<source>` ordenados de mejor a mejor compatible y `media="(min-width: …)"` por destino. No `autoplay` en conexiones con ahorro de datos (`navigator.connection.saveData`) ni con reduced motion: mostrar el poster.
- Controles discretos y accesibles: botón pausar/reanudar de tamaño táctil mínimo 44 px, con etiqueta, discreto visualmente.

## Imágenes
- Derivados en AVIF y WebP con respaldo JPEG; anchos 480/768/1280/1920/2560; `srcset` + `sizes` correctos.
- Dimensiones `width`/`height` siempre declaradas (evita CLS). `loading="lazy"` salvo la imagen LCP; esa lleva `fetchpriority="high"` y no `lazy`.
- Recorte editorial con `object-position` definido por foto, no automático.
- Texto alternativo descriptivo y real: describir lo que se ve, sin inventar lo que no.
- Metadatos EXIF con ubicación o datos personales: eliminar en derivados.

## Fuentes tipográficas
Autoalojadas, `woff2`, subconjunto latino (incluye á é í ó ú ñ ü ¿ ¡), `font-display: swap`, `preload` solo de la fuente crítica del hero.

## Verificación
- Pesos reales por página en la red (Playwright `page.on('response')`), no estimados.
- LCP medido en móvil con throttling; el video no puede ser el elemento que bloquea el LCP: el poster sí.
- Probar reproducción en Chromium; Safari/iOS queda "no verificado" hasta probar en un dispositivo real.
