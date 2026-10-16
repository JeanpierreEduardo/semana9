import {iniciarEmpleado,api,mensaje,hoy,fechaTexto,detalleEntrada} from '../empleado/ui.js';
if(await iniciarEmpleado()){
 const form=document.getElementById('form-validacion'),btn=document.getElementById('validar'),cont=document.getElementById('entrada');let codigo=null;
 form.elements.codigo.addEventListener('input',()=>{codigo=null;btn.hidden=true;cont.hidden=true});
 async function buscar(){const r=await api('/empleado/entrada',{body:JSON.stringify({codigo:form.elements.codigo.value})});codigo=r.ticket_ingreso;detalleEntrada(cont,r);btn.hidden=r.estado!=='registrado'||(r.fecha_funcion&&fechaTexto(r.fecha_funcion)!==hoy());if(r.estado!=='registrado')mensaje('Esta compra está '+r.estado+' y no se puede validar otra vez.',true);else if(btn.hidden)mensaje('La función no corresponde al día de hoy.',true);else mensaje('Entrada registrada. Verifica los datos antes de confirmar el ingreso.')}
 form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;btn.hidden=true;codigo=null;try{await buscar()}catch(e){cont.hidden=true;mensaje(e.message,true)}};
 btn.onclick=async()=>{if(!codigo)return;btn.disabled=true;try{await api('/empleado/entrada',{method:'POST',body:JSON.stringify({codigo})});await buscar();mensaje('Ingreso validado y guardado en Neon. La compra queda atendida.')}catch(e){mensaje(e.message,true);btn.hidden=true}finally{btn.disabled=false}};
}
