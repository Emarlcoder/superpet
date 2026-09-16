# Rendimiento: optimizaciones locales

Implementación local, pendiente de publicación y medición final en Vercel.

## Cambios

- Home: datos de promociones y colecciones obtenidos por Server Components, con límites de Suspense independientes para servir el encabezado mientras llegan los datos. El navegador recibe el banner y productos en el HTML; ya no inicia tres consultas de datos después de hidratar React.
- Caché de datos Next: promociones 60 segundos; categorías y marcas 300 segundos. Las consultas públicas no reciben cookies. Productos, precios, disponibilidad, autenticación y pedidos siguen sin caché.
- Al guardar promociones o taxonomías en el panel, una Server Action valida la sesión contra la API y ejecuta `updateTag`. Si falla, el guardado ya confirmado se conserva y el TTL actúa de respaldo. Escrituras realizadas fuera de este panel dependen del TTL. Los clientes con el home ya abierto deben recargar para ver las modificaciones.
- La página completa pasa a renderizado dinámico con streaming para mantener productos frescos. La caché es de datos públicos seleccionados; no se afirma conservar el HIT de HTML estático anterior.
- La API agrega URLs directas de ImageKit para derivados públicos. Nunca genera URLs para originales privados. Clientes anteriores y archivos locales conservan la ruta proxy como respaldo.
- El carrusel usa variantes por ancho de ImageKit (`srcSet`) y reserva espacio mientras llegan los datos. Solo la primera diapositiva recibe prioridad alta. La interacción del carrusel permanece en cliente.

## Verificación

- Build de producción local y TypeScript correctos; 25 pruebas PostgreSQL/HTTP y 6 pruebas de ImageKit pasadas.
- Prueba sobre build local: invalidación anónima rechazada; una promoción temporal no aparece mientras la caché está vigente y sí aparece en el HTML tras invalidación autenticada. Solo esa promoción temporal fue eliminada al finalizar.
- HTML local contiene imagen de banner y producto sin ejecutar JavaScript. Tres lecturas: cabeceras 254/29/25 ms; respuesta completa 446/38/32 ms. Son mediciones locales, no comparables directamente con producción ni métricas LCP/CLS.
- Navegador local: banner, categorías y producto visibles; selección de diapositiva funcional.

## Pendiente

Medir LCP/CLS y tiempos reales con móvil tras despliegue. Validar con un catálogo representativo los planes SQL y las búsquedas bajo latencia elevada.

## Segunda etapa: catálogo SQL

- Búsqueda por nombre, especie, categoría, marca, orden y paginación se ejecutan en PostgreSQL. Se mantiene el contrato `items/nextCursor` y el cursor de offset existente. La búsqueda trata `%` y `_` literalmente, sin interpretarlos como comodines.
- La página de 20 productos obtiene como máximo 21 filas de productos (una para detectar continuación), en lugar del catálogo completo. Solo consulta SKU activos e imágenes de los 20 productos devueltos; estas dos lecturas se ejecutan en paralelo. No se transfieren originales privados de imágenes.
- La ficha consulta por slug publicado con límite 1; borradores, archivados e inexistentes devuelven 404. El administrador conserva su listado completo.
- El precio de orden corresponde a bolsa/unidad, no a kilo suelto. Los empates usan ID. Si existieran publicaciones antiguas con varias unidades, se utiliza la primera por ID, igual que el orden estable de SKU devuelto; antes el orden interno no estaba definido. Productos sin precio unitario mantienen el comportamiento previo: últimos en ascendente, primeros en descendente.
- Sin migraciones ni modificaciones comerciales. Disponibilidad y precio siguen sin caché. Offset puede repetir/omitir resultados si el catálogo cambia entre páginas, igual que antes; no es un cursor de snapshot.
- Verificación: compilación TypeScript, formato y lint; 26 pruebas PostgreSQL/HTTP pasadas en una base temporal local. Cobertura nueva de filtros combinados, búsqueda literal y mayúsculas, orden por bolsa, empates, cursor siguiente/final/inválido/fuera de rango, SKU inactivos, agotados, imágenes públicas y fichas ocultas.
- La reducción descrita es de filas transferidas, no una medición de latencia productiva. Queda medir planes con un volumen representativo antes de proponer índices adicionales, especialmente para búsqueda y orden por precio.

## Tercera etapa: JavaScript por ruta y búsqueda

- Se reemplaza `components/storefront.tsx` por módulos directos `store-header`, `catalog`, `product-detail` y `cart`. Solo el almacenamiento y evento del carrito se comparten en `lib/cart-storage.ts`. El flujo de cotización, idempotencia y WhatsApp conserva su lógica.
- El HTML inicial del home y del catálogo ya no referencia scripts que contienen `/cart/quote`; el carrito sí. Next puede precargar rutas al mostrar/enfocar enlaces: esto no implica que la precarga quede deshabilitada.
- Medición de scripts referenciados en HTML de producción local: home 599412 bytes, catálogo 601315, carrito 603521 (9 scripts por ruta, bytes descomprimidos; no son bytes de transferencia ni LCP). No se calcula porcentaje de mejora contra producción porque cambió más de una etapa.
- Búsqueda: los 250 ms de espera se aplican solo al texto escrito. La carga inicial desde URL, los filtros, el orden y la paginación no añaden esa demora. Cada cambio cancela la consulta anterior y bloquea respuestas obsoletas; se conserva timeout de 90 segundos. Los cambios de URL reinician el catálogo con todos sus filtros inicializados, evitando la consulta inicial sin filtros.
- Se elimina el segundo filtrado de nombres en el navegador: SQL define los resultados y la paginación.
- Verificado: TypeScript, lint, formato y build Next. Navegador sobre build local: búsqueda desde URL, vacío, cambio de texto/orden, navegación Gatos/Perros, ficha, agregar al carrito, contador y contenido persistido entre rutas. El artículo de prueba fue quitado al terminar; no se enviaron pedidos ni mensajes. No se simuló red lenta ni se midieron Core Web Vitals.
