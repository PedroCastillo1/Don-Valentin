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
- Falta: pantallas Reservas/Mesas y QR/Parámetros/Usuarios en el admin; Reservar/Carta/Parrilla libre/Cómo llegar/`/m/:token` en la web pública (el hero ya enlaza a ellas: **hoy dan "Página no encontrada"**; construirlas antes de la demo).
- Falta: exportar la planilla a .xlsx (H2), tests de usuarios/auditoría, E2E Playwright, axe, Lighthouse, test de rate limit (la suite lo desactiva con `limitarTasa:false`).
- `/auth/me` sin sesión devuelve 401 (genera una línea roja en consola; es esperado).
- Videos: sin procesar ni publicar (licencia sin confirmar). Foto 5 muestra a un empleado (derechos de imagen).
- El puente al disco del usuario (`D:\don valentin`) se cayó durante la sesión: los archivos de continuidad están en `continuidad/` del repo y deben copiarse a la raíz de `D:\don valentin` (junto a `ESTADO_COMPARTIDO.md`) cuando el puente vuelva; también sincronizar el repo a `D:\don valentin\app`.

## Bloqueos
Esperando visto bueno de Martín sobre la dirección artística antes de extenderla a toda la web. N4 sin fecha. Context7 sin OAuth.

## Próxima acción exacta
1) Verificar MySQL (`mysql -S /run/dvmysql/mysql.sock -e "select 1"`) y `npm run verify`. 2) Si hay feedback de Martín sobre el hero/admin, aplicarlo primero. 3) Construir las pantallas faltantes en este orden: admin Reservas (alta + listado) → Mesas y QR → Parámetros (con estados de validación) → Usuarios; pública Reservar (con aviso RNF-4) → Carta → Parrilla libre → Cómo llegar → `/m/:token` ("Programado para el Hito 4 — 06/11/2026" para pedir). 4) Playwright E2E + axe + Lighthouse y guardar en `docs/evidencias/`. 5) Sincronizar a `D:\don valentin` y actualizar `ESTADO_COMPARTIDO.md`.

## Advertencias
No reutilizar el diseño del prototipo anterior. No inventar fechas, precios ni funciones. No publicar videos ni fotos con personas sin confirmación. No editar migraciones aplicadas. No tocar `documentacion/`.
