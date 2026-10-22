# Prueba de carga de un turno — RNF-7 (2026-10-22)

Turno simulado de 127 s por HTTP real contra la API con PostgreSQL 17: 30 mesas abiertas con un comensal
pidiendo desde el QR en cada una, los paneles de parrilla, cocina y barra consultando cada 3 s y preparando, dos personas de
salón mirando el salón y entregando, y 20 visitantes del sitio navegando la carta y reservando a la vez.
Comando: `node --experimental-strip-types scripts/carga-turno.ts 120`

**Resultado: CUMPLE** el criterio (sin pérdidas y el 95 % de las respuestas en 5 s o menos).

- Respuestas: 4723, dentro de 5 s: 100.00 %. p95 general: 35 ms.
- Pedidos desde el QR enviados y confirmados: 306 (746 líneas). En la base: 306 pedidos y 746 líneas.
- Reservas web confirmadas: 187; rechazadas por falta de lugar: 2. En la base: 187.
- Mesas asignadas dos veces en la misma franja: 0. Franjas por encima del aforo: 0.
- Errores del servidor (5xx) o respuestas inesperadas: 0.

| Operación | Pedidos HTTP | p50 (ms) | p95 (ms) | Máximo (ms) |
|---|---|---|---|---|
| visita: carta | 942 | 5 | 12 | 682 |
| visita: info | 942 | 2 | 6 | 107 |
| reserva web: disponibilidad | 942 | 15 | 34 | 616 |
| QR: seguimiento | 598 | 6 | 11 | 42 |
| QR: enviar pedido | 306 | 9 | 282 | 338 |
| sector: cambiar estado | 259 | 9 | 56 | 96 |
| mozo: entregar | 230 | 10 | 21 | 33 |
| reserva web: confirmar | 189 | 11 | 154 | 201 |
| panel de sector | 119 | 10 | 20 | 74 |
| salón | 49 | 10 | 46 | 176 |
| mozo: listos | 48 | 24 | 41 | 73 |
| carta | 31 | 110 | 598 | 616 |
| abrir mesa | 30 | 5 | 9 | 14 |
| QR: ingreso | 30 | 157 | 202 | 233 |
| ingreso | 7 | 753 | 768 | 768 |
| qr | 1 | 83 | 83 | 83 |
