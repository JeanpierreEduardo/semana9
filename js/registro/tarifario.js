export const PRECIOS={general:16,'3d':22,prime:32};
export const redondear=n=>Math.round((n+Number.EPSILON)*100)/100;
export function calcularMontoServicio(d){
 let total=(PRECIOS[d.tipo_sala]??0)*Number(d.cantidad||0);
 const dia=new Date(d.fecha_funcion+'T00:00:00').getDay();
 return redondear(total*([2,3].includes(dia)?.8:1));
}
export const soles=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n||0);
