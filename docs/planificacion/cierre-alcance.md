# Cierre de alcance MVP — aprobado

Conjunto confirmado explícitamente por el usuario: «Si, confirmo». Las reglas comerciales de este documento quedan aprobadas para el MVP. Sin código de aplicación. Infraestructura operativa diferida a después del desarrollo y antes de producción.

## Compra y comprobantes

Confirmado: cliente sin cuenta, con nombre/teléfono obligatorios al coordinar por WhatsApp; sin contraseña, historial público ni seguimiento por referencia. Mantener autenticación exclusiva del administrador.

Confirmado: sin facturación integrada en MVP. El panel registra compras, ventas, correcciones y movimientos; no emite comprobantes fiscales ni sustituye el proceso de comprobantes que use el comercio fuera del sistema. Esto delimita software, no define obligaciones tributarias ni exime de emitir comprobantes.

## Corregir una venta realizada

Confirmado: original inalterado, correcciones con motivo/fecha, devolución con reingreso explícito y ajustes motivados. Aprobado: acción administrativa «Corregir registro», que muestra original, correcciones previas y resultado vigente antes de confirmar.

- Error de precio: registrar importe anterior, correcto y diferencia, sin movimiento de stock. Ejemplo ficticio: una unidad registrada a $500 que correspondía a $450 genera diferencia de -$50. No implica devolución de dinero automática.
- Error de cantidad: registrar cantidad correcta y ajustar únicamente la diferencia del descuento incorrecto. Ejemplo: se registraron 3 kg pero realmente se vendieron 2 kg; la corrección del registro repone 1 kg contable. No es una devolución física: corrige un descuento que nunca debió existir. El administrador confirma que refleja lo ocurrido.
- Cantidad mayor a la registrada: descontar diferencia solo si hay stock; si falta, rechazar íntegramente la corrección y revisar el inventario físico. No permitir negativo ni ajustes ocultos.
- Error de SKU: registrar reducción del SKU equivocado y aumento del correcto como una sola corrección con movimientos atómicos y revisión previa. No convertir alimento abierto en bolsas físicamente cerradas por una corrección automática.
- Si la entrega original fue correcta y luego el cliente devuelve producto, usar «Registrar devolución», con reingreso físico explícito. No registrar ambas vías para el mismo hecho.

Comparar contra el resultado vigente de original + correcciones, nunca contra cantidades originales ignorando correcciones previas. Cada corrección conserva actor, fecha, motivo, antes/después y movimientos vinculados; versión e idempotencia evitan aplicarla dos veces. No alterar el catálogo ni el precio actual del producto por corregir una venta.

Para acotar MVP, bloquear corrección de cantidades/SKU si ya existe devolución vinculada: revisar el caso antes de añadir un contrato que reconcilie retornos y cantidades corregidas. Correcciones de precio mantienen trazabilidad y no recalculan reembolsos. El contrato técnico detallado sigue pendiente; no habilitar una vía genérica para sobrescribir ventas.

En informes distinguir venta original, diferencias por corrección y venta corregida; no contar una corrección como otra venta. Devoluciones se muestran separadas y no se interpreta un registro físico como reembolso. No hay contabilidad de caja o conciliación de pagos implícita.

## Decisiones confirmadas

Contrato técnico desarrollado en [contrato-correcciones.md](./contrato-correcciones.md); política de contraseñas definida en autenticacion.md. Queda revisión global antes de autorizar aplicación.

1. Compra sin cuenta y sin facturación integrada para MVP.
2. Corrección de registros por diferencias, con efecto explícito sobre inventario cuando corresponda y límite ante devoluciones previas.

Próximo paso técnico: ajustar entidades, contrato de corrección/retornos e informes con invariantes y casos concurrentes; después cerrar política de contraseñas y revisión global de planificación antes de autorizar desarrollo.
