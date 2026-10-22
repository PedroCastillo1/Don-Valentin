# Lighthouse — Hito 5 (22/10/2026)

Sistema local (build de producción servido por la API), Lighthouse 13, Chromium headless. Celular: Moto G simulado con red 4G lenta y CPU ×4. Una corrida por página; en celular el rendimiento varía ±6 puntos entre corridas.

| Modo | Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| celular | / | 88 | 100 | 96 | 100 | 3.2 s | 240 ms | 0 |
| celular | /carta | 84 | 100 | 96 | 100 | 3.2 s | 300 ms | 0.078 |
| celular | /parrilla-libre | 92 | 100 | 96 | 100 | 2.6 s | 210 ms | 0 |
| celular | /reservar | 86 | 100 | 96 | 100 | 3.3 s | 260 ms | 0 |
| celular | /como-llegar | 87 | 100 | 96 | 100 | 3.1 s | 250 ms | 0 |
| escritorio | / | 100 | 100 | 96 | 100 | 0.6 s | 30 ms | 0 |
| escritorio | /carta | 98 | 100 | 96 | 100 | 0.7 s | 10 ms | 0.083 |
| escritorio | /parrilla-libre | 99 | 100 | 96 | 100 | 0.7 s | 0 ms | 0 |
| escritorio | /reservar | 100 | 100 | 96 | 100 | 0.7 s | 0 ms | 0.004 |
| escritorio | /como-llegar | 100 | 100 | 96 | 100 | 0.6 s | 0 ms | 0 |
