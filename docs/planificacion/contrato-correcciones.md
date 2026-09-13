# Contrato de correcciones y devoluciones

Desarrollo técnico de [reglas comerciales aprobadas](./cierre-alcance.md). Solo planificación; no endpoints ni migraciones implementados. Sustituye las restricciones históricas que limitaban corrections a notas y las devoluciones a cantidades originales sin considerar correcciones.

## Representación vigente

Conservar LíneaCompra original inmutable. Al realizar, crear una proyección VentaVigente por compra con una línea por SKU: effectiveLineId UUID estable, SKU, snapshots de unidad/nombre/código, quantity, inventoryQuantity, unitPriceMinor y lineTotalMinor. SKU incorporado por corrección obtiene su propio ID; uno retirado conserva línea con quantity=0 para trazabilidad, pero no es devolvible. Prohibir duplicados de SKU.

Cada CorrecciónRegistro guarda ID, compra, actor, fecha, motivo, previousVersion/nextVersion, before/after completos de líneas vigentes y diferencia de subtotal firmada. Una línea de corrección referencia effectiveLineId; incluye antes/después de cantidad, precio e inventario. La proyección es una comodidad verificable contra original + correcciones, no otro historial editable. Precio o cantidad corregidos no reescriben LíneaCompra original.

## Previsualizar y confirmar

POST /admin/purchases/:id/corrections/preview recibe {expectedVersion, reason, desiredLines:[{skuId, quantity, unitPriceMinor}]}. Lista completa del resultado deseado, máximo 50 SKU, sin duplicados; omitir un SKU significa retirarlo, mostrado explícitamente en previsualización. Permitir lista vacía para corregir registro totalmente equivocado sin borrar la compra; queda realizada con resultado corregido cero, no cancelada ni devuelta.

unitPriceMinor representa el precio realmente aplicado en esa venta, no el precio actual del catálogo. Requerirlo explícitamente para cada línea; aplicar límites de dinero existentes. Las cantidades presentes son positivas y respetan unidades enteras y máximo 5kg por alimento; cero se expresa omitiendo la línea. Mantener moneda UYU; no corregir canal, envío, pago o cliente a través de este contrato.

La respuesta 200 incluye expectedVersion, before/after, subtotalBeforeMinor/subtotalAfterMinor, differenceMinor firmado, stockDeltas por SKU, advertencias y canApply. La vista siempre muestra retiros, incorporaciones y cambios de unidad; exige confirmar que representan un error de registro, no una apertura física ni devolución. No crea reserva, corrección o token que garantice stock.

POST /admin/purchases/:id/corrections recibe el mismo body con kind:"record_correction", Idempotency-Key y X-Operation-Epoch, sesión/CSRF/origen. Revalida todo en servidor; preview no es autoridad. kind:"note" acepta exclusivamente expectedVersion y reason, sin desiredLines ni efectos sobre cantidades/importes. GET /admin/purchases/:id/corrections lista ambos tipos y devoluciones con discriminador inequívoco.

201 devuelve {correctionId,purchaseId,previousVersion,nextVersion,subtotalAfterMinor,differenceMinor,inventoryOperationId?}. Replay devuelve recibo original según contrato de idempotencia. GET del detalle privado devuelve original, effectiveLines, correcciones, devoluciones y versión actual; respuesta privada no-store. No modificar venta realizada mediante PATCH genérico.

## Transacción e inventario

Reclamar intento, bloquear compra y verificar completed/expectedVersion. Calcular resultado vigente bajo bloqueo; cambio de cantidad o conjunto de SKU se considera corrección de cantidades aunque importe final coincida. Si existe cualquier devolución, rechazar ese cambio con 409 CORRECTION_AFTER_RETURN; sí admitir cambios exclusivos de precio o notas.

Para cada SKU, deltaStock = inventoryQuantityBefore − inventoryQuantityAfter; kg a gramos exactos. Bloquear filas Stock de la unión antes/después en orden de SKU, comprobar todos los saldos finales y límites; solo entonces anexar corrección, actualizar proyección/versión y crear movimientos/recibo en una transacción. Delta cero no crea movimiento. Precio solo no crea OperaciónInventario. Si una línea falla, no aplicar ninguna. Sin corrección sin efecto: 422 NO_CHANGES, salvo nota con motivo válido.

Un SKU histórico archivado puede mantenerse/corregirse porque representa venta pasada; exigir identidad/unidad existente y compatible, nunca inferirlas del texto. Un SKU nuevo en la corrección requiere identidad íntegra y saldo suficiente; archivo comercial no borra trazabilidad de una venta real. No abrir bolsas ni recalcular peso nominal por corregir. El sistema refleja declaración administrativa auditada, no comprueba por sí solo qué se entregó físicamente.

Errores: 409 VERSION_CONFLICT, INVALID_STATE, STOCK_INSUFFICIENT, CORRECTION_AFTER_RETURN; 422 INVALID_LINES/NO_CHANGES/LIMIT_EXCEEDED. No aceptar deltaStock, total, actor, timestamps ni previousVersion calculados por navegador. Los errores terminales/reintentos siguen validacion-reintentos.md.

## Devolución posterior a correcciones

POST /admin/purchases/:id/returns pasa a recibir {expectedVersion,reason,lines:[{effectiveLineId,returnedQuantity,restockQuantity,disposition}]}; reemplaza purchaseLineId porque un SKU correcto puede no existir en el original. Agrupar y validar IDs únicos de esta compra, máximo 50 entradas. Cantidades en unidad de venta, enteras, returnedQuantity>0; 0 ≤ restockQuantity ≤ returnedQuantity. disposition: restock, discard o mixed, coherente con las cantidades; no define aceptación comercial o reembolso.

Por línea: returnedAccumulated + returnedQuantity ≤ effectiveQuantity. Ejemplo: original 3kg corregido a 2kg admite devolver como máximo 2kg acumulados, no 3kg. SKU retirado por corrección admite cero devoluciones. Una devolución parcial fija cantidades/SKU para posteriores correcciones de esa compra; precio sigue corregible y no revaloriza devoluciones previas.

Bloquear compra antes de revisar acumulados y luego Stock ordenado; incrementar versión, anexar devolución y solo restockQuantity en movimientos, todo junto. Dos retornos concurrentes no pueden superar cantidad vigente. Guardar snapshots de unidad, SKU, cantidad vendida vigente y precio vigente al devolver para auditoría, sin inferir importe reembolsado. Las devoluciones ya registradas tampoco se editan o borran por API.

## Informes y aceptación

Subtotal corregido = suma de líneas vigentes = subtotal original + diferencias de correcciones. Mostrar ambos y desglose; una corrección no aumenta contador de ventas. No restar devolución física de ingresos como si fuera dinero reembolsado. Informes usan instantánea consistente de proyección y eventos.

Comprobar al implementar con PostgreSQL real: 3→2kg repone1kg; siguiente 2→1 repone1kg, no2; precio500→450 no mueve stock; SKU A→B con B insuficiente no repone A; fallo tras primer movimiento revierte todo; reintento mismo recibo; carrera corrección/devolución serializada; retorno máximo calculado sobre vigente; cambio precio tras retorno preserva snapshot de devolución; lista vacía preserva original y repone solo descuento erróneo una vez. Estas pruebas están previstas, no ejecutadas.
