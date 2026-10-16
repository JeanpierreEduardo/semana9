import {esErrorTurno} from '../turnos/turnos.js';
import { neon } from './vendor/neon-driver.js';
import { MIGRACION, MIGRACION_ADMIN, MIGRACION_EMPLEADO, MIGRACION_TURNOS } from './esquema.js';
import { crearOperaciones } from './operaciones.js';

// ÚNICO LUGAR PARA PEGAR TU CONEXIÓN. Usa la cadena completa de Neon > Connect.
// Práctica académica: esta credencial será visible en el navegador.
export const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_qzFOhm8NEx1Q@ep-wispy-snow-b429j09a-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

let conexion, inicializando, operaciones;
export async function obtenerSql() {
 if (!/^postgres(ql)?:\/\//i.test(NEON_DATABASE_URL)) throw new Error('Pega tu cadena de conexión de Neon en js/config/neon-config.js y guarda el archivo.');
 if (!conexion) conexion = neon(NEON_DATABASE_URL);
 if (!inicializando) inicializando = prepararEsquema(conexion).catch(error=>{inicializando=null;throw error;});
 await inicializando;
 return conexion;
}
async function prepararEsquema(sql) {
 const [estado] = await sql`SELECT
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='rol') AS rol,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='contrasena_hash') AS hash,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compras_entradas_cine' AND column_name='id_usuario') AS propietario,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compras_entradas_cine' AND column_name='comentario') AS comentario,
  to_regclass('public.sesiones_cinemax') IS NOT NULL AS sesiones`;
 if (!(estado.rol && estado.hash && estado.propietario && estado.comentario && estado.sesiones)) {
  await sql.transaction(MIGRACION.map(texto => sql.query(texto)));
 }
 const [admin] = await sql`SELECT to_regclass('public.peliculas') IS NOT NULL AS peliculas, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='activo') AS activo, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compras_entradas_cine' AND column_name='pelicula_id') AS enlace`;
 if (!(admin.peliculas && admin.activo && admin.enlace)) await sql.transaction(MIGRACION_ADMIN.map(texto=>sql.query(texto)));
 const [empleado]=await sql`SELECT to_regclass('public.asientos_ventas') IS NOT NULL AS asientos, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='compras_entradas_cine' AND column_name='asientos_vendidos') AS vendedor`;
 if(!(empleado.asientos&&empleado.vendedor))await sql.transaction(MIGRACION_EMPLEADO.map(texto=>sql.query(texto)));
 const [turnos]=await sql`SELECT
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='turno_nombre') AS nombre,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='turno_inicio') AS inicio,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='turno_fin') AS fin,
  to_regprocedure('public.cinemax_en_turno(time without time zone,time without time zone,timestamp with time zone)') IS NOT NULL AS funcion`;
 if(!(turnos.nombre&&turnos.inicio&&turnos.fin&&turnos.funcion))await sql.transaction(MIGRACION_TURNOS.map(texto=>sql.query(texto)));
 const [reservas]=await sql`SELECT to_regprocedure('public.editar_reserva_cinemax(integer,integer,jsonb)') IS NOT NULL AS listo`;
 if(!reservas.listo)throw Error('Primero ejecuta sql/semana9.sql en el SQL Editor de tu base Neon. Después recarga esta página.');
}
// 'api' conserva la interfaz de los módulos de página; ejecuta SQL directo en Neon.
// No usa localhost:3000, un servidor Node, cookies ni rutas HTTP de una API local.
export async function api(ruta, opciones={}) {
 try {
  const sql=await obtenerSql();
  operaciones ??= crearOperaciones(sql,sessionStorage,crypto);
  return await operaciones(ruta,opciones);
 } catch (error) {
  if(esErrorTurno(error)&&ruta!=='/auth/login')window.dispatchEvent(new CustomEvent('cinemax:turno-bloqueado',{detail:error.message}));
  if (error.code==='23505') throw new Error(error.constraint==='asiento_funcion_unico'?'Uno de los asientos acaba de ocuparse. Actualiza el mapa y selecciona otros.':'Ese correo o código ya está registrado.');
  if (error.code==='23503') throw new Error('El cliente seleccionado no existe.');
  if (['42P01','42703'].includes(error.code)) throw new Error('Faltan tablas o campos. Ejecuta sql/neon_schema.sql en Neon SQL Editor.');
  if (/fetch|network|failed to connect/i.test(error.message||'')) throw new Error('No se pudo conectar con Neon. Revisa Internet, la cadena de conexión y que tu red permita HTTPS a Neon.');
  throw error;
 }
}
