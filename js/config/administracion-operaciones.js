import {validarTurno} from '../turnos/turnos.js';
import {operacionesClientes} from './clientes-operaciones.js';
export function validarPelicula(d){
 const clave=String(d.clave||'').trim().toLowerCase(),titulo=String(d.titulo||'').trim(),genero=String(d.genero||'').trim(),clasificacion=String(d.clasificacion||'').trim(),sala=String(d.sala||'').trim(),sinopsis=String(d.sinopsis||'').trim(),poster=String(d.poster||'img/im2.jpg').trim(),duracion=Number(d.duracion);
 if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(clave))throw Error('El código debe tener 2 a 80 letras minúsculas, números o guiones.');
 if(titulo.length<2||titulo.length>120||!genero||genero.length>60||!clasificacion||clasificacion.length>30||!sala||sala.length>20||sinopsis.length>2000||!Number.isInteger(duracion)||duracion<1||duracion>600)throw Error('Revisa título, género, duración (1–600 minutos), clasificación, sala y sinopsis.');
 if(!['cartelera','proximamente','inactiva'].includes(d.estado))throw Error('Estado de película inválido.');
 if(poster.length>500||!(/^(img\/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp))$/i.test(poster)||/^https:\/\//i.test(poster)))throw Error('El póster debe ser una ruta de imagen en img/ o una URL HTTPS.');
 return {clave,titulo,genero,clasificacion,sala,sinopsis,poster,duracion,estado:d.estado};
}
function validarTrabajador(d,crear=false){
 const nombre=String(d.nombre||'').trim().replace(/\s+/g,' '),correo=String(d.correo||'').trim().toLowerCase();
 if(nombre.length<3||nombre.length>120||correo.length>120||!/^\S+@\S+\.\S+$/.test(correo)||!['administrador','empleado','cajero'].includes(d.rol))throw Error('Revisa nombre, correo y rol del trabajador.');
 const contrasena=String(d.contrasena||'');if((crear||contrasena)&&(contrasena.length<8||contrasena.length>128))throw Error('La contraseña debe tener 8 a 128 caracteres.');
 if(!crear&&!['true','false',true,false].includes(d.activo))throw Error('Estado del trabajador inválido.');
 return {nombre,correo,rol:d.rol,activo:crear?true:(d.activo===true||d.activo==='true'),contrasena,...validarTurno(d)};
}
export async function operacionesAdmin(sql,u,ruta,method,d,{aleatorio,hash}){
 if(u.rol!=='administrador')throw Error('Esta sección es exclusiva del administrador.');
 if(ruta.startsWith('/admin/clientes'))return operacionesClientes(sql,u,ruta,method,d,{aleatorio,hash});
 const pelicula=/^\/admin\/peliculas(?:\/([1-9][0-9]*))?$/.exec(ruta);
 if(pelicula){const id=pelicula[1]?Number(pelicula[1]):null;
  if(method==='GET'){const rows=id?await sql`SELECT * FROM peliculas WHERE id=${id}`:await sql`SELECT * FROM peliculas ORDER BY fecha_registro DESC,id DESC`;if(id&&!rows[0])throw Error('Película no encontrada.');return id?rows[0]:rows}
  if((method==='POST'&&!id)||(method==='PUT'&&id)){
   const p=validarPelicula(d);let rows;
   if(method==='POST')rows=await sql`INSERT INTO peliculas(clave,titulo,genero,duracion,clasificacion,sala,sinopsis,poster,estado) VALUES(${p.clave},${p.titulo},${p.genero},${p.duracion},${p.clasificacion},${p.sala},${p.sinopsis},${p.poster},${p.estado}) RETURNING *`;
   else rows=await sql`UPDATE peliculas SET clave=${p.clave},titulo=${p.titulo},genero=${p.genero},duracion=${p.duracion},clasificacion=${p.clasificacion},sala=${p.sala},sinopsis=${p.sinopsis},poster=${p.poster},estado=${p.estado} WHERE id=${id} RETURNING *`;
   if(!rows[0])throw Error('Película no encontrada.');return rows[0];
  }
 }
 const trabajador=/^\/admin\/trabajadores(?:\/([1-9][0-9]*))?$/.exec(ruta);
 if(trabajador){const id=trabajador[1]?Number(trabajador[1]):null;
  if(method==='GET')return sql`SELECT id,nombre,correo,rol,activo,fecha_registro,turno_nombre,turno_inicio,turno_fin FROM usuarios WHERE rol IN ('administrador','empleado','cajero') ORDER BY nombre`;
  if((method==='POST'&&!id)||(method==='PUT'&&id)){
   const t=validarTrabajador(d,method==='POST');let rows;
   if(id===u.id&&(!t.activo||t.rol!=='administrador'))throw Error('No puedes desactivar tu propia cuenta ni quitarte el rol administrador.');
   const salt=t.contrasena?aleatorio(16):null,passwordHash=t.contrasena?await hash(t.contrasena,salt):null;
   if(method==='POST')rows=await sql`INSERT INTO usuarios(nombre,correo,rol,activo,contrasena_hash,salt,turno_nombre,turno_inicio,turno_fin) VALUES(${t.nombre},${t.correo},${t.rol},TRUE,${passwordHash},${salt},${t.turno_nombre},${t.turno_inicio},${t.turno_fin}) RETURNING id,nombre,correo,rol,activo,turno_nombre,turno_inicio,turno_fin`;
   else rows=await sql`UPDATE usuarios SET nombre=${t.nombre},correo=${t.correo},rol=${t.rol},activo=${t.activo},turno_nombre=${t.turno_nombre},turno_inicio=${t.turno_inicio},turno_fin=${t.turno_fin},contrasena_hash=COALESCE(${passwordHash},contrasena_hash),salt=COALESCE(${salt},salt),contrasena=CASE WHEN ${passwordHash}::text IS NOT NULL THEN NULL ELSE contrasena END WHERE id=${id} AND rol IN ('administrador','empleado','cajero') RETURNING id,nombre,correo,rol,activo`;
   if(!rows[0])throw Error('Trabajador no encontrado.');return rows[0];
  }
 }
 throw Error('Operación administrativa no permitida.');
}
