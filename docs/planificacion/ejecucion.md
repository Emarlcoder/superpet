# Etapas y decisiones

## Etapa actual

Actualización 2026-09-08: usuario prioriza crear skills de desarrollo y posterga los bocetos de escritorio. Cuatro skills preparadas, validadas e instaladas; ver [skills.md](./skills.md). Home, catálogo y producto cliente móvil disponibles en bocetos/README.md. Esto no cierra las decisiones técnicas ni inicia código de aplicación.

Planificación; no escribir código de aplicación todavía. No estimar fechas hasta definir tamaño del catálogo, operación, diseño y equipo.

| Etapa | Entregable | Estado |
| --- | --- | --- |
| Memoria | Protocolo Engram y recuperación de contexto | Operativo; herramientas nativas y recuperación verificadas |
| Negocio | Catálogo, stock y venta coordinada por WhatsApp | Canal confirmado; reglas operativas propuestas |
| Experiencia | Páginas, recorridos y bocetos | Estructura funcional en pantallas.md; carrito y pendientes v1 en bocetos/README.md, pendientes de revisión |
| Dominio | Entidades, estados y contratos | Campos y restricciones en entidades.md; rutas y flujos en contratos-api.md. Propuesta técnica revisable |
| Técnica | Arquitectura, acceso y operación | Borrador |
| Ejecución | Historias priorizadas y aceptación | Base inicial |

## Mapa de páginas

Ver [pantallas y recorridos](./pantallas.md) para contenidos, acciones, estados de error y orden de bocetado. Estructura propuesta basada en los requisitos confirmados; no diseño visual aprobado.

Catálogo inicial confirmado: perros y gatos; alimentos, accesorios, juguetes e higiene. Propuesta: combinar filtros de especie y categoría sin duplicar productos ni stocks.

Públicas: inicio, catálogo/búsqueda, categoría, producto, carrito con retiro/envío y salida a WhatsApp, contacto y políticas.

Administración: acceso, resumen, productos y variantes, categorías/marcas, inventario e historial, compras pendientes y detalle, historial de realizadas/canceladas, configuración del local. Un administrador; sin gestión de usuarios adicionales en el MVP.

No planificar checkout de pago, resultado de pago ni seguimiento público para este MVP.

## Backlog inicial propuesto

El orden detallado vigente está en [backlog.md](./backlog.md): preparación P-01–P-05 y entregas B/C/V/O con dependencias y aceptación. Las historias siguientes se conservan como resumen del alcance; no sustituyen ese orden. Ninguna tarea de implementación está iniciada.

| Prioridad | Historia | Aceptación |
| --- | --- | --- |
| P0 | Administrador accede al panel | Acceso sin permisos rechazado también por API |
| P0 | Administrador carga catálogo desde cero | Borradores no visibles; variantes con SKU, precio e imágenes publicables |
| P0 | Administrador registra stock inicial y reposiciones | Cada cambio tiene motivo, actor e historial |
| P0 | Cliente consulta y arma carrito | Puede seleccionar presentación y cambiar cantidades en móvil |
| P0 | Cliente elige alimento suelto | Selector 1–5 kg, paso 1 kg, precio por kg y total correctos en carrito y WhatsApp |
| P0 | Administrador gestiona stock a granel | Un stock común por alimento; marcar realizada una compra de 3 kg descuenta 3 kg una sola vez |
| P0 | Administrador registra apertura de bolsas | Descontar bolsas disponibles y sumar su contenido al alimento vinculado en una única operación trazable |
| P0 | Cliente coordina por WhatsApp | Mensaje completo, modalidad elegida y subtotal validado; envío pendiente claramente indicado |
| P0 | Administrador marca compra de local o WhatsApp como realizada | Descuento atómico una sola vez; concurrencia no produce stock negativo |
| P0 | Administrador edita o cancela compras pendientes | Edición guarda cambios; cancelación conserva historial; ninguna altera stock |
| P1 | Administrador configura local y contacto | Número, dirección, horarios y entrega actualizables |
| P1 | Administrador identifica faltantes | Productos agotados y stock bajo consultables |

## Verificación prevista

- Precios manipulados en el navegador no alteran el resumen validado.
- Productos archivados, sin stock o con cantidades inválidas se detectan antes de abrir el chat.
- Abrir WhatsApp no crea ventas realizadas ni movimientos; creación de pendientes automática al pulsar Coordinar por WhatsApp.
- El mensaje incluye todas las líneas y funciona en móvil/escritorio; hay alternativa de copia.
- No afirmar que el mensaje fue enviado ni que el pedido está confirmado.
- Reintentos administrativos no duplican descuentos ni reposiciones.
- Ventas y datos del cliente solo accesibles a personal autorizado.
- Restauración de backup verificada antes del lanzamiento.
- Alimento suelto: aceptar 1 y 5 kg; rechazar 0, negativos, fracciones y 6 kg también por API.
- Agregados repetidos del mismo alimento se consolidan y no permiten superar 5 kg; alimentos distintos conservan límites independientes (interpretación propuesta).
- Con 2 kg disponibles no permitir 3 kg; con menos de 1 kg no permitir compra. Si se adopta inventario en gramos, con 2800 g ofrecer como máximo 2 kg.
- Marcar compras como realizadas concurrentemente no sobrevende stock; cancelar pendientes no repone nada.
- Abrir 1 de 4 bolsas de 20 kg con 2 kg sueltos deja 3 bolsas y 22 kg sueltos; no genera una venta.
- Apertura sin bolsas suficientes, sin vínculo válido o sin peso válido no modifica ninguno de los stocks.
- Fallos y reintentos de apertura no dejan movimientos parciales ni duplicados; venta y apertura concurrentes no consumen la misma última bolsa.
- La carga inicial separa bolsas cerradas y kilos ya abiertos; cancelaciones de venta suelta no reconstruyen bolsas cerradas.

## Registro de decisiones

| ID | Tema | Estado |
| --- | --- | --- |
| D-001 | NestJS y Next.js | Confirmado |
| D-002 | Panel integrado sin navegación pública | Confirmado |
| D-003 | Memoria Gentleman-Programming/engram | Operativo y verificado desde la tarea |
| D-004 | Monorepositorio y backend modular | Monorepositorio aprobado; detalle modular propuesto |
| D-005 | PostgreSQL | Confirmado por el usuario; Drizzle ORM elegido |
| D-006 | Sin cuentas de cliente en MVP | Propuesto |
| D-007 | Sin pagos web; coordinación por WhatsApp | Confirmado; reemplaza evaluación de pasarela inicial |
| D-008 | Retiro del local o envío | Confirmado; Ciudad de la Costa, Canelones, Uruguay como zona inicial provisoria; límites pendientes; costo coordinado por WhatsApp |
| D-009 | Catálogo y stock nuevos en admin | Confirmado; sin sistema digital previo |
| D-010 | Facturación integrada fuera del MVP | Propuesto; validar comprobantes con negocio |
| D-011 | Registro de todas las ventas en el panel, local y WhatsApp | Confirmado; descuento al marcar realizada confirmado; interfaz de Venta rápida propuesta |
| D-012 | Ingreso de compras desde web | Confirmado: Coordinar por WhatsApp crea una pendiente; solo marcar realizada descuenta stock |
| D-013 | Alimento suelto de 1 a 5 kg, paso 1 kg | Confirmado |
| D-014 | Máximo por alimento consolidado en carrito; stock común a granel | Aprobado para MVP |
| D-015 | Inventario a granel en gramos enteros, venta en kg enteros | Aprobado para MVP |
| D-016 | Alimento suelto obtenido de bolsas cerradas | Confirmado |
| D-017 | Acción administrativa de apertura con movimientos atómicos vinculados | Apertura y atomicidad aprobadas para MVP; detalle técnico pendiente |
| D-018 | Una sola persona administra el panel | Confirmado; un administrador sin roles de empleados como alcance derivado del MVP |

## Próximas definiciones

Primero: diseñar pantallas y precisar variantes y pesos de las bolsas. Categorías iniciales resueltas: alimentos, accesorios, juguetes e higiene. Moneda inicial confirmada por ahora: UYU. Contacto web resuelto: nombre y teléfono obligatorios antes de crear la pendiente. Cobertura inicial provisoria: Ciudad de la Costa, Canelones, Uruguay; definición final diferida. Registro de todas las ventas, incluidas las presenciales, confirmado. Alimento suelto proveniente de bolsas cerradas, rango de 1–5 kg y paso de 1 kg ya confirmados.

Después: contacto/local, cobertura de envío, cambios y devoluciones. Cantidad de administradores resuelta: una persona.

Finalmente: marca, fotos, diseño de pantallas, volumen del catálogo, hosting, dominio, presupuesto y fecha objetivo.

## Riesgos

Ventas presenciales no registradas desactualizan el stock. Una consulta por WhatsApp no garantiza disponibilidad hasta marcar la compra como realizada. Catálogo sin fotos, precios o SKUs retrasa la publicación. Las condiciones de entrega deben ser claras aunque el costo final se coordine por chat.

Cerrar planificación cuando reglas, pantallas, contratos y decisiones estén definidos; este borrador no inicia la implementación.





## Compras pendientes: aceptación adicional

- Nombre y teléfono obligatorios antes de crear una pendiente web; errores conservan carrito y no crean compras.
- Contacto visible al administrador, inaccesible a terceros mediante la referencia pública.

- Coordinar por WhatsApp guarda una pendiente con las líneas validadas y luego prepara el mensaje con la misma referencia; no descuenta stock.
- Doble clic o reintento del mismo intento crea una sola pendiente; cambio de contenido con la misma clave se rechaza.
- Si no se envía el mensaje, la compra permanece pendiente y no figura como realizada.
- Fallo al guardar conserva carrito para reintento; fallo al abrir WhatsApp permite reabrir la misma referencia sin duplicados.

- Editar o cancelar pendientes no genera movimientos de inventario.
- Falta de stock al marcar realizada mantiene toda la compra pendiente, sin descuentos parciales.
- Repetir la acción realizada no descuenta dos veces.
- Edición simultánea y transición a realizada no permiten descontar una versión desactualizada.
- Compras realizadas y canceladas se conservan en historial (propuesto).
