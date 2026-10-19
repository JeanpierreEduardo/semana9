export const ENLACES_EMPLEADO=[['Caja','caja.html'],['Venta de entradas','venta-entradas.html'],['Validación de entradas','validar-entradas.html'],['Cartelera y asientos','consulta-cartelera.html'],['Mis ventas','mis-ventas.html'],['Mi perfil','mi-perfil.html']];
export const ENLACES_CAJA=[['Caja','caja.html'],['Venta de entradas','venta-entradas.html']];
export const ENLACES_ADMIN=[['Caja y conciliación','caja.html'],['Administración de clientes','administracion-clientes.html'],['Crear película','crear-peliculas.html'],['Actualizar películas','actualizar-peliculas.html'],['Crear trabajadores','crear-usuarios.html'],['Trabajadores','trabajadores.html'],['Gestión de compras','gestionar-compras.html']];
export function destinoSesion(usuario,solicitado='index.html'){
 if(usuario.rol==='administrador')return 'administracion-clientes.html';
 if(usuario.rol==='cajero')return 'caja.html';
 if(usuario.rol==='empleado')return 'venta-entradas.html';
 return /^(registro|consulta|actualizar|pago|comprobante)\.html(?:\?[a-zA-Z0-9=&_%+-]*)?$/.test(solicitado)?solicitado:'index.html';
}
export function construirNav(doc,u,cerrar,pagina=''){
 const c=doc.getElementById('nav-cuenta');if(!c)return;doc.documentElement.dataset.rol=u?.rol||'visitante';c.replaceChildren();
 const enlace=(texto,href,css='boton boton-registro boton-nav')=>{const a=doc.createElement('a');a.textContent=texto;a.href=href;a.className=css;return a};
 if(u){const nombre=doc.createElement('div');nombre.className='nav-identidad';const textoNombre=doc.createElement('span');textoNombre.textContent=u.nombre;nombre.append(textoNombre);
  if(['administrador','empleado','cajero'].includes(u.rol)){const rol=doc.createElement('small');rol.className='nav-rol';rol.textContent=u.rol==='administrador'?'Administrador':u.rol==='cajero'?'Cajero':'Trabajador';nombre.append(rol);}const salir=doc.createElement('button');salir.type='button';salir.className='boton boton-primario boton-nav';salir.textContent='Cerrar sesión';salir.addEventListener('click',cerrar);
  if(['administrador','empleado','cajero'].includes(u.rol)){
   const header=doc.querySelector('.site-header'),nav=doc.querySelector('.nav-principal');header?.classList.add('nav-administrativa');
   if(nav){nav.setAttribute('data-admin-lista','true');nav.replaceChildren();const ul=doc.createElement('ul');for(const [texto,href]of(u.rol==='administrador'?ENLACES_ADMIN:u.rol==='cajero'?ENLACES_CAJA:ENLACES_EMPLEADO)){const li=doc.createElement('li'),a=enlace(texto,href,'');if(pagina===href){a.className='activo';a.setAttribute('aria-current','page')}li.append(a);ul.append(li)}nav.append(ul)}
   for(const e of doc.querySelectorAll('.menu-toggle-input,.menu-toggle-boton'))e.hidden=true;
   const logo=doc.querySelector('.logo');if(logo)logo.href=u.rol==='administrador'?'administracion-clientes.html':u.rol==='cajero'?'caja.html':'venta-entradas.html';c.append(nombre,salir);
  }else c.append(nombre,enlace('Mis compras','consulta.html'),salir);
 }else c.append(enlace('Iniciar sesión','login.html'),enlace('Crear cuenta','login.html?modo=registro'));
}
