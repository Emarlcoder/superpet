# Contratos API MVP — borrador revisable

Base propuesta /api/v1, JSON; contratos públicos y administrativos separados. Referencia de datos: [entidades](./entidades.md). No hay endpoints implementados ni OpenAPI generado todavía.

Actualización: [validación y reintentos](./validacion-reintentos.md) concreta límites, canonicalización, retención, archivo y orden transaccional. Sus definiciones prevalecen sobre propuestas anteriores de esos puntos; no cierra imágenes, autenticación ni compensaciones.

Actualización P-04: [imágenes y correo](./imagenes-correo.md) define multipart autenticado, carga recuperable, orden/eliminación de fotos y envío/consumo de recuperación. Reemplaza las menciones a proveedor, transporte y límites pendientes en esas secciones. Política de contraseñas y compensaciones siguen abiertas.

## Convenciones

P-05: [conexión y backups](./conexion-backups.md) define API directa en subdominio, GET /auth/csrf y CSRF de sesión previa para login/recuperación. /store y /auth/me incluyen operationEpoch; mutaciones comerciales/imágenes requieren X-Operation-Epoch. 409 RECOVERY_REVIEW_REQUIRED bloquea intentos anteriores a una restauración, sin regeneración automática. Dominio real pendiente.

Cookie de sesión admin; autorización backend en todas las rutas /admin. Mutaciones de sesión autenticada requieren protección CSRF y origen válido según autenticacion.md. No incluir admin en sitemap. Respuestas privadas y de autenticación no se cachean.

Listados: limit por defecto 20, máximo 100, cursor opaco; respuesta items/nextCursor. Orden estable por fecha e ID, catálogo por nombre e ID; filtros y orden permitidos enumerados. Cantidades de venta enteras; dinero en centésimos como string. Campos desconocidos rechazados, límites de texto/tamaño y normalización documentados antes de implementación.

Errores: code, message, fieldErrors opcional, requestId; sin stack, SQL o secretos. 400 formato, 401 sesión ausente/vencida, 403 operación prohibida/CSRF, 404 recurso inexistente o no publicable, 409 versión/estado/stock/precio/idempotencia, 422 reglas de campos y 429 frecuencia. Éxito creación 201, lectura/edición/acciones con resultado 200, logout 204.

expectedVersion obligatorio para editar/transicionar recursos mutables. Idempotency-Key requerido en creación de compra, realización, cancelación, apertura, ajustes y devolución; scope por acción y administrador cuando corresponda. Misma clave y payload no repiten efectos. Los errores de negocio no se convierten automáticamente en éxitos al reintentar.

## Catálogo público

| Método/ruta | Entrada | Salida |
| --- | --- | --- |
| GET /store | — | nombre, WhatsApp público, dirección/horarios publicados, zona/condiciones; sin secretos o email privado. |
| GET /catalog/filters | — | especies, categorías y marcas publicadas. |
| GET /products | q?, species?, category?, brand?, sort?, cursor?, limit? | Productos publicados, imagen, precio desde con unidad inequívoca, moneda, disponibilidad. |
| GET /products/:slug | slug | Producto, imágenes, SKU activos, precios/unidades y máximo seleccionable; sin historial o stock interno detallado. |
| POST /cart/quote | items[{skuId, quantity}], deliveryMode | quoteId, expiresAt, líneas recalculadas, subtotalMinor, shippingMinor=null si envío, currency y advertencias. No crea compra ni reserva. |

Propuesta: quote válido 10 minutos. Comparar contra precios/disponibilidad al crear; nunca garantizar existencias durante esa ventana. Con suelto disponible 2800 g, máximo 2 kg. Consolidar líneas y rechazar más de 5 kg del mismo alimento. Costo de envío se coordina; no emitir total final incluyendo envío desconocido.

## Coordinar por WhatsApp

POST /purchases con Idempotency-Key y body {quoteId, items, deliveryMode, customer:{name,phone}}. Proponer nombre 1–120 caracteres y teléfono normalizado internacional de hasta 15 dígitos; prefijo +598 editable. Validación no implica titularidad verificada. Cotización se vincula al contenido canónico de líneas/modalidad y precio; no aceptar totales de cliente.

Antes de guardar, comparar con quote. Si venció o cambió precio/catálogo/disponibilidad: 409 QUOTE_EXPIRED, PRICE_CHANGED o STOCK_INSUFFICIENT con resumen público actualizado; conservar carrito, solicitar revisión y generar nuevo intento si cambió contenido. No crear pendientes sobre una corrección no aceptada.

Éxito: {reference, creationStatus:"pending", createdAt}. creationStatus describe el resultado original, no el estado actual. No devolver contacto, hashes, historial ni URL con datos personales. Cliente conserva el texto preparado desde cotización validada y contacto ingresado; agrega referencia después de la respuesta. Esa cotización exacta es la usada para el snapshot guardado. WhatsApp se abre solo después de éxito. El cliente envía manualmente.

Si guardar falla/timeout, reintentar misma clave/payload. Si guardar tuvo éxito pero abrir falla, reabrir/copiar mensaje del mismo intento sin nuevo POST. Replay público devuelve la referencia original incluso si admin cambió estado, etiquetado como resultado original de creación, nunca como consulta del estado actual. No exponer GET público de compra por referencia; no borrar carrito automáticamente. Mensaje demasiado largo: copiar completo y abrir chat, sin truncar.

## Autenticación

| Método/ruta | Entrada | Salida/efecto |
| --- | --- | --- |
| POST /auth/login | username, password | Cookie rotada; perfil mínimo y expiración absoluta; error genérico y rate limit. |
| GET /auth/me | Cookie | id/username y límites de sesión, nunca hash/token. |
| POST /auth/logout | Cookie + CSRF | Revoca sesión; respuesta 204. |
| POST /auth/password/forgot | username | 202 uniforme; envío a email verificado, nunca email arbitrario del body. |
| POST /auth/password/reset | token, newPassword | Consume token una vez; cambia hash, revoca sesiones; requiere nuevo login. |
| POST /auth/password/change | currentPassword, newPassword; cookie+CSRF | Reautentica, cambia hash y revoca sesiones. |

Cookies Secure/HttpOnly y expiración según autenticacion.md. Política de longitud y revisión de contraseñas, alta inicial, cambio/verificación de email y proveedor quedan por especificar; no inventar valores reales. Ni reset ni login vuelven pública una sesión.

## Administración de catálogo y configuración

| Rutas | Entrada principal | Resultado |
| --- | --- | --- |
| GET/POST /admin/products; GET/PATCH /admin/products/:id | Campos producto; expectedVersion en edición | Borrador o producto actualizado. |
| POST /admin/products/:id/publish o /archive | expectedVersion | Cambio explícito tras validar integridad; archivo conserva historia. |
| POST /admin/products/:id/skus; PATCH /admin/skus/:id | label, code, unidad/peso/precio; expectedVersion | SKU; stock se modifica solo por inventario. |
| GET/POST /admin/categories y /admin/brands; PATCH /admin/categories/:id y /admin/brands/:id | name/slug/active, expectedVersion en edición | Catálogo de referencia; no borrar vínculos históricos. |
| POST /admin/products/:id/images; PATCH/DELETE /admin/products/:id/images/:imageId | Archivo validado o metadatos/orden | Imagen vinculada; tamaños/tipos y transporte definitivo dependen del proveedor. |
| GET/PATCH /admin/store | Datos públicos del local; expectedVersion | Configuración; no acepta secretos del proveedor. |

CRUD no acepta asignación arbitraria de campos. Cambiar precio no reescribe compras históricas. Una pendiente editada obtiene nuevo snapshot de líneas, mostrando los cambios al administrador antes de guardar.

## Compras administrativas

Contrato técnico vigente: [correcciones y devoluciones](./contrato-correcciones.md) define preview/confirmación, desiredLines y proyección vigente; returns usa effectiveLineId en lugar de purchaseLineId. Sus reglas sustituyen las filas históricas inferiores para correcciones/retornos. La política de contraseñas está definida en autenticacion.md.

Actualización comercial: correcciones por diferencias aprobadas en [cierre-alcance.md](./cierre-alcance.md). Sus reglas sustituyen la condición histórica de efecto comercial indefinido; resta detallar el endpoint compensatorio y su relación con devoluciones antes de implementar.

| Ruta | Entrada | Efecto |
| --- | --- | --- |
| GET /admin/purchases | status?, channel?, dateFrom?, dateTo?, cursor?, limit? | Listado privado. |
| GET /admin/purchases/:id | id | Contacto, líneas, historial y versión. |
| POST /admin/purchases | channel local/whatsapp_manual, items, deliveryMode, contacto opcional | Pendiente manual; reutilizar existente para compras originadas en web. |
| PATCH /admin/purchases/:id | expectedVersion, líneas/modalidad/envío acordado/notas | Solo pendiente; recálculo servidor, sin stock. |
| POST /admin/purchases/:id/cancel | expectedVersion, reason | Cancelada, sin movimiento. |
| POST /admin/purchases/:id/complete | expectedVersion | Realizada con descuento atómico; fallo deja pendiente intacta. |
| GET/POST /admin/purchases/:id/corrections | kind, reason, referencia a original | Anota corrección conservando original; no modifica cantidades por ruta genérica. |
| POST /admin/purchases/:id/returns | expectedVersion, reason, lines[{purchaseLineId, returnedQuantity, restockQuantity, disposition}] | Corrección vinculada + movimientos solo por reingreso explícito; control del acumulado devuelto. |

Todas las acciones se validan sobre estado y versión actual. No editar una realizada por PATCH. Proponer una versión agregada que avance también ante devolución para serializar retornos, sin tocar snapshots originales. Compensaciones de cantidades/precios erróneos necesitan contrato adicional cuando se defina su efecto comercial. No hay endpoint de cobro o reembolso.

## Inventario

| Ruta | Entrada | Efecto |
| --- | --- | --- |
| GET /admin/stock; GET /admin/stock/:skuId/movements | lowStock?, cursor?, limit? | Saldos/unidades y trazabilidad. |
| POST /admin/inventory/receipts | lines[{skuId, quantity, expectedVersion}], reason, kind initial/receipt | Ingreso trazable; inicial abierto separado; no abrir bolsas implícitamente. |
| POST /admin/inventory/adjustments | skuId, expectedVersion, mode delta/count, quantity, reason | Delta firmado o conteo físico; calcular efecto en servidor; prohibir negativo final. |
| GET/POST /admin/bulk-configs; PATCH /admin/bulk-configs/:id | sourceSkuId, targetSkuId, gramsPerBag, active; expectedVersion | Relación válida entre bolsa y suelto del mismo alimento. |
| POST /admin/bag-openings | configId, expectedConfigVersion, bagCount | Salida de bolsas y entrada de gramos juntas; snapshots y reintento seguro. |

Recepciones/ajustes usan unidades internas explícitas y enteras; para suelto gramos, no límite de 5 kg administrativo. Apertura valida stock vivo bloqueado; recepción inicial duplicada no se corrige borrando historial. Ajuste de diferencia de conteo conserva observado, previo y motivo.

## Cierre del contrato

Retención/replay de intentos, límites de entradas y archivo de catálogo definidos en validacion-reintentos.md. Antes de codificar sus módulos, completar contratos de imágenes/correo, autenticación y compensaciones de ventas realizadas. Generar después OpenAPI/DTOs desde contratos revisados; packages/contracts contiene representaciones API, nunca entidades Drizzle con secretos.
