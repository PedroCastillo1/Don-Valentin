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
