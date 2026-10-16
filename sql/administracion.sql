-- Ampliación administrativa. Compatible con la base anterior, sin borrar registros.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE IF NOT EXISTS peliculas (
 id SERIAL PRIMARY KEY,
 clave VARCHAR(80) UNIQUE NOT NULL,
 titulo VARCHAR(120) NOT NULL,
 genero VARCHAR(60) NOT NULL,
 duracion INT NOT NULL CHECK(duracion BETWEEN 1 AND 600),
 clasificacion VARCHAR(30) NOT NULL DEFAULT 'Todo público',
 sala VARCHAR(20) NOT NULL,
 sinopsis VARCHAR(2000) NOT NULL DEFAULT '',
 poster VARCHAR(500) NOT NULL DEFAULT 'img/im2.jpg',
 estado VARCHAR(20) NOT NULL DEFAULT 'cartelera' CHECK(estado IN ('cartelera','proximamente','inactiva')),
 fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,poster,estado)
VALUES
 ('silencio','El Origen del Silencio','Suspenso',118,'+14','Sala 1','img/im2.jpg','cartelera'),
 ('ruta65','Ruta 65','Acción',132,'+14','Sala 2','img/im3.jpg','cartelera'),
 ('carton','Mundo de Cartón','Animación',95,'Todo público','Sala 3','img/im4.jpg','cartelera'),
 ('luna','Bajo la Misma Luna','Drama',110,'+14','Sala 4','img/im1.jpg','cartelera')
ON CONFLICT(clave) DO NOTHING;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS pelicula_id INT REFERENCES peliculas(id);
UPDATE compras_entradas_cine c SET pelicula_id=p.id
FROM peliculas p WHERE c.pelicula_id IS NULL AND c.pelicula=p.titulo;
CREATE INDEX IF NOT EXISTS compras_pelicula_idx ON compras_entradas_cine(pelicula_id);
INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,poster,estado)
VALUES
 ('ventana','A través de mi ventana','Romance',118,'+14','Sala 1','img/im5.jpg','proximamente'),
 ('dos-caras','A 2 caras','Suspenso',132,'+14','Sala 2','img/im6.jpg','proximamente'),
 ('wish','Wish','Animación',95,'Todo público','Sala 3','img/im7.jpg','proximamente'),
 ('no-respires','No respires','Terror',110,'+18','Sala 4','img/im8.jpg','proximamente')
ON CONFLICT(clave) DO NOTHING;
