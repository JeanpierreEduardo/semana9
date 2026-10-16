export const hoyLima=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function fechaValida(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s}
function funcion(d){const fecha=String(d.fecha_funcion||''),horario=d.horario;if(!fechaValida(fecha)||!['tarde','noche'].includes(horario))throw Error('Selecciona una fecha y horario válidos.');return {fecha,horario}}
export async function operacionesEmpleado(sql,u,ruta,method,d,{aleatorio,hash,sha,token}){
 const reserva=ruta==='/reservas';
 if(reserva&&!['usuario','cliente'].includes(u.rol))throw Error('Acceso exclusivo del cliente.');
 if((ruta==='/empleado/entrada'||ruta==='/empleado/perfil'||ruta==='/empleado/mis-ventas')&&u.rol!=='empleado')throw Error('Acceso exclusivo del empleado.');
 const pago=/^\/reservas\/(\d+)\/(cancelar)$/.exec(ruta);
 if(pago&&method==='POST'){
  const id=Number(pago[1]);let rows;
  rows=await sql`UPDATE compras_entradas_cine SET estado='cancelado' WHERE id=${id} AND id_usuario=${u.id} AND estado='registrado' AND estado_pago='pendiente' RETURNING *`;
  if(!rows[0])throw Error('No se pudo procesar: revisa el estado, la fecha y los asientos de la reserva.');return rows[0];
 }
 if(!reserva&&ruta!=='/asientos'&&!['empleado','cajero','administrador'].includes(u.rol))throw Error('Acceso exclusivo del empleado.');
 if(ruta==='/empleado/clientes'&&method==='GET')return sql`SELECT id,nombre,correo FROM usuarios WHERE rol='usuario' AND activo=TRUE ORDER BY nombre`;
 if((ruta==='/empleado/asientos'||ruta==='/asientos')&&method==='GET'){
  const f=funcion(d);const [p]=await sql`SELECT * FROM peliculas WHERE clave=${String(d.pelicula||'')}`;if(!p)throw Error('Película no encontrada.');
  const ocupados=await sql`SELECT a.asiento,c.estado_pago FROM asientos_ventas a JOIN compras_entradas_cine c ON c.id=a.compra_id WHERE a.sala=${p.sala} AND a.fecha_funcion=${f.fecha}::date AND a.horario=${f.horario} AND c.estado<>'cancelado' AND NOT(c.id=${Number(d.excluir_id)||0} AND c.id_usuario=${u.id} AND c.estado_pago='pendiente') ORDER BY a.asiento`;
  const [legacy]=await sql`SELECT COUNT(*)::int AS sin_asientos FROM compras_entradas_cine c WHERE c.sala=${p.sala} AND c.estado<>'cancelado' AND c.pelicula_id=${p.id} AND (c.fecha_funcion IS NULL OR c.fecha_funcion=${f.fecha}::date) AND c.funcion_horario=${f.horario} AND NOT EXISTS(SELECT 1 FROM asientos_ventas a WHERE a.compra_id=c.id)`;
  return {pelicula:p,reservados:ocupados.filter(x=>x.estado_pago==='pendiente').map(x=>x.asiento),ocupados:ocupados.map(x=>x.asiento),filas:6,columnas:8,sin_asientos:legacy.sin_asientos,...f};
 }
 if((ruta==='/empleado/ventas'||reserva)&&method==='POST'){
  const f=funcion(d);if(f.fecha<hoyLima())throw Error('No puedes vender entradas para una fecha pasada.');
  const [p]=await sql`SELECT * FROM peliculas WHERE clave=${String(d.pelicula||'')} AND estado='cartelera'`;if(!p)throw Error('Selecciona una película en cartelera.');
  const [cliente]=await sql`SELECT id,nombre,correo FROM usuarios WHERE id=${reserva?u.id:(Number(d.id_usuario)||0)} AND rol IN('usuario','cliente') AND activo=TRUE`;if(!cliente)throw Error('Selecciona un cliente registrado y activo.');
  const asientos=Array.isArray(d.asientos)?d.asientos:[];if(!asientos.length||asientos.length>10||new Set(asientos).size!==asientos.length||asientos.some(a=>!/^([A-F][1-8])$/.test(a)))throw Error('Selecciona entre 1 y 10 asientos diferentes.');
  const precio='16';if(!/^\d{1,4}(\.\d{1,2})?$/.test(precio)||Number(precio)<=0||Number(precio)>9999)throw Error('Ingresa un precio por entrada mayor que cero y de hasta dos decimales.');
  const comentario=String(d.comentario||'').trim();if(comentario.length>500)throw Error('El comentario admite hasta 500 caracteres.');
  const code='CIN-'+aleatorio(8).toUpperCase();
  // Una sola sentencia: el INSERT de asientos y la venta se confirman juntos.
  // La restricción UNIQUE impide que dos cajeros vendan el mismo asiento.
  const rows=await sql`WITH venta AS (
   INSERT INTO compras_entradas_cine(codigo_seguimiento,id_usuario,nombre_cliente,correo_cliente,pelicula,funcion_horario,sala,cantidad,comentario,estado,pelicula_id,id_empleado,fecha_funcion,precio_unitario,total_venta,asientos_vendidos,tipo_sala,estado_pago,ticket_ingreso,fecha_pago)
   VALUES(${code},${cliente.id},${cliente.nombre},${cliente.correo},${p.titulo},${f.horario},${p.sala},${asientos.length},${comentario},'registrado',${p.id},${reserva?null:u.id},${f.fecha}::date,${precio}::numeric,${precio}::numeric*${asientos.length},${JSON.stringify(asientos)}::jsonb,${d.tipo_sala||'general'},'pendiente',NULL,NULL) RETURNING *
  ), asignados AS (
   INSERT INTO asientos_ventas(compra_id,sala,fecha_funcion,horario,asiento)
   SELECT venta.id,venta.sala,venta.fecha_funcion,venta.funcion_horario,a.asiento FROM venta CROSS JOIN jsonb_array_elements_text(${JSON.stringify(asientos)}::jsonb) AS a(asiento) RETURNING asiento
  ) SELECT venta.*, (SELECT json_agg(asiento ORDER BY asiento) FROM asignados) AS asientos FROM venta`;
  return {...rows[0],codigo:rows[0].codigo_seguimiento};
 }
 if(ruta==='/empleado/mis-ventas'&&method==='GET')return sql`SELECT c.*, COALESCE((SELECT json_agg(a.asiento ORDER BY a.asiento) FROM asientos_ventas a WHERE a.compra_id=c.id)::jsonb,c.asientos_vendidos,'[]'::jsonb) AS asientos FROM compras_entradas_cine c WHERE c.id_empleado=${u.id} ORDER BY c.fecha_registro DESC,c.id DESC`;
 if(ruta==='/empleado/entrada'&&['GET','POST'].includes(method)){
  const code=String(d.codigo||'').trim().toUpperCase();if(!/^TKT-[A-Z0-9]{24}$/.test(code))throw Error('Ingresa el código de seguimiento de la entrada.');
  if(method==='POST'){
   const rows=await sql`UPDATE compras_entradas_cine SET estado='atendido',id_validador=${u.id},fecha_validacion=NOW() WHERE ticket_ingreso=${code} AND estado='registrado' AND estado_pago='pagado' AND (fecha_funcion IS NULL OR fecha_funcion=(NOW() AT TIME ZONE 'America/Lima')::date) RETURNING id,codigo_seguimiento,estado,fecha_validacion`;
   if(!rows[0])throw Error('No se puede validar: el código no existe, ya fue atendido, está cancelado o la función no es de hoy.');return rows[0];
  }
  const [r]=await sql`SELECT c.*,COALESCE((SELECT json_agg(a.asiento ORDER BY a.asiento) FROM asientos_ventas a WHERE a.compra_id=c.id)::jsonb,c.asientos_vendidos,'[]'::jsonb) AS asientos FROM compras_entradas_cine c WHERE c.ticket_ingreso=${code}`;if(!r)throw Error('Entrada no encontrada.');return r;
 }
 if(ruta==='/empleado/perfil'&&method==='PUT'){
  const correo=String(d.correo||'').trim().toLowerCase(),actual=String(d.contrasena_actual||''),nueva=String(d.contrasena_nueva||'');
  if(correo.length>120||!/^\S+@\S+\.\S+$/.test(correo))throw Error('Ingresa un correo válido.');
  if(!actual||actual.length>128)throw Error('Confirma tu contraseña actual.');
  if(nueva&&(nueva.length<8||nueva.length>128))throw Error('La contraseña nueva debe tener 8 a 128 caracteres.');
  const [original]=await sql`SELECT * FROM usuarios WHERE id=${u.id} AND activo=TRUE AND rol='empleado'`;
  const valida=original?.contrasena_hash&&/^[a-f0-9]{32}$/.test(original.salt||'')?await hash(actual,original.salt)===original.contrasena_hash:original?.contrasena===actual;
  if(!valida)throw Error('La contraseña actual no es correcta.');
  const salt=nueva?aleatorio(16):null,passwordHash=nueva?await hash(nueva,salt):null,tokenHash=await sha(token);
  const [updated]=await sql`WITH actualizado AS (
   UPDATE usuarios SET correo=${correo},contrasena_hash=COALESCE(${passwordHash},contrasena_hash),salt=COALESCE(${salt},salt),contrasena=CASE WHEN ${passwordHash}::text IS NOT NULL THEN NULL ELSE contrasena END WHERE id=${u.id} AND rol='empleado' AND activo=TRUE RETURNING id,nombre,correo,rol
  ), invalidadas AS (DELETE FROM sesiones_cinemax WHERE id_usuario=${u.id} AND token_hash<>${tokenHash} AND ${passwordHash}::text IS NOT NULL AND EXISTS(SELECT 1 FROM actualizado) RETURNING token_hash)
  SELECT * FROM actualizado`;
  if(!updated)throw Error('No se pudo actualizar tu perfil.');return updated;
 }
 throw Error('Operación del empleado no permitida.');
}
