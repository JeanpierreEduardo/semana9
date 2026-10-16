import {iniciarEmpleado,api,mensaje,hoy,cargarPeliculas,dibujarMapa} from '../empleado/ui.js';
if(await iniciarEmpleado()){
 const form=document.getElementById('form-consulta');form.elements.fecha_funcion.value=hoy();
 async function consultar(){try{const r=await api('/empleado/asientos',{body:JSON.stringify(Object.fromEntries(new FormData(form)))});dibujarMapa(r,false);mensaje('Consulta actualizada desde Neon.')}catch(e){document.getElementById('mapa-asientos').replaceChildren();mensaje(e.message,true)}}
 setInterval(()=>{if(!document.hidden)consultar()},3000);
 form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())consultar()};
 try{const rows=await cargarPeliculas(form.elements.pelicula);const c=document.getElementById('cartelera-empleado');for(const p of rows){const card=document.createElement('article');card.className='admin-card';const h=document.createElement('h2');h.textContent=p.titulo;const meta=document.createElement('p');meta.textContent=`${p.genero} · ${p.duracion} min · ${p.clasificacion}`;const sala=document.createElement('p');sala.textContent=`${p.sala} · ${p.estado}`;const sin=document.createElement('p');sin.textContent=p.sinopsis;card.append(h,meta,sala,sin);c.append(card)}await consultar()}catch(e){mensaje(e.message,true)}
}
