import {exigirRol} from '../auth/auth.js';
import {api} from '../config/neon-config.js';
import {detectarMarca,validarPago} from './validaciones.js';
import {soles} from '../registro/tarifario.js';
const msg=document.getElementById('mensaje'),form=document.getElementById('form-pago'),id=Number(new URLSearchParams(location.search).get('id'));
if(await exigirRol(['usuario','cliente']))try{
 const r=await api('/compras/'+id);if(r.estado_pago!=='pendiente'||r.estado!=='registrado')throw Error('La reserva ya no está pendiente. Consulta Mis compras.');
 document.getElementById('resumen').textContent=`${r.pelicula_nombre} · ${String(r.fecha_funcion||'Sin fecha').slice(0,10)} · ${r.funcion_horario} · Butacas ${(r.asientos_vendidos||[]).join(', ')} · Total ${soles(r.monto_calculado)}`;form.hidden=false;
 function campos(){for(const k of ['tarjeta','billetera']){const el=document.getElementById(k);el.hidden=k!==form.elements.metodo.value;el.disabled=el.hidden}}
 form.elements.metodo.onchange=campos;campos();form.elements.numero.oninput=()=>{document.getElementById('marca').textContent=detectarMarca(form.elements.numero.value)||'Ingresa una tarjeta de prueba';};
 let busy=false;form.onsubmit=async e=>{e.preventDefault();if(busy)return;const button=form.querySelector('[type=submit]');try{const d=validarPago(Object.fromEntries(new FormData(form)));busy=true;button.disabled=true;msg.textContent='Consultando al emisor simulado…';const p=await api('/pagos',{method:'POST',body:JSON.stringify({...d,id,canal:'pasarela'})});form.elements.cvv.value='';form.elements.codigo.value='';if(p.estado==='rechazado'){msg.textContent='Pago rechazado: '+p.motivo_rechazo+'. La reserva sigue pendiente.';}else location.href='comprobante.html?op='+encodeURIComponent(p.codigo_operacion);}catch(e){msg.textContent=e.message}finally{busy=false;button.disabled=false}};
}catch(e){msg.textContent=e.message}
