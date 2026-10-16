import {FUERA_TURNO,SIN_TURNO} from '../turnos/turnos.js';
import {destinoSesion} from './navegacion.js';
import { registrarUsuario, iniciarSesion, obtenerSesion, obtenerPerfil } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || 'index.html';
  if(params.get('motivo')==='fuera-turno')document.getElementById('login-error').textContent=FUERA_TURNO;
  if(params.get('motivo')==='sin-turno')document.getElementById('login-error').textContent=SIN_TURNO;
  const destination = /^(registro|consulta|actualizar|panel|pago|comprobante|caja)\.html(?:\?[a-zA-Z0-9=&_%+-]*)?$/.test(next) ? next : 'index.html';
  if (obtenerSesion()) {
    try { const user=await obtenerPerfil(); location.replace(destinoSesion(user,destination)); return; }
    catch { /* una sesión caducada deja abrir el formulario */ }
  }
  const tabLogin = document.getElementById('tab-login');
  const tabRegistro = document.getElementById('tab-registro');
  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');
  if (params.get('motivo') === 'protegido') document.getElementById('auth-aviso').hidden = false;
  function switchTab(login) {
    tabLogin.classList.toggle('activo', login); tabRegistro.classList.toggle('activo', !login);
    tabLogin.setAttribute('aria-selected', String(login)); tabRegistro.setAttribute('aria-selected', String(!login));
    formLogin.hidden = !login; formRegistro.hidden = login;
    document.getElementById('login-error').textContent = ''; document.getElementById('registro-error').textContent = '';
  }
  tabLogin.addEventListener('click', () => switchTab(true));
  tabRegistro.addEventListener('click', () => switchTab(false));
  if (params.get('modo') === 'registro') switchTab(false);
  formLogin.addEventListener('submit', async event => {
    event.preventDefault(); const error = document.getElementById('login-error'); error.textContent = '';
    if (!formLogin.reportValidity()) return;
    const button = formLogin.querySelector('[type="submit"]'); button.disabled = true;
    try { const user=await iniciarSesion(document.getElementById('login-correo').value, document.getElementById('login-contrasena').value); location.replace(destinoSesion(user,destination)); }
    catch (cause) { error.textContent = cause.message; button.disabled = false; }
  });
  formRegistro.addEventListener('submit', async event => {
    event.preventDefault(); const error = document.getElementById('registro-error'); error.textContent = '';
    if (!formRegistro.reportValidity()) return;
    const password = document.getElementById('registro-contrasena').value;
    if (password !== document.getElementById('registro-confirmar').value) { error.textContent = 'Las contraseñas no coinciden.'; return; }
    const button = formRegistro.querySelector('[type="submit"]'); button.disabled = true;
    try { await registrarUsuario(document.getElementById('registro-nombre').value, document.getElementById('registro-correo').value, password); location.replace(destination); }
    catch (cause) { error.textContent = cause.message; button.disabled = false; }
  });
});
