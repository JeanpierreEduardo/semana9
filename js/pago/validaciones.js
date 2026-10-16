export const limpiarNumero=s=>String(s||'').replace(/[ -]/g,'');
export function luhn(valor){const n=limpiarNumero(valor);if(!/^\d{13,19}$/.test(n)||/^0+$/.test(n))return false;let suma=0,doble=false;for(let i=n.length-1;i>=0;i--){let x=Number(n[i]);if(doble){x*=2;if(x>9)x-=9}suma+=x;doble=!doble}return suma%10===0}
export function detectarMarca(v){const n=limpiarNumero(v);if(/^4\d{12}(\d{3})?(\d{3})?$/.test(n))return 'Visa';if(/^3[47]\d{13}$/.test(n))return 'American Express';const pref=Number(n.slice(0,4));if(n.length===16&&(/^5[1-5]/.test(n)||(pref>=2221&&pref<=2720)))return 'Mastercard';return ''}
export function validarVencimiento(v,ahora=new Date()){const m=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);if(!m)return false;const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit'}).formatToParts(ahora);const anio=Number(partes.find(p=>p.type==='year').value),mes=Number(partes.find(p=>p.type==='month').value);return 2000+Number(m[2])>anio||(2000+Number(m[2])===anio&&Number(m[1])>=mes)}
export const validarCVV=(cvv,marca)=>(marca==='American Express'?/^\d{4}$/:/^\d{3}$/).test(cvv);
export const validarCelular=v=>/^9\d{8}$/.test(v);
export function validarPago(d){
 if(d.metodo==='tarjeta'){
  if(!luhn(d.numero))throw Error('El número no supera la comprobación Luhn.');
  const marca=detectarMarca(d.numero);if(!marca)throw Error('Usa Visa, Mastercard o American Express.');
  if(!validarVencimiento(d.vencimiento))throw Error('Vencimiento inválido o tarjeta vencida.');
  if(!validarCVV(d.cvv,marca))throw Error('CVV inválido: American Express usa 4 dígitos; las otras marcas, 3.');
  if(String(d.titular||'').trim().length<3)throw Error('Ingresa el titular de la tarjeta de prueba.');
 }else if(d.metodo==='billetera'){
  if(!['andipay','pagomovil'].includes(d.proveedor)||!validarCelular(d.celular)||!/^\d{6}$/.test(d.codigo))throw Error('Revisa proveedor, celular de 9 dígitos y código de 6 dígitos.');
 }else if(d.metodo==='pos'){if(!/^\d{6,20}$/.test(d.voucher||''))throw Error('El voucher debe contener de 6 a 20 dígitos.');}
 else if(d.metodo==='efectivo'){if(!/^\d+(\.\d{1,2})?$/.test(String(d.recibido||'')))throw Error('Ingresa el efectivo recibido con hasta dos decimales.');}
 else throw Error('Método no permitido.');
 return {...d,numero:limpiarNumero(d.numero)};
}
