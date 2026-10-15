# Trazabilidad por hito — Don Valentín Digital

**Fecha de corte:** 15/10/2026
**Fuentes usadas (únicas):** `docs/fuente/decisiones_equipo.md` (versión 03/09/2026, en adelante **DE**) y `CLAUDE.md` (en adelante **CM**).
**Fuera de fuente:** Acta v6, Alcance+EDT v3, Cronograma v2, Matriz de Interesados, Enfoque v2 y Kickoff no están en el repo. Solo se los conoce por lo que DE y CM dicen de ellos. No se leyó código ni otros archivos del repo para armar esta matriz.

Convención: **Implementado / Probado / Evidencia** = `Sin dato` cuando las fuentes no los respaldan. Un documento de planificación no prueba que algo exista.

## 1. Matriz de trazabilidad

La numeración "Hito N" no figura en las fuentes (el cronograma tiene 8 hitos y solo 5 tienen fecha documentada), por eso los hitos se identifican por nombre.

| Hito | Fecha | Requisito | Fuente | Implementado | Probado | Evidencia | Estado |
|---|---|---|---|---|---|---|---|
| Reservas y Turnos | 09/10/2026 | Módulo "Reservas y Turnos" entra en uso real, reemplazando directamente esa parte del proceso manual (sin doble registro, según DE) | DE §Enfoque de Puesta en Marcha; CM §Hitos documentados | Sin dato | Sin dato | Sin dato | **Pendiente — exigible al corte** (fecha ≤ 15/10/2026; sin evidencia en las fuentes) |
| Reservas y Turnos | 09/10/2026 | Requisitos funcionales del módulo (qué hace, reglas, criterios de aceptación) | — | — | — | — | **Sin fuente** |
| Pedidos por QR | 23/10/2026 | Módulo "Pedidos por QR" entra en uso real | DE §Enfoque; CM §Hitos documentados | No aplica al corte | No aplica al corte | No aplica al corte | Programado (Pedidos por QR, 23/10/2026) |
| Pedidos por QR | 23/10/2026 | Requisitos funcionales del módulo | — | — | — | — | **Sin fuente** |
| Control de Stock | 06/11/2026 | Módulo "Control de Stock" entra en uso real | DE §Enfoque; CM §Hitos documentados | No aplica al corte | No aplica al corte | No aplica al corte | Programado (Control de Stock, 06/11/2026) |
| Control de Stock | 06/11/2026 | Requisitos funcionales del módulo | — | — | — | — | **Sin fuente** |
| Integración | 13/11/2026 | Integración de los módulos | DE §Enfoque; CM §Hitos documentados | No aplica al corte | No aplica al corte | No aplica al corte | Programado (Integración, 13/11/2026) |
| Integración | 13/11/2026 | Alcance concreto de la integración | — | — | — | — | **Sin fuente** |
| Cierre | 27/11/2026 | Cierre del proyecto | DE §Enfoque; CM §Hitos documentados | No aplica al corte | No aplica al corte | No aplica al corte | Programado (Cierre, 27/11/2026) |
| Sitio web | Sin fecha en fuente | Sitio web (DE lo menciona como parte de "los 3 módulos + sitio"; CM: "sitio web") | DE §Kickoff; CM §Puntos abiertos | Sin dato | Sin dato | Sin dato | **Sin fuente** (ni hito ni fecha ni requisitos) |
| Hito 6, 7 y 8 (los 3 restantes del cronograma) | Sin fuente | Desconocidos | CM §Hitos documentados ("los otros 3 no figuran en las fuentes disponibles") | — | — | — | **Sin fuente** |
| Módulos Cocina, Parrilla, Barra, Salón, Conciliación | Sin fuente | Listados en el "master prompt"; la documentación solo menciona 3 módulos | CM §Puntos abiertos | — | — | — | **Sin fuente** (fuera de alcance hasta confirmar) |

Notas sobre la matriz:
- Las fechas de los 5 hitos son "fechas de entrada en uso" y coinciden entre DE y CM.
- "Pendiente" para Reservas y Turnos significa solo que **las fuentes no aportan evidencia de entrega**. No afirma que no exista nada: no se inspeccionó el código.
- CM indica que el proyecto está en **Fase 0** y que no se desarrolla producto sin autorización escrita de Martín. Es un indicio (inferido, no comprobado) de que el módulo no está implementado.

## 2. Contradicciones abiertas

No se resuelve ninguna; se registran para que el equipo decida.

| # | Contradicción | Fuentes en conflicto | Qué falta |
|---|---|---|---|
| C1 | **Enfoque de puesta en marcha:** etapas con reemplazo directo y sin doble registro, frente a operación en paralelo con corte único. | DE (03/09/2026) frente a CM, que cita notas del usuario del 07/09 | Confirmación del equipo de cuál rige. Las notas del 07/09 no están en las fuentes: solo se las conoce por CM. |
| C2 | **Alcance de módulos:** 3 módulos (reservas y turnos, pedidos por QR, control de stock) + sitio web, frente a 5 módulos del master prompt (Cocina, Parrilla, Barra, Salón, Conciliación). | DE y CM frente al master prompt (citado por CM; no está en el repo) | Confirmar alcance antes de la Fase 6. |
| C3 | **Roles:** el Acta v6 dice "rol a confirmar" para Martín y Lucía; la Matriz de Interesados, el Enfoque y el Kickoff ya los muestran como Desarrollador y Diseñadora UX/UI. | DE §Pendiente / inconsistencia | Actualizar el Acta o confirmar cuál documento manda. |
| C4 | **Hito exigible frente a fase del proyecto:** Reservas y Turnos tenía fecha 09/10/2026 (anterior al corte), pero CM declara el proyecto en Fase 0, sin desarrollo de producto autorizado. | CM §Estado actual frente a CM/DE §Hitos | Confirmar si el hito se cumplió por otra vía o si hay un desvío. Si hay desvío, corresponde una solicitud de cambio (`pm-change-request`). |

## 3. Datos faltantes

| # | Dato | A quién pedirlo | Fuente que lo señala |
|---|---|---|---|
| F1 | Acta v6, Alcance+EDT v3, Cronograma v2, Matriz de Interesados, Enfoque v2 y Kickoff (no están en el repo). Se necesitan antes de la Fase 1. | Equipo (Lucas Di Gresia, PM) | CM §Fuente de verdad |
| F2 | Los 3 hitos del Cronograma v2 sin fecha en las fuentes (el cronograma tiene 8). | Lucas Di Gresia (PM) | CM §Hitos |
| F3 | Requisitos funcionales y criterios de aceptación de cada módulo y del sitio web. | Equipo / Analista Funcional (sin asignar) | Ausentes en DE y CM |
| F4 | Evidencia de entrega de Reservas y Turnos (implementación, pruebas, acta de aceptación). | Martín Cabrera (Desarrollador) | Ausente en DE y CM |
| F5 | Nombre real del dueño (Sponsor) y contactos. | Equipo | DE §Pendiente |
| F6 | 3 integrantes del equipo sin identificar; rol de Pedro Castillo sin confirmar; módulo de Martín sin especificar; Analista Funcional y Responsable de Calidad (QA) sin asignar. | Lucas Di Gresia (PM) | DE §Roles |
| F7 | Diagrama de Contexto de una entrega anterior (no se encontró ninguno). | Equipo | DE §Pendiente real |
| F8 | Costo real registrado (solo figura el Escenario A, US$0,01 el año 1), % completado por paquete de la EDT y valor planificado. Sin estos datos no se calcula EVM. | PM | DE §Kickoff |
| F9 | Texto de las notas del 07/09 sobre operación en paralelo con corte único. | Martín Cabrera | CM §Puntos abiertos |

## 4. Hito exigible al 15/10/2026

**Reservas y Turnos (09/10/2026).** Es el único hito documentado con fecha ≤ corte. Todo lo posterior (Pedidos por QR 23/10, Control de Stock 06/11, Integración 13/11, Cierre 27/11) figura como programado, nunca como operativo.
