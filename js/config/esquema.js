// Esquema compatible con el proyecto anterior. Se aplica solo si faltan campos.
export const MIGRACION = [
  "-- Ejecutar en Neon SQL Editor. Compatible con el esquema anterior del proyecto.\nCREATE TABLE IF NOT EXISTS usuarios (\n id SERIAL PRIMARY KEY,\n nombre VARCHAR(120) NOT NULL,\n correo VARCHAR(120) UNIQUE NOT NULL,\n contrasena TEXT,\n fecha_registro TIMESTAMP DEFAULT NOW()\n)",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena TEXT",
  "ALTER TABLE usuarios ALTER COLUMN contrasena DROP NOT NULL",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena_hash TEXT",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS salt TEXT",
  "CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_lower_unico ON usuarios (lower(correo))",
  "CREATE TABLE IF NOT EXISTS compras_entradas_cine (\n id SERIAL PRIMARY KEY,\n codigo_seguimiento VARCHAR(32) UNIQUE NOT NULL,\n nombre_cliente VARCHAR(120),\n pelicula VARCHAR(120),\n funcion_horario VARCHAR(30),\n sala VARCHAR(20),\n estado VARCHAR(30) DEFAULT 'registrado',\n fecha_registro TIMESTAMP DEFAULT NOW()\n)",
  "ALTER TABLE compras_entradas_cine ALTER COLUMN codigo_seguimiento TYPE VARCHAR(32)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS correo_cliente VARCHAR(120)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS comentario VARCHAR(500)",
  "CREATE INDEX IF NOT EXISTS compras_usuario_fecha_idx ON compras_entradas_cine (usuario_id, fecha_registro DESC)",
  "-- Semana 7: migración compatible con Semana 6, sin borrar compras anteriores.\nALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'usuario'",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_usuario INT REFERENCES usuarios(id)",
  "UPDATE compras_entradas_cine SET id_usuario=usuario_id WHERE id_usuario IS NULL AND usuario_id IS NOT NULL",
  "UPDATE compras_entradas_cine SET estado='registrado' WHERE estado IS NULL",
  "ALTER TABLE compras_entradas_cine ALTER COLUMN estado SET DEFAULT 'registrado'",
  "ALTER TABLE compras_entradas_cine ALTER COLUMN estado SET NOT NULL",
  "CREATE INDEX IF NOT EXISTS compras_id_usuario_fecha_idx ON compras_entradas_cine(id_usuario,fecha_registro DESC)",
  "CREATE TABLE IF NOT EXISTS sesiones_cinemax (\n token_hash CHAR(64) PRIMARY KEY,\n id_usuario INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,\n expira TIMESTAMPTZ NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS sesiones_expira_idx ON sesiones_cinemax(expira)",
  "DO $$ BEGIN\n IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='usuarios_rol_cinemax_check' AND conrelid='usuarios'::regclass) THEN\n ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_cinemax_check CHECK(rol IN ('usuario','administrador','empleado'));\n END IF;\n IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='compras_estado_cinemax_check' AND conrelid='compras_entradas_cine'::regclass) THEN\n ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_estado_cinemax_check CHECK(estado IN ('registrado','atendido','cancelado')) NOT VALID;\n END IF;\n IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='compras_cantidad_cinemax_check' AND conrelid='compras_entradas_cine'::regclass) THEN\n ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_cantidad_cinemax_check CHECK(cantidad BETWEEN 1 AND 8) NOT VALID;\n END IF;\nEND $$"
];

export const MIGRACION_ADMIN = [
  "-- Ampliación administrativa. Compatible con la base anterior, sin borrar registros.\nALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE",
  "CREATE TABLE IF NOT EXISTS peliculas (\n id SERIAL PRIMARY KEY,\n clave VARCHAR(80) UNIQUE NOT NULL,\n titulo VARCHAR(120) NOT NULL,\n genero VARCHAR(60) NOT NULL,\n duracion INT NOT NULL CHECK(duracion BETWEEN 1 AND 600),\n clasificacion VARCHAR(30) NOT NULL DEFAULT 'Todo público',\n sala VARCHAR(20) NOT NULL,\n sinopsis VARCHAR(2000) NOT NULL DEFAULT '',\n poster VARCHAR(500) NOT NULL DEFAULT 'img/im2.jpg',\n estado VARCHAR(20) NOT NULL DEFAULT 'cartelera' CHECK(estado IN ('cartelera','proximamente','inactiva')),\n fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()\n)",
  "INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,poster,estado)\nVALUES\n ('silencio','El Origen del Silencio','Suspenso',118,'+14','Sala 1','img/im2.jpg','cartelera'),\n ('ruta65','Ruta 65','Acción',132,'+14','Sala 2','img/im3.jpg','cartelera'),\n ('carton','Mundo de Cartón','Animación',95,'Todo público','Sala 3','img/im4.jpg','cartelera'),\n ('luna','Bajo la Misma Luna','Drama',110,'+14','Sala 4','img/im1.jpg','cartelera')\nON CONFLICT(clave) DO NOTHING",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS pelicula_id INT REFERENCES peliculas(id)",
  "UPDATE compras_entradas_cine c SET pelicula_id=p.id\nFROM peliculas p WHERE c.pelicula_id IS NULL AND c.pelicula=p.titulo",
  "CREATE INDEX IF NOT EXISTS compras_pelicula_idx ON compras_entradas_cine(pelicula_id)",
  "INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,poster,estado)\nVALUES\n ('ventana','A través de mi ventana','Romance',118,'+14','Sala 1','img/im5.jpg','proximamente'),\n ('dos-caras','A 2 caras','Suspenso',132,'+14','Sala 2','img/im6.jpg','proximamente'),\n ('wish','Wish','Animación',95,'Todo público','Sala 3','img/im7.jpg','proximamente'),\n ('no-respires','No respires','Terror',110,'+18','Sala 4','img/im8.jpg','proximamente')\nON CONFLICT(clave) DO NOTHING"
];

export const MIGRACION_EMPLEADO = [
  "-- Módulo del empleado, sin borrar datos existentes.\nALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_empleado INT REFERENCES usuarios(id)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_funcion DATE",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS total_venta NUMERIC(10,2)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_validador INT REFERENCES usuarios(id)",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_validacion TIMESTAMPTZ",
  "ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS asientos_vendidos JSONB NOT NULL DEFAULT '[]'::jsonb",
  "CREATE INDEX IF NOT EXISTS ventas_empleado_fecha_idx ON compras_entradas_cine(id_empleado,fecha_registro DESC)",
  "CREATE TABLE IF NOT EXISTS asientos_ventas (\n id SERIAL PRIMARY KEY,\n compra_id INT NOT NULL REFERENCES compras_entradas_cine(id) ON DELETE CASCADE,\n sala VARCHAR(20) NOT NULL,\n fecha_funcion DATE NOT NULL,\n horario VARCHAR(30) NOT NULL CHECK(horario IN ('tarde','noche')),\n asiento VARCHAR(3) NOT NULL CHECK(asiento ~ '^[A-F][1-8]$'),\n CONSTRAINT asiento_funcion_unico UNIQUE(sala,fecha_funcion,horario,asiento),\n CONSTRAINT asiento_compra_unico UNIQUE(compra_id,asiento)\n)",
  "-- Evita inconsistencias al editar una venta con asientos desde el CRUD anterior.\nCREATE OR REPLACE FUNCTION proteger_asientos_venta() RETURNS TRIGGER AS $$\nBEGIN\n IF OLD.id_empleado IS NOT NULL AND OLD.estado='cancelado' AND NEW.estado<>'cancelado' THEN\n  RAISE EXCEPTION 'Una venta de taquilla cancelada no puede reactivarse; registra una venta nueva.';\n END IF;\n IF EXISTS(SELECT 1 FROM asientos_ventas WHERE compra_id=OLD.id) AND\n (NEW.pelicula_id IS DISTINCT FROM OLD.pelicula_id OR NEW.sala IS DISTINCT FROM OLD.sala OR NEW.fecha_funcion IS DISTINCT FROM OLD.fecha_funcion OR NEW.funcion_horario IS DISTINCT FROM OLD.funcion_horario OR NEW.cantidad IS DISTINCT FROM OLD.cantidad) THEN\n  RAISE EXCEPTION 'Esta venta tiene asientos asignados. Conserva película, sala, función y cantidad, o cancélala y crea otra.';\n END IF;\n IF NEW.estado='cancelado' THEN DELETE FROM asientos_ventas WHERE compra_id=OLD.id; END IF;\n RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql",
  "DROP TRIGGER IF EXISTS proteger_asientos_venta_trigger ON compras_entradas_cine",
  "CREATE TRIGGER proteger_asientos_venta_trigger BEFORE UPDATE ON compras_entradas_cine FOR EACH ROW EXECUTE FUNCTION proteger_asientos_venta()"
];

// Turnos diarios. La hora válida proviene de Neon y usa America/Lima.
export const MIGRACION_TURNOS = [
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_nombre VARCHAR(60)",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_inicio TIME",
  "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_fin TIME",
  "DO $$ BEGIN\n IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='usuarios_turno_cinemax_check' AND conrelid='usuarios'::regclass) THEN\n ALTER TABLE usuarios ADD CONSTRAINT usuarios_turno_cinemax_check CHECK (\n  (turno_nombre IS NULL AND turno_inicio IS NULL AND turno_fin IS NULL) OR\n  (turno_nombre IS NOT NULL AND length(trim(turno_nombre)) BETWEEN 1 AND 60 AND turno_inicio IS NOT NULL AND turno_fin IS NOT NULL AND turno_inicio<>turno_fin)\n );\n END IF;\nEND $$",
  "CREATE OR REPLACE FUNCTION cinemax_en_turno(inicio TIME, fin TIME, instante TIMESTAMPTZ DEFAULT NOW())\nRETURNS BOOLEAN LANGUAGE SQL STABLE AS $$\n SELECT COALESCE(CASE\n  WHEN inicio < fin THEN (instante AT TIME ZONE 'America/Lima')::time >= inicio AND (instante AT TIME ZONE 'America/Lima')::time < fin\n  WHEN inicio > fin THEN (instante AT TIME ZONE 'America/Lima')::time >= inicio OR (instante AT TIME ZONE 'America/Lima')::time < fin\n  ELSE FALSE END, FALSE);\n$$"
];
