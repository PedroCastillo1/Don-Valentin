# Don Valentín Digital — reglas del proyecto

Proyecto académico (UADE, Dirección de Proyectos de la Tecnología) y de desarrollo: sistema digital para Don Valentín, parrilla familiar argentina en San Miguel (Buenos Aires), abierta desde 1994, atención en salón, modalidad parrilla libre.
Corte: **15/10/2026**.

## Continuidad con Gemini (leer primero)

Reglas compartidas: `AGENTS.md` · contexto: `PROJECT_CONTEXT.md` · estado: `PROJECT_STATUS.md` · traspaso: `HANDOFF.md` · entrada rápida: `ESTADO_COMPARTIDO.md`. Protocolo de arranque y cierre en `AGENTS.md`. (Copias canónicas en la raíz de `D:\don valentin`; en este repo están en `continuidad/`.) Al terminar cada turno: actualizar `HANDOFF.md`.

## Estado actual: FASE 1 (desarrollo autorizado hasta N3, martes 20/10/2026)

Ver `PROJECT_STATUS.md`. Comandos: `npm run verify` · `npm run db:migrate|db:seed` · `npm run dev:api|dev:web` · `npm run build`. Pruebas de integración contra MySQL real (ver `PROJECT_CONTEXT.md` §Entorno).

## Habilidades y herramientas de Claude

Plugins: frontend-design, impeccable, ui-ux-pro-max, superpowers, code-review, code-simplifier, security-guidance (`SECURITY_GUIDANCE_DISABLE=0` en `.claude/settings.json`), typescript-lsp, playwright, claude-md-management, feature-dev. Skills propias: `don-valentin-pm|motion|media|copywriting|seo`; de terceros: `pm-*`, `vercel-*`. Usarlas de verdad y dejar evidencia en `docs/evidencias/`.

## Mapa del repo

`packages/shared` · `apps/api` · `apps/web` · `db/` (migraciones y carta) · `docs/` (fuente, decisiones, trazabilidad, cronograma, evidencias, dirección artística) · `media/originals` (intocables) · `continuidad/` · `.claude/skills/`.

## Fuente de verdad

Carpeta conectada `D:\don valentin` (compartida con Gemini; no copiar ni duplicar). Vigentes: documentos v4 del 07/10/2026 (Acta, Alcance+EDT, Fase de Implementación, Plan de Dirección, Tablero, RACI, Riesgos, Informe 09, CR-009, cronograma .pod v5). Lo que dice el usuario en el chat va después. Nada más: no inventar horarios, platos, precios, historia, fechas ni costos.
**Estado de aprobación:** CR-009 APROBADA y línea base v4 vigente por confirmación del responsable (Martín Cabrera, 15/10/2026); falta incorporar la constancia al PDF de CR-009 (no inventar firmas ni editar el original). Prioridad inmediata: H2 (16/10). Cronograma en `docs/cronograma.md`, prioridades en `docs/prioridades.md`.

## Hitos (línea base v4 vigente)

H1 28/08 cumplido · H2 16/10 prototipos+modelo de datos+parametrización · N3 20/10 demo · H3 30/10 reservas y turnos · N4 03/11 (a confirmar) · H4 06/11 pedidos QR · H5 13/11 integración y sitio en ambiente de prueba · H6 20/11 pruebas y Plan de Implantación · H7 27/11 cierre. Detalle y criterios en `docs/trazabilidad.md`.
Alcance: reservas y turnos + pedidos por QR (30 mesas; paneles recepción/cocina/parrilla/barra/mozo) + sitio institucional. Sin stock, cobros ni extras CR-008. Stack propuesto S-03: Node/Express/MySQL (a confirmar en H2).

## Puntos abiertos (no resolver por cuenta propia)

Constancia de CR-009 · fecha de N4 · stack S-03 vs PostgreSQL mencionado en el relevamiento · hosting/dominio del cliente · Encargado de Salón.

## Protocolo de trabajo

Analizar → consultar docs → listar supuestos → plan verificable → una unidad de trabajo → probar → revisar → corregir → registrar en `docs/decisiones.md` → seguir.
"Terminado" exige prueba ejecutada y evidencia; que compile no alcanza. Separar siempre: comprobado / inferido / pendiente.
Al retomar: leer este archivo, `docs/estado.md` y `docs/decisiones.md` antes de tocar código.

## Convenciones

- Español argentino con voseo en textos para usuarios; código e identificadores en inglés.
- TypeScript strict, ESLint, Prettier, Vitest, Playwright. Dependencias locales al proyecto.
- Autorización siempre del lado del servidor. Nunca credenciales en frontend. Contraseñas con hash (argon2/bcrypt), nunca cifradas ni en claro.
- Originales de foto y video 4K intocables; derivados en carpeta aparte.
- Sin gastos, anuncios ni servicios pagos sin autorización explícita.
- Commits: mensajes en español, imperativo, una unidad de trabajo por commit.

## Skills propias (`.claude/skills/`)

`don-valentin-pm`, `don-valentin-motion`, `don-valentin-media`, `don-valentin-copywriting`, `don-valentin-seo`.
