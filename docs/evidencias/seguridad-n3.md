# Revisión de seguridad manual — N3 (15/10/2026, Claude)

Hecha además de los hooks (`security-guidance`, ahora activo con `SECURITY_GUIDANCE_DISABLE=0` en `.claude/settings.json`; verificado ejecutando el hook: con `=1` se saltea, con `=0` avisa sobre `eval`/`innerHTML`). Alcance: API y web en desarrollo. **No** es una auditoría de producción (sin TLS real ni hosting).

| Control | Cómo se comprobó | Resultado |
|---|---|---|
| Inyección SQL | consultas parametrizadas; pruebas automáticas con `' OR 1=1--` en query y en el nombre de una reserva (se guarda como texto, la tabla sigue) | ✅ |
| Autenticación | argon2id; mismo mensaje para usuario inexistente y clave errónea; bloqueo a los 5 intentos aunque luego llegue la clave correcta; logout invalida el token | ✅ test |
| Sesión | cookie `httpOnly` + `SameSite=Strict`; token opaco con hash en base | ✅ test |
| CSRF | escritura sin `X-CSRF-Token` → 403; `Origin` ajeno → 403 | ✅ test |
| Autorización (RNF-3) | mozo/cocina reciben 403 en rutas de administración; el intento queda en `auditoria` como `denegado`; solo el Encargado valida la planilla | ✅ test + E2E |
| Rate limit | reserva pública 8/10 min por IP → 429; login 20/15 min | ✅ test (reserva) · login: probado por bloqueo de cuenta, no por límite de IP |
| Cabeceras | CSP estricta (`script-src 'self'`, `frame-ancestors 'none'`, `font-src 'self'`), nosniff, no-referrer, COOP/CORP, sin `x-powered-by` | ✅ curl |
| Entradas hostiles | JSON roto → 400; cuerpo de 30 KB → 413 (antes era 500: corregido); path traversal devuelve `index.html`, no archivos | ✅ |
| Datos personales (RNF-4) | solo nombre y teléfono; aviso obligatorio en el formulario (Ley 25.326); la mesa asignada no se expone al comensal | ✅ E2E |
| Secretos | sin credenciales en el repo; `.credenciales-prueba.json` ignorado; claves de prueba aleatorias | ✅ |
| Dependencias | `npm audit --omit=dev`: 0 vulnerabilidades | ✅ |

**Pendiente / no cubierto:** HSTS y `Secure` en cookie solo se activan en producción (sin probar con TLS); `trust proxy` depende del hosting; límite de tasa por IP detrás de proxy; sin pruebas de carga (RNF-7 es H6); sin rotación de claves ni recuperación de contraseña (el Encargado crea usuarios).
