-- Don Valentín Digital · Modelo de datos unificado (H2, 16/10/2026)
-- Motor requerido: MySQL 8.4 (InnoDB, utf8mb4). Fuente: Declaración del Alcance v4 §1.6.
-- Entidades del alcance: cliente, reserva, franja, sector, mesa, sesión de mesa, pedido,
-- ítem del pedido, producto de la carta, tipo de solicitud, usuario, rol y estado.
-- «estado» se modela como columna ENUM en cada entidad que lo tiene (ver docs/modelo-de-datos.md).
-- Las tablas de pedidos (H4, 06/11/2026) existen en el modelo para que sea único, pero ningún módulo las usa todavía.

-- ───────── Usuarios, roles y auditoría (RNF-3) ─────────
CREATE TABLE roles (
  id          TINYINT UNSIGNED NOT NULL,
  codigo      VARCHAR(20)  NOT NULL,
  nombre      VARCHAR(60)  NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario           VARCHAR(40)  NOT NULL,
  nombre            VARCHAR(80)  NOT NULL,
  rol_id            TINYINT UNSIGNED NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta   DATETIME(3)  NULL,
  ultimo_acceso     DATETIME(3)  NULL,
  creado_en         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_usuario (usuario),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id)
) ENGINE=InnoDB;

CREATE TABLE sesiones_usuario (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash  CHAR(64)     NOT NULL,
  csrf_token  CHAR(43)     NOT NULL,
  usuario_id  INT UNSIGNED NOT NULL,
  creada_en   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expira_en   DATETIME(3)  NOT NULL,
  ip          VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesiones_token (token_hash),
  KEY ix_sesiones_usuario (usuario_id),
  KEY ix_sesiones_expira (expira_en),
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auditoria (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NULL,
  accion     VARCHAR(60)  NOT NULL,
  recurso    VARCHAR(160) NOT NULL,
  resultado  ENUM('permitido','denegado','error') NOT NULL,
  detalle    JSON NULL,
  ip         VARCHAR(45) NULL,
  creada_en  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_auditoria_fecha (creada_en),
  KEY ix_auditoria_resultado (resultado, creada_en),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ───────── Salón: sectores, mesas, franjas y aforo ─────────
CREATE TABLE sectores_salon (
  id                TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo            VARCHAR(30) NOT NULL,
  nombre            VARCHAR(60) NOT NULL,
  activo            TINYINT(1)  NOT NULL DEFAULT 1,
  estado_validacion ENUM('documentado','provisorio','validado') NOT NULL DEFAULT 'provisorio',
  PRIMARY KEY (id),
  UNIQUE KEY uq_sectores_salon_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE sectores_preparacion (
  id     TINYINT UNSIGNED NOT NULL,
  codigo ENUM('cocina','parrilla','barra') NOT NULL,
  nombre VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sectores_prep_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE mesas (
  id                SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero            SMALLINT UNSIGNED NOT NULL,
  sector_salon_id   TINYINT UNSIGNED NOT NULL,
  capacidad         TINYINT UNSIGNED NOT NULL,
  activa            TINYINT(1) NOT NULL DEFAULT 1,
  qr_token          CHAR(32)   NOT NULL,
  qr_generado_en    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  estado_validacion ENUM('documentado','provisorio','validado') NOT NULL DEFAULT 'provisorio',
  PRIMARY KEY (id),
  UNIQUE KEY uq_mesas_numero (numero),
  UNIQUE KEY uq_mesas_qr (qr_token),
  CONSTRAINT fk_mesas_sector FOREIGN KEY (sector_salon_id) REFERENCES sectores_salon (id),
  CONSTRAINT ck_mesas_capacidad CHECK (capacidad BETWEEN 1 AND 40)
) ENGINE=InnoDB;

CREATE TABLE franjas (
  id                SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo            VARCHAR(20) NOT NULL,
  nombre            VARCHAR(40) NOT NULL,
  hora_inicio       TIME NOT NULL,
  duracion_min      SMALLINT UNSIGNED NOT NULL,
  orden             TINYINT UNSIGNED NOT NULL,
  activa            TINYINT(1) NOT NULL DEFAULT 1,
  estado_validacion ENUM('documentado','provisorio','validado') NOT NULL DEFAULT 'provisorio',
  PRIMARY KEY (id),
  UNIQUE KEY uq_franjas_codigo (codigo),
  UNIQUE KEY uq_franjas_orden (orden),
  CONSTRAINT ck_franjas_duracion CHECK (duracion_min BETWEEN 15 AND 360)
) ENGINE=InnoDB;

CREATE TABLE aforos (
  franja_id         SMALLINT UNSIGNED NOT NULL,
  sector_salon_id   TINYINT UNSIGNED NOT NULL,
  aforo_personas    SMALLINT UNSIGNED NOT NULL,
  estado_validacion ENUM('documentado','provisorio','validado') NOT NULL DEFAULT 'provisorio',
  PRIMARY KEY (franja_id, sector_salon_id),
  CONSTRAINT fk_aforos_franja FOREIGN KEY (franja_id) REFERENCES franjas (id) ON DELETE CASCADE,
  CONSTRAINT fk_aforos_sector FOREIGN KEY (sector_salon_id) REFERENCES sectores_salon (id)
) ENGINE=InnoDB;

CREATE TABLE parametros (
  clave             VARCHAR(60)  NOT NULL,
  valor             VARCHAR(255) NOT NULL,
  tipo              ENUM('entero','texto','booleano') NOT NULL,
  unidad            VARCHAR(20)  NULL,
  descripcion       VARCHAR(255) NOT NULL,
  fuente            VARCHAR(255) NOT NULL,
  estado_validacion ENUM('documentado','provisorio','validado') NOT NULL,
  actualizado_en    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  actualizado_por   INT UNSIGNED NULL,
  PRIMARY KEY (clave),
  CONSTRAINT fk_parametros_usuario FOREIGN KEY (actualizado_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ───────── Clientes y reservas (RF-R1, RF-R2; RNF-4: solo nombre y teléfono) ─────────
CREATE TABLE clientes (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(80) NOT NULL,
  telefono  VARCHAR(15) NOT NULL,
  creado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_telefono (telefono)
) ENGINE=InnoDB;

CREATE TABLE reservas (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo          CHAR(8) NOT NULL,
  fecha_servicio  DATE NOT NULL,
  franja_id       SMALLINT UNSIGNED NOT NULL,
  sector_salon_id TINYINT UNSIGNED NOT NULL,
  mesa_id         SMALLINT UNSIGNED NOT NULL,
  cliente_id      INT UNSIGNED NOT NULL,
  a_nombre_de     VARCHAR(80) NOT NULL,
  personas        TINYINT UNSIGNED NOT NULL,
  estado          ENUM('confirmada','cancelada','no_show','cumplida') NOT NULL DEFAULT 'confirmada',
  origen          ENUM('web','telefono','presencial') NOT NULL,
  comentarios     VARCHAR(300) NULL,
  creada_por      INT UNSIGNED NULL,
  creada_en       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizada_en  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  -- Una mesa no puede tener dos reservas confirmadas en la misma franja del mismo día (garantía en la base).
  confirmada_flag TINYINT GENERATED ALWAYS AS (IF(estado = 'confirmada', 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservas_codigo (codigo),
  UNIQUE KEY uq_reservas_mesa_franja (mesa_id, fecha_servicio, franja_id, confirmada_flag),
  KEY ix_reservas_dia (fecha_servicio, franja_id, estado),
  KEY ix_reservas_cliente (cliente_id),
  CONSTRAINT fk_reservas_franja  FOREIGN KEY (franja_id)       REFERENCES franjas (id),
  CONSTRAINT fk_reservas_sector  FOREIGN KEY (sector_salon_id) REFERENCES sectores_salon (id),
  CONSTRAINT fk_reservas_mesa    FOREIGN KEY (mesa_id)         REFERENCES mesas (id),
  CONSTRAINT fk_reservas_cliente FOREIGN KEY (cliente_id)      REFERENCES clientes (id),
  CONSTRAINT fk_reservas_usuario FOREIGN KEY (creada_por)      REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT ck_reservas_personas CHECK (personas BETWEEN 1 AND 40)
) ENGINE=InnoDB;

-- Contador por (día, franja, sector): fila que se bloquea para que dos reservas simultáneas no superen el aforo (KQ-5).
CREATE TABLE ocupacion_franja (
  fecha_servicio       DATE NOT NULL,
  franja_id            SMALLINT UNSIGNED NOT NULL,
  sector_salon_id      TINYINT UNSIGNED NOT NULL,
  personas_confirmadas SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (fecha_servicio, franja_id, sector_salon_id),
  CONSTRAINT fk_ocupacion_franja FOREIGN KEY (franja_id)       REFERENCES franjas (id),
  CONSTRAINT fk_ocupacion_sector FOREIGN KEY (sector_salon_id) REFERENCES sectores_salon (id)
) ENGINE=InnoDB;

-- ───────── Sesión de mesa (apertura por mozo o por reserva; base del circuito QR) ─────────
CREATE TABLE sesiones_mesa (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mesa_id       SMALLINT UNSIGNED NOT NULL,
  reserva_id    BIGINT UNSIGNED NULL,
  abierta_por   INT UNSIGNED NULL,
  estado        ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
  abierta_en    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  cerrada_en    DATETIME(3) NULL,
  -- Dos mozos que abren a la vez la misma mesa generan una única sesión.
  abierta_flag  TINYINT GENERATED ALWAYS AS (IF(estado = 'abierta', 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesion_mesa_abierta (mesa_id, abierta_flag),
  CONSTRAINT fk_sesion_mesa    FOREIGN KEY (mesa_id)     REFERENCES mesas (id),
  CONSTRAINT fk_sesion_reserva FOREIGN KEY (reserva_id)  REFERENCES reservas (id) ON DELETE SET NULL,
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (abierta_por) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ───────── Carta, tipos de solicitud y pedidos (carta pública: RF-W1; pedidos: H4) ─────────
CREATE TABLE tipos_solicitud (
  id                   SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sector_preparacion_id TINYINT UNSIGNED NOT NULL,
  codigo               VARCHAR(40) NOT NULL,
  nombre               VARCHAR(80) NOT NULL,
  tiempo_maximo_min    SMALLINT UNSIGNED NOT NULL,
  estado_validacion    ENUM('documentado','provisorio','validado') NOT NULL DEFAULT 'provisorio',
  PRIMARY KEY (id),
  UNIQUE KEY uq_tipos_codigo (codigo),
  CONSTRAINT fk_tipos_sector FOREIGN KEY (sector_preparacion_id) REFERENCES sectores_preparacion (id),
  CONSTRAINT ck_tipos_tiempo CHECK (tiempo_maximo_min BETWEEN 1 AND 240)
) ENGINE=InnoDB;

CREATE TABLE categorias_carta (
  id      SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo  VARCHAR(40) NOT NULL,
  nombre  VARCHAR(80) NOT NULL,
  grupo   VARCHAR(60) NOT NULL,
  orden   SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_codigo (codigo)
) ENGINE=InnoDB;

CREATE TABLE productos (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id          SMALLINT UNSIGNED NOT NULL,
  sector_preparacion_id TINYINT UNSIGNED NOT NULL,
  tipo_solicitud_id     SMALLINT UNSIGNED NOT NULL,
  nombre                VARCHAR(120) NOT NULL,
  nota                  VARCHAR(255) NULL,
  sin_tacc              TINYINT(1) NOT NULL DEFAULT 0,
  disponible            TINYINT(1) NOT NULL DEFAULT 1,
  orden                 SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_productos_categoria (categoria_id, orden),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)          REFERENCES categorias_carta (id),
  CONSTRAINT fk_productos_sector    FOREIGN KEY (sector_preparacion_id) REFERENCES sectores_preparacion (id),
  CONSTRAINT fk_productos_tipo      FOREIGN KEY (tipo_solicitud_id)     REFERENCES tipos_solicitud (id)
) ENGINE=InnoDB;

CREATE TABLE variantes_producto (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id INT UNSIGNED NOT NULL,
  etiqueta    VARCHAR(40) NOT NULL,
  -- NULL cuando la carta impresa no permite leer el importe; lo confirma el local.
  precio      DECIMAL(10,2) NULL,
  orden       TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variantes (producto_id, etiqueta),
  CONSTRAINT fk_variantes_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pedidos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sesion_mesa_id BIGINT UNSIGNED NOT NULL,
  origen         ENUM('qr','mozo') NOT NULL,
  estado         ENUM('recibido','en_preparacion','listo','entregado','cancelado') NOT NULL DEFAULT 'recibido',
  creado_en      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_pedidos_sesion (sesion_mesa_id),
  CONSTRAINT fk_pedidos_sesion FOREIGN KEY (sesion_mesa_id) REFERENCES sesiones_mesa (id)
) ENGINE=InnoDB;

CREATE TABLE pedido_items (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id             BIGINT UNSIGNED NOT NULL,
  variante_id           INT UNSIGNED NOT NULL,
  sector_preparacion_id TINYINT UNSIGNED NOT NULL,
  cantidad              TINYINT UNSIGNED NOT NULL,
  precio_unitario       DECIMAL(10,2) NOT NULL,
  estado                ENUM('recibido','en_preparacion','listo','entregado','cancelado') NOT NULL DEFAULT 'recibido',
  listo_en              DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY ix_items_sector (sector_preparacion_id, estado),
  CONSTRAINT fk_items_pedido   FOREIGN KEY (pedido_id)             REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_variante FOREIGN KEY (variante_id)           REFERENCES variantes_producto (id),
  CONSTRAINT fk_items_sector   FOREIGN KEY (sector_preparacion_id) REFERENCES sectores_preparacion (id),
  CONSTRAINT ck_items_cantidad CHECK (cantidad BETWEEN 1 AND 50)
) ENGINE=InnoDB;
