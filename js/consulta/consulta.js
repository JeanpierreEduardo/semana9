import {exigirRol} from '../auth/auth.js';
import {api} from '../config/neon-config.js';
import {soles} from '../registro/tarifario.js';
if(await exigirRol(['usuario','cliente'])){
 const list=document.getElementById('lista-reservas');let busy=false;
 async function cargar(){if(busy)return;busy=true;try{const rows=await api('/compras');list.replaceChildren();if(!rows.length)list.textContent='Aún no tienes reservas.';for(const r of rows){const card=document.createElement('article');card.className='reserva-item';for(const text of [r.pelicula,`Reserva: ${r.codigo_seguimiento}`,`${r.sala} · ${r.tipo_sala} · ${String(r.fecha_funcion||'Sin fecha').slice(0,10)} · ${r.funcion_horario}`,`Butacas: ${(r.asientos_vendidos||[]).join(', ')||'Sin asignar'}`,`Importe: ${soles(r.monto_calculado)} · Pago: ${r.estado_pago} · Estado: ${r.estado}`]){const p=document.createElement('p');p.textContent=text;card.append(p)}
 const a=(text,url)=>{const el=document.createElement('a');el.className='boton boton-primario';el.textContent=text;el.href=url;card.append(el)};
 if(r.estado==='registrado'&&r.estado_pago==='pendiente'){a('Pagar','pago.html?id='+r.id);a('Editar reserva','actualizar.html?id='+r.id);const b=document.createElement('button');b.textContent='Cancelar y liberar butacas';b.className='boton';b.onclick=async()=>{if(!confirm('¿Cancelar esta reserva y liberar sus butacas?'))return;b.disabled=true;try{await api('/reservas/'+r.id+'/cancelar',{method:'POST'});await cargar()}catch(e){alert(e.message);b.disabled=false}};card.append(b)}
 if(r.estado_pago==='pagado'&&r.codigo_operacion)a('Ver comprobante y ticket','comprobante.html?op='+encodeURIComponent(r.codigo_operacion));list.append(card);}}
 catch(e){list.textContent=e.message}finally{busy=false}}
 await cargar();setInterval(()=>{if(!document.hidden)cargar()},15000);
}
