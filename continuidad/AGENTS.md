# AGENTS.md — Reglas compartidas (Claude Code y Gemini CLI)

Única fuente de verdad de **reglas de trabajo**. Contexto del proyecto: `PROJECT_CONTEXT.md`. Estado: `PROJECT_STATUS.md`. Traspaso: `HANDOFF.md`. Entrada rápida: `ESTADO_COMPARTIDO.md`.

## Arranque de sesión (obligatorio, en este orden)
1. Leer tu archivo propio (`CLAUDE.md` o `GEMINI.md`). 2. Leer este archivo. 3. Leer `PROJECT_STATUS.md`. 4. Leer `HANDOFF.md`. 5. Verificar el código real (`git status`, `git log -5`, `npm run verify`). 6. Comprobar qué pruebas pasan. 7. Continuar con la "próxima acción exacta" de `HANDOFF.md`.
Si lo que dice el HANDOFF no coincide con el código, **manda el código**; corregí el documento.

## Cierre de bloque y de turno
Al terminar un bloque importante: actualizar `PROJECT_STATUS.md`. **Antes de terminar cada turno: actualizar `HANDOFF.md`.** No esperar a quedarse sin uso. Commits chicos, en español, imperativo, una unidad de trabajo por commit.

## Protección del trabajo
- Nunca trabajan los dos agentes a la vez sobre los mismos archivos. El que arranca anota "EN CURSO: <agente>, <archivos>" en `HANDOFF.md` y lo borra al cerrar.
- No eliminar ni reemplazar funcionalidad comprobada por el otro agente sin justificarlo en `docs/decisiones.md`.
- Backup recuperable (commit o tag `respaldo-<fecha>`) antes de cambios estructurales.
- Tarea incompleta del agente anterior: verificarla y continuarla, no rehacerla.
- No modificar los documentos académicos originales (`documentacion/`). Los PDF/POD son de solo lectura.
- No sobrescribir configuración existente del otro agente sin revisarla.

## Honestidad de estado
"Terminado" = probado con evidencia ejecutada. Separar siempre: **comprobado / inferido / pendiente**. Nada de botones sin función, datos simulados presentados como reales ni documentación de funciones inexistentes. Datos de prueba siempre rotulados "(prueba)".

## Hitos y alcance (línea base v4, CR-009 aprobada por el responsable el 15/10/2026)
H2 16/10 · N3 20/10 (demo funcional) · H3 30/10 reservas y turnos · N4 03/11 (a confirmar) · H4 06/11 pedidos QR · H5 13/11 · H6 20/11 · H7 27/11. Una función futura se muestra con su estado exacto: `Programado para el Hito N — dd/mm/aaaa` (usar `textoProgramado()` de `@dv/shared`; no copiar a mano). Prohibidos los rellenos tipo "Próximamente, una experiencia increíble". En la web pública se ocultan las funciones futuras; en el admin se muestran con hito y fecha. No exponer internos académicos en la web pública. N3 ≠ aceptación de H3/H4.

## Arquitectura y código
Node 22 + Express 5 + MySQL 8.4 + TypeScript estricto + React 19 + Vite. Monorepo npm: `packages/shared` (`@dv/shared`: dominio, roles, esquemas zod, hitos), `apps/api`, `apps/web`. SQL parametrizado siempre; validación zod en el borde; autorización del lado del servidor (`exigirPermiso`); errores en español claro. Migraciones versionadas en `db/migrations` (con checksum), nunca editar una ya aplicada: agregar otra.
Convenciones: identificadores en inglés o español de dominio ya usado; textos al usuario en español argentino con voseo. Dependencias fijadas, sin servicios pagos sin autorización.

## Seguridad (no negociable)
Contraseñas con argon2id; sesión opaca httpOnly + SameSite=Strict + token CSRF + verificación de Origin; bloqueo tras 5 intentos; rate limit; CSP estricta (`font-src 'self'`: nada de data: URIs, Vite con `assetsInlineLimit: 0`); RNF-3: intentos denegados quedan en `auditoria`; RNF-4: solo nombre y teléfono + aviso (Ley 25.326). Sin credenciales en frontend ni en el repo (`.credenciales-prueba.json` está ignorado). Revisión manual de seguridad además de los hooks; `SECURITY_GUIDANCE_DISABLE=0` está fijado en `.claude/settings.json`.

## Diseño, motion, SEO, rendimiento
Dirección artística original (no reutilizar el prototipo rechazado): ver `docs/direccion-artistica.md`. Papel/brasa/tinta, Caprasimo + Instrument Sans, fotos y videos reales del local. Motion con GSAP, siempre con alternativa `prefers-reduced-motion`. Accesibilidad AA (axe), foco visible, contraste. Medios: originales intocables en `media/originals/`, derivados en `apps/web/public/media`; verificar licencia y derechos de imagen antes de publicar (los 12 videos parecen stock: **no publicar sin confirmar origen**; hay personas en fotos 1, 4, 5 y 7). Metas H5: Lighthouse rendimiento ≥90, accesibilidad/SEO/buenas prácticas ≥95.

## Pruebas
`npm run verify` (typecheck + lint + formato + vitest). Las pruebas de integración corren contra **MySQL real** (`dv_test`, ver `PROJECT_CONTEXT.md` §Entorno). Playwright para E2E y capturas (desktop 1440, móvil 390, reduced-motion). Evidencias en `docs/evidencias/`.
