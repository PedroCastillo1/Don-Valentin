# Fase 0 — Inventario y puerta de aprobación (actualizado 15/10 con documentos reales)

> **Corrección:** donde esta auditoría decía que los documentos no estaban en el entorno, era un error mío: estaban en `D:\don valentin`. Fuente única y compartida con Gemini. Hitos y requisitos vigentes: `docs/trazabilidad.md`.

**Fecha:** 15/10/2026 · **Repo:** `don-valentin-digital` (workspace en la nube) · **Estado:** Fase 0 completada con pendientes. **No se desarrolló producto.**

Clasificación: ✅ Disponible y verificada · 🟡 Instalada sin verificar · ⏳ Pendiente · ⛔ No compatible · 🚧 Bloqueada con causa

## 1. Inventario del entorno
Ubuntu 24.04 · Claude Code 2.1.301 · Node 22.22 (npm, pnpm, yarn, bun) · Python 3.13 · git 2.43 (repo nuevo, commits firmados) · ffmpeg/ffprobe · Playwright 1.64 + Chromium 156 en `/opt/pw-browsers` · 2 CPU, 7,8 GB RAM. Red: solo salida permitida a registros npm, GitHub (raw/clone), claude.com, gsap.com, mcp.context7.com. Sin MCP servers de usuario. Skills de la plataforma y plugins de la cuenta (design, engineering, canva, SEO, etc.) ya presentes. El plugin de cuenta `security-guidance@synced` no carga: gana el oficial instalado en el proyecto.

## 2. Plugins y skills: estado

| Capacidad | Origen verificado | Estado | Evidencia / motivo |
|---|---|---|---|
| frontend-design | claude-plugins-official | ✅ | Generó `phase0/site/composicion.html`; se capturó en desktop y móvil |
| Impeccable 4.6.0 | pbakaus/impeccable (plugin) | ✅ | Critique real con hallazgos concretos; motor 0.1.15 bajado con sha256 verificado |
| UI/UX Pro Max 2.15.0 | nextlevelbuilder (plugin) | ✅ | `search.py` devolvió estilos reales (Editorial Grid) |
| code-simplifier | official | ✅ | Refactor de `descuento.ts`; 7/7 tests siguen pasando |
| claude-md-management | official | ✅ | `claude-md-improver` auditó CLAUDE.md; mejoras aplicadas |
| skill-creator | anthropics/skills | ✅ | `quick_validate.py` valida las 5 skills propias |
| Superpowers 6.4.1 | official (obra/superpowers, sha fijado) | 🟡 | 15 skills visibles en sesión limpia; flujo completo no ejercitado |
| feature-dev | official | 🟡 | Skill y 3 agentes cargan; flujo no ejercitado |
| code-review | official | 🟡 | Orientado a PRs (requiere PR/gh); no ejercitado |
| security-guidance 2.0.13 | official | 🟡 | 4 hooks cargados; no confirmé que disparen. La revisión de seguridad del fixture se hizo con revisión manual guiada, no con este plugin |
| claude-code-setup | official | 🟡 | Carga; no ejercitado |
| typescript-lsp | official | 🟡 | Plugin + `typescript-language-server` local instalados; servicio LSP no verificado en sesión interactiva |
| Playwright (plugin MCP) | official | 🟡 | La librería sí está verificada (ver §3); el servidor MCP no se ejercitó |
| Context7 | official | 🚧 | `mcp.context7.com` responde pero pide **autorización OAuth** del usuario. Mientras tanto, usar documentación oficial vía web |
| Vercel: react-best-practices, web-design-guidelines, composition-patterns, react-view-transitions, writing-guidelines | vercel-labs/agent-skills (nombres verificados) | 🟡 | Copiadas a `.claude/skills/`; no ejercitadas. `vercel-optimize` y las demás no se instalaron |
| PM: wbs, project-schedule, risk-register, raci-matrix, status-report, change-request, decision-log, project-charter, budget-plan | kenmulford/PMSkills (existen todas) | 🟡 | Scripts revisados (sin red ni ejecución dinámica); no ejecutados. **El repo no tiene licencia**: confirmar antes de redistribuir |
| PM: project-manager (PMBOK + EVM) | takusaotome/claude-skills-library (MIT) | 🟡 | Revisada; no ejercitada. Hay otras skills útiles de esa biblioteca no instaladas a propósito |
| borghei/Claude-Skills | — | ⏳ | No se instaló: los nombres `senior-pm` y `scrum-master` no se verificaron como skills sueltas (aparecen como agentes `cs-*`); el equipo no los necesita todavía |
| Skills propias `don-valentin-pm` | local | ✅ | Prueba real (§3) |
| `don-valentin-copywriting` | local | ✅ | Prueba real (§3) |
| `don-valentin-motion`, `-media`, `-seo` | local | 🟡 | Validan formalmente y se siguieron sus checklists a mano (§3), pero no se invocaron como skill; `-seo` no se ejercitó |
| Lenis, GSAP plugins de pago | — | ⛔ | No hay necesidad concreta; no instalados |

## 3. Pruebas ejecutadas (todo en `phase0/`, descartable)
- **Toolchain**: `npm run verify` en verde (tsc strict, ESLint, Prettier, 11 tests Vitest). Control negativo: un archivo con `any`, `var` y un tipo erróneo fue rechazado por tsc, ESLint y Prettier.
- **Playwright + axe**: página real en desktop 1440, móvil 390 y `reduced-motion`. GSAP 3.15 anima (opacidad 0,28→1, línea 0→320 px); con reduced motion queda el estado final; 0 errores de consola; 0 violaciones WCAG 2.2 AA. Las capturas revelaron un botón estirado que axe no detecta; se corrigió y se recapturó.
- **ffmpeg**: fuente 4K **sintética** → 1080p y 720p H.264 `+faststart`, poster AVIF y WebP; hash del original sin cambios. Los tamaños no sirven como referencia (video sintético).
- **Lighthouse 13.5** (móvil simulado, página trivial): Performance 100, Accesibilidad 100, Buenas prácticas 96, SEO 90; LCP 1,1 s, CLS 0, TBT 0 ms. **No son métricas del producto.**
- **PM**: matriz de trazabilidad con la skill `don-valentin-pm` → `docs/trazabilidad.md`. **Reemplazada** por la matriz real v4 (ver `docs/trazabilidad.md`): 18 requisitos con criterio, hitos H1–H7, 8 discrepancias corregidas.
- **Redacción**: texto neutro y publicitario reescrito en voseo sin inventar datos (`phase0/copy/`).
- **Seguridad**: fixture con inyección SQL, contraseña en claro y secreto hardcodeado → versión corregida (consultas parametrizadas, scrypt, secreto por entorno, JWT con vencimiento). **No tiene tests ni se ejecutó**; sigue sin rate limiting.
- **Composición + Impeccable**: la composición tiene una idea propia (nombre "grillado") pero el entorno es genérico, el CTA no lleva a ningún lado y la legibilidad en móvil es débil. No se aceptó como dirección creativa.

## 4. Conflictos y riesgos
1. Master prompt pide `vercel-react-best-practices`: el nombre es correcto. Los comandos `npx impeccable install` y `uipro init` se reemplazaron por sus plugins para no duplicar distribuciones.
2. Impeccable ejecuta hooks en cada edición y al cerrar la sesión usando un binario descargado de GitHub Releases (verificado con sha256 del mismo origen). Riesgo aceptado por el prompt; revisar si se quiere desactivar.
3. Alcance real (Alcance v4): reservas y turnos, pedidos por QR y sitio, con paneles de recepción/cocina/parrilla/barra/mozo; conciliación y caja excluidas. Ver `docs/trazabilidad.md`.
4. H2 vence el 16/10 y H3 el 30/10 según v4 **propuesta**; CR-009 sin aprobación registrada.
5. Las pruebas de Fase 0 usaron material sintético; el material real existe y abre, pero aún no se derivó ni se usó.
6. Safari/iOS y dispositivos reales: sin probar.

## 5. Necesita tu autorización o acción
- **Autorizar Context7** (OAuth).
- **Confirmar el resultado del Comité del 09/10** (CR-009 aprobada o no). Los insumos ya no faltan: están en `D:\don valentin`.
- Decidir A1–A6 de `docs/decisiones.md`.
- Cuentas del dueño (Google Business Profile, Search Console, dominio).
- Antes de producción: licencia de PMSkills, hosting y despliegue.

## 6. Estado de preparación
**Listo para la Fase 1 con la autorización de Martín y la confirmación de CR-009.** Listo = toolchain, skills propias de PM y redacción, diseño (Impeccable/frontend-design/UI-UX) y registros. **No verificado todavía** = los flujos de Superpowers, feature-dev, code-review, security-guidance, LSP y Context7: se ejercitan en la primera funcionalidad real.
