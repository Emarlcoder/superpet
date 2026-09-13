# Entidades y campos — propuesta técnica MVP

Complementa [reglas aprobadas](./modelo-datos.md). Nombres de tablas, tipos, restricciones y contratos son propuestas técnicas revisables, no migraciones implementadas. La autorización de documentar no cambia reglas comerciales.

## Convenciones

IDs UUID internos; fechas con zona horaria, persistidas en UTC; presentación en zona del local. Tablas editables incluyen createdAt, updatedAt y version entero creciente. Eventos y movimientos son anexados, no sobrescritos. Relaciones históricas impiden borrado en cascada; proponer archivo lógico de catálogo.

Importes en centésimos UYU enteros (180 pesos = 18000); bigint en base y cadenas de dígitos en JSON para evitar pérdida de precisión. Cantidades de inventario bigint no negativas, serializadas como cadenas; ventas por kg reciben entero 1–5 y se convierten a gramos. No usar un decimal monetario en coma flotante. Límites máximos operativos de precios y unidades se fijarán en validaciones. currency conserva UYU en snapshots históricos.

## Catálogo

| Entidad | Campos específicos | Reglas y relaciones |
| --- | --- | --- |
| Especie | id, code, name, active | Códigos dog/cat iniciales; no habilitar otras especies sin ampliar alcance. |
| Categoría | id, slug, name, active | Cuatro categorías aprobadas; slug único. |
| Marca | id, name, slug, active | Marca nullable en producto para artículos sin marca. |
| Producto | id, slug, name, description, brandId?, categoryId, status | draft/published/archived propuestos; una categoría principal. Relación ProductoEspecie para una o ambas especies. |
| ProductoEspecie | productId, speciesId | Par único; no duplica producto ni stock. |
| ImagenProducto | id, productId, skuId?, storageKey, alt, position, status | Imagen de SKU pertenece al mismo producto; URL pública derivada. No aceptar rutas arbitrarias. Proveedor y límites pendientes. |
| SKU | id, productId, code, label, saleUnit, stockUnit, priceMinor, currency, netWeightGrams?, active, version | code único; unit/unit para bolsas y accesorios, kg/gram para suelto. Precio por unidad de venta. Peso obligatorio para bolsa habilitada como origen. Un SKU suelto por alimento/producto; separar fórmulas distintas en productos distintos. |

Publicar exige nombre, categoría, especie, imagen y al menos un SKU activo con precio válido. Es criterio técnico propuesto, sin productos ficticios en producción. Cambios de unidad o identidad de SKU con historial se bloquean; crear otro SKU. Índices: slug/código únicos, producto por status/categoryId y tablas de vínculo por claves externas.

## Inventario

| Entidad | Campos específicos | Reglas |
| --- | --- | --- |
| Stock | skuId, quantity, minimumAlert?, version | Una fila por SKU/local único. Unidad viene del SKU. Cantidad ≥ 0; saldo inicial es movimiento. |
| OperaciónInventario | id, kind, actorAdminId, reason, purchaseId?, correctionId?, createdAt | initial/receipt/sale/bag_opening/adjustment/return; motivo obligatorio en ajustes/correcciones. |
| MovimientoStock | id, operationId, skuId, delta, unit, balanceAfter, createdAt | Delta distinto de cero; unit inmutable; saldo después ≥ 0. Unique(operationId, skuId) tras consolidar cambios del mismo SKU. |
| ConfiguraciónFraccionamiento | id, sourceSkuId, targetSkuId, gramsPerBag, active, version | Origen bolsa por unidad, destino suelto del mismo alimento; peso positivo; par único. |
| AperturaBolsa | id, operationId, configId, sourceSkuId, targetSkuId, bagCount, gramsPerBagSnapshot, totalGrams | bagCount entero positivo; total = cantidad × peso histórico. Salida y entrada vinculadas a la misma operación. |

Stock y movimientos se actualizan juntos. Operación no es un campo libre que el cliente use para saltarse permisos. Reposición de suelto normal mediante apertura, no recepción de bolsa implícita. Ajuste conserva motivo y delta; para conteo registrar observado y saldo previo, validar versión y calcular diferencia en servidor.

## Compras e historial

Desarrollo vigente en [contrato-correcciones.md](./contrato-correcciones.md): agregar proyección VentaVigente/LíneaVentaVigente con effectiveLineId estable por compra/SKU, quantity cero para retiradas, snapshots y subtotal. CorrecciónRegistro conserva before/after, diferencias y versiones; LíneaDevolución referencia effectiveLineId y snapshot vigente. El acumulado retornado se limita por cantidad corregida, no por original. Las tablas siguientes conservan el esquema original como antecedente; aplicar esta extensión al implementar.

Actualización: [cierre-alcance.md](./cierre-alcance.md) confirma compensaciones por diferencias de precio/cantidad/SKU y bloqueo de cantidad/SKU con devoluciones previas. La representación técnica detallada debe extender las entidades siguientes; la política comercial ya no está pendiente.

| Entidad | Campos específicos | Reglas |
| --- | --- | --- |
| Compra | id, reference, channel, status, customerName?, customerPhone?, deliveryMode, shippingMinor?, subtotalMinor, currency, notes?, version, completedAt?, cancelledAt? | channel web/local/whatsapp_manual propuesto; status pending/completed/cancelled. Contacto obligatorio si web. Envío null = sin acordar, 0 = acordado sin costo; retiro 0. Sin inferir pago o entrega del estado. |
| LíneaCompra | id, purchaseId, skuId, skuCodeSnapshot, nameSnapshot, presentationSnapshot, saleUnit, quantity, inventoryQuantity, unitPriceMinor, lineTotalMinor, currency | Unique(purchaseId, skuId), consolidado. Snapshot al crear, revisado al editar pendiente; congelado al realizar. |
| EventoCompra | id, purchaseId, type, actorAdminId?, createdAt, previousVersion, nextVersion, detail | Creación, edición, cancelación, realización y corrección; no copiar contraseñas/tokens. Acceso admin; minimizar datos personales duplicados. |
| CorrecciónCompra | id, purchaseId, kind, reason, actorAdminId, createdAt, previousCorrectionId? | Compra original realizada permanece intacta. note/return propuestos para MVP; errores de cantidades/importes no se sobrescriben: alcance del documento compensatorio por definir. |
| LíneaDevolución | id, correctionId, purchaseLineId, returnedQuantity, restockQuantity, unit, disposition | 0 ≤ reingreso ≤ devuelto; acumulado devuelto no supera cantidad original, comprobado concurrentemente. Si cero reingreso, no movimiento. Sin convertir suelto en bolsa. |

Una devolución registra el retorno físico, no un reembolso automático. No implementar compensaciones de importes sin definir su efecto comercial. Índices propuestos: Compra(status, createdAt, id), Compra(channel, createdAt), líneas por compra, eventos/correcciones por compra y fecha, movimientos por SKU y fecha.

## Identidad y configuración

| Entidad | Campos específicos | Reglas |
| --- | --- | --- |
| Admin | id, usernameNormalized, passwordHash, recoveryEmail?, emailVerifiedAt?, active, passwordChangedAt | Usuario único; Argon2id; sin registro público. Alta inicial privada aún propuesta. |
| SesiónAdmin | id, adminId, tokenHash, createdAt, lastActivityAt, absoluteExpiresAt, revokedAt? | Token aleatorio solo en cookie; hash único; 12h máximo/30min inactividad. |
| RecuperaciónClave | id, adminId, tokenHash, expiresAt, consumedAt? | 15min, un uso; consumir y cambiar clave/revocar sesiones atómicamente. |
| ConfiguraciónTienda | id, name, whatsappNumber, address?, hours?, deliveryAreaText, deliveryConditions, version | Una configuración; zona provisoria, no geocerca. No contiene credenciales SMTP ni secretos de almacenamiento. |

Email/proveedor aún pendientes. Hashes nunca se serializan a web. Auditoría administrativa separada de logs técnicos, con actor/acción/recurso/fecha sin cuerpos completos de contacto.

## Idempotencia y concurrencia propuestas

Diseño concretado en [validación y reintentos](./validacion-reintentos.md). RegistroIntento: id, scope, principalScope, keyHash, payloadHmac, canonicalizationVersion, hmacKeyVersion, resourceId?, outcome, httpStatus, errorCode?, resultReceipt?, createdAt, replayUntil, tombstonedAt?. Unique(scope, principalScope, keyHash). Clave pública aleatoria de alta entropía por intento, nunca referencia predecible; no en URL ni logs. Respuesta de replay pública solo referencia/creationStatus/createdAt, sin contacto ni detalle de compra. Cliente conserva mensaje original del intento; recuperación entre dispositivos no prevista.

Registro de intento exitoso y operación de negocio se confirman juntos. Mismo intento y payload devuelve mismo recurso; distinto payload da conflicto. Replay 30 días; después conservar marcador sin payload ni resultado, rechazando la clave vencida sin recrearla. No deduplicar carritos iguales de personas distintas. Cotización sin contacto: id opaco, líneas/snapshots canónicos, modalidad, versión de condiciones de tienda, createdAt/expiresAt; vence a los 10 minutos y su purga no impide replay exitoso. Los límites técnicos de campos/importes/cantidades quedan especificados en el documento vinculado.

Al realizar: bloquear compra y stocks implicados en orden estable de SKU, verificar versión y estado, validar todos los saldos y guardar estado/movimientos juntos. Aperturas y ajustes usan los mismos bloqueos. Reintento de una realización exitosa no vuelve a descontar; cancelada no se realiza. Deadlocks/conflictos transitorios admiten reintentos acotados de toda la transacción. WhatsApp y envío de correos quedan fuera de la transacción.

## Validación pendiente de implementación

Extensión P-04: [imágenes y correo](./imagenes-correo.md) define CargaImagen (lease/generación/recibo), derivados y tareas de limpieza, EnvioCorreo y tokens separados por propósito/versión de casilla. Incorporar esos campos al esquema al implementar; sus estados y retenciones sustituyen los pendientes de imágenes/correo anteriores. No guardar cuerpo de correo o token reversible en tablas.

Casos: dos compras sobre última unidad; fallo en segunda línea; edición contra realización; apertura contra venta de última bolsa; doble retorno; cambio de precio entre carrito y creación; token de recuperación usado dos veces. Comprobar estados/saldos e historial contra PostgreSQL real de pruebas, no solo mocks.
