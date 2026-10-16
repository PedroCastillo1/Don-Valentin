# PROJECT_STATUS.md — estado real (actualizado 15/10/2026, Claude)

Convención: ✅ probado con evidencia ejecutada · 🟡 implementado, probado en parte · ⏳ pendiente. Solo se marca ✅ lo que tiene prueba.

## H2 (16/10)
| Entregable | Estado | Evidencia |
|---|---|---|
| Modelo de datos unificado | ✅ migración 0001 (19 tablas) aplicada en MySQL 8.4 real; seed con 30 mesas, 7 franjas, 14 tipos de solicitud, 126 productos / 152 variantes | `apps/api/test/api.integration.test.ts` (reconstruye `dv_test` desde cero en cada corrida) |
| Planilla de parámetros | 🟡 datos y API (`/api/admin/parametros`, edición, validación por elemento, estados documentado/provisorio/validado) probados; **pantalla admin pendiente**; exportación a .xlsx pendiente | test "planilla de parámetros" |
| Prototipos de interfaz | 🟡 hero + login + Inicio del admin funcionando con API real y capturados; **a la espera de visto bueno de Martín**; resto de pantallas pendientes | `docs/evidencias/n3-checkpoint/` |

## N3 (20/10) — demo con software funcionando
| Pieza | Estado |
|---|---|
| API: login/logout/sesión, CSRF, Origin, bloqueo, RBAC con auditoría de denegados | ✅ probado (31 tests contra MySQL real) |
| API: disponibilidad y reserva pública/interna con aforo y asignación de mesa | ✅ incluida prueba de 60 reservas simultáneas: 25 aceptadas, 0 sobreventas, 0 mesas repetidas |
| API: mesas, QR por mesa (SVG), `/m/:token`, sesión de mesa única con dos mozos simultáneos | ✅ probado |
| API: carta pública, usuarios, auditoría | 🟡 carta probada; usuarios/auditoría sin test dedicado |
| Web: hero (animación scroll, reduced-motion), login, Inicio admin con selector de día | 🟡 capturas desktop y móvil, 0 errores de consola; **sin axe ni Lighthouse todavía** |
| Web: Reservas (admin), Mesas y QR, Parámetros, Usuarios | ⏳ |
| Web pública: Reservar, Carta, Parrilla libre, Cómo llegar, landing `/m/:token` | ⏳ |
| E2E Playwright, axe, Lighthouse, revisión de seguridad manual documentada | ⏳ |

## Calidad
`npm run verify` en verde: typecheck + ESLint + Prettier + 34 tests (11 de dominio, 20 de API contra MySQL real, 3 de horario web). Pruebas de integración requieren MySQL en marcha (ver `PROJECT_CONTEXT.md`).
Seguridad: `SECURITY_GUIDANCE_DISABLE=0` fijado en `.claude/settings.json` y verificado ejecutando el hook directamente (con `=1` se saltea; con `=0` dispara con eval/innerHTML). La sesión de Claude Code ya iniciada conserva `=1` en su entorno: el cambio rige para sesiones nuevas.

## Fuera de N3 (no implementar de verdad; mostrar con hito y fecha)
Estado del salón, modificar/cancelar reservas (H3 30/10) · carta digital con pedidos y paneles por sector (H4 06/11) · medición del sitio (H5 13/11).

## Siguiente tarea
Ver `HANDOFF.md` → "Próxima acción exacta".
