# CineMax Perú — Semana 9, caso 18

**Lima Huaroc Jeanpierre Eduardo**

## Abrir en Live Server

1. Descomprime el ZIP y abre la carpeta del proyecto en VS Code.
2. En tu proyecto **Neon**, abre SQL Editor y selecciona la misma base que ya usa CineMax.
3. Ejecuta **sql/semana9.sql** completo. Es la actualización que falta: roles, tarifario, banco ficticio, pagos y protección de reservas. No es necesario volver a ejecutar los scripts de semanas anteriores en tu base actual.
4. Opcional: ejecuta **sql/datos_demo_semana9.sql** para disponer de cuatro pagos en línea, dos de caja y un rechazo de demostración. Crea siete reservas nuevas; no convierte tus compras antiguas en pagos.
5. Abre **index.html → Open with Live Server**. No requiere Node, npm, Vercel ni un backend local. Requiere Internet para Neon. La cadena de conexión original se conserva en js/config/neon-config.js.
6. Ejecuta **sql/verificar_semana9.sql** para las consultas de evidencia que pide el docente. Haz las capturas en tu Neon después de realizar las pruebas.

La aplicación avisa si aún no ejecutaste semana9.sql. Los archivos JS de pruebas no se necesitan para abrir la web.

## Flujo de uso

- Cliente: Reservar → película, fecha, horario, formato y de 1 a 10 butacas → Mis compras (pendiente) → Pagar → tarjeta o billetera ficticia → comprobante y ticket TKT.
- La reserva bloquea las butacas desde que se confirma. Una selección todavía sin confirmar no las bloquea. Si otra persona confirma primero, PostgreSQL rechaza el conflicto sin guardar una reserva parcial.
- La reserva genera un código de seguimiento, no una entrada. Un pago rechazado queda auditado y mantiene la reserva pendiente; no genera ticket.
- La pantalla actualiza butacas cada 3 segundos mientras está visible. La restricción única de Neon impide duplicados incluso antes del siguiente refresco. La ocupación es por sala, fecha, horario y asiento: cambiar de película no permite ocupar la misma sala y horario dos veces.
- Cancelar una reserva pendiente libera todas sus butacas. Editarla cambia función, formato y butacas en una operación atómica; si las nuevas están ocupadas, se conservan las originales.
- Cajero: Caja → buscar por nombre, DNI o código → cobrar efectivo (vuelto), POS (voucher) o billetera → comprobante. Nueva venta con butacas abre el selector y luego el cobro. Si no se completa el cobro, permanece pendiente.
- Empleado: puede tomar reservas en taquilla, consultar butacas y validar entradas pagadas. El cobro financiero lo realiza el cajero o administrador. Se conservan los turnos laborales existentes.
- Caja muestra pagos en línea, permite verificarlos y resume cobros del día por canal y método. Refresca cada 15 segundos y usa la fecha de Lima.
- Empleado: validación con el código **TKT-**, solo en la fecha de función y una sola vez. El código de reserva no permite ingresar.
- No se puede modificar una compra pagada ni borrar un registro con historial de pagos. Los rechazos también se conservan para auditoría.

## Tarifario de tu consigna

General S/16, 3D S/22, Prime S/32 por entrada. Martes y miércoles tienen 20 % de descuento.

- 3 entradas 3D, 13/10/2026: **S/52.80**.
- 2 generales, viernes 16/10/2026: **S/32.00**.

El cotizador usa JavaScript y PostgreSQL recalcula el monto al guardar y cobrar. Nunca se toma como autoritativo un total que envíe el formulario. El formato es una categoría tarifaria seleccionable del ejercicio; la ocupación física sigue la sala asociada a la película.

## Cuentas de prueba nuevas

| Rol | Correo | Contraseña |
|---|---|---|
| Cajero | caja@correo.com | 1234 |
| Cajero | caja2@correo.com | 1234 |
| Cliente de demostración (solo script opcional) | demo9@cinemax.test | DemoCine2026 |

Se conservan tus usuarios actuales. El administrador también puede crear nuevos cajeros desde Crear trabajadores. El cliente sigue llamado `usuario` internamente para mantener compatibilidad con tu proyecto; las pantallas lo tratan como cliente.

## Tarjetas y billeteras ficticias

No ingreses tarjetas reales en este ejercicio. Los siguientes datos son los de la consigna, no una conexión a esos bancos.

| Número de prueba | Vencimiento | CVV | Resultado esperado |
|---|---|---|---|
| 4111111111111111 | 12/29 | 123 | Débito aprobado si queda saldo |
| 4000000000000002 | 08/28 | 456 | Saldo inicial S/10, insuficiente para dos entradas |
| 5555555555554444 | 05/30 | 789 | Crédito aprobado si queda línea |
| 5105105105105100 | 03/27 | 321 | Bloqueada |
| 378282246310005 | 11/28 | 1234 | American Express, CVV de cuatro dígitos |
| 4242424242424242 | 01/25 | 111 | Vencida, detenida en el formulario |
| 4111111111111112 | 12/29 | 123 | Luhn incorrecto |
| 4111111111111111 | 12/29 | 999 | CVV incorrecto, rechazo auditado |

Puedes poner el titular ficticio indicado en la consigna; este dato es descriptivo y no autentica a una persona.

| Proveedor | Celular | Código | Saldo inicial |
|---|---|---|---|
| AndiPay | 987654321 | 123456 | S/500 |
| PagoMóvil | 912345678 | 654321 | S/15 |
| AndiPay | 999888777 | 111222 | S/1000 |

El código 000000 para la tercera billetera debe rechazarse. Para probar saldo insuficiente de PagoMóvil usa dos entradas generales: una sola entrada con descuento cuesta S/12.80 y sí podría pagarse con S/15. Los saldos disminuyen con cada autorización; repetir la migración no los reinicia.

## Qué significa validar una tarjeta de verdad

1. Luhn, marca, longitud y fecha detectan errores de formato. **No prueban la existencia de una tarjeta, su titularidad, su saldo ni su autorización.**
2. En esta práctica el emisor ficticio consulta `banco_tarjetas`, comprueba estado, vencimiento y CVV, y descuenta `banco_cuentas`; las billeteras funcionan de manera equivalente. `pagos` conserva solo referencias enmascaradas.
3. En una integración real, un formulario de una pasarela tokeniza los datos. Un backend calcula el monto, solicita autorización, gestiona autenticación adicional (por ejemplo 3D Secure cuando corresponde) y confirma el resultado de la pasarela, normalmente mediante webhooks verificados. Solo entonces se emite el ticket.
4. El CVV real no se conserva después de la autorización, ni siquiera cifrado. Las tablas del emisor con CVV en este trabajo contienen exclusivamente datos ficticios requeridos por el docente.
5. Live Server sirve archivos estáticos: la arquitectura directa a Neon sigue siendo una simulación académica, no una integración bancaria real. La conexión de prueba se mantiene a pedido del autor.

Fuentes oficiales consultadas el 16/10/2026:
- https://docs.stripe.com/payments/payment-intents
- https://docs.stripe.com/payments/payment-intents/verifying-status
- https://docs.stripe.com/testing
- https://www.pcisecuritystandards.org/faqs/are-merchants-allowed-to-request-card-verification-codes-values-from-cardholders/

## Datos históricos

La base consultada tenía 46 compras y 16 usuarios. Los registros anteriores sin pago auditado conservan la condición financiera pendiente: no se inventa un cobro. Los que no tienen fecha o butacas deben actualizarse antes de pagar. Los seis registros históricos atendidos se conservan como historial; no se convierten en tickets nuevos.

## Verificación y sustentación

Las pruebas de lógica están en `tests/resultado.txt`. La implementación ejecuta la autorización en una función PostgreSQL con bloqueo de la reserva y de la cuenta/billetera. El índice parcial permite un solo pago aprobado por compra. Un error revierte el descuento, la auditoría y el cambio de estado juntos.

Guion: reserva 3 butacas → muestra el descuento del martes → CVV incorrecto → CVV correcto → imprime ticket → entra como cajero y verifica el pago → realiza una venta en efectivo con vuelto.

Los scripts se entregan para que los ejecutes; esta entrega no aplica modificaciones a tu Neon ni sube cambios a la rama principal de GitHub.
