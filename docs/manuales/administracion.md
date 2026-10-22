# Manual de Administración

Administración tiene todo lo del [Encargado de Salón](encargado.md), y además:

- **Usuarios:** crea y desactiva a cualquier usuario, incluidos los Encargados y otros usuarios de Administración.
- **Auditoría:** en «Usuarios y roles» ve los últimos intentos de acceso denegados. Además, el sistema guarda un registro de los cambios importantes: precios con su valor anterior y el nuevo, reservas modificadas o canceladas, y altas y bajas de usuarios.
- **Parámetros:** los puede editar, pero **la validación de la planilla es del Encargado de Salón**, que conoce la operación.

## Respaldo de la información

- La base se respalda sola todas las noches (03:15), cifrada. Los respaldos de los últimos 30 días quedan en GitHub, en la sección «Actions» del repositorio, tarea «Respaldo nocturno».
- Para restaurar se necesita la **clave del respaldo** (secreto RESPALDO_CLAVE): guardala fuera del sistema, en un lugar seguro. Sin esa clave, el respaldo no se puede abrir.
- El procedimiento de restauración está en el [Plan de Implantación](../plan-de-implantacion.md#respaldo-y-recuperación).

## Cuentas externas del local

Dominio, Vercel (sitio), Supabase (base de datos), Google Analytics y Search Console son del local. Las credenciales se entregan en el acta de entrega y se cambian el día de la puesta en marcha.
