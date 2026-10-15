# Don Valentín Digital — reglas del proyecto

Proyecto académico (UADE, Dirección de Proyectos de la Tecnología) y de desarrollo: sistema digital para Don Valentín, parrilla familiar argentina en San Miguel (Buenos Aires), abierta desde 1994, atención en salón, modalidad parrilla libre.
Corte: **15/10/2026**.

## Estado actual: FASE 0 (preparación). No se desarrolla producto sin autorización escrita de Martín.
No hacer todavía: web pública, hero, administrador. Ver `docs/estado.md`, `docs/decisiones.md`, `docs/trazabilidad.md` y `docs/fase0-inventario.md`.

## Comandos
`npm run verify` (typecheck + lint + format + tests) · `npm run typecheck|lint|format:check|test` · E2E de ejemplo: `node --experimental-strip-types phase0/e2e.mts`

## Mapa del repo
`docs/` fuente de verdad y registros (`fuente/` copias de solo lectura, `trazabilidad.md`, `decisiones.md`, `estado.md`, `fase0-inventario.md`) · `phase0/` pruebas descartables de Fase 0 (no es producto) · `media/originals/` originales intocables, `media/derived/` derivados · `.claude/skills/` propias (`don-valentin-*`) y de terceros (`pm-*`, `vercel-*`, `skill-creator`, etc.). Todavía no hay `src/`.

## Fuente de verdad
Carpeta conectada `D:\don valentin` (compartida con Gemini; no copiar ni duplicar). Vigentes: documentos v4 del 07/10/2026 (Acta, Alcance+EDT, Fase de Implementación, Plan de Dirección, Tablero, RACI, Riesgos, Informe 09, CR-009, cronograma .pod v5). Lo que dice el usuario en el chat va después. Nada más: no inventar horarios, platos, precios, historia, fechas ni costos.
**Estado de aprobación:** CR-009 y la línea base v4 están "Propuestos"; el resultado del Comité del 09/10 no está registrado en la carpeta. Confirmar antes de tratar v4 como aprobada.

## Hitos (línea base v4 propuesta)
H1 28/08 cumplido · H2 16/10 prototipos+modelo de datos+parametrización · N3 20/10 demo · H3 30/10 reservas y turnos · N4 03/11 (a confirmar) · H4 06/11 pedidos QR · H5 13/11 integración y sitio en ambiente de prueba · H6 20/11 pruebas y Plan de Implantación · H7 27/11 cierre. Detalle y criterios en `docs/trazabilidad.md`.
Alcance: reservas y turnos + pedidos por QR (30 mesas; paneles recepción/cocina/parrilla/barra/mozo) + sitio institucional. Sin stock, cobros ni extras CR-008. Stack propuesto S-03: Node/Express/MySQL (a confirmar en H2).

## Puntos abiertos (no resolver por cuenta propia)
Resultado del Comité 09/10 · fecha de N4 · stack S-03 vs PostgreSQL mencionado en el relevamiento · hosting/dominio del cliente · Encargado de Salón.

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
