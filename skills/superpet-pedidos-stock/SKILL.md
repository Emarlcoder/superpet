---
name: superpet-pedidos-stock
description: Diseñar, implementar o revisar reglas de compras pendientes, ventas, idempotencia, stock y apertura de bolsas de SuperPet. Usar cuando un cambio afecte estados o cantidades comerciales.
---

# Pedidos e inventario de SuperPet

## Contexto y alcance

Aplicar solo al proyecto SuperPet. Resolver la raíz desde el workspace que contiene AGENTS.md y docs/planificacion/README.md; las rutas siguientes son relativas a esa raíz, no a la instalación de la skill. Si no están disponibles, solicitar la ubicación del proyecto antes de asumir sus decisiones.

Leer AGENTS.md y docs/planificacion/README.md; seguir allí el protocolo Engram. La etapa actual es planificación: crear especificaciones y contratos, no código de aplicación hasta que el usuario autorice avanzar. Las instrucciones vigentes del usuario prevalecen. Consultar los documentos citados para distinguir confirmado y propuesto; una skill no aprueba propuestas ni fija versiones, ORM o infraestructura.

## Fuente de dominio

Leer docs/planificacion/operacion.md y arquitectura.md. Aplicar sus reglas vigentes y conservar la distinción siguiente.

Confirmado: coordinar por WhatsApp crea pendiente antes de abrir chat; nombre y teléfono obligatorios en web; solo marcar realizada descuenta stock. Crear, editar o cancelar pendientes no cambia existencias. Todas las ventas se registran, incluidas las presenciales. Suelto se vende de 1 a 5 kg enteros y proviene de bolsas cerradas. Sin pago web.

Diseño propuesto: pendientes sin reserva, clave por intento, control de versión, stock común por alimento, inventario en gramos, máximo consolidado por alimento y operación explícita de apertura. No presentar esos mecanismos como aprobaciones comerciales. Detallar su adopción cuando corresponda sin volver a preguntar decisiones ya resueltas por el usuario.

## Consistencia de la operación

Para cada comando identificar actor, estado previo, entradas, resultado, efecto en stock y comportamiento de reintento. Diseñar cambio de estado y todos sus movimientos como una unidad atómica. Si una línea no tiene stock, no descontar ninguna. Resolver carreras entre edición y realización, dos realizaciones y consumo simultáneo de la última existencia.

Si se adopta la idempotencia propuesta, un reintento del mismo intento devuelve la misma referencia; igual clave con contenido distinto da conflicto. No deduplicar por carrito idéntico entre clientes. Persistir resultado y efecto juntos. Deshabilitar un botón no resuelve reintentos de red o concurrencia.

El mensaje WhatsApp se deriva del pedido guardado. Abrir chat no prueba envío. Si persiste pero falla abrir, recuperar ese intento; no recrearlo. La referencia no habilita acceso público a datos personales.

## Unidades e historial

No descontar bolsas por comprar kilos. Bajo el modelo propuesto, bolsa cerrada y suelto tienen SKU distintos; convertir kg enteros a gramos sin flotantes y consolidar cantidades del mismo alimento. Con 2800 g vendibles permitir hasta 2 kg; el límite comercial 5 kg no limita reposiciones ni ajustes.

Si se adopta apertura administrativa: usar relación explícita origen/destino y peso neto, descontar bolsas y sumar gramos en la misma transacción, conservar los valores aplicados y no producir ingresos. No inferir peso por nombre ni abrir bolsas desde el carrito. Contar stock inicial abierto separado para evitar doble descuento.

Preservar unidad, moneda, precio y descripción histórica. Pendiente cancelada no repone stock. Correcciones de realizadas y devoluciones siguen por definir: no inventar reapertura o reposición automática, ni reconstruir una bolsa físicamente cerrada desde alimento abierto.

## Verificación focalizada

Usar ejemplos de operacion.md como oráculos: 20 kg menos una realizada de 3 kg deja 17 kg una sola vez; cancelación pendiente deja 20 kg. Bajo apertura propuesta, 4 bolsas de 20 kg más 2 kg sueltos pasan a 3 bolsas y 22 kg al abrir una. Comprobar estos efectos y fallos parciales en persistencia real de pruebas cuando se implemente, no solo con mocks.
