import {exigirRol} from '../auth/auth.js';
import {api} from '../config/neon-config.js';
import {soles} from '../registro/tarifario.js';
if(await exigirRol(['usuario','cliente','cajero','administrador','empleado']))try{
 const op=new URLSearchParams(location.search).get('op');const r=await api('/comprobante',{body:JSON.stringify({op})});const cont=document.getElementById('comprobante');
 const h=document.createElement('h2');h.textContent='CineMax Perú · Pago aprobado';cont.append(h);const ticket=document.createElement('strong');ticket.textContent=r.ticket_ingreso;cont.append(ticket);
 for(const line of [`Operación: ${r.codigo_operacion}`,`Cliente: ${r.nombre_cliente}`,`${r.pelicula} · ${r.sala} · ${r.tipo_sala}`,`Función: ${String(r.fecha_funcion).slice(0,10)} · ${r.funcion_horario}`,`Butacas: ${r.asientos_vendidos.join(', ')} · ${r.cantidad} entradas`,`Total: ${soles(r.monto)}`,`Canal: ${r.canal} · Método: ${r.metodo}`,`Referencia: ${r.referencia}`,r.monto_recibido?`Recibido: ${soles(r.monto_recibido)} · Vuelto: ${soles(r.vuelto)}`:'',`Fecha de pago: ${new Date(r.fecha_pago).toLocaleString('es-PE',{timeZone:'America/Lima'})}`,'Comprobante académico de pago simulado. No es comprobante tributario.']){if(line){const p=document.createElement('p');p.textContent=line;cont.append(p)}}
 cont.hidden=false;const b=document.getElementById('imprimir');b.hidden=false;b.onclick=()=>window.print();
}catch(e){document.getElementById('mensaje').textContent=e.message}
