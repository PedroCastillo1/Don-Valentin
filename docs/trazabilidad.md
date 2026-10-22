# Trazabilidad — Don Valentín Digital (corregida con documentos reales v4)

**Corte:** 15/10/2026 · **Fuente de verdad única (Claude y Gemini):** carpeta `D:\don valentin` (subcarpeta `documentacion`). Este archivo no copia los documentos: los cita por número.
Convención: **Implementado / Probado** = `No` salvo evidencia. No existe repositorio de producto (Informe 09, I-06) y esta sesión no desarrolló nada.

## 1. Estado de la línea base (CR-009) — APROBADA por confirmación del responsable
- **15/10/2026: Martín Cabrera, responsable del proyecto, confirmó que CR-009 fue aprobada** y que la **línea base v4 es el cronograma vigente.** Fuente: confirmación del responsable en el chat (no hay documento firmado todavía).
- **Constancia documental pendiente:** el PDF de CR-009 (doc 11) sigue diciendo "Propuesto" con decisión y firmas en blanco; Acta, Alcance, Plan, Tablero y .pod también. **No se modificaron ni se inventaron firmas.** Falta incorporar la constancia al PDF (responsable: equipo/Luca). Hasta entonces, citar siempre "aprobada según confirmación del responsable 15/10/2026".
- Coherencia: el prototipo visto en la grabación de `moldes de web` ya muestra las fechas v4 (reservas 30/10, QR 06/11, integración 13/11).

## 2. Hitos (línea base v4 vigente · Alcance §2.1/§3.2, Tablero 05)
| Hito | Fecha v3 | Fecha v4 | Estado al 15/10 | Criterio de aceptación |
|---|---|---|---|---|
| H1 Acta, relevamiento y alcance | 28/08 | 28/08 | Cumplido (Director); conformidad del Sponsor no registrada (I-08), se ratifica el 09/10 | Acta aprobada, relevamiento cerrado, alcance definido |
| N1 Kickoff (cátedra) | 15/09 | 15/09 | Cumplido | — |
| LB Línea base v4 (CR-009) | — | 09/10 | **Aprobada (confirmación del responsable 15/10); constancia en PDF pendiente** | Aprobación en Comité |
| **H2** Prototipos, modelo de datos, parametrización | 11/09 | **16/10** | **En curso — vence 16/10 (prioridad inmediata)** | Prototipos validados, modelo de datos unificado, planilla de parametrización completa |
| N3 Demo prototipo funcional (cátedra) | — | 20/10 | Pendiente | — |
| **H3** Gestor de reservas y turnos | 02/10 | **30/10** | En plan; no iniciado (0 % implementado) | ≥10 reservas de prueba sin errores de asignación ni sobreventa; conformidad del Sponsor (RF-R1–R4, RNF-4) |
| N4 Presentación final (cátedra) | — | 03/11 (a confirmar: 03/10/17-11) | Pendiente | — |
| **H4** Pedidos por QR | 23/10 | **06/11** | Pendiente | 30 QR abren la mesa correcta; pedido al sector correcto en ≤5 s; conformidad (RF-Q1–Q4) |
| **H5** Integración y sitio en ambiente de prueba | 13/11 | 13/11 | Pendiente | Sistema integrado, sitio desplegado en prueba, Lighthouse en meta |
| **H6** Pruebas integrales y Plan de Implantación | 20/11 | 20/11 | Pendiente | Prueba de aceptación ≥95 %, 0 defectos críticos/altos, manuales y Plan de Implantación listos |
| **H7** Aceptación final y cierre | 27/11 | 27/11 | Pendiente | Todo aceptado, acta de aceptación final firmada, entrega de código/credenciales/QR |
Desvío del proyecto al corte 06/10 (Informe 09): SPI 0,67; EV 255 h, PV 378,2 h, AC 255 h (reconstruido). Criterios de éxito del proyecto: CE1–CE6 (Acta §4).

## 3. Requisitos → hito → criterio (Alcance v4 §1)
| ID | Requisito | Hito | Criterio de aceptación | Impl. | Prob. |
|---|---|---|---|---|---|
| RF-R1 | Alta de reserva (nombre, teléfono, personas, horario) | H3 | 10 reservas de prueba sin errores | No | No |
| RF-R2 | Asignación de mesa por capacidad y sector sin superar aforo | H3 | 0 sobreventas | No | No |
| RF-R3 | Estado de mesas (libre/reservada/ocupada) por franja; walk-in y no-show | H3 | Coincide en 10 escenarios | No | No |
| RF-R4 | Modificar/cancelar reserva | H3 | Libera o reasigna cupo | No | No |
| RF-Q1 | QR único por mesa → carta digital sin instalar app | H4 | 30 códigos abren la mesa correcta | No | No |
| RF-Q2 | Envío y enrutamiento a cocina/parrilla/barra ≤5 s | H4 | Llega al sector correcto ≤5 s | No | No |
| RF-Q3 | Estados en preparación/listo/entregado; demora destacada | H4 | Estados reflejados; alerta al superar el máximo | No | No |
| RF-Q4 | Carga manual del mozo | H4 | Sigue el mismo circuito | No | No |
| RF-W1 | Sitio: carta, ubicación, horarios, contacto, adaptable | H5 | Correcto en celular y PC con datos reales | No | No |
| RF-W2 | Acceso a reservas; reserva web impacta disponibilidad | H5 | Aparece en el panel de recepción | No | No |
| RF-W3 | GA4 + Search Console con sitemap | H5 | GA4 registra visitas en prueba; propiedad verificada | No | No |
| RNF-1 | Lighthouse rendimiento ≥90 (base 54/57) | H5 | Medición ≥90 | No | No |
| RNF-2 | Accesibilidad ≥95 (base 89); SEO y buenas prácticas ≥95 | H5 | Medición ≥95 | No | No |
| RNF-3 | Usuarios y roles | H5/H6 | Mozo no accede a administración de mesas; intento registrado | No | No |
| RNF-4 | Datos mínimos y aviso (Ley 25.326) | H3 | Solo nombre y teléfono; aviso en formulario | No | No |
| RNF-5 | Web, sin app nativa | H5/H6 | Chrome y Safari celular; Chrome PC | No | No |
| RNF-6 | Respaldo automático y restauración | H6 | Una restauración documentada | No | No |
| RNF-7 | Concurrencia | H6 | Turno simulado sin pérdidas; 95 % ≤5 s | No | No |

## 4. Lo que NO es alcance (Alcance §4)
Cobros/facturación/caja/sueldos; **control de stock** (CR-001); tablero para el Dueño, indicadores por turno, promociones, galería, FAQ estructuradas, delivery (CR-008 rechazado); app nativa, takeaway, marketing, redes, segunda sucursal; puesta en marcha en el local (el cliente ejecuta el Plan de Implantación después del 27/11); hosting y dominio de producción; soporte posterior. Tecnología planificada (S-03, a confirmar en H2): Node.js + Express + MySQL; sitio HTML/CSS/JS.

## 5. Discrepancias respecto de la Fase 0 anterior (corregidas)
| # | Fase 0 decía | Documentos reales dicen |
|---|---|---|
| 1 | Fuentes: Acta v6, Alcance/EDT v3, Cronograma v2 | Vigentes: Acta/Alcance/EDT/Plan v4 (07/10); v3 es la base anterior |
| 2 | "Reservas y Turnos 09/10 es hito exigible" | H3 reservas = 30/10 (v4) o 02/10 vencido (v3); 09/10 es el **Comité**, no un hito de producto |
| 3 | Hitos: Reservas 09/10, QR 23/10, Stock 06/11, Integración 13/11, Cierre 27/11 | H1–H7 y notas N1/N3/N4 (tabla §2). Control de stock **quitado** (CR-001) |
| 4 | "3 hitos sin fecha" | Todos tienen fecha |
| 5 | Módulos Cocina/Parrilla/Barra/Salón/Conciliación en duda | Paneles de recepción, cocina, parrilla, barra y mozo **sí** están (Alcance §1.6); conciliación/caja **excluida** (RP7) |
| 6 | "Documentos no están en el entorno" | Estaban en `D:\don valentin` (14 docs, 12+1 videos, 7 fotos, 9 referencias) |
| 7 | Puesta en marcha: etapas vs paralelo (A1) | Fuera de alcance: lo ejecuta el cliente con el Plan de Implantación |
| 8 | Stack sin decidir (A6) | Propuesto: Node/Express/MySQL (S-03); PostgreSQL del relevamiento queda como contradicción a confirmar |

## 6. Pendientes de confirmación humana
1. Constancia escrita de CR-009 en el PDF; ¿H1 ratificado por el Sponsor (I-08)? 2. Fecha de N4 (cátedra). 3. Encargado de Salón designado. 4. S-03 stack. 5. Hosting/dominio del cliente.

## 7. Regla de presentación de estado
Nada posterior a H2 se presenta como terminado. Cada requisito RF/RNF figura "No implementado / No probado" hasta que exista evidencia ejecutada (test, medición o conformidad del Sponsor). El prototipo visto en la grabación **no cuenta** como evidencia: no hay código en la carpeta ni se sabe su origen.


## 7. Estado del producto al 16/10/2026 (después de la revisión de Martín)

Lo que existe y está probado (45 tests de API/dominio contra MySQL real + 36 pruebas Playwright con axe):

| Pantalla / función | Hito | Estado en el panel |
| --- | --- | --- |
| Modelo de datos unificado (migración 0001) | H2 | Implementado y probado |
| Planilla de parametrización (franjas, aforo, tiempos, horario, **días de atención y cierres**, anticipación, tolerancia) con validación del Encargado y exportación CSV | H2 | Implementado y probado; valores **provisorios** hasta la validación (19–23/10) |
| Prototipos UX/UI del sitio y del panel, incluidos los módulos de H3–H5 (rotulados «Prototipo de pantalla · datos de ejemplo») | H2 | Implementado |
| Alta de reserva web e interna con asignación de mesa y control de aforo (RF-R1, RF-R2); rechazo de días sin atención | H3 (adelantado, sin conformidad) | Implementado y probado |
| Reservas: ver cualquier fecha (calendario) | H3 | Implementado |
| Buscar, modificar, cancelar, no-show (RF-R4) | H3 | **En construcción — Hito 3, 30/10/2026** (cartel en Reservas) |
| Estado del salón por franja, walk-in (RF-R3) | H3 | **En construcción — Hito 3** (pantalla con prototipo) |
| Mesas y QR único por mesa, código vigente impreso y visible, regeneración con confirmación (RF-Q1) | H4 (adelantado) | Implementado y probado |
| Pedido desde el QR, paneles de cocina/parrilla/barra, carga del mozo (RF-Q2–Q4) | H4 | **En construcción — Hito 4, 06/11/2026** (pantallas con prototipo) |
| Carta y precios: carta real visible en el panel; edición de precios para sitio y QR | H4 | Visible real; edición **en construcción — Hito 4** |
| Usuarios y roles con jerarquía (el Encargado no gestiona Administración) y auditoría de intentos (RNF-3) | H5/H6 | Implementado y probado |
| GA4 + Search Console (RF-W3) | H5 | **En construcción — Hito 5, 13/11/2026** |
| Lighthouse (RNF-1/2) | H5 | Medido: inicio celular 93–98, escritorio 100; a11y/BP/SEO 100 |

Adelantar una función no la da por aceptada: la conformidad del Sponsor sigue siendo la del hito correspondiente.

## 8. Estado del producto al 22/10/2026 (todo el alcance construido y probado)

Reemplaza la columna «Impl./Prob.» de la tabla del §3. Detalle por requisito, con su evidencia, en `docs/cierre/informe-final.md`; casos de aceptación para el Sponsor en `docs/pruebas/plan-aceptacion.md`.

| Hito | Requisitos | Implementado | Probado | Aceptación |
| --- | --- | --- | --- | --- |
| H3 (30/10) | RF-R1, RF-R2, RF-R3, RF-R4, RNF-4 | Sí | Sí (`reservas-h3`, `api.integration`, `hito3.spec`) | Pendiente: conformidad del Sponsor (CA-01 a CA-12) |
| H4 (06/11) | RF-Q1, RF-Q2, RF-Q3, RF-Q4 | Sí | Sí (`pedidos-h4`, `hito4.spec`) | Pendiente (CA-13 a CA-20) |
| H5 (13/11) | RF-W1, RF-W2, RF-W3, RNF-1, RNF-2, RNF-5 | Sí (GA4 y Search Console listos para las cuentas del local) | Sí (`hito5.spec`, `medicion-h5`, Lighthouse) | Pendiente (CA-21 a CA-26); RNF-1 en celular, observación media |
| H6 (20/11) | RNF-3, RNF-6, RNF-7, Plan de Implantación, manuales | Sí | Sí (`respaldo-h6`, `npm run carga`) | Pendiente: ejecución de la prueba de aceptación (CA-27 a CA-32) |
| H7 (27/11) | Aceptación y entrega | Actas redactadas | — | Firmas |
