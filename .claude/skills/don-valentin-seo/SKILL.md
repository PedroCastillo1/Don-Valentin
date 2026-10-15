---
name: don-valentin-seo
description: SEO técnico, SEO local, datos estructurados (Restaurant/LocalBusiness), analítica y conversión gratuita para el sitio de Don Valentín. Usar al definir metadatos, sitemap, robots, canonicals, schema.org, Open Graph, Google Business Profile, eventos de analítica o revisar visibilidad.
---

# Don Valentín — SEO y analítica

Objetivo: que quien busque "parrilla en San Miguel" o el nombre del local encuentre información correcta y pueda reservar. Solo acciones gratuitas. Para auditorías más profundas usar las skills `seo-aeo-geo-ultimate:*` disponibles.

## Reglas duras
1. **Cero datos inventados**: dirección, teléfono, horarios, rango de precios, cocina, coordenadas, redes y reseñas salen del cliente. Hasta tenerlos, el schema se genera con campos vacíos omitidos, nunca con valores de relleno.
2. El marcado debe coincidir con el contenido visible. No marcar reseñas, calificaciones ni horarios que la página no muestre.
3. No prometer posiciones, tráfico ni "rich results". No inventar métricas.
4. No contratar anuncios, herramientas ni servicios pagos sin autorización.

## Checklist técnico (se verifica con el sitio corriendo)
- Una URL canónica por página (`<link rel="canonical">`), https, sin duplicados con/sin barra final.
- `<title>` único (≤ 60 caracteres aprox.) y `meta description` útil (≤ 155) por página, en español argentino.
- `robots.txt` y `sitemap.xml` generados desde las rutas reales; el panel administrativo y las rutas privadas con `noindex` **y** protegidas por autenticación (noindex no es seguridad).
- Encabezados: un `h1` por página, jerarquía lógica, `lang="es-AR"` en `<html>`.
- Open Graph y Twitter Card con imagen real del local (derivada, 1200×630).
- Enlaces internos con texto descriptivo; carta y reservas a un clic desde el inicio.
- Páginas de estado (404/500) con `noindex` y código HTTP correcto.
- Rendimiento y accesibilidad forman parte del SEO: medir con Lighthouse y no declarar cumplidos los Core Web Vitals sin medición.

## SEO local
- Perfil de Google Business Profile: **requiere cuenta y verificación del dueño**; no se puede crear ni reclamar desde el código. Lo preparamos como lista de datos para cargar: nombre exacto, categoría, dirección, teléfono, horarios, enlace de reservas, fotos reales.
- NAP (nombre, dirección, teléfono) idéntico en sitio, perfil y directorios.
- Página de ubicación con dirección en texto, mapa y cómo llegar.
- Google Search Console y Bing Webmaster Tools: requieren verificación de dominio por el dueño (registro DNS o archivo). Documentar como pendiente.

## Datos estructurados
`Restaurant` (subtipo de `LocalBusiness`) en JSON-LD, solo con campos confirmados: `name`, `address`, `telephone`, `openingHoursSpecification`, `servesCuisine`, `url`, `image`, `acceptsReservations`, `menu` (URL de la carta). `priceRange` solo si el dueño lo confirma. Validar con el validador de Schema.org y la prueba de resultados enriquecidos, y anotar la fecha de la validación.

## Analítica y conversión
- Embudo principal: visita → ve la carta → inicia reserva → reserva validada.
- Eventos mínimos: `reserva_iniciada`, `reserva_enviada`, `reserva_confirmada`, `reserva_error`, `clic_telefono`, `clic_como_llegar`, `carta_vista`.
- Privacidad: sin datos personales en eventos (ni nombre, ni email, ni teléfono); informar el uso de analítica; preferir herramienta sin cookies o con consentimiento. La herramienta concreta la decide el equipo.
- Conversión: formulario de reserva corto (fecha, hora, personas, nombre, contacto), errores en línea en voseo, confirmación clara. Los experimentos se plantean con una hipótesis y una métrica; con el tráfico de un restaurante, los resultados pueden no ser concluyentes: decirlo.

## Cuentas externas que hacen falta (todas del dueño)
Dominio y DNS (donvalentinparrilla.com.ar figura en el relevamiento del equipo: confirmar titularidad), Google Business Profile, Search Console, Bing Webmaster, herramienta de analítica elegida.
