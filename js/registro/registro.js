import {exigirRol} from '../auth/auth.js';
import {api} from '../config/neon-config.js';
import {cargarSelector} from '../catalogo/catalogo.js';
import {crearMapa} from '../asientos/mapa.js';
import {calcularMontoServicio,soles} from './tarifario.js';
const u=await exigirRol(['usuario','cliente']);
if(u){
 const form=document.querySelector('.formulario-reserva'),error=document.getElementById('reserva-error'),button=form.querySelector('[type=submit]');
 const id=Number(new URLSearchParams(location.search).get('id')),editando=location.pathname.endsWith('actualizar.html');let enviando=false;
 const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 form.elements.nombre.value=u.nombre;form.elements.correo.value=u.correo;form.elements.nombre.readOnly=true;form.elements.correo.readOnly=true;
 form.elements.fecha_funcion.min=hoy;form.elements.fecha_funcion.value=hoy;
 document.getElementById('sesion-activa').textContent='Sesión: '+u.nombre;
 const datos=()=>({pelicula:form.elements.pelicula.value,fecha_funcion:form.elements.fecha_funcion.value,horario:form.elements.horario.value,excluir_id:editando?id:0});
 function cotizar(a=mapa.seleccion){form.elements.entradas.value=a.length;document.getElementById('cotizacion').textContent=`${a.length} butacas: ${a.join(', ')||'ninguna'} · Total ${soles(calcularMontoServicio({...datos(),tipo_sala:form.elements.tipo_sala.value,cantidad:a.length}))}`;button.disabled=enviando||!a.length;}
 const mapa=crearMapa({contenedor:document.getElementById('mapa-asientos'),info:document.getElementById('info-asientos'),datos,alCambiar:cotizar});
 for(const k of ['pelicula','fecha_funcion','horario'])form.elements[k].addEventListener('change',()=>mapa.actualizar(true));form.elements.tipo_sala.addEventListener('change',()=>cotizar());
 document.getElementById('refrescar').onclick=()=>mapa.actualizar();
 try{
  await cargarSelector(form.elements.pelicula);
  const movie=new URLSearchParams(location.search).get('pelicula');if(movie&&[...form.elements.pelicula.options].some(o=>o.value===movie))form.elements.pelicula.value=movie;
  if(editando){const r=await api('/compras/'+id);if(r.estado_pago!=='pendiente'||r.estado!=='registrado')throw Error('Solo se pueden editar reservas pendientes.');for(const k of ['pelicula','horario','fecha_funcion','tipo_sala','comentario'])form.elements[k].value=r[k]??'';button.textContent='Guardar cambios';await mapa.actualizar();mapa.setSeleccion(r.asientos_vendidos||[]);}else await mapa.actualizar();
 }catch(e){error.textContent=e.message;button.disabled=true;mapa.detener();}
 form.onsubmit=async e=>{e.preventDefault();if(enviando||!form.reportValidity()||!mapa.seleccion.length)return;enviando=true;button.disabled=true;error.textContent='';const asientos=mapa.seleccion;
  try{const d={...datos(),id,tipo_sala:form.elements.tipo_sala.value,comentario:form.elements.comentario.value,asientos};await api(editando?'/reservas/editar':'/reservas',{method:'POST',body:JSON.stringify(d)});mapa.detener();location.href='consulta.html';}
  catch(e){error.textContent=e.message;await mapa.actualizar();}finally{enviando=false;cotizar();}
 };
}
