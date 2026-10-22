# Restauración documentada — RNF-6 (22/10/2026)

Base del sistema local (PostgreSQL 17, la misma versión mayor que Supabase) con datos de prueba. Comandos:

```
RESPALDO_CLAVE=… npm run db:respaldo -- respaldo.dvr
RESPALDO_CLAVE=… DB_NAME=dv_restaurada npm run db:restaurar -- respaldo.dvr
```

```
## Respaldo
Respaldo listo: /tmp/claude-0/resp/respaldo.dvr (459 filas, 20 tablas, 2026-10-22T22:27:24.110Z).
tiempo: .662 s
tamaño: 9615 bytes

## Restauración en una base vacía (dv_restaurada)
Restauración completa: 459 filas.
┌──────────────────────┬────────┐
│ (index)              │ Values │
├──────────────────────┼────────┤
│ roles                │ 6      │
│ sectores_preparacion │ 3      │
│ sectores_salon       │ 1      │
│ parametros           │ 6      │
│ usuarios             │ 6      │
│ mesas                │ 30     │
│ franjas              │ 7      │
│ aforos               │ 7      │
│ clientes             │ 36     │
│ reservas             │ 36     │
│ ocupacion_franja     │ 9      │
│ sesiones_mesa        │ 6      │
│ tipos_solicitud      │ 14     │
│ categorias_carta     │ 14     │
│ productos            │ 126    │
│ variantes_producto   │ 152    │
│ pedidos              │ 0      │
│ pedido_items         │ 0      │
│ auditoria            │ 0      │
│ eventos_sitio        │ 0      │
└──────────────────────┴────────┘
tiempo: .978 s

## Segundo intento sobre la misma base (debe negarse)
La base de destino no está vacía (la tabla roles tiene datos).
## Clave equivocada
No se pudo abrir el respaldo: la clave no es la correcta o el archivo está dañado.
```

Además, la prueba automática `apps/api/test/respaldo-h6.integration.test.ts` restaura en otra base y compara el contenido de las 20 tablas (huella MD5 por tabla), verifica que el archivo no tenga datos en claro y que, después de restaurar, una reserva nueva no choque con los identificadores restaurados.

En el ambiente de prueba el respaldo corre solo todas las noches (03:15) con `.github/workflows/respaldo.yml`; necesita los secretos DATABASE_URL y RESPALDO_CLAVE en GitHub.
