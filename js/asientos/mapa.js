import {api} from '../config/neon-config.js';
export function crearMapa({contenedor,info,datos,alCambiar=()=>{}}){
 let seleccion=new Set(),secuencia=0,ocupados=new Set(),reservados=new Set(),disponible=false,detenido=false;
 function pintar(){contenedor.replaceChildren();for(const fila of 'ABCDEF')for(let n=1;n<=8;n++){
  const a=fila+n,b=document.createElement('button');b.type='button';b.className='asiento';b.textContent=a;b.disabled=!disponible||ocupados.has(a);b.dataset.ocupado=String(ocupados.has(a));b.dataset.reservado=String(reservados.has(a));b.dataset.seleccionado=String(seleccion.has(a));b.setAttribute('aria-pressed',String(seleccion.has(a)));b.setAttribute('aria-label',a+(reservados.has(a)?' reservado':ocupados.has(a)?' vendido':' disponible'));
  b.onclick=()=>{if(seleccion.has(a))seleccion.delete(a);else if(seleccion.size<10)seleccion.add(a);else{info.textContent='Máximo 10 butacas por reserva.';return}pintar();alCambiar([...seleccion])};contenedor.append(b);
 }}
 async function actualizar(reset=false){if(detenido)return;const turno=++secuencia;if(reset){seleccion.clear();disponible=false;pintar();alCambiar([])}
  const d=datos();if(!d.pelicula||!d.fecha_funcion||!d.horario){info.textContent='Elige película, fecha y horario.';return}
  try{const r=await api('/asientos',{body:JSON.stringify(d)});if(turno!==secuencia||detenido)return;ocupados=new Set(r.ocupados);reservados=new Set(r.reservados);const anterior=seleccion.size;seleccion=new Set([...seleccion].filter(a=>!ocupados.has(a)));disponible=true;pintar();alCambiar([...seleccion]);info.textContent=`${r.pelicula.sala} · ${r.fecha} · ${r.horario}. ${r.ocupados.length} ocupadas. Actualizado ${new Date().toLocaleTimeString('es-PE')}.`+(anterior!==seleccion.size?' Una butaca seleccionada acaba de ocuparse.':'')+(r.sin_asientos?' Hay registros antiguos sin butacas; requieren asignación antes del cobro.':'');}
  catch(e){if(turno!==secuencia)return;disponible=false;pintar();alCambiar([]);info.textContent=e.message+' No se puede confirmar hasta recuperar la conexión.';}
 }
 const timer=setInterval(()=>{if(!document.hidden)actualizar()},3000);const foco=()=>{if(!document.hidden)actualizar()};document.addEventListener('visibilitychange',foco);
 return {actualizar,get seleccion(){return disponible?[...seleccion].sort():[]},setSeleccion(a){seleccion=new Set(a);pintar();alCambiar([...seleccion])},detener(){detenido=true;clearInterval(timer);document.removeEventListener('visibilitychange',foco)}};
}
