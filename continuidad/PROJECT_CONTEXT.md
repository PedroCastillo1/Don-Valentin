# PROJECT_CONTEXT.md — Don Valentín Digital

**Cliente:** Don Valentín, parrilla familiar en San Miguel (Buenos Aires), desde 1994, "Parrilla Libre & Restó", Av. Pres. Arturo Umberto Illia 3873. Horario 12:00 a 02:00. Teléfonos 11-3303-9516 (WhatsApp) y 4664-1720. Instagram @parrilladonvalentin. **Proyecto:** UADE, Dirección de Proyectos de la Tecnología. Responsable: Martín Cabrera.

**Documentos oficiales (solo lectura):** `D:\don valentin\documentacion` (Acta, Alcance+EDT, Plan de Dirección, Tablero, RACI, Riesgos, Informe 09, CR-009, cronograma .pod, carta PDF). Línea base v4 vigente por CR-009 (constancia en el PDF pendiente; no inventar firmas).

**Alcance (Alcance v4 §1):** (1) Reservas y turnos: alta, asignación de mesa por capacidad y sector sin superar aforo, estado de mesas, modificar/cancelar (RF-R1–R4). (2) Pedidos por QR: 30 mesas, QR único, enrutamiento a cocina/parrilla/barra en ≤5 s (RF-Q1–Q4). (3) Sitio institucional adaptable (RF-W1–W3). RNF-1…7: rendimiento, accesibilidad, usuarios y roles, datos mínimos, web sin app nativa, respaldo, concurrencia. Fuera de alcance: stock, cobros, delivery, app nativa, indicadores para el dueño.

**Stack decidido por el responsable:** Node.js + Express + MySQL + TypeScript + React. Sin migraciones arbitrarias.

**Estructura:** `packages/shared` · `apps/api` (`src/domain`, `src/services`, `src/http`, `src/db`, `test`) · `apps/web` (`src/components`, `pages`, `lib`, `styles`; `public/media`) · `db/migrations`, `db/data/carta.json` (transcripción de la carta PDF: 126 productos, 152 variantes) · `docs/` · `media/originals|derived` · `.claude/skills`.

**Decisiones ya tomadas (detalle en `docs/decisiones.md`):** modelo unificado de 19 tablas (`db/migrations/0001`); control de aforo con fila contador `ocupacion_franja` bloqueada `FOR UPDATE` + índices únicos generados (`confirmada_flag`, `abierta_flag`); día de servicio: franjas después de medianoche pertenecen al día anterior; zona horaria Argentina UTC-3 fija; parámetros marcados `documentado | provisorio | validado` (valores provisorios a validar con el Encargado, actividad 1.2.3.4, 19–23/10); 14 tipos de solicitud (provisorios); mozo no administra mesas; carta PDF es la fuente de precios; prototipo anterior rechazado (solo sirve para entender flujos).

**Pendientes de humanos:** fecha de N4 (03/11, 10/11 o 17/11) · constancia de CR-009 en PDF · Context7 (OAuth) · licencias de los videos y derechos de imagen de personas · validar parámetros provisorios · precio del Chandon · asignación definitiva de tipo de solicitud a ítems de carta · Encargado de Salón designado · hosting/dominio.

## Entorno de desarrollo
- Repo en la nube: `/home/claude/don-valentin-digital` (git). Copia en la carpeta común: `D:\don valentin\app` (sincronizar por tar; ver HANDOFF).
- **MySQL 8.4.10** instalado en `/opt/mysql` (tarball oficial, sha256 88ac9cc8…), datos en `/var/lib/dvmysql`, socket `/run/dvmysql/mysql.sock`. Si el contenedor se recicló, reiniciar: `cd /opt/mysql && LD_LIBRARY_PATH=/opt/libshim nohup ./bin/mysqld --no-defaults --user=root --datadir=/var/lib/dvmysql --socket=/run/dvmysql/mysql.sock --port=3306 --bind-address=127.0.0.1 --mysqlx=OFF --character-set-server=utf8mb4 &` (necesita `libaio.so.1` → symlink a `libaio.so.1t64` en `/opt/libshim`). Bases: `don_valentin` (sembrada) y `dv_test` (la recrea la suite).
- Variables API: `DB_SOCKET`, `WEB_DIST=../web/dist`, `PORT=3000`, `PUBLIC_BASE_URL` (obligatoria en producción: base de los QR).
- Comandos: `npm run verify` · `npm run db:migrate` · `npm run db:seed` (`--usuarios-prueba` genera claves en `apps/api/.credenciales-prueba.json`, ignorado) · `node --experimental-strip-types apps/api/src/db/seed-demo.ts` (datos de prueba) · `npm run dev:api` / `dev:web` · `npm run build`.
