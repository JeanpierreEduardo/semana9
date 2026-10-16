-- OPCIONAL. Solo para la demostración: crea 7 reservas NUEVAS con prefijo DEMO-S9.
-- No marca como pagadas compras antiguas. Los saldos y cobros son ficticios.
-- Ejecutar después de semana9.sql. Puede repetirse sin duplicar las operaciones.
BEGIN;
INSERT INTO usuarios(nombre,correo,contrasena,rol,dni)
VALUES('Cliente Demostración Semana 9','demo9@cinemax.test','DemoCine2026','usuario','70990009')
ON CONFLICT(correo) DO NOTHING;
DO $$
DECLARE cliente INT; cajero INT; p peliculas%ROWTYPE; r compras_entradas_cine%ROWTYPE; i INT; fecha DATE; datos JSONB; resultado JSONB;
BEGIN
 SELECT id INTO cliente FROM usuarios WHERE correo='demo9@cinemax.test';
 SELECT id INTO cajero FROM usuarios WHERE correo='caja@correo.com' AND rol='cajero';
 SELECT * INTO p FROM peliculas WHERE estado='cartelera' ORDER BY id LIMIT 1;
 IF p.id IS NULL OR cajero IS NULL THEN RAISE EXCEPTION 'Falta una película en cartelera o el cajero de prueba'; END IF;
 FOR i IN 1..7 LOOP
  IF EXISTS(SELECT 1 FROM compras_entradas_cine WHERE codigo_seguimiento='DEMO-S9-'||lpad(i::text,3,'0')) THEN CONTINUE; END IF;
  fecha=(NOW() AT TIME ZONE 'America/Lima')::date+90+i;
  INSERT INTO compras_entradas_cine(codigo_seguimiento,id_usuario,nombre_cliente,correo_cliente,pelicula,pelicula_id,sala,funcion_horario,fecha_funcion,cantidad,tipo_sala,asientos_vendidos,estado,comentario)
  VALUES('DEMO-S9-'||lpad(i::text,3,'0'),cliente,'Cliente Demostración Semana 9','demo9@cinemax.test',p.titulo,p.id,p.sala,'tarde',fecha,2,'general','["F7","F8"]','registrado','Demostración aislada Semana 9') RETURNING * INTO r;
  INSERT INTO asientos_ventas(compra_id,sala,fecha_funcion,horario,asiento) VALUES(r.id,r.sala,fecha,'tarde','F7'),(r.id,r.sala,fecha,'tarde','F8');
  datos=CASE i
   WHEN 1 THEN '{"metodo":"tarjeta","numero":"4111111111111111","vencimiento":"12/29","cvv":"123"}'::jsonb
   WHEN 2 THEN '{"metodo":"tarjeta","numero":"5555555555554444","vencimiento":"05/30","cvv":"789"}'::jsonb
   WHEN 3 THEN '{"metodo":"billetera","proveedor":"andipay","celular":"987654321","codigo":"123456"}'::jsonb
   WHEN 4 THEN '{"metodo":"billetera","proveedor":"andipay","celular":"999888777","codigo":"111222"}'::jsonb
   WHEN 5 THEN '{"metodo":"efectivo","recibido":"50"}'::jsonb
   WHEN 6 THEN '{"metodo":"pos","voucher":"004513"}'::jsonb
   ELSE '{"metodo":"tarjeta","numero":"4111111111111111","vencimiento":"12/29","cvv":"999"}'::jsonb END;
  resultado=pagar_cinemax(r.id,CASE WHEN i IN(5,6) THEN cajero ELSE cliente END,CASE WHEN i IN(5,6) THEN 'caja' ELSE 'pasarela' END,datos,'OP-DEMO-S9-'||lpad(i::text,3,'0'),'TKT-'||upper(substr(md5('demo-s9-'||r.id::text),1,24)));
  IF i<=6 AND resultado->>'estado'<>'aprobado' THEN RAISE EXCEPTION 'Emisor de prueba sin disponibilidad: %. Revise saldos ficticios.',resultado->>'motivo_rechazo'; END IF;
 END LOOP;
END $$;
COMMIT;
