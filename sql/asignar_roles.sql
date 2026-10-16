-- Crea primero las cuentas en login.html y cambia estos correos por cuentas reales.
-- Ejecutar únicamente desde Neon SQL Editor con acceso de propietario.
UPDATE usuarios SET rol='administrador' WHERE lower(correo)=lower('administrador@ejemplo.com');
UPDATE usuarios SET rol='empleado' WHERE lower(correo)=lower('empleado@ejemplo.com');
SELECT id,nombre,correo,rol FROM usuarios ORDER BY id;
