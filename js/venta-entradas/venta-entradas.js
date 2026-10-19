import {iniciarEmpleado,api,mensaje,hoy,cargarPeliculas,dinero} from '../empleado/ui.js';
import {crearMapa} from '../asientos/mapa.js';
import {calcularMontoServicio} from '../registro/tarifario.js';
const u=await iniciarEmpleado();
if(u){
 const form=document.getElementById('form-venta'),save=document.getElementById('guardar-venta');let ocupado=false;
 form.elements.fecha_funcion.value=hoy();form.elements.fecha_funcion.min=hoy();
 const datos=()=>({pelicula:form.elements.pelicula.value,fecha_funcion:form.elements.fecha_funcion.value,horario:form.elements.horario.value});
 function total(a=mapa.seleccion){const precio=calcularMontoServicio({...datos(),tipo_sala:form.elements.tipo_sala.value,cantidad:1});form.elements.precio_unitario.value=precio.toFixed(2);document.getElementById('seleccion').textContent=`Butacas: ${a.join(', ')||'ninguna'} · Total ${dinero(precio*a.length)}`;save.disabled=ocupado||!a.length;save.textContent=['empleado','cajero','administrador'].includes(u.rol)?'Reservar y cobrar en caja':'Reservar para cobrar en caja';}
 const mapa=crearMapa({contenedor:document.getElementById('mapa-asientos'),info:document.getElementById('info-asientos'),datos,alCambiar:total});
 for(const k of ['pelicula','fecha_funcion','horario'])form.elements[k].onchange=()=>mapa.actualizar(true);form.elements.tipo_sala.onchange=()=>total();document.getElementById('cargar-asientos').onclick=()=>mapa.actualizar();
 form.onsubmit=async e=>{e.preventDefault();if(ocupado||!form.reportValidity()||!mapa.seleccion.length)return;ocupado=true;save.disabled=true;try{const d={...Object.fromEntries(new FormData(form)),asientos:mapa.seleccion};const r=await api('/empleado/ventas',{method:'POST',body:JSON.stringify(d)});if(['empleado','cajero','administrador'].includes(u.rol)){mapa.detener();location.href='caja.html?reserva='+r.id;}else{mensaje('Reserva '+r.codigo_seguimiento+' guardada. El cajero puede cobrarla para emitir el ticket.');await mapa.actualizar(true);}}catch(e){mensaje(e.message,true);await mapa.actualizar()}finally{ocupado=false;total()}};
 try{await cargarPeliculas(form.elements.pelicula);const clientes=await api('/empleado/clientes');form.elements.id_usuario.replaceChildren(new Option('Selecciona el cliente',''));for(const c of clientes)form.elements.id_usuario.add(new Option(c.nombre+' — '+c.correo,c.id));await mapa.actualizar()}catch(e){mensaje(e.message,true)}
}
