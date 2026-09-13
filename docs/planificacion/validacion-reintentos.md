# API: validación, límites y reintentos

Diseño técnico seleccionado al continuar el cierre de contratos solicitado por el usuario. Complementa [contratos API](./contratos-api.md) y concreta esa parte de P-02. No es implementación ni aprobación de nuevas reglas comerciales. Valores operativos ajustables con evidencia de uso; imágenes, autenticación y compensaciones tienen contratos separados.

## Entradas y normalización

Validar en servidor antes de ejecutar efectos. El frontend replica validaciones para ayudar al usuario; no es autoridad. Rechazar campos desconocidos en todos los objetos anidados y no convertir automáticamente strings, booleanos o null en cantidades numéricas. JSON mal formado: 400; tipo de contenido distinto de application/json: 415; cuerpo JSON mayor de 64 KiB: 413. La carga de imágenes queda fuera de este límite y de esta entrega.

| Campo | Contrato seleccionado |
| --- | --- |
| IDs | UUID válido; representación canónica minúscula. Referencia comercial separada, generada por servidor y única; nunca credencial. |
| deliveryMode | pickup o shipping. Sin dirección ni validación geográfica en este checkout; coordinación por WhatsApp. |
| customer.name | String, trim y normalización Unicode NFC; 1–120 caracteres Unicode. Permitir tildes, espacios y apóstrofes. Rechazar controles y saltos de línea. No restringir a letras ASCII. |
| customer.phone | String; eliminar separadores visuales permitidos (espacio, guion y paréntesis), exigir + seguido de 8–15 dígitos, primero distinto de 0. Prefijo +598 editable en UI; no inferir nacionalidad ni verificar titularidad. |
| items | Array no vacío, máximo 50 entradas antes de consolidar; máximo 50 SKU distintos. Unir entradas por skuId antes de validar límites y disponibilidad. Orden canónico por skuId. |
| quantity de venta | Número JSON entero seguro positivo. Suelto: 1–5 kg consolidados por alimento; unidades: máximo técnico 999 por SKU. Rechazar fracciones, notación de valores no finitos y exceso tras consolidar; no recortar cantidades. |
| Inventario | Cadenas decimales canónicas de enteros; 0 o dígitos sin ceros iniciales. Solo delta permite signo negativo; no -0. Máximo técnico absoluto 999999999999 unidades internas por saldo/movimiento; resultado también dentro de rango. Aperturas validan multiplicación sin flotantes. |
| Dinero | String decimal canónico en centésimos UYU. Precio publicado positivo, máximo técnico 999999999; importes derivados/compra máximo 999999999999. Envío acordado no negativo; null significa sin acordar, retiro 0. No aceptar precio ni subtotal del navegador público. |
| expectedVersion | Entero seguro positivo obligatorio para edición/transición según ruta; lo asigna e incrementa el servidor. |
| Texto de catálogo | Nombre/etiqueta 1–160; marca/categoría 1–100; código SKU 1–64 ASCII alfanumérico, guion o guion bajo; slug 1–160 minúsculas ASCII, números y guiones simples internos. Descripción hasta 10000 caracteres, texto plano. |
| Motivos/notas | Motivo requerido 1–500; notas opcionales hasta 2000. Trim/NFC; texto plano, sin HTML ejecutable. |
| Búsqueda/listados | q hasta 100 caracteres, limit entero 1–100 (20 por defecto); cursor hasta 2048 caracteres, validado contra filtros/orden. sort público: name_asc (defecto), price_asc, price_desc; desempate por ID. Precio desde entre SKU activos. |
| Fechas/filtros | Fechas RFC 3339 con zona; dateFrom inclusivo, dateTo exclusivo; from menor que to. status pending/completed/cancelled; channel web/local/whatsapp_manual. Filtros no admitidos: 422. |

Estos máximos técnicos evitan cargas descontroladas; no implican que el comercio tenga esas existencias. En creación web exigir disponibilidad actual por línea consolidada; una pendiente no reserva. Validar de nuevo stock al realizar. Texto se muestra escapado y se codifica al formar el enlace WhatsApp. No aplicar normalización de textos a contraseñas o tokens.

## Cotización y revisión del cliente

POST /cart/quote calcula desde catálogo vigente, devuelve quoteId opaco impredecible, expiresAt (10 minutos desde reloj servidor), líneas canónicas con snapshots de nombres/presentaciones/unidades/precios, subtotal y modalidad. Persistir esa cotización sin contacto. Vincularla a la versión de condiciones de tienda utilizada, incluido el número WhatsApp público; cambios relevantes de destino/modalidad requieren revisión. No promete precio congelado ni reserva existencias.

POST /purchases recibe quoteId, items, deliveryMode y customer, más Idempotency-Key. Para un intento nuevo, validar cotización, catálogo y stock en una transacción consistente con las filas que se copian al snapshot. No cotizar, cerrar transacción y copiar precios sin volver a validarlos. Las actualizaciones administrativas concurrentes deben quedar ordenadas respecto a esta lectura; las ventas pueden agotar stock después de crear la pendiente porque no existe reserva.

Cotización inexistente o vencida: 409 QUOTE_EXPIRED. Líneas/modalidad distintas de la cotización: 409 QUOTE_MISMATCH. Precio cambiado: PRICE_CHANGED; producto/SKU no publicable: CATALOG_CHANGED; condiciones/destino cambiado: STORE_CHANGED; stock insuficiente: STOCK_INSUFFICIENT. En todos estos casos no crear pendiente. El cliente pide nueva cotización, ve diferencias y pulsa de nuevo tras revisarlas; nunca acepta automáticamente cantidades o precios sustituidos. No devolver contactos ni cantidades internas de stock en errores públicos.

El snapshot de la compra procede de la cotización aceptada y comprobada. El mensaje local usa esas mismas líneas y el nombre normalizado; agrega referencia recibida. No permite que una recotización posterior reescriba el mensaje de un intento ya exitoso. El destino WhatsApp se conserva con ese intento; nunca enviar el pedido automáticamente.

## Identidad del intento y persistencia

P-05 agrega X-Operation-Epoch a mutaciones comerciales y de imágenes, ligado al intento y su huella. Verificar época antes de reclamar/ejecutar o responder replay; tras restauración, rechazar épocas anteriores con RECOVERY_REVIEW_REQUIRED aunque el registro del intento se haya perdido. No sustituir automáticamente la época de un intento guardado. Ver [conexión y backups](./conexion-backups.md).

Idempotency-Key: UUID v4 generado con aleatoriedad criptográfica, nuevo solo al iniciar una operación deliberada. No en URL, logs o analítica. En web se genera antes del primer POST y se conserva junto con el payload exacto. Misma compra idéntica con otra clave es otra intención: no deduplicar por teléfono ni contenido entre clientes.

Obligatorio en POST /purchases y en creación manual, edición de pendiente, cancelación, realización, correcciones, devoluciones, recepciones, ajustes y aperturas administrativas. Aplicar también a creaciones de producto/SKU/categoría/marca/configuración de fraccionamiento para evitar duplicados por timeout. Acciones de publicación/archivo y ediciones de catálogo/configuración requieren expectedVersion; un reintento con versión vieja no vuelve a mutar y la UI puede consultar estado autenticada. Cargas de imágenes y autenticación se especifican aparte.

Scope único compuesto de versión API, acción, ID del recurso cuando exista, principal y hash de clave. En creación pública el principal es el ámbito público, no la IP ni el teléfono; en administración es el ID admin estable, no la sesión. Cada petición admin, incluido replay, requiere autenticación y autorización vigentes.

RegistroIntento contiene scope, principalScope, keyHash, payloadHmac, canonicalizationVersion, outcome, httpStatus, errorCode?, resourceId?, resultReceipt?, createdAt, replayUntil y tombstonedAt?. Unique(scope, principalScope, keyHash). HMAC del contenido canónico incluye quoteId, contacto normalizado, líneas consolidadas, modalidad, expectedVersion y demás campos de la acción, sin omitir ninguno que altere el efecto. No persistir cuerpo original en esta tabla. La clave HMAC vive fuera de la base; registrar su versión y conservarla durante la ventana de replay.

Conservar resultado mínimo y huella durante 30 días. Después convertir a marcador de intento vencido: conservar scope/principal/keyHash y fecha, eliminar payloadHmac y resultado. Todo uso posterior de esa clave devuelve 409 IDEMPOTENCY_EXPIRED y jamás ejecuta la operación. Mantener marcadores mientras esta versión de API acepte claves de ese namespace; no eliminarlos mediante el TTL de cotizaciones. La retención de compras/contactos es otra política, aún pendiente; este plazo no autoriza borrar compras ni guardar contactos adicionales.

Cotizaciones vencidas pueden purgarse por tarea oportunista acotada o tarea programada; la fecha se verifica en cada petición y la corrección no depende de un cron en Render. Replay de éxito se resuelve antes de consultar la cotización, por lo que no necesita que siga existiendo.

## Orden de ejecución y concurrencia

1. Comprobar tamaño/formato, autenticación donde corresponda, límites de frecuencia y construir contenido canónico.
2. Buscar/reclamar scope+clave con restricción única. Si existe marcador vencido, rechazar. Si existe registro vigente con huella distinta, 409 IDEMPOTENCY_CONFLICT. Si coincide y hay resultado terminal, devolver ese resultado original sin revalidar precios, cotización, estado o expectedVersion actuales.
3. Solo para intento nuevo, ejecutar validaciones de negocio bajo bloqueos y control de versión. Guardar operación, movimientos/eventos y resultado del intento en la misma transacción. La reclamación pendiente tampoco se confirma por separado: una caída no deja un processing permanente.
4. Dos solicitudes simultáneas con la misma clave se serializan por la unicidad. La segunda lee el resultado tras la confirmación; espera acotada de 5 segundos, luego devuelve 409 IDEMPOTENCY_IN_PROGRESS con Retry-After: 2. No iniciar otro intento por esa respuesta.
5. Fallo antes de commit revierte intento y efectos; fallo después de commit se recupera con replay. Reintentar toda la transacción como máximo dos veces adicionales solo para deadlock/fallo de serialización comprobado. Resultado de commit incierto: resolver misma clave, nunca asumir rollback y generar otra.

Errores terminales de negocio 409/422 posteriores a reclamar un intento se conservan con código estable y sin datos personales. Si mejora stock después, el mismo intento fallido sigue fallido: una acción nueva revisada lleva otra clave. Errores de formato/autenticación/frecuencia, IN_PROGRESS y fallos de infraestructura no se guardan como resultados terminales. En validación terminal no hay efectos parciales; conservar el error requiere confirmar solo el registro de intento, revirtiendo cualquier trabajo de negocio.

Realización bloquea compra y filas de stock en orden estable de SKU; valida versión/estado y todos los saldos antes de confirmar. La creación de pendiente no modifica stock. Aperturas, ajustes y devoluciones comparten orden de bloqueos de stock. Toda edición o transición de compra incrementa versión; devoluciones también, preservando snapshot de la venta. Otra clave sobre una compra ya realizada devuelve INVALID_STATE; no crea un segundo descuento.

Respuesta de creación inicial y replay: 201 con {reference, creationStatus:"pending", createdAt}. Cambia status por creationStatus para que no parezca estado actual. Header Idempotency-Replayed: true en replay. No hay GET público por referencia ni consulta pública de estado. El recibo administrativo idempotente contiene ID, versión y resultado original mínimos; obtener detalle actual mediante GET autenticado.

## Comportamiento del carrito ante fallos

Guardar en sessionStorage el intento y su snapshot antes de enviar, durante un máximo de 24 horas, con limpieza al vencer o al elegir olvidar el intento; no almacenar contacto en analítica ni localStorage permanente. Conserva recarga en la misma pestaña, no garantiza recuperación al cerrar navegador o desde otro dispositivo. La garantía servidor depende de conservar la clave: sin ella no se promete deduplicación. Carrito persistente solo contiene SKU/cantidades, sin contacto.

Mientras una respuesta sea incierta, congelar el snapshot del intento y ofrecer Resolver intento. Un borrador editado no modifica el intento en curso ni dispara otro POST. Resolver con misma clave/body; después de éxito mostrar referencia y Abrir WhatsApp/Copiar pedido. Para crear otra solicitud, acción explícita Nuevo pedido con advertencia de que no edita la anterior. Si se perdió la clave o venció la recuperación, orientar a coordinar con el local antes de repetir, sin prometer que el anterior no existe.

Timeout de cliente 90 segundos; no es prueba de rollback. Reintentos de red/502/503/504 como máximo dos automáticos con espera 2 y 5 segundos más jitter, siempre misma clave/body. Después botón manual. Para 429 respetar Retry-After; no recotizar ni abrir chat automáticamente. Si la respuesta fue exitosa pero falla abrir WhatsApp, copiar/reabrir el mensaje sin otro POST. Si falta el snapshot local, no reconstruir precios históricos desde catálogo actual ni exponer un endpoint público de datos personales.

La recuperación automática entre pestañas no está garantizada: usar la pestaña del intento. Doble clic en ella reutiliza clave y promesa activa. No vaciar carrito por abrir WhatsApp; nunca afirmar que el mensaje fue enviado. Longitud de enlace y fallback copiar se validarán en dispositivos durante implementación.

## Límites de frecuencia iniciales

Valores técnicos iniciales configurables, no cuotas de compra comerciales: catálogo 120 peticiones/minuto/IP, quote 30/minuto/IP; creación pública nueva 5/10 minutos/IP y 100/hora global; replay 30/minuto/IP en contador independiente. Respuesta 429 con Retry-After y texto para esperar, conservando intento. No consumir cuota de creación para replay exitoso. Conocer una IP compartida no identifica a una persona; revisar falsos positivos con uso real.

Contadores compartidos y atómicos en PostgreSQL para sobrevivir reinicios; clave de IP mediante HMAC y expiración máxima de 24 horas, sin IP cruda en tabla de límites. Confiar solo en encabezados de proxy cuya procedencia se configure/verifique en P-05; no aceptar X-Forwarded-For arbitrario. Si no hay base, responder 503 y no crear. No imponer CAPTCHA o servicio adicional sin evidencia de abuso. Los límites de login/reset y la política de contraseñas se cierran en autenticación.

## Archivo del catálogo

Archivo lógico, sin borrar SKU, stock, líneas ni relaciones históricas. Producto archivado y SKU inactivo no aparecen como comprables; cotizaciones nuevas y nuevas líneas los rechazan. Marcar realizada una pendiente existente puede consumir su SKU archivado si conserva identidad/unidad y tiene stock: archivar retira de la oferta, no cancela compromisos. No revalorar silenciosamente pendientes por archivo o cambio de precio. Editar líneas implica recotización explícita del admin.

Archivar marca/categoría usada por productos publicados devuelve 409 CATALOG_IN_USE; primero reasignar o archivar productos. Slugs y códigos históricos no se reutilizan. No habilitar borrado físico por API. Las configuraciones de apertura inactivas no admiten nuevas aperturas, aunque sus operaciones anteriores permanezcan legibles.

## Criterios para comprobar al implementar

| Caso | Resultado exigido |
| --- | --- |
| Doble clic y solicitudes simultáneas misma clave | Una pendiente, misma referencia; o IN_PROGRESS recuperable. |
| Commit exitoso, respuesta perdida, cotización luego vencida | Replay recupera referencia, sin nueva compra ni recotización. |
| Misma clave con contacto/cantidad/quoteId distintos | IDEMPOTENCY_CONFLICT, sin efectos adicionales. |
| Clave con más de 30 días | IDEMPOTENCY_EXPIRED aunque se haya purgado la cotización; no nueva compra. |
| Error de stock y posterior reposición | Mismo intento conserva error; nuevo intento revisado puede operar. |
| Admin ya realizó/editó/canceló la compra | Replay público informa creación original, sin revelar estado actual. |
| Dos compras compiten por última unidad | Solo una realización descuenta; la otra queda pendiente íntegra. |
| Fallo en segunda línea o caída durante transacción | Ningún movimiento parcial ni intento exitoso sin su operación. |
| Suelto repetido 3+3 kg; stock 2800 g y selección 3 kg | Rechazo por límite consolidado o disponibilidad, respectivamente. |
| Contacto con controles, decimal en quantity, total inyectado, body excesivo | Rechazo determinista sin pendiente; datos privados fuera de logs. |
| Recarga después de timeout, bloqueo de popup, 429 | Carrito/intento conservados; reintento/reapertura sin otra clave automática. |
| Archivo de producto con pendiente existente | Sin venta pública nueva; historial preservado y realización existente con stock permitida. |

Son escenarios de aceptación previstos, no pruebas ejecutadas. Se verifican con PostgreSQL real para transacciones/concurrencia y navegador para recuperación. Pendientes fuera de este cierre: imágenes/correo P-04, autenticación detallada, proxy/backups P-05, retención comercial de datos y compensaciones P-03.
