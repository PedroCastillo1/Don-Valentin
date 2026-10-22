-- Hito 3 (RF-R3, RF-R4): llegada, walk-in, cancelación y no-show.
-- Cambios solo aditivos: la versión anterior de la API sigue funcionando con este esquema.

-- WhatsApp: el panel ya lo ofrecía como origen, pero la base no lo aceptaba.
-- Walk-in: el grupo llega sin reserva y no se piden datos personales (RNF-4: datos mínimos).
ALTER TABLE reservas ALTER COLUMN cliente_id DROP NOT NULL;

ALTER TABLE reservas DROP CONSTRAINT reservas_origen_check;
ALTER TABLE reservas ADD CONSTRAINT reservas_origen_check
  CHECK (origen IN ('web', 'telefono', 'whatsapp', 'presencial', 'walk_in'));

-- Momento en que el grupo llegó (pasa a «cumplida») o en que se canceló.
ALTER TABLE reservas
  ADD COLUMN llegada_en   timestamptz(3) NULL,
  ADD COLUMN cancelada_en timestamptz(3) NULL;

-- Una mesa con el grupo ya sentado (cumplida) tampoco se puede volver a asignar en esa franja.
DROP INDEX uq_reservas_mesa_franja;
CREATE UNIQUE INDEX uq_reservas_mesa_franja ON reservas (mesa_id, fecha_servicio, franja_id)
  WHERE estado IN ('confirmada', 'cumplida');

-- Claves foráneas que se consultan y no tenían índice.
CREATE INDEX ix_sesiones_reserva ON sesiones_mesa (reserva_id) WHERE reserva_id IS NOT NULL;
CREATE INDEX ix_reservas_mesa ON reservas (mesa_id);
CREATE INDEX ix_reservas_franja ON reservas (franja_id);
