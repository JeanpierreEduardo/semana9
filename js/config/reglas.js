export const PELICULAS={silencio:['El Origen del Silencio','Sala 1'],ruta65:['Ruta 65','Sala 2'],carton:['Mundo de Cartón','Sala 3'],luna:['Bajo la Misma Luna','Sala 4']};
export function esPersonal(u){return ['administrador','empleado'].includes(u?.rol)}
export function validarCompra(d,panel=false,peliculaDb=null){
 const pelicula=peliculaDb?[peliculaDb.titulo,peliculaDb.sala]:PELICULAS[d.pelicula],cantidad=Number(d.cantidad),comentario=String(d.comentario||'').trim();
 if(!pelicula||!['tarde','noche'].includes(d.horario)||!Number.isInteger(cantidad)||cantidad<1||cantidad>10||comentario.length>500)throw Error('Película, horario, cantidad (1 a 10) o comentario inválidos.');
 const estado=panel?d.estado:'registrado';if(!['registrado','atendido','cancelado'].includes(estado))throw Error('Estado inválido.');
 if(panel&&(!Number.isInteger(Number(d.id_usuario))||Number(d.id_usuario)<1))throw Error('Selecciona un cliente válido.');
 return {pelicula:pelicula[0],sala:pelicula[1],cantidad,comentario,horario:d.horario,estado,id_usuario:Number(d.id_usuario)};
}
export function serializarCompra(r){return {...r,pelicula_nombre:r.pelicula,horario:r.funcion_horario,pelicula:r.pelicula_clave||Object.keys(PELICULAS).find(k=>PELICULAS[k][0]===r.pelicula)||r.pelicula}}
