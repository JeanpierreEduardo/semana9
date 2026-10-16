import {iniciarAdmin,api,mensaje,preview,enviar,celda,vacio} from '../admin/ui.js';
if(await iniciarAdmin()){
 const form=document.getElementById('form-pelicula'),tbody=document.getElementById('lista-peliculas'),editor=document.getElementById('editor'),refrescar=preview(form);let rows=[],id=null;
 function mostrar(){tbody.replaceChildren();const search=document.getElementById('buscar').value.toLowerCase(),estado=document.getElementById('filtro-estado').value;const filtradas=rows.filter(p=>(p.titulo+' '+p.clave).toLowerCase().includes(search)&&(!estado||p.estado===estado));for(const p of filtradas){const tr=document.createElement('tr');tr.append(celda(p.titulo+' ('+p.clave+')'),celda(p.genero),celda(p.duracion+' min'),celda(p.sala),celda(p.estado));const td=document.createElement('td'),b=document.createElement('button');b.className='boton boton-primario';b.textContent='Editar';b.onclick=()=>{id=p.id;for(const k of ['clave','titulo','genero','duracion','clasificacion','sala','estado','poster','sinopsis'])form.elements[k].value=p[k]??'';document.getElementById('titulo-editor').textContent='Editar: '+p.titulo;editor.hidden=false;refrescar();editor.scrollIntoView({behavior:'smooth'})};td.append(b);tr.append(td);tbody.append(tr)}if(!filtradas.length)vacio(tbody,6,'No hay películas con esos filtros.')}
 async function cargar(){rows=await api('/admin/peliculas');mostrar()}
 for(const k of ['buscar','filtro-estado'])document.getElementById(k).addEventListener('input',mostrar);
 document.getElementById('cancelar').onclick=()=>{editor.hidden=true;id=null};
 form.onsubmit=e=>{e.preventDefault();if(!id)return;enviar(form,async d=>{await api('/admin/peliculas/'+id,{method:'PUT',body:JSON.stringify(d)});editor.hidden=true;id=null;await cargar();mensaje('Película actualizada. Los clientes verán el catálogo actualizado.')})};
 try{await cargar()}catch(e){mensaje(e.message,true)}
}
