import {operacionesPago} from '../pago/pasarela.js';
import {FUERA_TURNO,SIN_TURNO} from '../turnos/turnos.js';
import {operacionesEmpleado} from './empleado-operaciones.js';
import {operacionesAdmin} from './administracion-operaciones.js';
import {esPersonal,validarCompra,serializarCompra} from './reglas.js';
// Funciones de práctica académica. Con SQL directo los permisos no son una barrera
// contra quien tenga la credencial de la BD; no usar esta arquitectura en producción.
export function crearOperaciones(sql,storage,cryptoApi) {
 const TOKEN='cinemax_token_directo_v1';
 const hex=a=>[...new Uint8Array(a)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const aleatorio=n=>hex(cryptoApi.getRandomValues(new Uint8Array(n)));
 const bytes=s=>new Uint8Array(s.match(/../g).map(x=>parseInt(x,16)));
 const sha=async s=>hex(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 async function hash(password,salt){const key=await cryptoApi.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await cryptoApi.subtle.deriveBits({name:'PBKDF2',salt:bytes(salt),iterations:180000,hash:'SHA-256'},key,256));}
 const perfil=u=>({id:u.id,nombre:u.nombre,correo:u.correo,rol:u.rol,turno_nombre:u.turno_nombre,turno_inicio:u.turno_inicio,turno_fin:u.turno_fin});
 function verificarTurno(u){if(u.rol!=='empleado')return;if(!u.turno_inicio||!u.turno_fin||!u.turno_nombre)throw Error(SIN_TURNO);if(!u.en_turno)throw Error(FUERA_TURNO);}
 async function nuevaSesion(u){
  verificarTurno(u);
  const token=aleatorio(32),tokenHash=await sha(token);
  // Revalidar el turno en la misma sentencia que crea la sesión.
  const creada=await sql`INSERT INTO sesiones_cinemax(token_hash,id_usuario,expira)
   SELECT ${tokenHash},id,NOW()+INTERVAL '8 hours' FROM usuarios WHERE id=${u.id} AND activo=TRUE
   AND (rol<>'empleado' OR cinemax_en_turno(turno_inicio,turno_fin)) RETURNING token_hash`;
  if(!creada[0])throw Error(u.rol==='empleado'?FUERA_TURNO:'No se pudo iniciar sesión.');
  storage.setItem(TOKEN,token);return perfil(u);
 }
 async function sesion(){
  const token=storage.getItem(TOKEN);if(!token)throw Error('Inicia sesión para continuar.');
  const tokenHash=await sha(token);
  const rows=await sql`SELECT u.id,u.nombre,u.correo,u.rol,u.turno_nombre,u.turno_inicio,u.turno_fin,
   cinemax_en_turno(u.turno_inicio,u.turno_fin) AS en_turno
   FROM sesiones_cinemax s JOIN usuarios u ON u.id=s.id_usuario
   WHERE s.token_hash=${tokenHash} AND s.expira>NOW() AND u.activo=TRUE`;
  if(!rows[0]){storage.removeItem(TOKEN);throw Error('Tu sesión caducó. Inicia sesión nuevamente.')}
  try{verificarTurno(rows[0])}catch(error){storage.removeItem(TOKEN);try{await sql`DELETE FROM sesiones_cinemax WHERE token_hash=${tokenHash}`}catch{}throw error;}
  return rows[0];
 }
 return async function operar(ruta,opciones={}) {
  const method=opciones.method||'GET';const d=opciones.body?JSON.parse(opciones.body):{};
  if(ruta==='/auth/registro'&&method==='POST'){
   const nombre=String(d.nombre||'').trim().replace(/\s+/g,' '),correo=String(d.correo||'').trim().toLowerCase();
   if(nombre.length<3||nombre.length>120||correo.length>120||!/^\S+@\S+\.\S+$/.test(correo)||typeof d.contrasena!=='string'||d.contrasena.length<8||d.contrasena.length>128)throw Error('Usa nombre de 3 a 120 caracteres, correo válido y contraseña de 8 a 128 caracteres.');
   const salt=aleatorio(16),passwordHash=await hash(d.contrasena,salt);
   const rows=await sql`INSERT INTO usuarios(nombre,correo,contrasena_hash,salt,rol,contrasena) VALUES(${nombre},${correo},${passwordHash},${salt},'usuario',${d.contrasena}) RETURNING id,nombre,correo,rol`;
   return nuevaSesion(rows[0]);
  }
  if(ruta==='/auth/login'&&method==='POST'){
   if(typeof d.contrasena!=='string'||d.contrasena.length>128)throw Error('Credenciales inválidas.');
   const rows=await sql`SELECT *,cinemax_en_turno(turno_inicio,turno_fin) AS en_turno FROM usuarios WHERE lower(correo)=${String(d.correo||'').trim().toLowerCase()} AND activo=TRUE LIMIT 1`;const u=rows[0];let valid=false;
   if(u?.contrasena_hash&&/^[a-f0-9]{32}$/.test(u.salt||''))valid=await hash(d.contrasena,u.salt)===u.contrasena_hash;
   else if(u?.contrasena)valid=u.contrasena===d.contrasena;
   if(!valid)throw Error('Correo o contraseña incorrectos.');
   verificarTurno(u);
   if(u.contrasena&&!u.contrasena_hash){const salt=aleatorio(16),passwordHash=await hash(d.contrasena,salt);await sql`UPDATE usuarios SET contrasena_hash=${passwordHash},salt=${salt} WHERE id=${u.id}`}
   return nuevaSesion(u);
  }
  if(ruta==='/auth/logout'&&method==='POST'){const token=storage.getItem(TOKEN);if(token){const tokenHash=await sha(token);await sql`DELETE FROM sesiones_cinemax WHERE token_hash=${tokenHash}`}storage.removeItem(TOKEN);return {ok:true}}
  if(ruta==='/peliculas'&&method==='GET')return sql`SELECT * FROM peliculas WHERE estado<>'inactiva' ORDER BY titulo`;
  const u=await sesion();
  if(ruta==='/auth/me'&&method==='GET')return perfil(u);
  if(ruta==='/pagos'||ruta==='/comprobante'||ruta.startsWith('/caja/'))return operacionesPago(sql,u,ruta,method,d,{aleatorio});
  if(ruta==='/reservas/editar'&&method==='POST'){const [r]=await sql`SELECT editar_reserva_cinemax(${Number(d.id)},${u.id},${JSON.stringify(d)}::jsonb) AS reserva`;return r.reserva;}
  if((ruta==='/compras'||ruta.startsWith('/compras/'))&&!['usuario','cliente'].includes(u.rol))throw Error('Acceso exclusivo del cliente.');
  if(ruta.startsWith('/admin/'))return operacionesAdmin(sql,u,ruta,method,d,{aleatorio,hash});
  if(ruta==='/asientos'||ruta==='/reservas'||/^\/reservas\/\d+\/(cancelar)$/.test(ruta))return operacionesEmpleado(sql,u,ruta,method,d,{aleatorio});
  if(ruta==='/compras'&&method==='POST')return operacionesEmpleado(sql,u,'/reservas',method,d,{aleatorio});
  if(ruta==='/panel/compras'&&method==='POST')throw Error('Registra la reserva desde Reservar o la venta desde Venta de entradas para asignar asientos.');
  if(ruta.startsWith('/empleado/'))return operacionesEmpleado(sql,u,ruta,method,d,{aleatorio,hash,sha,token:storage.getItem(TOKEN)});
  const panel=ruta.startsWith('/panel/');if(panel&&!esPersonal(u))throw Error('Solo administrador y empleado pueden acceder al panel.');
  if(ruta==='/panel/usuarios'&&method==='GET')return sql`SELECT id,nombre,correo FROM usuarios WHERE activo=TRUE ORDER BY nombre`;
  const base=panel?'/panel/compras':'/compras';const match=new RegExp('^'+base+'(?:/([1-9][0-9]*))?$').exec(ruta);if(!match)throw Error('Operación no encontrada.');const id=match[1]?Number(match[1]):null;if(id&&!Number.isSafeInteger(id))throw Error('Identificador inválido.');
  if(method==='GET'){
   let rows;if(id)rows=panel?await sql`SELECT c.*,(SELECT codigo_operacion FROM pagos WHERE id_registro=c.id AND estado='aprobado' LIMIT 1) AS codigo_operacion,p.clave AS pelicula_clave FROM compras_entradas_cine c LEFT JOIN peliculas p ON p.id=c.pelicula_id WHERE c.id=${id}`:await sql`SELECT c.*,(SELECT codigo_operacion FROM pagos WHERE id_registro=c.id AND estado='aprobado' LIMIT 1) AS codigo_operacion,p.clave AS pelicula_clave FROM compras_entradas_cine c LEFT JOIN peliculas p ON p.id=c.pelicula_id WHERE c.id=${id} AND c.id_usuario=${u.id}`;
   else rows=panel?await sql`SELECT c.*,(SELECT codigo_operacion FROM pagos WHERE id_registro=c.id AND estado='aprobado' LIMIT 1) AS codigo_operacion,p.clave AS pelicula_clave FROM compras_entradas_cine c LEFT JOIN peliculas p ON p.id=c.pelicula_id ORDER BY c.fecha_registro DESC,c.id DESC`:await sql`SELECT c.*,(SELECT codigo_operacion FROM pagos WHERE id_registro=c.id AND estado='aprobado' LIMIT 1) AS codigo_operacion,p.clave AS pelicula_clave FROM compras_entradas_cine c LEFT JOIN peliculas p ON p.id=c.pelicula_id WHERE c.id_usuario=${u.id} ORDER BY c.fecha_registro DESC,c.id DESC`;
   if(id&&!rows[0])throw Error('Compra no encontrada.');
   return id?serializarCompra(rows[0]):panel?rows.map(serializarCompra):rows;
  }
  if(method==='DELETE'&&id){if(!panel)throw Error('Solo el personal puede eliminar compras.');const rows=await sql`DELETE FROM compras_entradas_cine WHERE id=${id} RETURNING id`;if(!rows[0])throw Error('Compra no encontrada.');return {ok:true}}
  if((method==='POST'&&!id)||(method==='PUT'&&id)){
   const films=await sql`SELECT * FROM peliculas WHERE clave=${String(d.pelicula||'')}`;const film=films[0];if(!film)throw Error('La película seleccionada no existe.');
   if(film.estado!=='cartelera'){let previa=[];if(method==='PUT'&&id)previa=panel?await sql`SELECT pelicula_id FROM compras_entradas_cine WHERE id=${id}`:await sql`SELECT pelicula_id FROM compras_entradas_cine WHERE id=${id} AND id_usuario=${u.id}`;if(previa[0]?.pelicula_id!==film.id)throw Error('La película no está disponible en cartelera.');}
   const data=validarCompra(d,panel,film);const clients=await sql`SELECT id,nombre,correo FROM usuarios WHERE id=${panel?data.id_usuario:u.id} AND activo=TRUE`;const cliente=clients[0];if(!cliente)throw Error('El cliente no existe.');let rows;
   if(method==='POST'){
    const code='CIN-'+aleatorio(8).toUpperCase();
    rows=await sql`INSERT INTO compras_entradas_cine(codigo_seguimiento,id_usuario,nombre_cliente,correo_cliente,pelicula,funcion_horario,sala,cantidad,comentario,estado,pelicula_id) VALUES(${code},${cliente.id},${cliente.nombre},${cliente.correo},${data.pelicula},${data.horario},${data.sala},${data.cantidad},${data.comentario},${data.estado},${film.id}) RETURNING *`;
   }else if(panel){
    rows=await sql`UPDATE compras_entradas_cine SET pelicula_id=${film.id},id_usuario=${cliente.id},nombre_cliente=${cliente.nombre},correo_cliente=${cliente.correo},pelicula=${data.pelicula},funcion_horario=${data.horario},sala=${data.sala},cantidad=${data.cantidad},comentario=${data.comentario},estado=${data.estado} WHERE id=${id} AND estado_pago='pendiente' RETURNING *`;
   }else{
    rows=await sql`UPDATE compras_entradas_cine SET pelicula_id=${film.id},pelicula=${data.pelicula},funcion_horario=${data.horario},sala=${data.sala},cantidad=${data.cantidad},comentario=${data.comentario} WHERE id=${id} AND id_usuario=${u.id} AND estado='registrado' AND estado_pago='pendiente' RETURNING *`;
   }
   if(!rows[0])throw Error('No se pudo actualizar: la compra no existe, no te pertenece o ya no está registrada.');return {...rows[0],codigo:rows[0].codigo_seguimiento};
  }
  throw Error('Operación no permitida.');
 };
}
