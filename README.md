# Don Valentín Digital

Sistema digital de **Don Valentín**, parrilla familiar en San Miguel (Buenos Aires) desde 1994: sitio institucional con carta y reservas, panel de administración (reservas, mesas y QR, parámetros, usuarios y roles) y base para los pedidos por QR. Proyecto de la materia Dirección de Proyectos de la Tecnología (UADE).

## Estructura

| Carpeta           | Qué hay                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `apps/web`        | Sitio público y panel (React 19 + Vite + GSAP/ScrollTrigger + Lenis)           |
| `apps/api`        | API (Node 22 + Express 5 + PostgreSQL con `pg`, sesiones con cookie, argon2)   |
| `packages/shared` | Datos y reglas compartidas (local, parrilla libre, roles, hitos, validaciones) |
| `db/`             | Migraciones SQL y carta real (`db/data/carta.json`)                            |
| `e2e/`            | Pruebas Playwright (escritorio y celular, con axe WCAG 2.2 AA)                 |
| `docs/`           | Decisiones, trazabilidad, cronograma, dirección artística y evidencias         |
| `continuidad/`    | Archivos de traspaso entre agentes (Claude y Gemini)                           |

## Correr en desarrollo

Requiere Node 22+. La base es PostgreSQL 17 (Supabase en el ambiente de prueba).

```bash
npm install
npm run db:migrate && npm run db:seed   # crea tablas y carga la carta
npm run dev:api                         # API en :3000
npm run dev:web                         # sitio en :5173 (proxy /api a :3000)
```

Sin instalar nada: `npm run build` y después `node --experimental-strip-types apps/api/src/local.ts`. Levanta un PostgreSQL 17 temporal, carga datos de PRUEBA y sirve todo en http://localhost:3001 (usuario `encargado`, contraseña `donvalentin`; solo en esa vista local).

## Calidad

```bash
npm run verify   # typecheck + lint + prettier + 45 tests (API contra PostgreSQL 17 embebido)
npm run e2e      # build + 36 pruebas Playwright (escritorio y celular)
```

Lighthouse (16/10/2026, inicio): celular 93 a 98, escritorio 100; accesibilidad, buenas prácticas y SEO 100. Evidencias en `docs/evidencias/`.

## Despliegue previsto

Supabase (PostgreSQL) + Vercel. `vercel.json` corre `scripts/vercel-build.mjs`, que arma el sitio estático y una función para `/api`. Variables de entorno en Vercel: `DATABASE_URL` (Supabase → Connect → Transaction pooler), `DB_SSL=true`, `DB_POOL_MAX=3`, `NODE_ENV=production`, `PUBLIC_BASE_URL` (la URL pública del sitio) y `TRUST_PROXY=true`.
