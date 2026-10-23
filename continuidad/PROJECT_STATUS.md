# PROJECT_STATUS.md — estado real (actualizado 22/10/2026, Gemini CLI)

Convención: ✅ probado con evidencia ejecutada · 🟡 implementado, probado en parte · ⏳ pendiente. Solo se marca ✅ lo que tiene prueba.

## Actualización 22/10/2026 (H3 a H6 y mejoras de usabilidad en pedidos, QR, parámetros y reservas)
- **H3 (Reservas y estado del salón) y H4 (Pedidos QR, paneles de sector, mozo y carta):** ✅ implementados y verificados sobre PostgreSQL 17 (`embedded-postgres` en pruebas y Supabase en producción).
- **Mejoras de usabilidad del 22/10 (Gemini CLI):** ✅
  - Búsqueda precisa de productos en `Carta`, `QR` y `Pedido del mozo` (solo nombre y categoría específica, sin falsos positivos por grupo o nota), con normalización de tildes, fracciones y variantes (`muza`/`mozzarella`).
  - Controles `−` / `+` de a 1 unidad en `Pedido del mozo` y carrito colapsable (`Ocultar lista` / `Ver lista`) en el celular QR (`MesaQr.tsx`).
  - Tarjetas de ítems en `/admin/pedidos` en dos filas (título completo arriba, botones de estado abajo) sin texto comprimido verticalmente.
  - Panel de `/admin/sectores` (`Cocina, parrilla y barra`) con tickets horizontales compactos, scroll por columna y filtro por mesa + buscador.
  - Editor visual en `/admin/parametros`: botones de días de atención con rótulo explícito `Abierto` / `Cerrado` y selector de calendario (`<input type="date">`) con chips removibles para `dias_cerrados`.
  - En `/admin/reservas` y `/admin/salon`: botón `Volver a confirmada` (`POST /api/admin/reservas/:id/reabrir`) para deshacer `no-show`, `llegada` o `cancelada`, y edición completa de `mesa`, `fecha`, `horario`, `personas`, `nombre`, `teléfono` y `comentarios` incluso durante el día/franja en curso.
- **Verificación:** `npm run verify` con **80/80 pruebas verdes** (9 archivos) + E2E Playwright (**43/43 pruebas verdes** en `flujos.spec.ts`, `hito3.spec.ts`, `hito4.spec.ts` y `revision-22-10.spec.ts`) con 0 violaciones `axe-core` y 0 px de desborde horizontal.

## H2 (16/10)
| Entregable | Estado | Evidencia |
|---|---|---|
| Modelo de datos unificado | ✅ migración 0001 (19 tablas) aplicada; seed con 30 mesas, 7 franjas, 14 tipos de solicitud, 126 productos / 152 variantes | `apps/api/test/api.integration.test.ts` |
| Planilla de parámetros | ✅ API y pantalla `/admin/parametros` con edición visual de días/fechas/horas, validación solo Encargado y exportación CSV | `flujos.spec.ts` + `api.integration.test.ts` |
| Prototipos de interfaz | ✅ Web pública y panel administrativo completos y verificados | `e2e/*.spec.ts` |

## Siguiente tarea
Ver `HANDOFF.md` → "Próxima acción exacta".
