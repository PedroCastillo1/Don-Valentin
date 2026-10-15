---
name: don-valentin-motion
description: "Sistema de movimiento de Don Valentín Digital con GSAP, ScrollTrigger, View Transitions y SVG: principios, coreografía, accesibilidad (reduced motion), limpieza de timelines y prueba en navegador. Usar al diseñar o implementar cualquier animación, transición, loader, microinteracción o secuencia de scroll, en la web pública o el administrador."
---

# Don Valentín — Motion

El movimiento cuenta algo de una parrilla: fuego, brasa, humo, mesa servida. Si una animación no comunica, orienta o da feedback, se saca.

## Principios
1. **Propósito**: cada animación responde a una de tres preguntas: ¿dónde estoy?, ¿qué cambió?, ¿qué sigue? Decorativo puro, solo en la web pública y con presupuesto de rendimiento.
2. **Un lenguaje, no un catálogo**: definir tokens y reutilizarlos. Duraciones: micro 120–200 ms, UI 250–400 ms, escena 600–1200 ms. Easings: uno de entrada (`power3.out`), uno de salida (`power2.in`), uno expresivo (`expo.inOut`) para escenas. Nada de bounce.
3. **Coreografía**: jerarquía temporal. Primero lo que ancla (tipografía/imagen), después lo secundario con stagger corto (40–80 ms). Máximo 3 elementos protagonistas en simultáneo.
4. **Público vs administrador**: público expresivo; administrador discreto (≤200 ms, sin parallax, sin scroll storytelling). En operación (cocina, salón) el movimiento nunca retrasa una acción.
5. **Prohibido**: scroll hijacking, bloquear scroll para esperar una animación, loaders que fingen progreso, `fadeIn+scale` como único recurso.

## Elección de herramienta
- Secuencias y scroll narrativo: GSAP + ScrollTrigger (`gsap.context`, `ScrollTrigger.matchMedia`/`gsap.matchMedia`).
- Cambios de vista y elementos compartidos: View Transitions API (nativa) o `<ViewTransition>` de React si el stack lo permite; siempre con fallback sin animación.
- Microinteracciones simples: CSS (`transform`, `opacity`, `clip-path`) antes que JS.
- SVG/máscaras: animar `clip-path`, `mask`, `stroke-dashoffset`; no animar `filter` pesado en móviles.
- Lenis u otro smooth scroll: solo con necesidad demostrada y desactivado con reduced motion.
- **Verificar la API en la documentación de la versión instalada (Context7) antes de usarla.** No inventar plugins ni parámetros; varios plugins de GSAP cambiaron de licencia/paquete: comprobar qué trae la versión instalada.

## Accesibilidad
- `prefers-reduced-motion: reduce`: reemplazar movimiento por cambios de opacidad instantáneos o breves; sin parallax, sin autoplay de video con movimiento fuerte, sin scrub.
- Implementar con `gsap.matchMedia()` condicionando por `(prefers-reduced-motion: no-preference)`.
- Todo contenido debe estar visible y operable si el JS de animación falla.
- Nada que parpadee más de 3 veces por segundo. Foco visible y no tapado por animaciones.
- Control de pausa para cualquier movimiento autónomo de más de 5 s (video del hero incluido).

## Ciclo de vida y fugas de memoria
- Crear animaciones dentro de `gsap.context()` y llamar `ctx.revert()` al desmontar.
- Matar `ScrollTrigger` creados (`kill()`) al cambiar de ruta; `ScrollTrigger.refresh()` tras cargar imágenes/fuentes.
- Quitar listeners de `pointermove`/`resize`; usar `requestAnimationFrame`/`gsap.ticker`, no `setInterval`.
- Animar solo `transform` y `opacity`; `will-change` puntual y se retira al terminar. Evitar layout thrash.

## Cómo se prueba (obligatorio)
1. Ejecutar la página real en Playwright (Chromium) a 1440×900 y 390×844.
2. Capturar frames en puntos de la línea de tiempo (inicio, 50 %, fin) y comparar con lo esperado.
3. Repetir con `reducedMotion: 'reduce'` y confirmar que el contenido sigue visible.
4. Medir: sin errores en consola, CLS ≤ 0,1, sin tareas largas > 50 ms durante la animación (Performance trace).
5. Recorrer 20 navegaciones seguidas y verificar que no crece el número de ScrollTriggers ni de listeners.
Una animación no se declara lista sin esas evidencias.

## Evaluación visual
Mirar las capturas, no el código. Preguntas: ¿se entiende sin sonido ni texto?, ¿el ojo sabe a dónde ir?, ¿se parece a algo genérico de plantilla? Si sí a lo último, rehacer.
