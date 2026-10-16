-- CineMax Perú · Caso 18 · Lima Huaroc Jeanpierre Eduardo
-- Ejecutar en la MISMA base Neon del proyecto. No borra las compras existentes.
BEGIN;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_cinemax_check;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_cinemax_check CHECK(rol IN ('usuario','cliente','administrador','empleado','cajero'));
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS dni VARCHAR(8);
ALTER TABLE compras_entradas_cine DROP CONSTRAINT IF EXISTS compras_cantidad_cinemax_check;
ALTER TABLE compras_entradas_cine ADD CONSTRAINT compras_cantidad_cinemax_check CHECK(cantidad BETWEEN 1 AND 10) NOT VALID;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS tipo_sala VARCHAR(8) NOT NULL DEFAULT 'general' CHECK(tipo_sala IN ('general','3d','prime'));
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS monto_calculado NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK(monto_calculado>=0);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS canal_pago VARCHAR(10) CHECK(canal_pago IN ('pasarela','caja'));
-- Lima Huaroc Jeanpierre Eduardo
-- No supone que las compras antiguas estén pagadas.
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente';
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS ticket_ingreso VARCHAR(40) UNIQUE;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION controlar_pago_cinemax() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.estado_pago NOT IN ('pendiente','pagado') THEN RAISE EXCEPTION 'Estado de pago inválido'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.estado='cancelado' AND NEW.estado<>'cancelado' THEN RAISE EXCEPTION 'Una reserva cancelada no se puede reactivar'; END IF;
  IF OLD.estado_pago='pagado' AND (NEW.estado_pago<>'pagado' OR NEW.ticket_ingreso IS DISTINCT FROM OLD.ticket_ingreso) THEN RAISE EXCEPTION 'El pago y ticket ya fueron registrados'; END IF;
 END IF;
 IF NEW.estado='atendido' AND NEW.estado_pago<>'pagado' THEN RAISE EXCEPTION 'Primero registra el pago'; END IF;
 IF NEW.estado_pago='pendiente' AND NEW.ticket_ingreso IS NOT NULL THEN RAISE EXCEPTION 'Una reserva pendiente no tiene ticket'; END IF;
 IF NEW.estado_pago='pagado' AND (NEW.ticket_ingreso IS NULL OR NEW.fecha_pago IS NULL) THEN RAISE EXCEPTION 'El pago necesita ticket y fecha'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS controlar_pago_cinemax_trigger ON compras_entradas_cine;
CREATE TRIGGER controlar_pago_cinemax_trigger BEFORE INSERT OR UPDATE ON compras_entradas_cine FOR EACH ROW EXECUTE FUNCTION controlar_pago_cinemax();

CREATE TABLE IF NOT EXISTS banco_cuentas (
   id               SERIAL PRIMARY KEY,
   numero_cuenta    VARCHAR(20) UNIQUE NOT NULL,
   titular          VARCHAR(100) NOT NULL,
   tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('ahorros', 'credito')),
   saldo_disponible NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo_disponible >= 0),
   moneda           CHAR(3) NOT NULL DEFAULT 'PEN'
 );
CREATE TABLE IF NOT EXISTS banco_tarjetas (
   id        SERIAL PRIMARY KEY,
   numero    VARCHAR(19) UNIQUE NOT NULL,           -- solo dígitos, sin espacios
   id_cuenta INT NOT NULL REFERENCES banco_cuentas(id),
   titular   VARCHAR(100) NOT NULL,
   marca     VARCHAR(20) NOT NULL,
   tipo      VARCHAR(10) NOT NULL CHECK (tipo IN ('debito', 'credito')),
   mes_venc SMALLINT NOT NULL CHECK (mes_venc BETWEEN 1 AND 12),
   anio_venc SMALLINT NOT NULL,
   cvv       VARCHAR(4) NOT NULL,                   -- solo existe del lado del emisor
   estado    VARCHAR(10) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa',
 'bloqueada'))
 );
CREATE TABLE IF NOT EXISTS billeteras (
   id                SERIAL PRIMARY KEY,
   proveedor         VARCHAR(12) NOT NULL CHECK (proveedor IN ('andipay', 'pagomovil')),
   celular           VARCHAR(9) NOT NULL,
   titular           VARCHAR(100) NOT NULL,
   saldo_disponible NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (saldo_disponible >= 0),
   codigo_aprobacion VARCHAR(6) NOT NULL,          -- simula el código que la app
   UNIQUE (proveedor, celular)
 );
CREATE TABLE IF NOT EXISTS pagos (
   id                  SERIAL PRIMARY KEY,
   codigo_operacion    VARCHAR(20) UNIQUE NOT NULL,
   id_registro         INT NOT NULL REFERENCES compras_entradas_cine(id),
   id_usuario          INT REFERENCES usuarios(id),          -- cliente que paga (puede
   canal               VARCHAR(10) NOT NULL CHECK (canal IN ('pasarela', 'caja')),
   metodo              VARCHAR(20) NOT NULL
                       CHECK (metodo IN ('tarjeta_debito', 'tarjeta_credito',
 'billetera', 'efectivo', 'pos')),
   proveedor_billetera VARCHAR(12) CHECK (proveedor_billetera IN ('andipay',
 'pagomovil')),
   marca_tarjeta       VARCHAR(20),
   referencia          VARCHAR(30),                          -- '**** 1111', '*** ***
   monto               NUMERIC(10,2) NOT NULL CHECK (monto > 0),
   monto_recibido      NUMERIC(10,2),                        -- solo efectivo
   vuelto              NUMERIC(10,2),                        -- solo efectivo
   estado              VARCHAR(10) NOT NULL CHECK (estado IN ('aprobado', 'rechazado')),
   motivo_rechazo      VARCHAR(120),
   id_cajero           INT REFERENCES usuarios(id),          -- quién cobró en
   verificado          BOOLEAN NOT NULL DEFAULT false,       -- conciliación de pagos en
   verificado_por      INT REFERENCES usuarios(id),
   fecha_verificacion TIMESTAMPTZ,
   fecha_pago          TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
CREATE UNIQUE INDEX IF NOT EXISTS uq_pagos_un_aprobado_por_registro
   ON pagos (id_registro) WHERE estado = 'aprobado';
INSERT INTO banco_cuentas (numero_cuenta, titular, tipo, saldo_disponible) VALUES
   ('0011-000001', 'ANA TORRES QUISPE', 'ahorros', 1500.00),
   ('0011-000002', 'LUIS PEREZ ROJAS',    'ahorros',   10.00),
   ('0022-000001', 'MARIA HUAMAN SOTO', 'credito', 3000.00),
   ('0022-000002', 'JORGE LIMA CRUZ',     'credito', 2000.00),
   ('0011-000003', 'ROSA CCENCHO VEGA', 'ahorros', 800.00)
 ON CONFLICT (numero_cuenta) DO NOTHING;
 
 INSERT INTO banco_tarjetas (numero, id_cuenta, titular, marca, tipo, mes_venc,
 anio_venc, cvv, estado)
 SELECT t.numero, c.id, c.titular, t.marca, t.tipo, t.mes, t.anio, t.cvv, t.estado
 FROM (VALUES
   ('4111111111111111', '0011-000001', 'Visa',              'debito', 12, 2029, '123',
 'activa'),
   ('4000000000000002', '0011-000002', 'Visa',              'debito',    8, 2028, '456',
 'activa'),
   ('5555555555554444', '0022-000001', 'Mastercard',        'credito', 5, 2030, '789',
 'activa'),
   ('5105105105105100', '0022-000002', 'Mastercard',        'credito', 3, 2027, '321',
 'bloqueada'),
   ('378282246310005', '0022-000001', 'American Express', 'credito', 11, 2028, '1234',
 'activa'),
   ('4242424242424242', '0011-000003', 'Visa',              'debito',    1, 2025, '111',
 'activa')
 ) AS t(numero, cuenta, marca, tipo, mes, anio, cvv, estado)
 JOIN banco_cuentas c ON c.numero_cuenta = t.cuenta
 ON CONFLICT (numero) DO NOTHING;
 
 INSERT INTO billeteras (proveedor, celular, titular, saldo_disponible,
 codigo_aprobacion) VALUES
   ('andipay',   '987654321', 'ANA TORRES QUISPE', 500.00, '123456'),
   ('pagomovil', '912345678', 'LUIS PEREZ ROJAS',     15.00, '654321'),
   ('andipay',   '999888777', 'MARIA HUAMAN SOTO', 1000.00, '111222')
 ON CONFLICT (proveedor, celular) DO NOTHING;


INSERT INTO usuarios(nombre,correo,contrasena,rol) VALUES ('Cajera de Turno','caja@correo.com','1234','cajero'),('Cajero Dos','caja2@correo.com','1234','cajero') ON CONFLICT(correo) DO NOTHING;
UPDATE usuarios SET dni=(70000000+id)::text WHERE rol='usuario' AND dni IS NULL;
CREATE OR REPLACE FUNCTION tarifa_cinemax(tipo TEXT,cant INT,fecha DATE) RETURNS NUMERIC LANGUAGE SQL IMMUTABLE AS $$
 SELECT ROUND((CASE tipo WHEN 'general' THEN 16 WHEN '3d' THEN 22 WHEN 'prime' THEN 32 ELSE 0 END)*cant*(CASE WHEN EXTRACT(ISODOW FROM fecha) IN(2,3) THEN .8 ELSE 1 END),2)
$$;
CREATE OR REPLACE FUNCTION cotizar_cinemax() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.estado_pago='pagado' OR EXISTS(SELECT 1 FROM pagos WHERE id_registro=OLD.id) THEN RAISE EXCEPTION 'No se elimina un registro con historial de pagos'; END IF;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.estado_pago='pagado' AND (NEW.tipo_sala IS DISTINCT FROM OLD.tipo_sala OR NEW.cantidad IS DISTINCT FROM OLD.cantidad OR NEW.fecha_funcion IS DISTINCT FROM OLD.fecha_funcion OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario OR NEW.pelicula_id IS DISTINCT FROM OLD.pelicula_id OR NEW.funcion_horario IS DISTINCT FROM OLD.funcion_horario OR NEW.estado='cancelado') THEN RAISE EXCEPTION 'La compra pagada no puede modificarse ni cancelarse desde este módulo'; END IF;
 NEW.monto_calculado=tarifa_cinemax(NEW.tipo_sala,NEW.cantidad,NEW.fecha_funcion);
 NEW.total_venta=NEW.monto_calculado;
 NEW.precio_unitario=NEW.monto_calculado/NEW.cantidad;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cotizar_cinemax_trigger ON compras_entradas_cine;
CREATE TRIGGER cotizar_cinemax_trigger BEFORE INSERT OR UPDATE OR DELETE ON compras_entradas_cine FOR EACH ROW EXECUTE FUNCTION cotizar_cinemax();
UPDATE compras_entradas_cine SET monto_calculado=tarifa_cinemax(tipo_sala,cantidad,fecha_funcion) WHERE estado_pago='pendiente' AND estado='registrado';
CREATE OR REPLACE FUNCTION pagar_cinemax(p_id INT,p_usuario INT,p_canal TEXT,p_datos JSONB,p_operacion TEXT,p_ticket TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
 r compras_entradas_cine%ROWTYPE; u usuarios%ROWTYPE; t banco_tarjetas%ROWTYPE;
 b billeteras%ROWTYPE; c banco_cuentas%ROWTYPE; resultado pagos%ROWTYPE;
 metodo TEXT=p_datos->>'metodo'; motivo TEXT; referencia TEXT; marca TEXT;
 recibido NUMERIC; cambio NUMERIC; importe NUMERIC; proveedor TEXT;
BEGIN
 SELECT * INTO u FROM usuarios WHERE id=p_usuario AND activo;
 IF NOT FOUND THEN RAISE EXCEPTION 'Usuario inválido'; END IF;
 IF p_canal NOT IN('pasarela','caja') THEN RAISE EXCEPTION 'Canal inválido'; END IF;
 IF p_canal='caja' AND u.rol NOT IN('cajero','administrador') THEN RAISE EXCEPTION 'Acceso exclusivo de caja'; END IF;
 SELECT * INTO r FROM compras_entradas_cine WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;
 IF p_canal='pasarela' AND (r.id_usuario<>u.id OR u.rol NOT IN('usuario','cliente')) THEN RAISE EXCEPTION 'Esta reserva no te pertenece'; END IF;
 IF r.estado_pago<>'pendiente' OR EXISTS(SELECT 1 FROM pagos WHERE id_registro=r.id AND estado='aprobado') THEN RAISE EXCEPTION 'Esta solicitud ya fue pagada'; END IF;
 IF r.estado<>'registrado' THEN RAISE EXCEPTION 'La reserva no está activa'; END IF;
 IF r.fecha_funcion IS NULL OR r.fecha_funcion<(NOW() AT TIME ZONE 'America/Lima')::date THEN RAISE EXCEPTION 'Actualiza la fecha de la reserva'; END IF;
 IF (SELECT COUNT(*) FROM asientos_ventas WHERE compra_id=r.id)<>r.cantidad THEN RAISE EXCEPTION 'Selecciona las butacas antes de pagar'; END IF;
 importe=tarifa_cinemax(r.tipo_sala,r.cantidad,r.fecha_funcion);
 IF importe<=0 THEN RAISE EXCEPTION 'Importe inválido'; END IF;
 IF metodo='tarjeta' AND p_canal='pasarela' THEN
  SELECT * INTO t FROM banco_tarjetas WHERE numero=p_datos->>'numero';
  referencia='**** '||RIGHT(COALESCE(p_datos->>'numero',''),4);
  metodo='tarjeta_'||COALESCE(t.tipo,'debito'); marca=t.marca;
  IF t.id IS NULL THEN motivo='Tarjeta no registrada en el emisor simulado';
  ELSIF t.estado<>'activa' THEN motivo='Tarjeta bloqueada';
  ELSIF make_date(t.anio_venc,t.mes_venc,1)+INTERVAL '1 month'<=(NOW() AT TIME ZONE 'America/Lima')::date THEN motivo='Tarjeta vencida';
  ELSIF lpad(t.mes_venc::text,2,'0')||'/'||right(t.anio_venc::text,2)<>p_datos->>'vencimiento' THEN motivo='Vencimiento no coincide con el emisor';
  ELSIF t.cvv<>p_datos->>'cvv' THEN motivo='Código de seguridad incorrecto';
  ELSE
   SELECT * INTO c FROM banco_cuentas WHERE id=t.id_cuenta FOR UPDATE;
   IF c.saldo_disponible<importe THEN motivo='Saldo o línea de crédito insuficiente';
   ELSE UPDATE banco_cuentas SET saldo_disponible=saldo_disponible-importe WHERE id=c.id; END IF;
  END IF;
 ELSIF metodo='billetera' THEN
  proveedor=p_datos->>'proveedor';
  IF proveedor NOT IN('andipay','pagomovil') THEN RAISE EXCEPTION 'Proveedor inválido'; END IF;
  SELECT * INTO b FROM billeteras WHERE billeteras.proveedor=p_datos->>'proveedor' AND celular=p_datos->>'celular' FOR UPDATE;
  referencia='*** *** '||RIGHT(COALESCE(p_datos->>'celular',''),3);
  IF b.id IS NULL THEN motivo='Billetera no registrada';
  ELSIF b.codigo_aprobacion<>p_datos->>'codigo' THEN motivo='Código de aprobación incorrecto';
  ELSIF b.saldo_disponible<importe THEN motivo='Saldo insuficiente en billetera';
  ELSE UPDATE billeteras SET saldo_disponible=saldo_disponible-importe WHERE id=b.id; END IF;
 ELSIF metodo='efectivo' AND p_canal='caja' THEN
  recibido=(p_datos->>'recibido')::numeric;
  IF recibido IS NULL OR recibido<importe THEN RAISE EXCEPTION 'El efectivo no cubre el importe'; END IF;
  cambio=recibido-importe; referencia='Efectivo';
 ELSIF metodo='pos' AND p_canal='caja' THEN
  IF COALESCE(p_datos->>'voucher','')!~'^[0-9]{6,20}$' THEN RAISE EXCEPTION 'Voucher inválido'; END IF;
  referencia='Voucher '||(p_datos->>'voucher');
 ELSE RAISE EXCEPTION 'Método no permitido para este canal'; END IF;
 INSERT INTO pagos(codigo_operacion,id_registro,id_usuario,canal,metodo,proveedor_billetera,marca_tarjeta,referencia,monto,monto_recibido,vuelto,estado,motivo_rechazo,id_cajero)
 VALUES(p_operacion,r.id,r.id_usuario,p_canal,metodo,proveedor,marca,referencia,importe,recibido,cambio,CASE WHEN motivo IS NULL THEN 'aprobado' ELSE 'rechazado' END,motivo,CASE WHEN p_canal='caja' THEN u.id END) RETURNING * INTO resultado;
 IF motivo IS NULL THEN
  UPDATE compras_entradas_cine SET estado_pago='pagado',ticket_ingreso=p_ticket,fecha_pago=NOW(),canal_pago=p_canal WHERE id=r.id;
 END IF;
 RETURN to_jsonb(resultado);
END $$;
CREATE OR REPLACE FUNCTION editar_reserva_cinemax(p_id INT,p_usuario INT,p_datos JSONB) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE r compras_entradas_cine%ROWTYPE; p peliculas%ROWTYPE; seats JSONB=p_datos->'asientos'; fecha DATE=(p_datos->>'fecha_funcion')::date;
BEGIN
 SELECT * INTO r FROM compras_entradas_cine WHERE id=p_id AND id_usuario=p_usuario FOR UPDATE;
 IF NOT FOUND OR r.estado_pago<>'pendiente' OR r.estado<>'registrado' THEN RAISE EXCEPTION 'Solo puedes editar tus reservas pendientes'; END IF;
 IF fecha IS NULL OR fecha<(NOW() AT TIME ZONE 'America/Lima')::date THEN RAISE EXCEPTION 'Fecha inválida'; END IF;
 IF jsonb_typeof(seats)<>'array' OR jsonb_array_length(seats) NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Selecciona de 1 a 10 butacas'; END IF;
 SELECT * INTO p FROM peliculas WHERE clave=p_datos->>'pelicula' AND estado='cartelera';
 IF NOT FOUND THEN RAISE EXCEPTION 'Película no disponible'; END IF;
 DELETE FROM asientos_ventas WHERE compra_id=r.id;
 UPDATE compras_entradas_cine SET pelicula_id=p.id,pelicula=p.titulo,sala=p.sala,fecha_funcion=fecha,funcion_horario=p_datos->>'horario',tipo_sala=p_datos->>'tipo_sala',cantidad=jsonb_array_length(seats),asientos_vendidos=seats,comentario=p_datos->>'comentario' WHERE id=r.id RETURNING * INTO r;
 INSERT INTO asientos_ventas(compra_id,sala,fecha_funcion,horario,asiento) SELECT r.id,r.sala,r.fecha_funcion,r.funcion_horario,value FROM jsonb_array_elements_text(seats);
 RETURN to_jsonb(r);
END $$;

COMMIT;
