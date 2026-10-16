# Estado compartido — Claude y Gemini (punto de entrada)
Actualizado: 15/10/2026 por Claude · Responsable: Martín Cabrera

**Orden de lectura al iniciar una sesión:** tu archivo (`CLAUDE.md` / `GEMINI.md`) → `AGENTS.md` (reglas) → `PROJECT_STATUS.md` (estado) → `HANDOFF.md` (último traspaso) → verificar el código en `app/` (`git log`, `npm run verify`).
Cada tipo de información tiene una sola fuente: reglas = `AGENTS.md`; contexto/entorno = `PROJECT_CONTEXT.md`; estado y pruebas = `PROJECT_STATUS.md`; traspaso = `HANDOFF.md`; hitos y trazabilidad = `app/docs/trazabilidad.md`; decisiones = `app/docs/decisiones.md`.

**Línea base v4 vigente** (CR-009 aprobada según confirmación del responsable el 15/10/2026; falta la constancia en el PDF; no se tocaron los originales). H2 16/10 · N3 20/10 (demo funcional) · H3 30/10 · N4 03/11 (a confirmar) · H4 06/11 · H5 13/11 · H6 20/11 · H7 27/11.

**Estado en una línea:** Fase 1 autorizada hasta N3. Código en `app/` (repo git): modelo de datos, API, admin y sitio público funcionando; 36 tests + 24 E2E en verde. Pendiente: visto bueno de Martín al hero/admin, Lighthouse, planilla .xlsx, revisión de seguridad documentada.


## 15/10/2026 noche — 3ª iteración de diseño (Claude)
Hecha y probada (43 tests, 31 E2E, axe 0, Impeccable limpio). Ver HANDOFF.md. Código en app/ (commit 22f2fe2). Precio $41.000 confirmado por Martín. Pendiente: licencia de videos, Lighthouse móvil, N4.


## 16/10/2026 — hero limpio (Claude)
Hero sin pin ni controles; scroll nativo; pausa discreta. Ver HANDOFF.md. Rendimiento móvil 70/100 (pendiente ≥90).


## 16/10/2026 ~01:00 — sitio animado completo (Claude)
Hero con paradas sin controles; home y páginas internas con escenas animadas; carta corregida; vista local con VER-SITIO.cmd. Ver HANDOFF.md.


## 16/10/2026 ~02:30 (Claude)
Listo para GitHub. Mañana: migración a Supabase (Postgres) y Vercel. Ver HANDOFF.md y docs/decisiones.md.
