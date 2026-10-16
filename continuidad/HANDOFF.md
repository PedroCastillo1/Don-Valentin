# HANDOFF.md — traspaso entre agentes

**Último agente:** Claude Code (Sonnet 5.5) · **Fecha:** 15/10/2026 · **EN CURSO:** ninguno (si ves una marca "EN CURSO" de otro agente, no toques esos archivos).

## Tarea que estaba haciendo
**16/10 ~13:00 — presentación de avance por hitos** (15 diapositivas HTML animadas + guion PDF) entregada en `D:\don valentin\presentacion` (fuera del repo: usa grabaciones del sitio y del panel). Corrección: al confirmar una reserva la página sube al ticket (antes quedaba fuera de la vista). Siguiente: Supabase + Vercel.

**16/10 ~03:30 — revisión del panel aplicada** (ver decisiones y trazabilidad §7): carteles de obra por hito (`components/EnConstruccion.tsx`, `pages/AdminProximos.tsx`), jerarquía de roles (`ROLES_GESTIONABLES` en shared), código vigente del QR (`codigoQr` en mesas.ts), calendario en Reservas, días de atención/cierres. 45 tests + 36 E2E verdes. Pendiente para H3: búsqueda/modificación/cancelación de reservas, estado del salón; H4: pedidos QR, paneles, mozo, edición de carta y precios.

**16/10 ~02:30 — listo para subir a GitHub; mañana Supabase + Vercel.** Todo verde: `npm run verify` (43), Playwright 34/34, Lighthouse celular inicio 93–98. Repo: https://github.com/PedroCastillo1/Don-Valentin (Claude no puede pushear: se sube con `SUBIR-A-GITHUB.cmd` desde la compu de Martín). Revisar el panel en local: `VER-SISTEMA.cmd` → http://localhost:3001/admin/ingresar (credenciales en `sistema-local\CREDENCIALES-DE-PRUEBA.txt`). **Próximo paso:** migrar `apps/api` de MySQL a PostgreSQL (Supabase): `db/migrations` a SQL de Postgres, `mysql2` → `pg`/`postgres`, `?` → `$n`, `ON DUPLICATE KEY` → `ON CONFLICT`, DATETIME(3) → timestamptz, ENUM → CHECK; pruebas de integración contra Postgres; luego Vercel (web estática + API como función o servidor). No tocar el hero (scroll y animación aprobados por Martín) ni la carta (aprobada).

**16/10 ~01:00 — vida en todo el sitio**: hero restaurado (paradas, scroll controlado, sin controles visibles; pausa solo con teclado). Home nueva en `HomeSecciones.tsx` (Cinta, Recorrido, Salon, Precios, Galeria, Ubicacion, CierreReserva) con GSAP/ScrollTrigger y `gsap.matchMedia` (sin movimiento = estático). `PaginaPublica` acepta `medio` (foto/video de portada). `Telon.tsx` = transición entre rutas. Carta: categoría activa por posición (ver decisiones). Vista local: `D:\don valentin\VER-SITIO.cmd` → http://localhost:4173 (`app\vista-local`, se actualiza con el build de vista previa: `VITE_PREVIEW=1 npx vite build -c vite.preview.config.ts --base /`). Pruebas: 35 E2E verdes. Pendiente: Lighthouse móvil (era 70), medir con las escenas nuevas.

**16/10 00:xx — hero limpio (directiva de Martín)**: el hero ya no tiene pin, snap ni listeners de rueda/toque/teclado; son 3 escenas con scroll nativo (`Hero.tsx`: `.hero`, `.portada__fuego`, `.asador`), sin «Saltar portada» ni riel de pasos; hay un botón de pausa discreto (`.hero__pausa`). Se quitó «Imagen ilustrativa» (derechos confirmados). La parte de la home bajo la portada se carga aparte (`HomeResto.tsx`). Pruebas: 43 unit, 32 E2E (desktop+móvil) verdes con axe 0; Impeccable limpio en la home (1280 y 390). Lighthouse móvil 70 (objetivo 90 NO alcanzado; ver decisiones). Cuidado: `AdminReservas` deshabilita los botones de día hasta cargar la fecha; el test de reservas avanza días porque entre 00:00 y 02:00 el día de servicio es el anterior. No volver a poner pin/snap en el hero.

**3ª iteración de diseño (15/10 noche) implementada y probada**: hero con paradas controladas, "Del fuego a la mesa" rediseñada, "Cómo llegar" con mapa propio (OSM), precio $41.000 contextualizado (confirmado por Martín), Carta/Reserva/Parrilla libre/Pie al mismo nivel. Pruebas: `npm run verify` 43 verdes; Playwright 31 pasaron/1 omitida (desktop+móvil), axe 0 violaciones; Impeccable 4.6.0 limpio en 5 páginas × 2 viewports. Pendiente: Lighthouse móvil (chunk Inicio ~127 kB + datos del mapa), visto bueno de Martín.

Antes: Fase 1: lo exigible para H2 (16/10) y N3 (20/10) está implementado y probado. Última etapa (15/10 noche): **2ª iteración de diseño** pedida por Martín tras ver las capturas (ver `docs/direccion-artistica.md` v2): nuevo hero "el fuego visto a través de la parrilla" con videos reales recodificados, home con cinta/mosaico/cierre, páginas interiores con banda brasa, dashboard con "Pulso del día" (reemplaza las barras de aforo), login rediseñado, navegación móvil inferior. A la espera de su visto bueno.

## Cambios implementados (commit `1c9b3e4` y siguientes)
Monorepo (`packages/shared`, `apps/api`, `apps/web`); modelo de datos 0001; seed (carta real); servicios y API Express completos para reservas, mesas, QR, sesión de mesa, parámetros, usuarios, auditoría, carta; web con hero, login e Inicio del admin; configuración de seguridad; eslint/prettier ordenados; tests.

## Archivos clave
API: `apps/api/src/{config,errors}.ts`, `src/db/*`, `src/domain/*`, `src/services/*`, `src/http/{app,middleware,rutas-publicas,rutas-admin}.ts`, `src/server.ts`. Web: `apps/web/src/{App,main}.tsx`, `components/{Hero,SiteNav}.tsx`, `pages/{Login,AdminLayout,AdminInicio}.tsx`, `lib/{api,sesion,horario}`, `styles/*`. Datos: `db/migrations/0001_modelo_unificado.sql`, `db/data/carta.json`. Evidencia: `docs/evidencias/n3-checkpoint/*.png`.

## Pruebas y resultados (2ª iteración)
`npm test`: 43 tests verdes. Playwright: 26 pruebas (13 desktop + 13 móvil) verdes, incluida la nueva "la secuencia del hero avanza con el scroll" (barras, video A/B, persiana, nav) y axe WCAG 2.2 AA sin violaciones en todas las pantallas. ESLint, Prettier y typecheck limpios. Impeccable `detect` en vivo: limpio tras corregir 10 hallazgos. Lighthouse home: desktop 96/100/96/100 (LCP 1,3 s); móvil rendimiento 66 (LCP 5,9 s simulado en 4G lenta; a11y 100, BP 96, SEO 100) → **pendiente optimizar móvil** (bundle base 260 kB + chunk Inicio 121 kB con GSAP, precarga del póster/fuentes). Evidencia (capturas, videos, Lighthouse) en `docs/evidencias/iteracion-2/`.

## Pruebas y resultados (anteriores)
`npm run verify` verde (34 tests: 31 API/dominio contra MySQL real + 3 de horario web). Concurrencia: 60 simultáneas → 25 aceptadas, aforo respetado. Playwright: 0 errores de consola (el 401 de `/auth/me` sin sesión es esperado).

## Errores conocidos / deuda
- Falta: Lighthouse (H5 mide; aquí solo informativo), revisión de seguridad manual documentada en `docs/evidencias/`, exportar planilla a .xlsx (hoy CSV), test de rate limit (la suite lo desactiva con `limitarTasa:false`), tests dedicados de usuarios/auditoría.
- `/auth/me` sin sesión devuelve 401 (línea roja esperada en consola).
- Videos: ya recodificados y usados en la 2ª iteración (`apps/web/public/media/video/`, ~10 MB en total); son clips de banco (patrón Pexels), **no del local**: confirmar fuente/licencia y reemplazar por material propio antes de publicar. Foto 5 muestra a un empleado (derechos de imagen). Originales: `D:\don valentin\fotos y videos` (no se tocan).
- Las sesiones E2E comparten base `dv_e2e` entre desktop y móvil: cada test usa datos propios por proyecto.

- **Sincronización a `D:\don valentin` pendiente** (el puente se cayó): copiar a la raíz de D: los .md de `continuidad/` + `CLAUDE.md`, y extraer el repo en `D:\don valentin\app`. Hasta entonces la fuente es el repo en la nube.

## Bloqueos
Esperando visto bueno de Martín sobre la v2/v3 (ya extendida a toda la web pública y al admin). N4 sin fecha. Context7 sin OAuth.

## Próxima acción exacta
1) Verificar MySQL y `npm run verify` (43 tests) + `npm run e2e` (26). 2) Aplicar el feedback de Martín a la v2 (hero, dashboard, login, móvil). 3) Rendimiento móvil de la home (meta ≥90 se mide en H5): partir GSAP del chunk inicial, precargar póster y fuentes. 4) Exportar planilla a .xlsx. 5) Actualizar `docs/trazabilidad.md`. 6) Re-sincronizar a `D:\don valentin` (el puente se cayó al cierre de esta tarea).

## Advertencias
No reutilizar el diseño del prototipo anterior ni la v0 beige/Caprasimo. No inventar fechas, precios ni funciones. No publicar videos ni fotos con personas sin confirmación. No editar migraciones aplicadas. No tocar `documentacion/`.

## 16/10 (tarde): despliegue y ajustes
Base en Supabase cargada y usuarios del ambiente con contraseña igual al usuario (hash argon2). Vercel lo configura Pedro con `vercel.json` (instalación `npm ci --include=dev`). Pendiente: URL final, `PUBLIC_BASE_URL` y probar carta, login, reserva y QR en vivo. Panel: telón de marca una sola vez; Mesas y QR en tarjetas en celular. Presentación y guion corregidos (el QR se queda en el alcance; Supabase y Vercel figuran como ya montados: confirmar que el sitio esté arriba antes de presentar).

Mesas y QR: el botón "Cerrar sesión" pasó a "Liberar mesa" (el QR queda fijo y la próxima sesión empieza con cuenta en cero). Diseño del permiso atado a la sesión para H4 en `docs/decisiones.md`.

Sitio en vivo: https://don-valentin.vercel.app (Pedro lo desplegó). Ajustes del 16/10 a la tarde: ticket del hero derecho, Recorrido vertical, Salón sin pin y con foto apaisada en celular, Reservar con personas borrable y errores en español (z.config es). E2E 35/37: fallan solo los 2 del hero por falta de H.264 en este Chromium.

## 16/10 (noche): revisión de capturas de Pedro y Martín
- Hecho y probado: bordeaux #791f1f en todo; rótulos legibles en el hero; interlineado ≥1,04; carta y mesa QR sin nombres en columna; recorrido sin videos superpuestos; reels en 1280 px; precios en iPad.
- `e2e/revision-16-10.spec.ts`: una prueba por cada problema marcado. Suite completa: 55 pasan; las 2 del video del hero fallan solo en el Chromium del contenedor (no reproduce H.264).
- Presentación y guion regenerados (`Presentacion-Don-Valentin.html`, `Guion-presentacion-Don-Valentin.pdf`).
- Pendiente: Martín corre `SUBIR-A-GITHUB.cmd` con el paquete nuevo y Pedro verifica el redeploy en Vercel.
