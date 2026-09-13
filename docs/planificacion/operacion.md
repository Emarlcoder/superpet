# Operación propuesta: administración, WhatsApp y stock

Actualización vigente: aprobadas para MVP las reglas de producto/SKU, gramos enteros, stock común por alimento, máximo consolidado 5 kg, apertura administrativa atómica y pendientes sin reserva; ver [modelo-datos.md](./modelo-datos.md). Las menciones anteriores a estas reglas como propuestas quedan superadas por esa aprobación. Criterio de correcciones/devoluciones aprobado en modelo-datos.md; detalles y mecanismos técnicos restantes pendientes.

Las modalidades retiro/envío y la coordinación por WhatsApp están confirmadas. Las reglas siguientes son propuestas para revisar con SuperPet.

También está confirmado que se registrarán todas las ventas en el panel, incluidas las presenciales. La pantalla “Venta rápida” es la propuesta de interfaz para facilitar esa operación.

## Venta rápida propuesta

Buscar producto o SKU → indicar unidades o kg → revisar importes → marcar la compra como realizada. Una venta presencial entregada en el momento registra canal local, entrega e historial con un único descuento de stock. No exigir datos de cliente para una venta de mostrador salvo necesidad comercial definida.

Las ventas recibidas por WhatsApp se registran con ese canal para distinguir su origen. Marcar una compra como realizada actualiza el inventario que consulta la tienda. Los medios de cobro fuera de la web siguen pendientes.

## Puesta en marcha

1. Crear categorías, marcas y productos en borrador.
2. Cargar fotos, precios y presentaciones con SKU propio.
3. Contar existencias físicas y registrar movimientos de stock inicial.
4. Revisar y publicar productos completos.
5. Registrar las ventas de WhatsApp y del local en el panel.

Carga manual disponible desde el inicio; evaluar importación masiva según cantidad de productos. Confirmado: una sola persona usará el panel. Planificar un administrador con acceso completo, sin gestión de empleados ni matriz de roles en el MVP. Mantener inicio de sesión, recuperación segura e historial de operaciones.

## Mensaje del carrito

Cobertura inicial provisoria confirmada: Ciudad de la Costa, Canelones, Uruguay. Puede modificarse. Propuesta: mantener zona y condiciones de entrega editables en Configuración del panel, sin cambios de código. La validación de la dirección y la entrega se coordina por WhatsApp; no afirmar cobertura automática por pertenecer al departamento de Canelones. Confirmado: el costo del envío se coordina por WhatsApp. Los límites precisos siguen pendientes; no inventar un importe ni presentarlo como envío gratis.

El backend valida identificadores y cantidades y calcula importes con datos vigentes. El mensaje incluye nombre, presentación/SKU, cantidad, precio unitario, total por línea, subtotal, modalidad de entrega y aclaración de disponibilidad y envío a confirmar.

Si cambia un precio o disponibilidad, el cliente revisa el carrito actualizado antes de abrir WhatsApp. El texto es una solicitud y puede ser editado por el cliente: el administrador contrasta el mensaje con la pendiente existente y la edita si acordaron cambios, sin duplicarla.

La implementación verificará la documentación vigente del enlace de WhatsApp y probará móvil y escritorio. No se envía un mensaje desde el servidor ni se requiere una API de mensajería para este alcance.

Si el texto resulta demasiado largo, permitir copiarlo completo y abrir el chat; nunca truncar productos silenciosamente. Si falla la validación, conservar el carrito y ofrecer reintento. Abrir el chat tampoco vacía automáticamente el carrito.

## Intención y venta

Propuesta administrativa: registrar el costo de envío acordado por WhatsApp separado del subtotal de productos. Un costo aún no acordado queda pendiente, no en cero; solo mostrar total final con entrega cuando se cargue el importe acordado. No implementar un cotizador automático para el MVP.

## Compras pendientes — confirmado

El panel tendrá una sección “Compras pendientes”. Cada compra pendiente permite editarse, cancelarse o marcarse como realizada. Crear, editar o cancelar una pendiente no descuenta ni repone stock. El único momento de descuento por venta es marcar la compra como realizada. Esta regla reemplaza la propuesta anterior de descontar al confirmar un acuerdo.

| Operación | Estado resultante | Efecto en stock |
| --- | --- | --- |
| Crear compra | Pendiente | Ninguno |
| Editar pendiente | Pendiente | Ninguno |
| Cancelar pendiente | Cancelada | Ninguno |
| Marcar pendiente como realizada | Realizada | Descontar las cantidades vigentes una sola vez |

Propuesta de interfaz: lista con referencia, fecha, canal local/WhatsApp, resumen e importe; detalle editable de productos, cantidades, retiro/envío, costo acordado y notas. Las realizadas y canceladas salen de pendientes y permanecen en un historial filtrable.

Al marcar como realizada, el backend valida stock actual y la versión vigente de la compra y aplica cambio de estado y todos los movimientos en una transacción. Si falta stock en cualquier línea, no descuenta ninguna y mantiene la compra pendiente con un error claro. Un doble clic o reintento no duplica el descuento. Una edición simultánea no puede sobrescribir una compra ya realizada o hacer que se descuenten cantidades antiguas.

Propuesta: las pendientes no reservan unidades ni garantizan disponibilidad. Realizada expresa el cierre administrativo de la compra; no implica automáticamente pago recibido, despacho o entrega. No se requiere el flujo anterior Confirmada → En preparación → Entregada para descontar stock.

Confirmado: al pulsar Coordinar por WhatsApp se crea automáticamente una compra pendiente. Luego se abre el chat con su detalle. Reemplaza la propuesta de carga manual para pedidos originados en la web; las ventas presenciales se cargan desde el panel. Abrir WhatsApp no demuestra envío ni recepción y la pendiente no descuenta stock.

Una venta presencial rápida, si se adopta, utiliza la misma transición a realizada, sin otra vía de descuento. Confirmado para MVP: conservar compra realizada original y registrar correcciones con motivo y fecha; en devoluciones indicar qué productos reingresan realmente; pérdidas, roturas y diferencias de conteo mediante ajustes con motivo obligatorio. Detalles pendientes en modelo-datos.md. Una cancelación de pendiente nunca repone existencias.

## Integridad y trazabilidad

### Creación desde el carrito

Regla confirmada: el botón crea una pendiente. Diseño propuesto:

1. Validar carrito, cantidades, precios y modalidad de entrega en el backend; mostrar cualquier cambio para revisión del cliente.
2. Guardar una compra pendiente con copia de sus líneas e importes, subtotal y referencia única. No descontar ni reservar stock.
3. Preparar el mensaje desde los datos guardados, incluyendo la referencia para ubicarlo en el panel, y abrir WhatsApp. El cliente envía el mensaje.
4. Mostrar la compra en Compras pendientes aunque el cliente finalmente no envíe el mensaje; no inventar un estado “mensaje recibido”.

Usar una clave de idempotencia por intento: doble clic, reintento tras timeout o reapertura del mismo intento recuperan la misma referencia, sin duplicar pendientes. Si cambia el contenido con la misma clave, rechazar el conflicto; un carrito cambiado requiere un nuevo intento explícito y no sobrescribe una compra administrada. No deduplicar por contenido entre clientes distintos.

Si falla la creación, conservar carrito y clave y ofrecer reintento sin abrir un mensaje que aparente estar registrado. Si se guardó pero falló abrir WhatsApp, permitir reabrirlo o copiar mensaje y referencia sin volver a crear la compra. La referencia pública no autoriza consultar ni editar compras; datos y acciones administrativas siguen protegidos. Proponer límites de solicitudes al endpoint público para evitar pendientes masivas.

Confirmado: solicitar nombre y teléfono obligatorios antes de crear la compra pendiente y abrir WhatsApp. Guardarlos con la compra para identificarla en el panel. No inferir el teléfono desde la apertura de WhatsApp.

Propuesta: validar nombre no vacío y formato de teléfono en frontend y backend, con prefijo +598 preseleccionado y editable. Errores conservan el carrito y no crean compras. Esto no verifica la titularidad del teléfono; no se propone OTP. Explicar que los datos se usarán para coordinar el pedido. Acceso al contacto solo administrativo, sin incluir datos personales en logs ni Engram. La dirección sigue propuesta para coordinar por WhatsApp. Esta regla corresponde al flujo web, no agrega datos obligatorios a la venta presencial rápida.

- Impedir stock negativo y validar confirmaciones concurrentes.
- Repetir la acción de marcar como realizada no duplica movimientos; cancelar una pendiente no genera movimientos.
- Cada cambio de stock conserva fecha, actor, cantidad, motivo y referencia.
- Corregir compras realizadas con operaciones trazables, sin sobrescribir su historia.
- Conservar descripción, SKU y precio de cada línea al marcar la compra como realizada.
- Archivar productos con historial en lugar de borrar sus referencias.
- Restringir datos de ventas a personal autorizado.
- Recopilar solo datos necesarios: dirección para envío, no para retiro.

El registro interno de una venta no sustituye el comprobante que corresponda al negocio.

## Alimento suelto por kilo

Confirmado: cantidades de 1 a 5 kg con paso de 1 kg. Propuesta de inventario: un SKU a granel por alimento y un stock común medido en kg; elegir 1, 2 o 5 kg consume el mismo inventario. No crear cinco existencias independientes para esas cantidades.

En el panel, distinguir venta por unidad (bolsa cerrada o accesorio) de venta por kg (alimento suelto). Configurar precio por kg, stock inicial, reposiciones y mínimo de alerta con la unidad visible. Guardar unidad y precio por unidad de medida en las líneas históricas.

Al marcar como realizada una compra de 3 kg de una existencia de 20 kg, quedan 17 kg disponibles. Cancelar esa compra mientras todavía es pendiente deja intactos los 20 kg. No convertirlos en tres bolsas ni descontar una bolsa cerrada automáticamente.

La validación del backend debe rechazar fracciones, cero, negativos, más de 5 kg por alimento en el carrito y cantidades superiores al stock. Aplicar la misma regla a compras pendientes originadas en WhatsApp al marcarlas como realizadas. Los ajustes y reposiciones no están limitados a 5 kg: ese es un límite comercial de selección, no de inventario.

Propuesta para medición exacta: almacenar el inventario a granel en gramos enteros y presentarlo en kg. Cada paso de venta equivale a 1000 g. Esto permite registrar mermas y pesajes sin habilitar compras fraccionarias; el máximo comprable es el menor entre 5 y los kg enteros disponibles. Ejemplo: con 2800 g se pueden seleccionar 1 o 2 kg.

Confirmado por el usuario: el alimento suelto se obtiene de bolsas cerradas.

## Apertura de bolsas para venta suelta

Flujo propuesto del panel: Inventario → Abrir bolsa para venta suelta. El administrador selecciona la presentación cerrada, indica una cantidad entera positiva de bolsas y revisa el alimento suelto vinculado y el peso que ingresará. Registra la operación al abrir físicamente las bolsas.

- Configurar una relación entre cada SKU de bolsa cerrada apta para fraccionar y el SKU suelto del mismo alimento. Guardar el contenido neto por bolsa; no deducirlo del nombre ni del precio.
- Permitir que distintas presentaciones del mismo alimento abastezcan su stock suelto común, con su peso correspondiente. No mezclar alimentos o fórmulas diferentes.
- Validar disponibilidad de bolsas disponibles en stock, relación de origen/destino y peso positivo.
- En una única transacción, descontar las bolsas y sumar cantidad de bolsas × contenido neto al stock suelto. Si algo falla, no aplicar ninguno de los movimientos.
- Vincular salida y entrada a una operación con identificador, fecha, actor, SKU origen/destino, número de bolsas y peso aplicado. Conservar esos valores aunque cambie el catálogo.
- Reintentar la misma operación no duplica movimientos. Dos aperturas o una apertura y una venta concurrentes no pueden consumir la misma última bolsa.
- La apertura no es una venta ni genera ingresos. El precio por kg se configura por separado del precio de la bolsa.
- El stock suelto vendible aumenta cuando se registra la apertura; no sumar bolsas todavía cerradas a la disponibilidad pública por kg ni abrirlas automáticamente desde el carrito.
- Registrar mermas con un ajuste explícito vinculado, sin ocultarlas cambiando el peso nominal de la bolsa.

Ejemplo ilustrativo: con 4 bolsas cerradas de 20 kg y 2 kg sueltos, abrir 1 bolsa deja 3 bolsas y 22 kg sueltos. Marcar después como realizada una compra de 3 kg deja 19 kg sueltos y las mismas 3 bolsas.

No ofrecer una reversión rutinaria que convierta alimento físicamente abierto en una bolsa cerrada. Un registro equivocado se corrige con ajustes auditados que reflejen el inventario real; no se borra el historial. Cancelar una pendiente no repone stock. Si se implementa devolución de una compra realizada, el reingreso será de alimento suelto, nunca de bolsas cerradas.

En la carga inicial, contar por separado bolsas cerradas y alimento ya abierto. Este último se registra como saldo inicial, sin descontar de nuevo bolsas que ya no figuran cerradas. Las reposiciones posteriores del stock suelto provienen de aperturas; los ajustes quedan reservados para diferencias justificadas.
