# Pantallas y recorridos de SuperPet

Revisión visual local solicitada tomando puppis.com.ar como referencia: encabezado con buscador prominente, carrito y barra separada de navegación; home con carrusel existente, información de entrega, accesos por mascota, categorías, productos y marcas del catálogo, pasos de compra y pie de página. Se conserva identidad SuperPet, perros/gatos y coordinación por WhatsApp. Buscador y enlaces de marcas sincronizan filtros por URL. Publicación de esta revisión autorizada por el usuario tras revisar la versión local.

Actualización confirmada 2026-09-15: el bloque de bienvenida del home se reemplaza por un carrusel de promociones administradas desde la pestaña **Promociones**. Solo se carga la imagen; debajo se listan todas con eliminar y deshabilitar/habilitar. Desarrollo y pruebas en local; publicación autorizada posteriormente por el usuario. Ver [implementación y ejecución local](../desarrollo/promociones.md).

Actualización confirmada 2026-09-15: la carga administrativa usa una publicación por bolsa/tamaño o artículo, con fotos y descripción propias. Precio de bolsa/unidad obligatorio; switch de venta por kilo con precio/kg y peso de bolsa. SKU y relación de apertura se generan internamente. Ya no se muestran formularios de presentaciones ni vínculos de fraccionamiento; Inventario conserva la apertura explícita. Las referencias históricas a múltiples presentaciones dentro de una publicación quedan reemplazadas por este flujo.

Estado: propuesta de estructura funcional basada en requisitos confirmados. No es diseño visual aprobado ni implementación. Rutas, distribución y componentes son propuestas.

## Navegación pública

Cabecera: marca, buscador, Perros, Gatos y carrito con cantidad de artículos. Las categorías Alimentos, Accesorios, Juguetes e Higiene se combinan con la especie seleccionada. En móvil, navegación compacta y filtros en un panel desplegable. Sin enlace público al administrador.

Pie: contacto, dirección y horarios reales cuando estén disponibles, retiro/envío, condiciones de compra y privacidad. No inventar datos del local ni promociones.

| ID | Pantalla / ruta propuesta | Contenido y acción principal |
| --- | --- | --- |
| T01 | Inicio / | Presentación de SuperPet, accesos a Perros/Gatos y categorías, explicación de compra por WhatsApp; Ver productos |
| T02 | Catálogo /productos | Búsqueda, filtros por especie/categoría/marca, orden y resultados; Ver producto |
| T03 | Producto /productos/[slug] | Fotos, descripción, especie, presentación, precio UYU, disponibilidad, cantidad; Agregar al carrito |
| T04 | Carrito /carrito | Líneas editables, subtotal, retiro/envío, nombre y teléfono; Coordinar por WhatsApp |
| T05 | Continuación en /carrito | Referencia de la pendiente recién creada, explicación de envío manual del mensaje; Abrir WhatsApp y Copiar pedido |
| T06 | Contacto /contacto | Datos del local, zona provisoria vigente y costo de envío a coordinar; Contactar |
| T07 | Condiciones /condiciones y /privacidad | Información comercial y uso de datos; contenido pendiente de definir |

T05 es un estado del carrito, no seguimiento público de compras por referencia. Un enlace directo con una referencia no permite recuperar datos privados. El resultado de creación permite continuar el intento actual sin exponer una consulta pública de pedidos.

## Catálogo y ficha de producto

Una tarjeta muestra foto, nombre, presentación o precio desde si hay variantes con distintos importes, precio por unidad o por kg y disponibilidad. Si hay que elegir presentación, llevar a la ficha antes de agregar.

Filtros con resultado vacío ofrecen limpiar filtros. Producto agotado visible con etiqueta y acción de compra deshabilitada; producto archivado no se ofrece. Estado de carga, error con reintento y producto inexistente definidos por separado.

En la ficha, distinguir bolsa cerrada y alimento suelto aunque pertenezcan al mismo alimento. Bolsa cerrada: seleccionar presentación y unidades. Suelto: precio por kg y selector 1, 2, 3, 4 o 5 kg, limitado por stock. El total se actualiza al cambiar la cantidad. No permitir fracciones ni un segundo multiplicador de paquetes de kilos.

Propuesta: mostrar disponibilidad sin publicar la cantidad exacta de stock. El administrador sí ve existencias numéricas. Productos compatibles con ambas especies se muestran bajo ambas sin duplicar su inventario.

## Carrito y creación de pendiente

Orden propuesto en móvil: productos → modalidad de entrega → contacto → resumen y botón.

1. Revisar productos y modificar cantidades o eliminarlos. Las líneas de suelto muestran kg; unidades para bolsas y accesorios.
2. Elegir Retiro en local o Envío. En envío, mostrar Ciudad de la Costa como zona provisoria configurable y “Envío a coordinar”.
3. Completar nombre y teléfono obligatorios. Prefijo +598 preseleccionado y editable, propuesto. Explicar uso de datos para coordinar la compra; dirección por WhatsApp propuesta.
4. Mostrar subtotal de productos en UYU. Nunca presentarlo como total con envío incluido.
5. Pulsar Coordinar por WhatsApp. Validar datos y catálogo, crear la pendiente y preparar el mensaje con referencia. No descontar stock.
6. Mostrar “Solicitud registrada. Enviá el mensaje por WhatsApp para coordinar tu compra”. No afirmar mensaje enviado, pago aprobado ni compra realizada.

El botón permanece ocupado mientras se procesa. Si precio o disponibilidad cambiaron, mostrar las diferencias y pedir revisar antes de enviar nuevamente. Si falla la creación, conservar datos y carrito; si la respuesta se perdió, reintentar el mismo intento sin duplicar. Si falla abrir WhatsApp después de guardar, reabrir o copiar usando la referencia existente.

El mensaje contiene referencia, nombre del cliente propuesto, productos, presentaciones/SKU, cantidades con unidad, precios, subtotal y retiro/envío. No incluir notas internas. El teléfono se guarda para el administrador; no es necesario repetirlo en el texto del chat. El cliente puede editar el mensaje, por lo que el administrador contrasta lo conversado con la pendiente.

Conservar el carrito al abrir WhatsApp. Cambiar productos después de crear una pendiente no modifica silenciosamente esa compra: un nuevo envío con cambios constituye otro intento explícito. El historial del panel permite cancelar pendientes abandonadas; no cancelarlas automáticamente en este MVP sin una política acordada.

## Navegación administrativa

Un administrador autenticado. Menú propuesto: Resumen, Compras pendientes, Historial de compras, Nueva venta, Productos, Categorías y marcas, Inventario, Configuración. Cerrar sesión accesible. En móvil, tablas se adaptan a tarjetas o columnas esenciales sin esconder acciones críticas.

| ID | Pantalla / ruta propuesta | Contenido y acciones |
| --- | --- | --- |
| A01 | Acceso /admin/login | Inicio de sesión y recuperación segura; sin registro público |
| A02 | Resumen /admin | Cantidad de pendientes, stock bajo y accesos a Nueva venta y Abrir bolsa |
| A03 | Pendientes /admin/compras/pendientes | Referencia, fecha, cliente, canal, retiro/envío y subtotal; buscar por referencia, nombre o teléfono |
| A04 | Detalle /admin/compras/[id] | Contacto, líneas, importes, modalidad y notas; Editar, Cancelar, Marcar como realizada si está pendiente |
| A05 | Historial /admin/compras | Realizadas y canceladas, filtro de fechas/canal/estado y detalle histórico |
| A06 | Nueva venta /admin/compras/nueva | Cargar venta presencial, productos y cantidades; Guardar pendiente o Marcar como realizada |
| A07 | Productos /admin/productos | Buscar, filtrar publicación/categoría/especie, crear, editar o archivar |
| A08 | Editor /admin/productos/[id] | Nombre, descripción, especie, categoría, marca, fotos, presentaciones/SKU y precios; guardar borrador/publicar |
| A09 | Organización /admin/catalogo | Administrar categorías y marcas; inicialmente las cuatro categorías confirmadas |
| A10 | Inventario /admin/inventario | Existencias por SKU y unidad, mínimos e historial; carga inicial, reposición, ajuste y apertura de bolsa |
| A11 | Apertura de bolsa, formulario dentro de Inventario | Bolsa origen, cantidad, alimento suelto destino y peso resultante; Registrar apertura |
| A12 | Configuración /admin/configuracion | WhatsApp comercial, dirección, horarios y texto de cobertura/entrega; guardar cambios |

## Compras pendientes: detalle y acciones

Encabezado con referencia y estado. Contacto y modalidad de entrega, luego líneas con nombre, presentación, cantidad, precio y subtotal. Mostrar costo de envío acordado separado; si no se cargó, etiquetar pendiente, nunca asumir cero.

| Acción | Comportamiento |
| --- | --- |
| Editar | Cambiar líneas, cantidades, contacto, modalidad y notas; guardar versión nueva sin movimiento de stock |
| Cancelar | Mostrar resumen de la acción, pasar a cancelada y conservar historial; no reponer stock |
| Marcar como realizada | Mostrar cantidades que se descontarán, validar inventario actual y aplicar estado/movimientos juntos |
| Abrir contacto WhatsApp | Permitir al administrador contactar al teléfono declarado; no enviar automáticamente |

Propuesta: una revisión breve antes de cancelar o realizar para evitar clics accidentales. No supone un flujo de aprobación de otra persona. Si no alcanza stock, mantener pendiente y detallar faltantes para editar o reponer. Si ya fue modificada en otra pestaña, cargar la versión actual antes de ejecutar la acción.

Las realizadas y canceladas quedan en modo consulta. Correcciones de realizadas y devoluciones requieren reglas pendientes; no ofrecer edición destructiva ni reponer unidades automáticamente. Realizada no es sinónimo de pagada o entregada; el MVP no infiere esos hechos.

Nueva venta presencial propone contacto opcional y la misma transición a realizada. El botón no crea un segundo descuento diferente al flujo de pendientes. No incluir caja, arqueo ni facturación electrónica sin definir ese alcance.

## Catálogo y stock en administración

Separar edición comercial de movimientos físicos: cambiar descripción o precio no altera stock. SKU y unidad visibles en productos, ventas e inventario. Para alimento suelto, precio por kg; para bolsa, precio por unidad y contenido neto para la apertura.

En la apertura, mostrar antes/después: por ejemplo, 4 bolsas de 20 kg y 2 kg sueltos → 3 bolsas y 22 kg sueltos. Validar bolsa disponible, peso y vínculo con el mismo alimento. Guardar ambos movimientos o ninguno. Fallo o doble clic no puede duplicar la operación.

Reposiciones y ajustes solicitan cantidad, unidad y motivo. Existencias iniciales distinguen bolsas aún cerradas de alimento ya abierto. No ofrecer revertir una apertura física como si el alimento volviera a ser una bolsa sellada.

## Componentes compartidos y calidad

Proponer buscador, filtros, tarjeta de producto, selector de variante, cantidad con unidad, importe UYU, estado de compra, tabla/lista adaptable, formulario con errores junto al campo y resumen de acción. Usar etiquetas textuales además de color.

Todos los recorridos deben funcionar con teclado, foco visible, nombres accesibles y lectura clara de errores. Al cerrar un diálogo, devolver foco a la acción de origen. No depender de hover en móvil. Preservar datos al fallar una petición; no mostrar éxito antes de la respuesta del backend.

## Orden de bocetos y decisiones pendientes

Primero T04/T05 y A03/A04: definen el flujo central y la relación con stock. Después T02/T03, A07/A08 y A10/A11. Finalmente inicio, contacto, configuración y resumen.

El usuario confirmó identidad existente y señaló Instagram @superpet.uy como guía. Ver identidad-visual.md para los elementos observados y su aplicación propuesta. Hay referencia suficiente para bocetos; originales del logo, tonos exactos y tipografía final siguen pendientes. No inventar una identidad aprobada.

Pendientes funcionales: correcciones/devoluciones de realizadas, precio acordado tras cambios de catálogo, política de datos y recuperación de administrador. Datos comerciales pendientes: contacto/local, catálogo real y pesos, imágenes y condiciones. Diseño técnico pendiente: entidades detalladas, contratos API, infraestructura y backlog final. Este mapa no cierra toda la planificación.

