-- Ejecutar después de semana9.sql y de hacer las pruebas desde la web.
SELECT rol, COUNT(*) AS cantidad FROM usuarios GROUP BY rol;
SELECT id,codigo_seguimiento,estado,estado_pago,tipo_sala,cantidad,fecha_funcion,monto_calculado,ticket_ingreso FROM compras_entradas_cine ORDER BY id DESC;
SELECT id,codigo_operacion,id_registro,canal,metodo,referencia,monto,estado,motivo_rechazo,id_cajero,verificado,verificado_por FROM pagos ORDER BY id DESC;
SELECT numero_cuenta,tipo,saldo_disponible FROM banco_cuentas ORDER BY id;
SELECT proveedor,celular,saldo_disponible FROM billeteras ORDER BY id;
SELECT canal,metodo,SUM(monto) AS total FROM pagos WHERE estado='aprobado' AND (fecha_pago AT TIME ZONE 'America/Lima')::date=(NOW() AT TIME ZONE 'America/Lima')::date GROUP BY canal,metodo;
-- Debe devolver cero filas: doble cobro.
SELECT id_registro,COUNT(*) FROM pagos WHERE estado='aprobado' GROUP BY id_registro HAVING COUNT(*)>1;
-- Debe devolver cero filas: butacas duplicadas.
SELECT sala,fecha_funcion,horario,asiento,COUNT(*) FROM asientos_ventas GROUP BY sala,fecha_funcion,horario,asiento HAVING COUNT(*)>1;
-- Debe devolver cero filas: pendientes con ticket.
SELECT id FROM compras_entradas_cine WHERE estado_pago='pendiente' AND ticket_ingreso IS NOT NULL;
-- Tarifario exacto de la consigna: 52.80 y 32.00.
SELECT tarifa_cinemax('3d',3,'2026-10-13') AS ejemplo_52_80,tarifa_cinemax('general',2,'2026-10-16') AS ejemplo_32_00;
-- Registros históricos que aún requieren fecha o asignación de butacas.
SELECT c.id,c.codigo_seguimiento,c.estado,c.fecha_funcion,c.cantidad,COUNT(a.id) AS butacas FROM compras_entradas_cine c LEFT JOIN asientos_ventas a ON a.compra_id=c.id GROUP BY c.id HAVING c.fecha_funcion IS NULL OR COUNT(a.id)<>c.cantidad;
