# Bocetos visuales

## Tienda desde el cliente — v1

Propuesta móvil del 2026-09-08, con el logo original como referencia y rojo #C7050E. Pantallas de página completa que requieren desplazamiento en un teléfono.

- [Home](./home-cliente-v1.png): búsqueda, presentación de la tienda, perros/gatos, cuatro categorías, productos de ejemplo y explicación de compra por WhatsApp.
- [Catálogo](./catalogo-cliente-v1.png): búsqueda, selección de mascota/categoría, filtros, orden y seis productos ilustrativos.
- [Producto](./producto-cliente-v1.png): alimento suelto, precio por kg, selector de 1 a 5 kg en pasos enteros, subtotal y agregar al carrito.
- [Prompts completos](./prompts-tienda-v1.md).

Productos, fotografías y precios son ejemplos, no el catálogo real. Las imágenes son propuestas estáticas, sin implementación ni aprobación del diseño. Logo y rojo son aproximaciones de ImageGen: en implementación se utilizará el archivo original y el valor de color definido. Quedan por revisar variantes de escritorio, estados e interacción y accesibilidad.

Agregar al carrito no crea una compra pendiente ni descuenta stock. La pendiente se crea al pulsar Coordinar por WhatsApp desde el carrito con los datos requeridos. El costo de envío se coordina por WhatsApp.

## Revisión vigente: v2, rojos del logo

- [Carrito móvil v2](./carrito-movil-v2.png).
- [Compras pendientes v2](./compras-pendientes-v2.png).
- [Prompts y alcance de la corrección](./prompts-v2.md).

Logo original disponible en ../assets/logo.png. Rojo muestreado de referencia: #C7050E. Bocetos editados con ImageGen, con aproximación visual de color; v1 permanece como historial. La palabra SuperPet de los bocetos sigue siendo provisional.

Propuestas generadas con ImageGen integrado el 2026-09-08. No son pantallas implementadas ni diseño aprobado.

- [Carrito móvil](./carrito-movil-v1.png): página completa con productos, cantidad por kg/unidad, retiro/envío, contacto y acción WhatsApp. Requiere desplazamiento en un teléfono real; no pretende representar una sola altura de pantalla.
- [Compras pendientes](./compras-pendientes-v1.png): listado y detalle con editar, cancelar y marcar realizada.
- [Prompts completos](./prompts-v1.md).

Revisión visual: importes ilustrativos coherentes (3 × 180 + 250 = 790 UYU), envío a coordinar, contacto obligatorio en carrito, estado pendiente y tres acciones visibles en admin. Logo tipográfico provisional; sustituir por archivo original antes de producción. Fotos y productos ilustrativos, sin catálogo real.

Limitaciones de esta entrega: imágenes estáticas, sin interacciones, validación técnica de contraste ni pruebas de accesibilidad. El formulario del carrito está sin completar y el botón ilustra la jerarquía visual, no habilita crear pedidos con datos vacíos. No se representan aún errores, recuperación de WhatsApp ni estados realizada/cancelada. La edición de notas se guardará dentro del flujo Editar, no con un guardado implícito. Categorías y marcas pueden agruparse bajo Productos; navegación definitiva por revisar.

Próxima revisión: jerarquía, densidad y dirección visual; luego variantes de estado y escritorio. Ningún boceto cambia las reglas documentadas de stock ni de creación de pendientes.
