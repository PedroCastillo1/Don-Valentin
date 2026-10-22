-- Hito 5 (RF-W3): medición propia del sitio, anónima y agregada.
-- Sin cookies, sin IP, sin datos personales: solo cuántas veces pasó cada evento, por día y por página.
CREATE TABLE eventos_sitio (
  dia      date        NOT NULL,
  evento   varchar(40) NOT NULL,
  ruta     varchar(80) NOT NULL,
  cantidad integer     NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  PRIMARY KEY (dia, evento, ruta)
);
CREATE INDEX ix_eventos_evento_dia ON eventos_sitio (evento, dia);
-- Como el resto de las tablas: la API REST pública de Supabase no la puede leer ni escribir.
ALTER TABLE eventos_sitio ENABLE ROW LEVEL SECURITY;
