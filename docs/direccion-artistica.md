# Dirección artística — Don Valentín (v0, a revisar por Martín)

**Idea:** *la brasa que se abre*. La web arranca sobre papel de carta cálido con la parrillada circular real del salón como "brasero" (un círculo que gira despacio, rodeado por un anillo de texto) y, al desplazarse, el círculo se expande hasta mostrar el asador a pantalla completa. El círculo no es decoración: es la forma real de la parrilla del local.
**No es:** hero de tres columnas con imágenes, plantilla oscura con tipografía gigante, ni el prototipo anterior rechazado.

**Color** (sacado de las fotos oficiales): papel `#f2eadb`, tinta `#231a14`, brasa `#c4421a`, brasa oscura `#8e2b0e`, mármol verde `#3d5a47` (mesas), malbec `#4a1b24`.
**Tipografía:** Caprasimo (títulos, tono de cartel de parrilla de barrio) + Instrument Sans (texto). Tamaños moderados; el título no grita.
**Motion:** GSAP + ScrollTrigger; entrada escalonada, giro lento del brasero, apertura circular con scrub. `prefers-reduced-motion`: sin giro ni pin, estado final legible. Nada decorativo que bloquee lectura o foco.
**Elementos de marca:** "comanda" (ticket con borde punteado con estado real abierto/cerrado), brasas como medidor de aforo en el admin, mapa de mesas en mármol verde y brasa.
**Admin:** riel oscuro de carbón con acento brasa, contenido sobre papel; módulos futuros con hito y fecha exactos. Cada pantalla trabaja con datos reales de la API.
**Medios:** solo fotos oficiales por ahora. Videos: no publicar hasta confirmar licencia (nombres tipo stock) y derechos de imagen de personas. Foto del asador (foto 5) muestra a un empleado: confirmar autorización antes de publicar.
**Estado de revisión:** primer prototipo (hero + inicio del admin) entregado como capturas en `docs/evidencias/n3-checkpoint/`; se espera el visto bueno antes de extender a toda la web.
