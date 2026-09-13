# Modelo de datos del MVP

## Reglas aprobadas

El usuario aprueba para el MVP el modelo producto/presentación y las reglas siguientes. Esta confirmación reemplaza el estado propuesto de estas mismas reglas en notas anteriores; no aprueba automáticamente otros detalles técnicos.

- Producto reúne nombre, descripción, marca, especie, categoría y fotos.
- Cada presentación o variante vendible tiene SKU, precio y stock propios.
- Un SKU suelto por alimento, con precio por kg y stock común almacenado en gramos enteros. No hay stocks distintos para 1, 2 o 5 kg.
- Máximo de 5 kg por alimento en carrito, consolidando agregados repetidos; distintos alimentos tienen límites independientes. Paso de venta 1 kg.
- Apertura explícita en admin: descontar bolsas cerradas y sumar su contenido al SKU suelto en una operación atómica. El carrito no abre bolsas.
- Pendientes sin reserva ni descuento. Realizar valida stock y descuenta una sola vez; si falta cualquier producto, no se descuenta ninguna línea.

Ejemplo aprobado: 4 bolsas de 20 kg y 2 kg sueltos; abrir una deja 3 bolsas y 22 kg sueltos; realizar venta de 3 kg deja 19 kg sueltos.

## Desarrollo técnico pendiente

Detalle preparado en [entidades.md](./entidades.md) y [contratos-api.md](./contratos-api.md): campos, relaciones, restricciones, operaciones, errores y concurrencia. Es una propuesta técnica para revisión; no hay tablas ni migraciones creadas.

Definir campos, relaciones, restricciones e índices de Producto, SKU, Stock, MovimientoStock, AperturaBolsa, Compra y LíneaCompra. Las entidades de sesión y recuperación seguirán autenticacion.md. Conservar historial y diseñar concurrencia/idempotencia según operacion.md; el mecanismo concreto de claves y versiones sigue siendo propuesta técnica.

Correcciones, devoluciones y ajustes tienen el criterio aprobado siguiente; sus campos y validaciones y la política de archivo requieren definición. No se crean tablas ni migraciones todavía.

## Correcciones y ajustes aprobados para MVP

Ampliación confirmada: [cierre de alcance](./cierre-alcance.md) aprueba correcciones por diferencias de precio, cantidad o SKU, siempre contra el resultado vigente y preservando original. Precio no mueve stock; cantidad/SKU ajustan diferencia atómicamente con stock suficiente. Bloquear corrección de cantidad/SKU si ya existen devoluciones vinculadas. No equivale a reembolso. Contrato detallado pendiente.

- Conservar la compra realizada original y registrar cada corrección vinculada con motivo y fecha.
- En una devolución, el administrador indica qué productos vuelven realmente al stock; no reponer automáticamente toda la compra.
- Pérdidas, roturas y diferencias de conteo se registran como ajustes de inventario con motivo obligatorio.

Esta aprobación define trazabilidad y control explícito del stock. No establece todavía plazos de devolución, reembolsos, medios de cobro ni reglas de aceptación del alimento abierto. Esos aspectos no se infieren del registro administrativo.
