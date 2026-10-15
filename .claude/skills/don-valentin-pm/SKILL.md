---
name: don-valentin-pm
description: "Gestión de proyecto de Don Valentín Digital: contrastar la documentación aprobada (Acta, Alcance, EDT, Cronograma) contra el trabajo, armar la matriz de trazabilidad de hitos, registrar decisiones y verificar cumplimiento a una fecha de corte. Usar antes de planificar, implementar o declarar terminado cualquier requisito, y al preguntar qué hito es exigible o si algo está hecho."
---

# Don Valentín — Project Management

La documentación aprobada es la línea base. Esta skill sirve para **leerla, contrastarla y registrar desvíos**, no para reescribirla.

## Reglas duras
1. No modificar alcance, fechas, roles ni presupuesto aprobados. Si el trabajo los contradice, se abre una **solicitud de cambio** (`pm-change-request`) y se espera la decisión del equipo.
2. No inventar fechas, costos, avances ni porcentajes. Dato faltante = "sin dato" + a quién pedirlo.
3. Un documento de planificación no prueba que algo exista. "Implementado" necesita código; "probado" necesita una prueba ejecutada; "evidencia" necesita un archivo o salida citable.
4. Lo posterior a la fecha de corte nunca se presenta como operativo.

## Procedimiento: contrastar contra la línea base
1. Leer `CLAUDE.md`, `docs/estado.md`, `docs/decisiones.md` y los documentos en `docs/fuente/`.
2. Anotar de cada documento: versión, fecha, qué afirma. Si dos documentos se contradicen, **no elegir**: registrar la contradicción en `docs/decisiones.md` como "abierta" y preguntar.
3. Extraer hitos y requisitos con su fuente (documento + sección).
4. Aplicar la fecha de corte: exigible = fecha del hito ≤ corte. Futuro = "Programado para el Hito N — fecha documentada".
5. Armar la matriz (`docs/trazabilidad.md`):

| Hito | Fecha | Requisito | Fuente | Implementado | Probado | Evidencia | Estado |
|---|---|---|---|---|---|---|---|

Estados permitidos: `Pendiente`, `En curso`, `Implementado sin probar`, `Verificado`, `Bloqueado (causa)`, `Programado (hito/fecha)`, `Sin fuente`.
6. Todo requisito sin fuente documental se marca `Sin fuente` y no entra al alcance hasta confirmarlo.

## Registro de decisiones (`docs/decisiones.md`)
Una entrada por decisión: fecha, decisión, motivo, fuente, quién la tomó, estado (`abierta`/`cerrada`). Las decisiones de terceros (equipo, profesora, dueño) se citan, no se deducen.

## Ejecución técnica incremental
Los hitos son predictivos; la ejecución puede ser iterativa.
- Backlog: historias "Como <rol> quiero <acción> para <resultado>", cada una enlazada a un requisito de la matriz.
- Definition of Ready: fuente documental, criterio de aceptación escrito, dependencias identificadas.
- Definition of Done: código revisado, prueba automatizada pasando, accesibilidad y seguridad revisadas para esa pieza, matriz actualizada, decisión registrada.
- Cierre de cada incremento: qué se probó, qué quedó pendiente, impedimentos.

## Valor ganado (EVM)
Solo con datos reales: BAC, % completado por paquete de la EDT, costo real. Fórmulas: CV=EV−AC, SV=EV−PV, CPI=EV/AC, SPI=EV/PV, EAC=BAC/CPI, ETC=EAC−AC, VAC=BAC−EAC. Si falta PV, EV o AC, **no calcular**: pedir el dato. Los documentos del equipo mencionan un presupuesto "Escenario A" (US$0,01 en el año 1); no hay costo real registrado, así que no hay CPI posible hoy.

## Herramientas de apoyo instaladas
`pm-project-manager-pmbok-evm`, `pm-wbs`, `pm-project-schedule`, `pm-risk-register`, `pm-raci-matrix`, `pm-status-report`, `pm-change-request`, `pm-decision-log`, `pm-project-charter`, `pm-budget-plan`. Generan plantillas Word/Excel nuevas: **usarlas solo si el equipo lo pide**, porque los entregables académicos ya existen y tienen su formato (el cronograma oficial es el `.pod` de ProjectLibre).
