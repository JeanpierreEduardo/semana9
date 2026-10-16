import {prepararFormularioTurno} from '../turnos/turnos.js';
import {iniciarAdmin,api,mensaje,enviar} from '../admin/ui.js';
if(await iniciarAdmin()){const form=document.getElementById('form-trabajador');prepararFormularioTurno(form);form.onsubmit=e=>{e.preventDefault();enviar(form,async d=>{const u=await api('/admin/trabajadores',{method:'POST',body:JSON.stringify(d)});form.reset();mensaje('Cuenta creada para '+u.nombre+' ('+u.correo+'). Ya puede iniciar sesión como '+u.rol+'.')})}}
