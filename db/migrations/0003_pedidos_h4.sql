-- Hito 4 (RF-Q1 a RF-Q4): pedido desde el QR, paneles por sector, pedido del mozo y carta editable.
-- Cambios solo aditivos.

-- Permiso del comensal: al escanear con la mesa abierta, su celular recibe este código (en una cookie).
-- Cada sesión de mesa tiene el suyo: el grupo anterior no ve ni modifica la cuenta nueva.
ALTER TABLE sesiones_mesa ADD COLUMN token_comensal char(32) NULL;

-- Quién cargó el pedido cuando lo toma el mozo (RF-Q4).
ALTER TABLE pedidos ADD COLUMN creado_por integer NULL REFERENCES usuarios (id) ON DELETE SET NULL;

-- Aclaración del comensal ("sin sal", "jugoso") y marcas de tiempo para medir demoras.
ALTER TABLE pedido_items
  ADD COLUMN nota              varchar(140) NULL,
  ADD COLUMN creado_en         timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN en_preparacion_en timestamptz(3) NULL,
  ADD COLUMN entregado_en      timestamptz(3) NULL;

-- Claves foráneas consultadas sin índice.
CREATE INDEX ix_items_pedido ON pedido_items (pedido_id);
CREATE INDEX ix_items_variante ON pedido_items (variante_id);
CREATE INDEX ix_pedidos_creado_por ON pedidos (creado_por) WHERE creado_por IS NOT NULL;
-- Paneles de sector: solo miran lo que todavía no se entregó.
CREATE INDEX ix_items_activos ON pedido_items (sector_preparacion_id, creado_en)
  WHERE estado IN ('recibido', 'en_preparacion', 'listo');

-- Quién y cuándo cambió un precio queda en la auditoría; acá solo la marca de la última edición.
ALTER TABLE variantes_producto ADD COLUMN actualizado_en timestamptz(3) NULL;
ALTER TABLE productos ADD COLUMN actualizado_en timestamptz(3) NULL;
