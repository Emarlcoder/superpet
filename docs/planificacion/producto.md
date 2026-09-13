# Producto y alcance

## Confirmado por el usuario

- En principio, el catálogo atenderá solo perros y gatos. Otras especies quedan fuera del alcance inicial.

- Categorías iniciales confirmadas: alimentos, accesorios, juguetes e higiene.

Propuesta de organización: navegar o filtrar por Perros y Gatos y por las cuatro categorías. Mantener especie separada de categoría. El alimento suelto es una modalidad de venta dentro de alimentos; no requiere una categoría independiente. Subcategorías y productos concretos se definirán al cargar el catálogo.

- Moneda inicial: pesos uruguayos (UYU), por ahora. Aplica a catálogo, precio por kg, carrito, compras y costo de envío registrado en el panel.

- SuperPet no tiene catálogo ni sistema de gestión digital previo.
- El panel administrará catálogo y stock desde cero.
- Se ofrecerán retiro del local y envío.
- El costo del envío se coordinará por WhatsApp por ahora. La web mostrará subtotal de productos y “Envío a coordinar”, sin presentarlo como total final con entrega incluida.
- Zona inicial provisoria: Ciudad de la Costa, Canelones, Uruguay. El usuario podrá cambiarla; límites precisos pendientes; costo del envío coordinado por WhatsApp, confirmado.
- No habrá pagos en la web en esta etapa.
- El carrito abrirá WhatsApp con el pedido preparado para que el cliente lo envíe al número de SuperPet y coordine allí la compra.
- También se venderá alimento suelto de 1 a 5 kg, aumentando o disminuyendo de a 1 kg entero.
- El alimento suelto proviene de abrir bolsas cerradas.
- Todas las ventas se registrarán en el panel: local y WhatsApp.
- Una sola persona usará el panel. Alcance derivado para el MVP: un administrador con acceso a todas sus funciones; sin gestión de empleados ni roles diferenciados.

## Alcance del MVP

| Área | Detalle propuesto |
| --- | --- |
| Tienda | Inicio, catálogo, búsqueda, filtros, ficha de producto y carrito |
| Catálogo administrativo | Productos, variantes/SKU, fotos, precios, categorías, marcas y publicación |
| Inventario | Carga inicial, reposiciones, apertura de bolsas para venta suelta, ajustes con motivo, salidas por venta y alertas de stock bajo |
| Carrito | Cantidades, subtotal de productos, retiro/envío y acción “Coordinar por WhatsApp” |
| Compras pendientes | Editar, cancelar o marcar como realizada; solo esta última acción descuenta stock. Creación automática al pulsar Coordinar por WhatsApp |
| Configuración | Número de WhatsApp, dirección, horarios e información de entrega |

Se propone comprar sin cuenta de cliente. Los detalles de operación están en [operacion.md](./operacion.md).

Se propone editar la cobertura y su texto informativo desde Configuración del panel. La tienda mostrará la zona vigente y aclarará que la entrega se confirma por WhatsApp. No asumir cobertura en todo Canelones ni bloquear direcciones automáticamente mientras no existan límites definitivos.

## Recorrido del cliente

1. Seleccionar productos, presentaciones y cantidades.
2. Revisar el carrito y elegir retiro o envío.
3. Validar precios y disponibilidad contra el backend; revisar cualquier cambio antes de continuar.
4. Completar nombre y teléfono, requeridos para identificar la compra.
5. Pulsar “Coordinar por WhatsApp”: validar datos, crear la compra pendiente y abrir el chat con el detalle y la referencia.
6. Enviar el mensaje voluntariamente y coordinar disponibilidad, pago y entrega con SuperPet.

El subtotal corresponde a productos. Si el envío no está cotizado, mostrar “Envío a coordinar”; no tratarlo como gratuito. Se propone pedir la dirección por WhatsApp, sin recopilarla previamente en la web.

Se registra una compra pendiente; abrir el chat no confirma que el mensaje se haya enviado ni que la compra esté realizada. No mostrar “Pedido confirmado” al salir a WhatsApp.

## Fuera del MVP

- Pagos online, pasarelas, webhooks de pago y conciliación automática.
- Bots, envío automático e integración con WhatsApp Business Platform.
- Cuentas de clientes y seguimiento público de pedidos.
- Facturación integrada, excluida del MVP por confirmación del usuario; registro administrativo de ventas sin emisión fiscal.
- Suscripciones, puntos, marketplace, app móvil y múltiples depósitos.

## Pendientes

Volumen de catálogo, presentaciones y pesos de bolsas que se abrirán para venta suelta, número de WhatsApp, dirección, horarios, cobertura definitiva de envío, política de cambios y devoluciones, comprobantes, marca visual, fotos, dominio, presupuesto y fecha objetivo. Moneda inicial resuelta: UYU.

## Alimento suelto

- Mostrar precio por kg y selector con valores 1, 2, 3, 4 y 5 kg. No aceptar fracciones.
- Calcular el importe como kilos seleccionados × precio por kg.
- Mostrar los kg explícitamente en ficha, carrito y mensaje de WhatsApp; ejemplo: “Alimento suelto — 3 kg × precio/kg”.
- Si hay menos de 5 kg disponibles, limitar la selección al stock vendible; si no alcanza para 1 kg, mostrar agotado.
- Interpretación de alcance propuesta: el máximo de 5 kg aplica al total de cada alimento suelto en el carrito, sin limitar la suma de alimentos diferentes. Agregados repetidos se consolidan para evitar superar ese máximo mediante varias líneas.
- El selector de kg representa la cantidad comprada; no agregar un segundo multiplicador de paquetes de 1–5 kg.

La gestión del stock a granel se detalla en [operacion.md](./operacion.md).

## Calidad

Priorizar móvil, accesibilidad, páginas públicas indexables y estados claros de error, carrito vacío y agotados. Ofrecer copia del mensaje y número visible si no puede abrirse WhatsApp. Definir retención de datos, backups y objetivos de rendimiento antes del lanzamiento.
