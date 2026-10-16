# Dirección artística — Don Valentín (v2, 15/10/2026)

Sustituye a la v0 ("la brasa que se abre", papel cálido + Caprasimo). La v0 se conserva en `docs/evidencias/iteracion-2/direccion-artistica-v1.md`.
**Por qué cambia:** Martín revisó las capturas de la v0 (reconoció tipografía, fotos reales, redacción argentina y organización) y pidió una dirección más ambiciosa. Impeccable y Frontend Design coinciden en que "papel cálido + serif + terracota" es el look por defecto de 2026, así que se abandonó.

## Idea: el fuego visto a través de la parrilla
El hero se ve como se ve el fuego en el local: **a través de las barras de hierro**. Al cargar, columnas de carbón caen sobre el video del fuego y dejan ranuras encendidas; una comanda (ticket con perforaciones y estado real abierto/cerrado) es lo único que se lee. Con el scroll las barras se abren, el fuego ocupa la pantalla, pasa a un segundo video y una **persiana de tiras** trae la foto del asador. La forma (barras verticales) vuelve en el nav, el admin y los separadores; no es decoración suelta.
**No es:** texto a la izquierda + imagen circular, tres columnas con imágenes, plantilla oscura con tipografía gigante, ni el prototipo rechazado.

## Sistema
- **Color** ("ceniza y brasa", estrategia de paleta completa con roles): carbón `#17100c` (hierro, texto), brasa `#e8481a` (bandas y acciones a pleno), ceniza `#e9eaec` (lectura; gris frío a propósito, no beige), humo `#565d66`, malbec `#4b1424`, mármol `#3d5a47` (estado libre). Texto sobre brasa siempre en carbón (≥ 5:1).
- **Tipografía:** Big Shoulders Display (condensada, de chapa/cartel; títulos en mayúscula, tope 6 rem) + Instrument Sans (texto) + IBM Plex Mono (comanda, datos, códigos).
- **Botones:** brasa con borde y sombra dura de carbón (se "hunde" al presionar).
- **Medios:** 12 videos en `D:\don valentin\fotos y videos` (clips de parrilla/brasas). Recodificados a H.264 sin audio: horizontales 1280×720 y verticales 540×960, 0,4–1,6 MB cada uno, con póster WebP. En el hero solo carga el primero al terminar la carga de la página; el segundo cuando el scroll se acerca; todos se pausan fuera de pantalla. Con `prefers-reduced-motion` o ahorro de datos no se descarga ningún video y queda el póster.
- **Motion** (GSAP + ScrollTrigger, scrub): 1 entrada (barras caen, comanda sube) → 2 barras se abren desde el centro (video A a pantalla completa, push lento) → 3 rótulo "A las brasas, todos los días." → 4 fundido al video B con el precio real de la parrilla libre → 5 persiana de tiras con la foto del asador (clip-path, tiras que suben de izquierda a derecha) → 6 pausa final y se suelta el pin. Vertical (celular): 5 barras, videos verticales, comanda a todo el ancho, recorrido más corto (3 alturas de pantalla).
- **Home:** hero · cinta estática con datos reales (nada corre solo) · "Del fuego a la mesa" (mosaico de 5 videos) · "Lo que tenés que saber" (libro de cuentas sobre brasa) · cierre con brasas · pie.
- **Páginas interiores:** banda brasa con título grande; Reservar y Cómo llegar llevan el fuego al lado (video).
- **Admin** (referencias POS/SaaS de Martín: PosyMart y dashboard médico): rail de carbón con íconos y activo en brasa; tarjetas de indicadores (reservas, personas con % de aforo, mesas con sesión, franja más cargada); **"Pulso del día"** reemplaza las barras de aforo: curva de personas vs. aforo por franja, anillo de ocupación y estado (Con lugar / Se está llenando / Casi completa / Completa) con foco por teclado; reservas con etiqueta de estado; salón con capacidad; "Próximos módulos" con "Programado para el Hito N — dd/mm/aaaa". En celular: barra de navegación inferior y tablas con scroll interno.
- **Login:** brasas en video a un lado, formulario con mostrar/ocultar contraseña, aviso de mayúsculas, error genérico ("Usuario o contraseña incorrectos.") sin revelar qué campo falló, clave borrada tras el error, estado "Ingresando…". La seguridad no cambió (misma API, CSRF, bloqueo y rate limit).

## Uso de las skills (evidencia)
- **Frontend Design:** brief → plan de tokens y wireframe → revisión contra los tres "looks por defecto" → se descartó la v0 (cream + serif + terracota) y la plantilla oscura con acento neón.
- **Impeccable:** reglas de color/tipografía/movimiento aplicadas al plan (sin cream, sin glass, sin side-stripe, display ≤ 6 rem, sin hero-métrica); detector `impeccable detect` contra las páginas en vivo: 10 hallazgos en la primera corrida (texto < 11 px, marquee infinito, 3 kickers sobre h1) → corregidos → corrida final limpia (`docs/evidencias/iteracion-2/impeccable-detect.txt`).
- **UI/UX Pro Max y web-design-guidelines:** jerarquía y estados del dashboard (KPIs, gráfico con alternativa accesible, estados vacíos/errores), navegación móvil inferior, áreas táctiles ≥ 40 px, foco visible, contraste verificado con axe (WCAG 2.2 AA, 0 violaciones en desktop y móvil).
- **don-valentin-motion / -media / -copywriting:** `prefers-reduced-motion`, limpieza de timelines (`gsap.matchMedia` + revert), pausa de videos fuera de pantalla, voseo y textos cortos, sin rellenos prohibidos.

## Datos y textos
Todo dato operativo viene de la API o de `@dv/shared`/carta real (precio desde $41.000, horario 12:00–02:00, dirección, teléfonos). Los datos del panel en el ambiente de desarrollo son **de prueba**: nombres con "(prueba)", teléfonos 11 5555-01xx, rotulados como "Ambiente de prueba". El aforo (100 por franja) está marcado como provisorio. Se quitó del formulario de reserva una regla de "más de 12 personas" que no figura en ningún documento.

## Pendientes de derechos (no bloquean N3, sí la publicación real)
- Los 12 videos tienen nombres de banco de videos (patrón de Pexels, que permite uso comercial sin atribución, pero hay que confirmar la fuente y que se descargaron de ahí). **No son imágenes del local**: mostrarlos como "Del fuego a la mesa" sin aclararlo podría inducir a error sobre lo que se sirve; reemplazarlos por material propio cuando exista. Se evitó el clip con una persona identificable (parrillero con boina).
- Foto 5 (asador con un empleado) y fotos 1, 4, 7: confirmar autorización de imagen antes de publicar.

## Evidencia
`docs/evidencias/iteracion-2/`: capturas por etapa, secuencia del hero (desktop y móvil), admin (desktop y móvil), **videos** de la secuencia y del login→dashboard, Lighthouse, detector de Impeccable.

## v3 (15/10/2026, tercera iteración)
- Consistencia: todo el sitio usa el mismo lenguaje que el hero (ceniza/brasa, sombra dura desplazada, comandas con muesca, barras de parrilla, tipografía Big Shoulders / Instrument Sans / IBM Plex Mono).
- Hero: 4 paradas (inicio, fuego, mesa, asador); un gesto = una parada; riel de pasos; sin barrido accidental por scroll rápido.
- "Del fuego a la mesa": capítulos con aire, un video protagonista, fotos fijas y texto; sin collage.
- Precio: "desde $41.000 por persona" contextualizado junto a la otra fórmula, confirmado por Martín.
- Cómo llegar: mapa propio (SVG desde OSM), referencias con distancias aproximadas, Google Maps como acceso secundario.
- Impeccable 4.6.0 sobre las 5 páginas públicas en escritorio y móvil: limpio tras corregir crédito del mapa (<11 px) y dirección en mayúsculas. Evidencia: `docs/evidencias/impeccable-iteracion3-inicial.txt` (hallazgos previos a la corrección).
