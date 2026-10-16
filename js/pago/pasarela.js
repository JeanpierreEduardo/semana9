import {validarPago} from './validaciones.js';
export async function operacionesPago(sql,u,ruta,method,d,{aleatorio}){
 const caja=['cajero','administrador'].includes(u.rol);
 if(ruta==='/pagos'&&method==='POST'){
  const datos=validarPago(d),canal=d.canal==='caja'?'caja':'pasarela';
  if(canal==='caja'&&!caja)throw Error('Acceso exclusivo de caja.');
  const [r]=await sql`SELECT pagar_cinemax(${Number(d.id)},${u.id},${canal},${JSON.stringify(datos)}::jsonb,${'OP-'+aleatorio(8).toUpperCase()},${'TKT-'+aleatorio(12).toUpperCase()}) AS pago`;
  return r.pago;
 }
 if(ruta==='/comprobante'&&method==='GET'){
  const [r]=await sql`SELECT p.*,c.ticket_ingreso,c.nombre_cliente,c.pelicula,c.sala,c.tipo_sala,c.funcion_horario,c.fecha_funcion,c.asientos_vendidos,c.cantidad FROM pagos p JOIN compras_entradas_cine c ON c.id=p.id_registro WHERE p.codigo_operacion=${d.op} AND p.estado='aprobado' AND (p.id_usuario=${u.id} OR ${['cajero','administrador','empleado'].includes(u.rol)})`;
  if(!r)throw Error('Comprobante no encontrado o sin permiso.');return r;
 }
 if(!caja)throw Error('Acceso exclusivo de caja.');
 if(ruta==='/caja/pendientes'&&method==='GET'){
  const busqueda='%'+String(d.busqueda||'').trim()+'%';
  return sql`SELECT c.*,u.dni FROM compras_entradas_cine c JOIN usuarios u ON u.id=c.id_usuario WHERE c.estado_pago='pendiente' AND c.estado='registrado' AND (c.nombre_cliente ILIKE ${busqueda} OR c.codigo_seguimiento ILIKE ${busqueda} OR u.dni ILIKE ${busqueda}) ORDER BY c.id DESC LIMIT 100`;
 }
 if(ruta==='/caja/pagos'&&method==='GET')return sql`SELECT p.*,c.nombre_cliente,v.nombre AS verificador FROM pagos p JOIN compras_entradas_cine c ON c.id=p.id_registro LEFT JOIN usuarios v ON v.id=p.verificado_por WHERE (p.fecha_pago AT TIME ZONE 'America/Lima')::date=(NOW() AT TIME ZONE 'America/Lima')::date ORDER BY p.fecha_pago DESC`;
 if(ruta==='/caja/verificar'&&method==='POST'){
  const rows=await sql`UPDATE pagos SET verificado=TRUE,verificado_por=${u.id},fecha_verificacion=NOW() WHERE id=${Number(d.id)} AND estado='aprobado' AND canal='pasarela' AND verificado=FALSE RETURNING id`;
  return {ok:!!rows.length};
 }
 throw Error('Operación no encontrada.');
}
