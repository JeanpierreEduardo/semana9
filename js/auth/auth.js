import {esErrorTurno,FUERA_TURNO} from '../turnos/turnos.js';
import {construirNav,ENLACES_ADMIN,ENLACES_EMPLEADO} from './navegacion.js';
import { api } from '../config/neon-config.js';
const CLAVE='cinemax_perfil';
let comprobandoTurno=false,bloqueandoTurno=false;
window.addEventListener('cinemax:turno-bloqueado',event=>{
 sessionStorage.removeItem(CLAVE);
 if(location.pathname.endsWith('/login.html')){const error=document.getElementById('login-error');if(error)error.textContent=event.detail;return;}
 if(bloqueandoTurno)return;bloqueandoTurno=true;
 const contenido=document.getElementById('contenido-empleado');if(contenido)contenido.hidden=true;
 location.replace('login.html?motivo='+encodeURIComponent(event.detail===FUERA_TURNO?'fuera-turno':'sin-turno'));
});
async function comprobarTurno(){
 if(comprobandoTurno||obtenerSesion()?.rol!=='empleado')return;
 comprobandoTurno=true;
 try{guardar(await api('/auth/me'))}catch(error){if(esErrorTurno(error))sessionStorage.removeItem(CLAVE);}finally{comprobandoTurno=false;}
}
// Cada acción consulta el turno en Neon; este control cierra también una pantalla inactiva.
setInterval(comprobarTurno,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)comprobarTurno();});
function guardar(u){sessionStorage.setItem(CLAVE,JSON.stringify(u));return u;}
export function obtenerSesion(){try{return JSON.parse(sessionStorage.getItem(CLAVE))}catch{return null}}
export async function obtenerPerfil(){try{return guardar(await api('/auth/me'))}catch(e){sessionStorage.removeItem(CLAVE);throw e}}
export async function registrarUsuario(nombre,correo,contrasena){return guardar(await api('/auth/registro',{method:'POST',body:JSON.stringify({nombre,correo,contrasena})}))}
export async function iniciarSesion(correo,contrasena){return guardar(await api('/auth/login',{method:'POST',body:JSON.stringify({correo,contrasena})}))}
export async function cerrarSesion(){try{await api('/auth/logout',{method:'POST'});sessionStorage.removeItem(CLAVE);location.replace('index.html')}catch(e){alert(e.message)}}
export function exigirSesion(){const u=obtenerSesion();if(!u)location.replace('login.html?motivo=protegido&next='+encodeURIComponent(location.pathname.split('/').pop()+location.search));return u}
export async function guardarReserva(data){return api('/compras',{method:'POST',body:JSON.stringify(data)})}
export async function obtenerReservas(){return api('/compras')}
async function mostrarNav(){let u;try{u=await obtenerPerfil()}catch{}construirNav(document,u,cerrarSesion,location.pathname.split('/').pop());
 const pagina=location.pathname.split('/').pop()||'index.html';
 const privadas=['caja.html','comprobante.html','venta-entradas.html',...ENLACES_ADMIN.map(e=>e[1]),'panel.html'];
 if(u?.rol==='administrador'&&!privadas.includes(pagina)&&pagina!=='login.html')location.replace('administracion-clientes.html');
 if(u?.rol==='empleado'&&!ENLACES_EMPLEADO.some(e=>e[1]===pagina)&&!['login.html','comprobante.html'].includes(pagina))location.replace('venta-entradas.html');
}
export async function exigirRol(roles){if(!exigirSesion())return null;const u=await obtenerPerfil();if(!roles.includes(u.rol)){alert('No tienes permiso para esta página.');location.replace('index.html');return null}return u;}
export {destinoSesion as rutaInicioSegunRol} from './navegacion.js';
const guardado=obtenerSesion();
if(['administrador','empleado'].includes(guardado?.rol))document.documentElement.dataset.rol=guardado.rol;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mostrarNav);else mostrarNav();
