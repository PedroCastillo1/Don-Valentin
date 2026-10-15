# Cierre de Fase 0 — 15/10/2026 (para autorizar la implementación)

## 1. Qué se resolvió
- Fuente única `D:\don valentin` verificada (14 docs, 13 videos, 7 fotos, 8 referencias; 0 ilegibles). Sin copias.
- CR-009 aprobada / línea base v4 vigente por confirmación del responsable (15/10); constancia en PDF pendiente. Matriz, cronograma, prioridades, decisiones y estado actualizados.
## 2. Material visual (visto, no solo abierto)
- **Fotos oficiales (7):** parrillero con costillares al asador frente a la vidriera; parrillada circular con achuras, pollo, costillas y guarniciones. Material real, fuerte, listo para derivar (1600 px de ancho: suficiente para sitio, no para impresión).
- **Videos (12):** carnes y brasas, planos de fuego y parrilla (≥8 con fuego/brasa sin personas: aptos para hero sin permisos de imagen); 2 con personas (asador con boina, manos cortando) → revisar autorización de imagen. Varios llevan nombre de stock (p. ej. Pexels: `1111421-hd…`, `12615145-uhd…`): **confirmar licencia/origen antes de publicar**; uno parece cocina coreana (kimchi) y no representa a la parrilla argentina. 6 son 4K verticales/horizontales; 6 tienen audio AAC (se quita para el hero).
- **Referencias (8):** estilo editorial rojo/crema con tipografía condensada en mayúsculas (Jones BBQ, Pretzels, Bake Today, "70-80s"); dos de dashboards (POS de café, médico, vuelos) para el panel interno: barra lateral, tarjetas, rejilla de productos. Dirección coherente con el sitio de la grabación: burdeos/rojo/negro, titulares condensados, botón rojo "Reservar mesa".
- **Grabación 15/10 (67 s):** muestra un **prototipo ya corriendo** (`localhost:3000`): sitio (la carta, el recorrido, cómo llegar, reservas) y panel (Reservas, Salón, Cocina, Parrilla, Barra, Mesas y QR, Carta, Conciliación) con aviso "reservas se validan el 30/10, QR 06/11, integración 13/11". No hay código en la carpeta; ver decisión A7.
## 3. Habilidades y entorno
| Capacidad | Estado | Evidencia |
|---|---|---|
| typescript-lsp | ✅ | `typescript-language-server` 6.0.3 devolvió el error real TS2322 sobre un archivo de prueba |
| security-guidance | ✅ con salvedad | El hook marcó `eval` e `innerHTML` en un fixture. **En esta sesión de nube la variable `SECURITY_GUIDANCE_DISABLE=1` lo desactiva**; no detectó la inyección SQL por concatenación → no reemplaza la revisión de seguridad |
| Superpowers 6.4.1 / feature-dev | 🟡 | 15 skills y 3 agentes presentes; flujos se ejercitan en la primera funcionalidad |
| code-review | 🟡 | Requiere PR |
| Context7 | 🚧 | Pide OAuth del usuario; hasta entonces, documentación oficial vía web |
| Toolchain TS/ESLint/Prettier/Vitest/Playwright/axe/Lighthouse/ffmpeg | ✅ | `npm run verify` verde (Fase 0) |
| Paquetes del stack S-03 | ✅ | `express` 5.3.0 y `mysql2` 3.24.6 se resuelven en npm |
| **Servidor MySQL en la nube** | ⛔ | Sin Docker daemon ni paquete apt (`mariadb-server` no disponible). Las pruebas con base real requieren otra vía (ver §4) |
## 4. Riesgos y decisiones que quedan para empezar
1. **Stack (A3):** Node/Express/MySQL (documentos) vs Next.js (prototipo). Define el esqueleto. 2. **Base de datos de pruebas:** sin MySQL aquí; opción: probar la capa de datos contra una MySQL en tu equipo o un servicio, y la lógica (aforo, asignación de mesas, parámetros) con tests unitarios puros. 3. Origen/licencia de videos y datos reales del local (precio, horarios, política de menores). 4. Constancia de CR-009. 5. Autorizar Context7.
## 5. Propuesta de arranque (tras tu autorización)
Día 1–2 (H2, 16/10): modelo de datos unificado (13 entidades), planilla de parámetros con valores a confirmar por el local, prototipos validados con Agustín; luego esqueleto del repositorio con la decisión del stack. Nada se declara implementado sin test ejecutado.
## 6. Autorización solicitada
☐ Autorizo iniciar la implementación (Fase 1) con la línea base v4 y las prioridades de `docs/prioridades.md`. Decisión A3 (stack): ______
