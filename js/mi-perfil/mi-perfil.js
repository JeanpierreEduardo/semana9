import {turnoTexto} from '../turnos/turnos.js';
import {iniciarEmpleado,api,mensaje} from '../empleado/ui.js';
import {obtenerPerfil} from '../auth/auth.js';
const u=await iniciarEmpleado();
if(u){const form=document.getElementById('form-perfil');form.elements.correo.value=u.correo;const datos=document.getElementById('datos-perfil');datos.textContent=`${u.nombre} · Trabajador · ${turnoTexto(u)}`;
 form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;if(form.elements.contrasena_nueva.value!==form.elements.confirmar.value){mensaje('La confirmación de la contraseña nueva no coincide.',true);return}const b=form.querySelector('[type=submit]');b.disabled=true;try{await api('/empleado/perfil',{method:'PUT',body:JSON.stringify({correo:form.elements.correo.value,contrasena_actual:form.elements.contrasena_actual.value,contrasena_nueva:form.elements.contrasena_nueva.value})});await obtenerPerfil();form.elements.contrasena_actual.value='';form.elements.contrasena_nueva.value='';form.elements.confirmar.value='';mensaje('Tu correo y contraseña se guardaron en Neon.')}catch(e){mensaje(e.message,true)}finally{b.disabled=false}};
}
