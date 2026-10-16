-- Actualización de turnos laborales para la base existente. No borra registros.
-- Ejecuta TODO este archivo en Neon > SQL Editor.
BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_nombre VARCHAR(60);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_inicio TIME;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turno_fin TIME;

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='usuarios_turno_cinemax_check' AND conrelid='usuarios'::regclass) THEN
 ALTER TABLE usuarios ADD CONSTRAINT usuarios_turno_cinemax_check CHECK (
  (turno_nombre IS NULL AND turno_inicio IS NULL AND turno_fin IS NULL) OR
  (turno_nombre IS NOT NULL AND length(trim(turno_nombre)) BETWEEN 1 AND 60 AND turno_inicio IS NOT NULL AND turno_fin IS NOT NULL AND turno_inicio<>turno_fin)
 );
 END IF;
END $$;

CREATE OR REPLACE FUNCTION cinemax_en_turno(inicio TIME, fin TIME, instante TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
 SELECT COALESCE(CASE
  WHEN inicio < fin THEN (instante AT TIME ZONE 'America/Lima')::time >= inicio AND (instante AT TIME ZONE 'America/Lima')::time < fin
  WHEN inicio > fin THEN (instante AT TIME ZONE 'America/Lima')::time >= inicio OR (instante AT TIME ZONE 'America/Lima')::time < fin
  ELSE FALSE END, FALSE);
$$;
COMMIT;

-- Los empleados existentes necesitan un turno asignado.
-- Asígnalo desde Administrador > Trabajadores > Editar.
-- No se asigna un horario inventado a las cuentas existentes.

-- Ejemplo OPCIONAL: cambia el correo y quita los -- para ejecutarlo.
-- UPDATE usuarios SET turno_nombre='Tarde', turno_inicio='13:00', turno_fin='18:00'
-- WHERE lower(correo)='correo_del_empleado@gmail.com' AND rol='empleado';

-- Consulta de verificación (hora de Perú):
SELECT id, nombre, correo, rol, turno_nombre, turno_inicio, turno_fin,
 CASE WHEN rol='empleado' THEN cinemax_en_turno(turno_inicio, turno_fin) ELSE TRUE END AS acceso_por_turno,
 NOW() AT TIME ZONE 'America/Lima' AS hora_peru
FROM usuarios WHERE rol IN ('empleado','administrador') ORDER BY nombre;
