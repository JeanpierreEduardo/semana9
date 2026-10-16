-- Módulo del empleado, sin borrar datos existentes.
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_empleado INT REFERENCES usuarios(id);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_funcion DATE;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(10,2);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS total_venta NUMERIC(10,2);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS id_validador INT REFERENCES usuarios(id);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_validacion TIMESTAMPTZ;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS asientos_vendidos JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS ventas_empleado_fecha_idx ON compras_entradas_cine(id_empleado,fecha_registro DESC);
CREATE TABLE IF NOT EXISTS asientos_ventas (
 id SERIAL PRIMARY KEY,
 compra_id INT NOT NULL REFERENCES compras_entradas_cine(id) ON DELETE CASCADE,
 sala VARCHAR(20) NOT NULL,
 fecha_funcion DATE NOT NULL,
 horario VARCHAR(30) NOT NULL CHECK(horario IN ('tarde','noche')),
 asiento VARCHAR(3) NOT NULL CHECK(asiento ~ '^[A-F][1-8]$'),
 CONSTRAINT asiento_funcion_unico UNIQUE(sala,fecha_funcion,horario,asiento),
 CONSTRAINT asiento_compra_unico UNIQUE(compra_id,asiento)
);
-- Evita inconsistencias al editar una venta con asientos desde el CRUD anterior.
CREATE OR REPLACE FUNCTION proteger_asientos_venta() RETURNS TRIGGER AS $$
BEGIN
 IF OLD.id_empleado IS NOT NULL AND OLD.estado='cancelado' AND NEW.estado<>'cancelado' THEN
  RAISE EXCEPTION 'Una venta de taquilla cancelada no puede reactivarse; registra una venta nueva.';
 END IF;
 IF EXISTS(SELECT 1 FROM asientos_ventas WHERE compra_id=OLD.id) AND
 (NEW.pelicula_id IS DISTINCT FROM OLD.pelicula_id OR NEW.sala IS DISTINCT FROM OLD.sala OR NEW.fecha_funcion IS DISTINCT FROM OLD.fecha_funcion OR NEW.funcion_horario IS DISTINCT FROM OLD.funcion_horario OR NEW.cantidad IS DISTINCT FROM OLD.cantidad) THEN
  RAISE EXCEPTION 'Esta venta tiene asientos asignados. Conserva película, sala, función y cantidad, o cancélala y crea otra.';
 END IF;
 IF NEW.estado='cancelado' THEN DELETE FROM asientos_ventas WHERE compra_id=OLD.id; END IF;
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS proteger_asientos_venta_trigger ON compras_entradas_cine;
CREATE TRIGGER proteger_asientos_venta_trigger BEFORE UPDATE ON compras_entradas_cine FOR EACH ROW EXECUTE FUNCTION proteger_asientos_venta();
