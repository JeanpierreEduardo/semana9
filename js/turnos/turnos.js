export const FUERA_TURNO='Estás fuera de turno laboral';
export const SIN_TURNO='No tienes un turno laboral asignado. Comunícate con el administrador.';
export const esErrorTurno=e=>[FUERA_TURNO,SIN_TURNO].includes(e?.message);
export function validarTurno(d){
 if(d.rol!=='empleado')return {turno_nombre:null,turno_inicio:null,turno_fin:null};
 const nombre=String(d.turno_nombre||'').trim(),inicio=String(d.turno_inicio||''),fin=String(d.turno_fin||'');
 const hora=/^([01]\d|2[0-3]):[0-5]\d$/;
 if(!nombre||nombre.length>60||!hora.test(inicio)||!hora.test(fin)||inicio===fin)throw Error('Asigna un nombre de turno y horas de inicio y fin diferentes.');
 return {turno_nombre:nombre,turno_inicio:inicio,turno_fin:fin};
}
export function turnoTexto(u){
 if(!u.turno_inicio||!u.turno_fin)return 'Sin turno asignado';
 const inicio=String(u.turno_inicio).slice(0,5),fin=String(u.turno_fin).slice(0,5);
 return `${u.turno_nombre} · ${inicio} – ${fin}${fin<inicio?' (termina al día siguiente)':''} · Hora de Perú · Todos los días`;
}
export function prepararFormularioTurno(form){
 const grupo=form.querySelector('[data-campos-turno]');
 const campos=['turno_nombre','turno_inicio','turno_fin'];
 function refrescar(){const empleado=form.elements.rol.value==='empleado';grupo.hidden=!empleado;for(const k of campos){form.elements[k].disabled=!empleado;form.elements[k].required=empleado;}}
 form.elements.rol.addEventListener('change',refrescar);
 form.addEventListener('reset',()=>queueMicrotask(refrescar));refrescar();return refrescar;
}
