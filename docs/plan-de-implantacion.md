# Plan de Implantación — Don Valentín Digital

**Qué es:** la guía para poner en marcha el sistema en el local después de la aceptación final (Hito 7, 27/11/2026). Según el Alcance v4, la puesta en marcha en el local **la ejecuta el cliente**: este plan le deja los pasos, los responsables sugeridos, los controles y qué hacer si algo falla. Las fechas son relativas («semana 1») porque las elige el local.

**Qué se pone en marcha:** reservas y turnos (sitio y panel), estado del salón, pedidos por QR con paneles de cocina, parrilla y barra, pedido del mozo, carta y precios editables, sitio institucional y medición.

## 1. Antes de empezar (requisitos)

| # | Requisito | Responsable sugerido | Listo |
| --- | --- | --- | --- |
| 1 | **Cuentas a nombre del local:** Vercel (sitio), Supabase (base de datos) y el repositorio de GitHub, transferidos o con el dueño como administrador. | Dueño + equipo | ☐ |
| 2 | **Dominio:** decidir si se usa un dominio propio (por ejemplo, el que figura en el relevamiento) y apuntarlo a Vercel. Si se cambia la dirección del sitio, cargarla en `PUBLIC_BASE_URL` y `VITE_SITIO_URL` y **reimprimir los QR**. | Dueño | ☐ |
| 3 | **Planilla de parámetros validada** por el Encargado: franjas, aforo por franja, tolerancia de no-show, tiempos máximos por tipo de plato, días de atención y cierres, mesas con su capacidad y sector. Ningún valor queda «Provisorio». | Encargado de Salón | ☐ |
| 4 | **Carta y precios vigentes** revisados en «Carta y precios» (los que figuran como «Consultar» se completan o se dejan así a propósito). | Encargado | ☐ |
| 5 | **Usuarios reales**, uno por persona, con contraseña propia. Se desactivan los usuarios de prueba. | Encargado | ☐ |
| 6 | **Equipos:** una tablet o compu fija por sector (cocina, parrilla y barra) con el panel abierto, celulares de los mozos, y wifi estable en el salón y en la cocina. | Dueño | ☐ |
| 7 | **QR impresos** desde «Mesas y QR → Imprimir los QR», plastificados o en portacartel, uno por mesa, con el número a la vista. | Encargado | ☐ |
| 8 | **Respaldo nocturno activo:** secretos `DATABASE_URL` y `RESPALDO_CLAVE` cargados en GitHub; una ejecución manual exitosa; la clave guardada fuera del sistema. | Administración | ☐ |
| 9 | **Medición (opcional):** cuenta de Google Analytics 4 y Search Console del local, con `VITE_GA4_ID` y `VITE_GSC_VERIFICACION` cargados en Vercel. | Dueño | ☐ |
| 10 | **Seguridad:** cambiar todas las contraseñas y claves que se usaron durante el proyecto (base de datos, usuarios de prueba, clave del respaldo). | Administración | ☐ |

## 2. Capacitación (semana previa)

Una charla corta por puesto, con el manual impreso y el sistema abierto, practicando en un día sin reservas reales:

| Puesto | Manual | Duración sugerida | Práctica |
| --- | --- | --- | --- |
| Encargado de Salón | `docs/manuales/encargado.md` | 60 min | Cargar, buscar, modificar y cancelar reservas; registrar llegadas, walk-in y no-show; cambiar un precio; crear un usuario. |
| Mozos | `docs/manuales/mozo.md` | 30 min | Abrir y liberar mesas, cargar un pedido, entregar desde «Listos para entregar». |
| Cocina, parrilla y barra | `docs/manuales/sectores.md` | 15 min | Empezar y marcar listo; leer las aclaraciones y las demoras. |
| Administración | `docs/manuales/administracion.md` | 30 min | Usuarios, auditoría, respaldo y restauración. |

## 3. Puesta en marcha por etapas (propuesta)

Se recomienda entrar por partes, con el método actual (cuaderno y comanda en papel) **en paralelo** durante la primera semana de cada etapa, para comparar y no depender del sistema mientras el equipo aprende.

| Etapa | Cuándo | Qué se activa | Cómo se controla | Pasa a la siguiente si… |
| --- | --- | --- | --- | --- |
| 1. Reservas | Semana 1 | Reservas por teléfono y WhatsApp cargadas en el panel; reserva web abierta. | Al cierre, comparar el cuaderno con «Reservas» del día. | Una semana sin diferencias entre el cuaderno y el sistema. |
| 2. Salón | Semana 2 | «Estado del salón»: llegadas, walk-in y no-show en cada franja. | El Encargado revisa al final de cada turno que no queden mesas «reservadas» de grupos que ya se fueron. | El equipo lo usa sin ayuda en los turnos de más movimiento. |
| 3. Pedidos del mozo | Semana 3 | Paneles de cocina, parrilla y barra; los mozos cargan los pedidos en el celular. | Comanda en papel en paralelo los primeros días; comparar los tiempos y las demoras. | Ningún pedido perdido en la semana y tiempos dentro de los máximos de la planilla. |
| 4. QR para comensales | Semana 4 | QR en las mesas: el comensal pide solo. | El mozo pasa por la mesa después del primer pedido para ver que salió bien. | Pedidos por QR sin reclamos durante una semana. |

## 4. Día de la puesta en marcha (lista de control)

- ☐ Respaldo manual de la base antes de empezar (`npm run db:respaldo`).
- ☐ Paneles de sector abiertos y con la pantalla siempre encendida; wifi probado en cada puesto.
- ☐ Un pedido de prueba por sector antes de abrir, y luego cancelado.
- ☐ Usuarios de prueba desactivados.
- ☐ El Encargado tiene a mano el plan de contingencia (punto 7) y la comanda en papel.

## 5. Indicadores para las primeras semanas

Se miran en el panel («Medición del sitio», «Pedidos», «Inicio») sin herramientas extra:

| Indicador | Dónde se ve | Qué se espera |
| --- | --- | --- |
| Reservas web confirmadas por semana | Medición del sitio | Que crezcan a medida que se difunde el sitio. |
| Reservas con error (horario completo) | Medición del sitio | Si son muchas en una franja, revisar el aforo de la planilla. |
| Platos demorados por turno | Pedidos y paneles | Bajos y en baja; si una categoría se demora siempre, revisar su tiempo máximo. |
| No-show por semana | Reservas | Para decidir si conviene ajustar la tolerancia. |

## 6. Respaldo y recuperación

- **Automático:** todas las noches a las 03:15 (`.github/workflows/respaldo.yml`). Cada respaldo queda 30 días en GitHub (Actions → «Respaldo nocturno» → artefactos), cifrado.
- **Manual:** `RESPALDO_CLAVE=… DATABASE_URL=… DB_SSL=true npm run db:respaldo -- respaldo.dvr`.
- **Restaurar** (por ejemplo, si se borraron datos por error):
  1. Crear una base **vacía** (un proyecto nuevo de Supabase o una base nueva en el mismo servidor).
  2. Descargar el respaldo del día que se quiere recuperar.
  3. `RESPALDO_CLAVE=… DATABASE_URL=<base vacía> DB_SSL=true npm run db:restaurar -- respaldo.dvr`. El comando aplica la estructura, carga los datos y se niega a escribir sobre una base que ya tenga datos.
  4. Revisar en el panel las reservas y la carta, y apuntar el sitio a la base restaurada (`DATABASE_URL` en Vercel) y volver a publicar.
- La restauración se probó y está documentada en `docs/evidencias/hito6/restauracion.md`.

## 7. Contingencia (si el sistema no responde)

| Situación | Qué hacer en el momento | Después |
| --- | --- | --- |
| No hay internet en el local | Reservas en el cuaderno; pedidos con comanda en papel. Los paneles muestran «Sin conexión: reintentando…» y se recuperan solos. | Cargar en el panel las reservas tomadas a mano. |
| El sitio o el panel no cargan | Igual que arriba. Revisar el estado de Vercel y de Supabase en sus páginas de estado. | Si es una falla propia, volver a la versión anterior desde Vercel («Promote» de la publicación previa). |
| Se perdieron o se cargaron mal datos | No seguir cargando sobre el error; avisar a Administración. | Restaurar el respaldo de la noche anterior (punto 6) y volver a cargar lo del día. |
| Un QR impreso se perdió o lo copió alguien ajeno | En «Mesas y QR», generar un QR nuevo para esa mesa. | Imprimir solo ese QR y reemplazarlo. |

## 8. Riesgos de la implantación

| Riesgo | Probabilidad | Impacto | Respuesta |
| --- | --- | --- | --- |
| El personal sigue con el papel y no carga en el sistema | Media | Alto | Etapas cortas con un responsable por turno; el Encargado revisa al cierre. |
| Wifi débil en cocina o en el salón | Media | Alto | Probar la señal antes de la etapa 3; agregar un repetidor si hace falta. |
| Parámetros que no reflejan la realidad (aforo, tiempos) | Media | Medio | Revisarlos con los indicadores de las primeras semanas y ajustarlos en «Parámetros». |
| Pérdida de la clave del respaldo | Baja | Alto | Guardarla en dos lugares seguros fuera del sistema (por ejemplo, el gestor de contraseñas del dueño y un sobre cerrado). |
| Cuentas gratuitas de Vercel o Supabase que cambian sus condiciones | Baja | Medio | Revisar los avisos de ambos servicios; el respaldo permite mudar la base sin perder datos. |

## 9. Después de la puesta en marcha

El soporte posterior no forma parte del alcance del proyecto. Se entrega el código, la documentación técnica (`README.md`, `docs/`) y las pruebas automáticas (`npm run verify`, `npm run e2e`, `npm run carga`) para que cualquier proveedor pueda continuar el trabajo con seguridad.
