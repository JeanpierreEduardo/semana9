// Variante académica: se conserva una contraseña visible solo para cuentas cliente.
// Las contraseñas anteriores que solo tienen hash no se reconstruyen.
export async function operacionesClientes(sql,u,ruta,method,d,{aleatorio,hash}){
 if(u.rol!=='administrador')throw Error('Acceso exclusivo para administradores.');
 const match=/^\/admin\/clientes(?:\/([1-9][0-9]*))?$/.exec(ruta);if(!match)throw Error('Operación de clientes no permitida.');
 const id=match[1]?Number(match[1]):null;if(id&&!Number.isSafeInteger(id))throw Error('Identificador inválido.');
 if(method==='GET'){
  const rows=id?await sql`SELECT id,nombre,correo,contrasena,activo,fecha_registro FROM usuarios WHERE id=${id} AND rol='usuario'`:await sql`SELECT id,nombre,correo,contrasena,activo,fecha_registro FROM usuarios WHERE rol='usuario' ORDER BY nombre,id`;
  if(id&&!rows[0])throw Error('Cliente no encontrado.');return id?rows[0]:rows;
 }
 if(method==='PUT'&&id){
  const nombre=String(d.nombre||'').trim().replace(/\s+/g,' '),correo=String(d.correo||'').trim().toLowerCase(),password=typeof d.contrasena==='string'?d.contrasena:'';
  if(nombre.length<3||nombre.length>120||correo.length>120||!/^\S+@\S+\.\S+$/.test(correo))throw Error('Ingresa un nombre de 3 a 120 caracteres y un correo válido.');
  if(password&&(password.length<8||password.length>128))throw Error('La contraseña debe tener de 8 a 128 caracteres.');
  if(![true,false,'true','false'].includes(d.activo))throw Error('Estado de cliente inválido.');
  const activo=d.activo===true||d.activo==='true',salt=password?aleatorio(16):null,passwordHash=password?await hash(password,salt):null;
  const [r]=await sql`WITH actualizado AS (
   UPDATE usuarios SET nombre=${nombre},correo=${correo},activo=${activo},contrasena=CASE WHEN ${password}::text<>'' THEN ${password} ELSE contrasena END,contrasena_hash=COALESCE(${passwordHash},contrasena_hash),salt=COALESCE(${salt},salt) WHERE id=${id} AND rol='usuario' RETURNING id,nombre,correo,contrasena,activo,fecha_registro
  ), invalidadas AS (DELETE FROM sesiones_cinemax WHERE id_usuario=${id} AND (${passwordHash}::text IS NOT NULL OR NOT ${activo}::boolean) AND EXISTS(SELECT 1 FROM actualizado) RETURNING token_hash)
  SELECT * FROM actualizado`;
  if(!r)throw Error('Cliente no encontrado.');return r;
 }
 if(method==='DELETE'&&id){
  // La cuenta se elimina, pero sus compras e importes permanecen como historial.
  const [r]=await sql`WITH cliente AS (SELECT id FROM usuarios WHERE id=${id} AND rol='usuario'),
  desvinculadas AS (UPDATE compras_entradas_cine SET id_usuario=CASE WHEN id_usuario=${id} THEN NULL ELSE id_usuario END,usuario_id=CASE WHEN usuario_id=${id} THEN NULL ELSE usuario_id END,id_empleado=CASE WHEN id_empleado=${id} THEN NULL ELSE id_empleado END,id_validador=CASE WHEN id_validador=${id} THEN NULL ELSE id_validador END WHERE EXISTS(SELECT 1 FROM cliente) AND (id_usuario=${id} OR usuario_id=${id} OR id_empleado=${id} OR id_validador=${id}) RETURNING id),
  eliminado AS (DELETE FROM usuarios WHERE id IN (SELECT id FROM cliente) AND (SELECT COUNT(*) FROM desvinculadas)>=0 RETURNING id)
  SELECT * FROM eliminado`;
  if(!r)throw Error('Cliente no encontrado.');return {ok:true,id:r.id};
 }
 throw Error('Operación de clientes no permitida.');
}
