// Efectos compartidos para reservas del cliente y ventas de taquilla.
export function iniciarProceso(form,button,texto){
 const anterior=button.textContent;
 const controles=[...form.querySelectorAll('input,select,textarea,button')].map(el=>[el,el.disabled]);
 controles.forEach(([el])=>el.disabled=true);form.classList.add('form-procesando');form.setAttribute('aria-busy','true');button.classList.add('procesando');button.textContent=texto;
 return ()=>{controles.forEach(([el,disabled])=>el.disabled=disabled);form.classList.remove('form-procesando');form.removeAttribute('aria-busy');button.classList.remove('procesando');button.textContent=anterior;};
}
export function animarTicket(el){el.classList.remove('ticket-animado');void el.offsetWidth;el.classList.add('ticket-animado');}
export function mostrarConfirmacion({titulo,codigo,detalle}){
 const previo=document.activeElement,dialog=document.createElement('dialog');dialog.className='confirmacion-dialog';dialog.setAttribute('aria-labelledby','confirmacion-titulo');dialog.setAttribute('aria-describedby','confirmacion-detalle');
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('exito-icono');svg.setAttribute('viewBox','0 0 80 80');svg.setAttribute('aria-hidden','true');
 const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','40');circle.setAttribute('cy','40');circle.setAttribute('r','34');
 const path=document.createElementNS(ns,'path');path.setAttribute('d','M23 41 L35 53 L57 29');
 for(const el of [circle,path]){el.setAttribute('fill','none');el.setAttribute('stroke','currentColor');el.setAttribute('stroke-width','4');el.setAttribute('stroke-linecap','round');svg.append(el);}
 const confeti=document.createElement('div');confeti.className='confeti-cinemax';confeti.setAttribute('aria-hidden','true');
 for(let i=0;i<24;i++){const part=document.createElement('i');part.style.setProperty('--confeti-x',(i*43%100)+'%');part.style.setProperty('--confeti-delay',(i%6)*.05+'s');part.style.setProperty('--confeti-color',['#68df99','#ffd56a','#79aef8'][i%3]);confeti.append(part);}
 const title=document.createElement('h2');title.id='confirmacion-titulo';title.textContent=titulo;
 const label=document.createElement('p');label.textContent='Código de operación o reserva:';
 const code=document.createElement('strong');code.className='confirmacion-codigo';code.textContent=codigo;
 const desc=document.createElement('p');desc.id='confirmacion-detalle';desc.textContent=detalle;
 const accept=document.createElement('button');accept.type='button';accept.className='boton boton-primario';accept.textContent='Aceptar';accept.addEventListener('click',()=>dialog.close());
 dialog.append(confeti,svg,title,label,code,desc,accept);document.body.append(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();if(previo?.isConnected)previo.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.showModal();accept.focus();
}
