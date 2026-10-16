# GEMINI.md — instrucciones para Gemini CLI

Este archivo solo agrega lo propio de Gemini. Las reglas son las mismas que para Claude y viven en **`AGENTS.md`** (no se duplican acá). Al iniciar cada sesión seguí el protocolo de `AGENTS.md`: este archivo → `AGENTS.md` → `PROJECT_STATUS.md` → `HANDOFF.md` → verificar el código real → ver qué pruebas pasan → continuar con la "próxima acción exacta".

- Respetá el cronograma v4 (CR-009), el alcance hasta N3 (20/10), la identidad argentina, la dirección artística de `docs/direccion-artistica.md`, y los criterios de seguridad, rendimiento, SEO y testing de `AGENTS.md`.
- Equivalencias de capacidades: para revisión visual usá Playwright (`npx playwright`, capturas desktop 1440 / móvil 390 / reduced-motion); para accesibilidad `axe-core`; para rendimiento Lighthouse; para documentación actualizada de librerías, la documentación oficial (Context7 solo si está autorizado).
- Si Gemini ya tenía configuración en este proyecto (`.gemini/`, `GEMINI.md` previo), **revisala antes de reemplazar nada** y conservá lo que no contradiga `AGENTS.md`.
- Al cerrar tu turno actualizá `PROJECT_STATUS.md` y `HANDOFF.md`. No trabajes sobre archivos que el otro agente marcó como EN CURSO.
