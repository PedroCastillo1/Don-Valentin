# Informe de estado y cierre técnico — Don Valentín Digital

**Fecha de corte:** 22/10/2026 · **Línea base vigente:** v4 (solicitud de cambio n.º 9) · **Cierre:** Hito 7, 27/11/2026

## 1. Resumen

Al 22/10/2026 están **construidas y probadas todas las funciones del alcance**: reservas y turnos (H3), pedidos por QR (H4), sitio con medición (H5), y respaldo, carga y documentación de implantación (H6). Lo adelantado se acepta recién en la fecha de su hito, con la conformidad del Sponsor (ver `docs/pruebas/plan-aceptacion.md`).

## 2. Estado por hito

| Hito | Fecha v4 | Qué entrega | Estado técnico al 22/10 | Pendiente para cerrar |
| --- | --- | --- | --- | --- |
| H1 | 28/08 | Acta, relevamiento y alcance | Cumplido | — |
| H2 | 16/10 | Prototipos, modelo de datos y parametrización | Aprobado | Validación de la planilla por el Encargado |
| H3 | 30/10 | Gestor de reservas y turnos | Construido y probado (RF-R1 a RF-R4, RNF-4) | Conformidad del Sponsor (CA-01 a CA-12) |
| H4 | 06/11 | Pedidos por QR | Construido y probado (RF-Q1 a RF-Q4) | Conformidad del Sponsor (CA-13 a CA-20) |
| H5 | 13/11 | Integración y sitio en ambiente de prueba | Construido y probado (RF-W1 a RF-W3, RNF-1/2/5) | Publicación de esta versión; cuentas de GA4 y Search Console del local (CA-23); medición de PageSpeed en el ambiente de prueba (CA-24/25) |
| H6 | 20/11 | Pruebas integrales y Plan de Implantación | Respaldo y restauración (RNF-6) y carga (RNF-7) probados; plan de aceptación, manuales y Plan de Implantación redactados | Ejecución de la prueba de aceptación con el Sponsor (≥95 %, sin críticos ni altos) |
| H7 | 27/11 | Aceptación final y cierre | Acta de aceptación y acta de entrega redactadas (sin firmar) | Firmas, entrega de credenciales y lecciones aprendidas del equipo |

## 3. Requisitos

| Requisito | Implementado | Probado | Evidencia |
| --- | --- | --- | --- |
| RF-R1 Alta de reserva | Sí | Sí | `api.integration`, `flujos.spec` |
| RF-R2 Asignación por capacidad sin superar el aforo | Sí | Sí | 60 reservas simultáneas; `reservas-h3` (concurrencia) |
| RF-R3 Estado del salón, walk-in y no-show | Sí | Sí | `reservas-h3`, `hito3.spec` |
| RF-R4 Buscar, modificar y cancelar | Sí | Sí | `reservas-h3`, `hito3.spec` |
| RF-Q1 QR por mesa sin instalar nada | Sí | Sí | 30 QR probados; hoja imprimible |
| RF-Q2 Pedido al sector correcto en ≤ 5 s | Sí | Sí | `pedidos-h4`, `hito4.spec` |
| RF-Q3 Estados y alerta por demora | Sí | Sí | `pedidos-h4` |
| RF-Q4 Carga del mozo | Sí | Sí | `pedidos-h4`, `hito4.spec` |
| RF-W1 Sitio con datos reales | Sí | Sí | `flujos.spec`, revisiones del 16/10 y 22/10 |
| RF-W2 Reserva web en el panel | Sí | Sí | `flujos.spec` |
| RF-W3 GA4 + Search Console con sitemap | Sí (medición propia activa; GA4 y Search Console listos para las cuentas del local) | Sí | `hito5.spec`, `medicion-h5` |
| RNF-1 Rendimiento ≥ 90 | Sí en computadora (98–100); inicio en celular 88–96 en casi todas las corridas (una dio 76); páginas interiores en celular 84–92 | Parcial | `docs/evidencias/hito5/lighthouse.md` |
| RNF-2 Accesibilidad, SEO y buenas prácticas ≥ 95 | Sí (100 / 100 / 96) | Sí | idem; axe sin violaciones |
| RNF-3 Usuarios, roles y auditoría | Sí | Sí | `api.integration`, `pedidos-h4` |
| RNF-4 Datos mínimos y aviso | Sí | Sí | `api.integration` |
| RNF-5 Web en Chrome y Safari | Sí | Sí (Chromium escritorio y celular) | Playwright; Safari a confirmar en la prueba de aceptación |
| RNF-6 Respaldo y restauración | Sí | Sí | `respaldo-h6`, `docs/evidencias/hito6/restauracion.md` |
| RNF-7 Concurrencia | Sí | Sí | `docs/evidencias/hito6/carga-turno.md` |

## 4. Calidad

- **Pruebas automáticas:** pruebas de integración contra PostgreSQL 17 y recorridos de punta a punta en navegador (computadora y celular) con revisión de accesibilidad (axe, WCAG 2.2 AA). Se corren con `npm run verify` y `npm run e2e`.
- **Carga:** turno de 2 minutos con 30 mesas pidiendo, paneles, mozos y 20 visitantes reservando: 4.723 respuestas, el 100 % en 5 segundos o menos (p95 de 35 ms), sin pérdidas ni sobreventa.
- **Observación abierta (media):** el rendimiento en celular de las páginas interiores (84–92 en Lighthouse simulado) está por debajo de 90 por el costo de las animaciones. Opción para mejorarlo: cargar la librería de animación después de la primera pintura, lo que cambia levemente la entrada animada aprobada. Se decide con el equipo.

## 5. Valor ganado

El último corte con horas registradas es el del 06/10 (SPI 0,67; EV 255 h; PV 378,2 h; AC 255 h). El corte de cierre se calcula con la planilla de horas del equipo:

| Corte | PV (h) | EV (h) | AC (h) | SPI | CPI |
| --- | --- | --- | --- | --- | --- |
| 06/10 | 378,2 | 255 | 255 | 0,67 | 1,00 |
| Cierre | | | | | |

## 6. Pendientes que no dependen del desarrollo

1. Conformidad del Sponsor en cada hito y firma del acta de aceptación final.
2. Validación de la planilla de parámetros por el Encargado de Salón.
3. Constancia firmada de la solicitud de cambio n.º 9.
4. Cuentas del local: dominio, Google Analytics 4 y Search Console; transferencia de Vercel y Supabase.
5. Fecha de la Nota 4 (presentación final) con la cátedra.
