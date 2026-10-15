# Don Valentín Digital — reglas del proyecto

Proyecto académico (UADE, Dirección de Proyectos de la Tecnología) y de desarrollo: sistema digital para Don Valentín, parrilla familiar argentina en San Miguel (Buenos Aires), abierta desde 1994, atención en salón, modalidad parrilla libre.
Fecha de corte de cumplimiento: **15/10/2026**.

## Estado actual: FASE 0 (preparación). No se desarrolla producto sin autorización escrita de Martín.
No hacer todavía: web pública, hero, administrador. Ver `docs/estado.md`, `docs/decisiones.md`, `docs/trazabilidad.md` y `docs/fase0-inventario.md`.

## Comandos
`npm run verify` (typecheck + lint + format + tests) · `npm run typecheck|lint|format:check|test` · E2E de ejemplo: `node --experimental-strip-types phase0/e2e.mts`

## Mapa del repo
`docs/` fuente de verdad y registros (`fuente/` copias de solo lectura, `trazabilidad.md`, `decisiones.md`, `estado.md`, `fase0-inventario.md`) · `phase0/` pruebas descartables de Fase 0 (no es producto) · `media/originals/` originales intocables, `media/derived/` derivados · `.claude/skills/` propias (`don-valentin-*`) y de terceros (`pm-*`, `vercel-*`, `skill-creator`, etc.). Todavía no hay `src/`.

## Fuente de verdad
1. Documentación aprobada del equipo (Acta v6, Alcance+EDT v3, Cronograma v2, Matriz de Interesados, Enfoque v2, Kickoff). Hoy solo está disponible la copia de `docs/fuente/decisiones_equipo.md`; los demás documentos **no están en este repo** y hay que pedirlos antes de la Fase 1.
2. Lo que dice el usuario en el chat.
3. Nada más. No inventar horarios, platos, precios, historia, promociones, fechas ni costos.

## Hitos documentados (Cronograma v2)
Reservas y Turnos 09/10/2026 · Pedidos por QR 23/10/2026 · Control de Stock 06/11/2026 · Integración 13/11/2026 · Cierre 27/11/2026. El cronograma tiene 8 hitos; los otros 3 no figuran en las fuentes disponibles: no inventar sus fechas.
Al 15/10/2026 lo exigible es **Reservas y Turnos**. Lo posterior se muestra como "Programado para el Hito N — fecha documentada" y nunca como operativo.

## Puntos abiertos (no resolver por cuenta propia)
- El master prompt lista Cocina, Parrilla, Barra, Salón y Conciliación; la documentación disponible solo menciona 3 módulos (reservas y turnos, pedidos por QR, control de stock) + sitio web. Confirmar alcance antes de la Fase 6.
- Enfoque de puesta en marcha: `decisiones_equipo.md` (03/09) dice etapas con reemplazo directo; las notas posteriores del usuario (07/09) dicen operación en paralelo con corte único. Confirmar cuál rige.
- Roles del Acta v6 desactualizados; contactos y nombre del dueño sin confirmar.

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
