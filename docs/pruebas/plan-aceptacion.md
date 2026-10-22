# Plan de prueba de aceptación — Don Valentín Digital (Hito 6)

**Objetivo:** que el Sponsor y el Encargado de Salón comprueben, en el ambiente de prueba, que cada requisito del Alcance v4 funciona con sus propias manos, antes de la aceptación final (Hito 7, 27/11/2026).

**Criterio de aprobación (Alcance v4, H6):** al menos el 95 % de los casos aprobados y ningún defecto crítico ni alto abierto. Con 32 casos, se puede aprobar con hasta un caso observado de severidad media o baja.

**Ambiente:** el sitio publicado en el ambiente de prueba, un celular con Chrome o Safari, una computadora con Chrome y la hoja de QR impresa. Usuarios de prueba: uno por rol (Administración, Encargado, Mozo, Parrilla, Cocina y Barra), creados por el Encargado desde «Usuarios y roles».

**Cómo se ejecuta:** el equipo guía, y el Sponsor o el Encargado hace cada paso. En «Resultado» se anota *Aprobado*, *Observado* (con severidad: crítica, alta, media o baja) o *No aplica*. Cada caso tiene además una prueba automática que lo repite en cada cambio del código: es la evidencia técnica, no reemplaza la conformidad.

**Severidad de un defecto:**

| Severidad | Qué significa |
| --- | --- |
| Crítica | Impide operar un turno o pierde datos (por ejemplo, una reserva o un pedido que no llega). |
| Alta | Una función del alcance no hace lo que dice el criterio y no hay alternativa en el sistema. |
| Media | Funciona, pero con un error que tiene alternativa (otro camino en el sistema). |
| Baja | Texto, estética o comodidad, sin efecto en la operación. |

## Reservas y turnos (Hito 3)

| Caso | Requisito | Pasos | Resultado esperado | Evidencia automática | Resultado | Firma |
| --- | --- | --- | --- | --- | --- | --- |
| CA-01 | RF-R1 | En el celular, entrar a «Reservar», cargar nombre, teléfono, personas, día y horario, aceptar el aviso y enviar. | Aparece el código de la reserva; el Encargado la ve en «Reservas» del día. | `flujos.spec.ts` › reservar: sin aviso no se puede enviar; con aviso se confirma y aparece en el panel | | |
| CA-02 | RF-R1 | Desde el panel, cargar 10 reservas telefónicas para distintos horarios y cantidades. | Las 10 quedan guardadas con mesa asignada, sin errores. | `api.integration` › crea una reserva…; `reservas-h3` | | |
| CA-03 | RF-R2 | Llenar una franja hasta su aforo (planilla) e intentar una reserva más. | El sistema no la acepta y avisa que no hay lugar. Ninguna mesa queda con dos reservas. | `api.integration` › 60 reservas simultáneas nunca superan el aforo ni repiten mesa | | |
| CA-04 | RF-R2 | Reservar para 8 personas. | Se asigna una mesa de capacidad suficiente (la más ajustada). | `dominio.test` › elige la mesa más chica que alcance | | |
| CA-05 | RF-R3 | Abrir «Estado del salón», recorrer las franjas del día. | Cada una de las 30 mesas figura libre, reservada u ocupada según las reservas y los grupos sentados. | `hito3.spec.ts`; `reservas-h3` › una mesa abierta por el mozo… figura ocupada | | |
| CA-06 | RF-R3 | Con un grupo que llega, tocar su mesa y «Registrar llegada». | La mesa pasa a ocupada y queda habilitada para pedir por QR. | `reservas-h3` › la llegada solo se registra el día de la reserva… | | |
| CA-07 | RF-R3 | Sentar un grupo sin reserva («Sentar grupo») en la franja en curso. | Se asigna mesa libre, la mesa queda ocupada y cuenta para el aforo. | `reservas-h3` › walk-in: toma una mesa libre… | | |
| CA-08 | RF-R3 | Con una reserva que no se presentó, esperar la tolerancia y «Marcar no-show». | Antes de la tolerancia no se permite; después, la mesa queda libre. | `reservas-h3` › no-show: antes de la tolerancia se rechaza… | | |
| CA-09 | RF-R4 | Buscar una reserva por nombre (sin acentos), por teléfono y por código. | La encuentra en cualquier fecha. | `reservas-h3` › busca por nombre sin importar acentos… | | |
| CA-10 | RF-R4 | Modificar una reserva: otro día, otro horario y más personas. | Se guarda; el cupo anterior queda libre y se toma el nuevo. | `reservas-h3` › cambiar de día y horario libera el cupo anterior… | | |
| CA-11 | RF-R4 | Cancelar una reserva y volver a reservar ese mismo lugar. | La cancelación libera la mesa: la nueva reserva la obtiene. | `reservas-h3` › cancelar libera la mesa para otra reserva… | | |
| CA-12 | RNF-4 | Revisar el formulario público de reserva. | Pide solo nombre y teléfono como datos personales y muestra el aviso de uso de datos (Ley 25.326); sin aceptarlo no se envía. | `api.integration` › exige el aviso de datos (RNF-4) | | |

## Pedidos por QR (Hito 4)

| Caso | Requisito | Pasos | Resultado esperado | Evidencia automática | Resultado | Firma |
| --- | --- | --- | --- | --- | --- | --- |
| CA-13 | RF-Q1 | Escanear con el celular los 30 QR de la hoja impresa. | Cada uno abre su mesa (el número coincide) sin instalar nada. | `pedidos-h4` › los 30 QR abren su mesa | | |
| CA-14 | RF-Q1 | Escanear el QR de una mesa sin habilitar. | Muestra la carta y avisa que hay que pedirle al mozo que habilite la mesa; no deja pedir. | `pedidos-h4` › sin sesión abierta no se puede pedir… | | |
| CA-15 | RF-Q2 | Con la mesa habilitada, pedir desde el celular una carne, una pizza y una bebida. | Cada ítem aparece en su panel (parrilla, cocina y barra) en 5 segundos o menos. | `hito4.spec.ts`; `pedidos-h4` › el pedido se reparte por sector y aparece en cada panel en menos de 5 segundos | | |
| CA-16 | RF-Q3 | En cada panel, pasar el ítem a «En preparación» y a «Listo». | El comensal ve el estado en su celular («En preparación», «Listo, ya viene»). | `hito4.spec.ts` | | |
| CA-17 | RF-Q3 | Dejar un ítem sin preparar más que su tiempo máximo (planilla). | El panel lo marca «demorado» y avisa cuántos platos superaron el tiempo. | `pedidos-h4` › un ítem que supera el tiempo máximo… figura demorado | | |
| CA-18 | RF-Q4 | El mozo carga un pedido para una mesa desde «Pedido del mozo». | Sigue el mismo circuito: llega a los sectores y el mozo lo entrega desde «Listos para entregar». | `pedidos-h4` › recibido → en preparación → listo → entregado… | | |
| CA-19 | RF-Q1 | Liberar la mesa desde «Mesas y QR» y volver a pedir desde el celular del grupo anterior. | Ese celular ya no ve ni pide; el grupo siguiente empieza con la cuenta en cero y el mismo QR. | `pedidos-h4` › al liberar la mesa, el celular del grupo anterior ya no ve ni pide… | | |
| CA-20 | Carta | El Encargado cambia un precio y marca un producto como agotado. | En menos de un minuto el sitio y el QR muestran el precio nuevo y el producto no aparece; queda en la auditoría. | `pedidos-h4` › el Encargado cambia un precio…; › un producto agotado desaparece… | | |

## Sitio e integración (Hito 5)

| Caso | Requisito | Pasos | Resultado esperado | Evidencia automática | Resultado | Firma |
| --- | --- | --- | --- | --- | --- | --- |
| CA-21 | RF-W1 | Recorrer el sitio en el celular y en la computadora: inicio, carta, parrilla libre, cómo llegar y reservar. | Datos reales del local (carta, ubicación, horarios, contacto), sin elementos cortados ni desplazamiento de costado. | `flujos.spec.ts` (sitio público); `revision-16-10`; `revision-22-10` | | |
| CA-22 | RF-W2 | Reservar desde el sitio y mirar el panel de recepción. | La reserva web aparece en el panel y descuenta disponibilidad. | `flujos.spec.ts` › reservar… aparece en el panel | | |
| CA-23 | RF-W3 | Con las cuentas del local: cargar el ID de GA4 y la verificación de Search Console, publicar, visitar el sitio y aceptar la medición. | GA4 registra la visita en tiempo real; Search Console verifica la propiedad y acepta el mapa del sitio. La «Medición del sitio» del panel muestra la visita. | `hito5.spec.ts`; `medicion-h5` | | |
| CA-24 | RNF-1 | Medir el inicio con PageSpeed Insights (celular). | Rendimiento de 90 o más. | `docs/evidencias/hito5/lighthouse.md` | | |
| CA-25 | RNF-2 | Medir con PageSpeed Insights las cinco páginas públicas. | Accesibilidad de 95 o más; SEO y buenas prácticas de 95 o más. | `docs/evidencias/hito5/lighthouse.md`; axe en `flujos.spec.ts` | | |
| CA-26 | RNF-5 | Usar el sitio y el panel en Chrome y Safari del celular y en Chrome de la computadora. | Todo funciona como web, sin instalar aplicaciones. | Recorridos en escritorio y celular (`playwright.config.ts`) | | |

## Seguridad, respaldo y carga (Hito 6)

| Caso | Requisito | Pasos | Resultado esperado | Evidencia automática | Resultado | Firma |
| --- | --- | --- | --- | --- | --- | --- |
| CA-27 | RNF-3 | Ingresar como mozo e intentar entrar a «Parámetros» o «Usuarios y roles» (escribiendo la dirección). | No tiene acceso; el intento queda registrado en la auditoría. | `flujos.spec.ts` › el mozo no ve ni alcanza la administración…; `api.integration` › RBAC | | |
| CA-28 | RNF-3 | Ingresar como cocina: ver el panel. | Ve solo los pedidos de su sector y no puede entregar ni cancelar. | `pedidos-h4` › cada puesto solo toca lo suyo | | |
| CA-29 | RNF-3 | El Encargado intenta desactivar a Administración. | No puede; el intento queda auditado. | `api.integration` › jerarquía… | | |
| CA-30 | RNF-6 | Correr el respaldo, restaurarlo en una base vacía y comparar. | La base restaurada tiene los mismos datos y el sistema sigue funcionando sobre ella. | `respaldo-h6`; `docs/evidencias/hito6/restauracion.md` | | |
| CA-31 | RNF-7 | Simular un turno completo: 30 mesas pidiendo, paneles, mozos y reservas web a la vez. | Ningún pedido ni reserva perdidos; el 95 % de las respuestas en 5 segundos o menos. | `npm run carga`; `docs/evidencias/hito6/carga-turno.md` | | |
| CA-32 | RNF-3 | Cerrar sesión y usar el botón «atrás» del navegador. | El panel pide ingresar de nuevo. | `api.integration` › cerrar sesión invalida el token | | |

## Resumen de la ejecución

| Total de casos | Aprobados | Observados (crítica / alta / media / baja) | Porcentaje aprobado | ¿Cumple el 95 % y sin críticos ni altos? |
| --- | --- | --- | --- | --- |
| 32 | | | | |

Conformidad del Sponsor: ____________________ Fecha: ____/____/2026

Encargado de Salón: ____________________ Fecha: ____/____/2026
