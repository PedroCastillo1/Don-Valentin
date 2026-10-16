# HANDOFF.md — traspaso entre agentes

**Último agente:** Claude Code (Sonnet 5.5) · **Fecha:** 15/10/2026 · **EN CURSO:** ninguno (si ves una marca "EN CURSO" de otro agente, no toques esos archivos).

## Tarea que estaba haciendo
Fase 1: implementar lo exigible para H2 (16/10) y N3 (20/10). Última etapa: checkpoint visual (hero + inicio del admin) enviado a Martín; mientras espera su visto bueno se continúa con arquitectura, API y pantallas funcionales.

## Cambios implementados (commit `1c9b3e4` y siguientes)
Monorepo (`packages/shared`, `apps/api`, `apps/web`); modelo de datos 0001; seed (carta real); servicios y API Express completos para reservas, mesas, QR, sesión de mesa, parámetros, usuarios, auditoría, carta; web con hero, login e Inicio del admin; configuración de seguridad; eslint/prettier ordenados; tests.

## Archivos clave
API: `apps/api/src/{config,errors}.ts`, `src/db/*`, `src/domain/*`, `src/services/*`, `src/http/{app,middleware,rutas-publicas,rutas-admin}.ts`, `src/server.ts`. Web: `apps/web/src/{App,main}.tsx`, `components/{Hero,SiteNav}.tsx`, `pages/{Login,AdminLayout,AdminInicio}.tsx`, `lib/{api,sesion,horario}`, `styles/*`. Datos: `db/migrations/0001_modelo_unificado.sql`, `db/data/carta.json`. Evidencia: `docs/evidencias/n3-checkpoint/*.png`.

## Pruebas y resultados
`npm run verify` verde (34 tests: 31 API/dominio contra MySQL real + 3 de horario web). Concurrencia: 60 simultáneas → 25 aceptadas, aforo respetado. Playwright: 0 errores de consola (el 401 de `/auth/me` sin sesión es esperado).

## Errores conocidos / deuda
- Falta: Lighthouse (H5 mide; aquí solo informativo), revisión de seguridad manual documentada en `docs/evidencias/`, exportar planilla a .xlsx (hoy CSV), test de rate limit (la suite lo desactiva con `limitarTasa:false`), tests dedicados de usuarios/auditoría.
- `/auth/me` sin sesión devuelve 401 (línea roja esperada en consola).
- Videos: sin procesar ni publicar (licencia sin confirmar). Foto 5 muestra a un empleado (derechos de imagen).
- Las sesiones E2E comparten base `dv_e2e` entre desktop y móvil: cada test usa datos propios por proyecto.

- **Sincronización a `D:\don valentin` pendiente** (el puente se cayó): copiar a la raíz de D: los .md de `continuidad/` + `CLAUDE.md`, y extraer el repo en `D:\don valentin\app`. Hasta entonces la fuente es el repo en la nube.

## Bloqueos
Esperando visto bueno de Martín sobre la dirección artística antes de extenderla a toda la web. N4 sin fecha. Context7 sin OAuth.

## Próxima acción exacta
1) Verificar MySQL y `npm run verify` (43 tests) + `npm run e2e` (24). 2) Aplicar el feedback de Martín al hero/admin si llegó. 3) Subir rendimiento Lighthouse a ≥90 (reducir bundle base de 260 kB, preload de la imagen del hero, AVIF). 4) Exportar planilla a .xlsx. 5) Procesar videos solo si se confirma licencia. 6) Actualizar docs (`trazabilidad`, `decisiones`) y este traspaso.

## Advertencias
No reutilizar el diseño del prototipo anterior. No inventar fechas, precios ni funciones. No publicar videos ni fotos con personas sin confirmación. No editar migraciones aplicadas. No tocar `documentacion/`.
