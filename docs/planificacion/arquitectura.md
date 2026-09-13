# Arquitectura propuesta

NestJS, Next.js, PostgreSQL, Drizzle ORM y el panel integrado están confirmados. Monorepositorio aprobado con apps/api, apps/web, packages/contracts y docs. Los detalles adicionales siguientes conservan su estado de propuesta; ver [elección y comparativa](./orms.md).

## Estructura objetivo

    apps/
      api/                  Backend NestJS
      web/                  Tienda y administración Next.js
    packages/
      contracts/            Contratos API o cliente generado
      config/               Configuración técnica compartida
    docs/
      planificacion/        Alcance, arquitectura y operación
      decisiones/           Motivos y alternativas
      contratos/            Especificación API
      operaciones/          Despliegue y recuperación

No se crean aplicaciones durante la planificación. Estas carpetas son convenciones de SuperPet, no requisitos de Engram. La memoria del agente es independiente de los datos del comercio; ver [engram.md](./engram.md).

## Responsabilidades y módulos

| Componente | Responsabilidad |
| --- | --- |
| Next.js público | Catálogo, carrito, selector retiro/envío y apertura de WhatsApp |
| Next.js admin | Catálogo, inventario, ventas y configuración |
| NestJS identidad | Autenticación y permisos administrativos |
| NestJS catálogo | Productos, variantes, categorías, marcas, imágenes y precios |
| NestJS inventario | Movimientos, disponibilidad y mínimos |
| NestJS carrito | Validar selección y recalcular resumen antes de abrir WhatsApp |
| NestJS ventas | Compras pendientes, edición, cancelación, transición a realizada e historial; creación automática desde Coordinar por WhatsApp |
| NestJS configuración | WhatsApp, local y condiciones de entrega |
| NestJS auditoría | Registro de acciones administrativas relevantes |
| PostgreSQL confirmado | Persistencia y transacciones; versión y hosting pendientes |
| Almacenamiento de objetos | Imágenes; proveedor pendiente |

No incluir módulos de pasarela de pagos ni webhooks de pago en el MVP. La entrega se coordina manualmente; no se presupone integración con transportistas.

Proponer cobertura y condiciones como datos editables de ConfiguraciónTienda. Valor inicial provisorio: Ciudad de la Costa, Canelones, Uruguay. No fijar esa localidad en código ni incorporar geocercas, mapas o validación automática de direcciones sin una regla comercial definida.

## Modelo conceptual

Consultar [entidades y campos](./entidades.md) y [contratos API](./contratos-api.md) para el desarrollo técnico propuesto. Los nombres, tipos y mecanismos son revisables.

Actualización: producto/presentación, stock común en gramos, límite consolidado por alimento, apertura administrativa atómica y pendientes sin reserva aprobados para el MVP; ver [modelo-datos.md](./modelo-datos.md). Esta aprobación reemplaza su calificación como propuesta en los párrafos históricos siguientes, sin aprobar otros mecanismos técnicos.

Especies iniciales confirmadas: perros y gatos. Proponer especie como dato del catálogo separado de categoría y marca; no asumir otras especies en el MVP. La asociación de productos compatibles con ambas especies se definirá con el catálogo real.

Producto, Variante/SKU, Categoría, Marca, Imagen, MovimientoStock, ConfiguraciónFraccionamiento, AperturaBolsa, Venta, LíneaVenta, EventoVenta, UsuarioAdmin y ConfiguraciónTienda.

Cada variante tiene precio y stock propios. La venta conserva sus líneas históricas, canal local/WhatsApp y modalidad retiro/envío. Las transiciones y efectos en stock están en [operacion.md](./operacion.md).

Para alimento suelto, un SKU representa el alimento a granel y su precio por kg; 1–5 kg son cantidades de ese SKU, no variantes con stocks independientes. Proponer unidad de venta unidad/kg y unidad interna de inventario unidad/gramo. El backend convierte los kg enteros a gramos para descontar existencias y conserva unidad, cantidad y precio por kg en la venta. El límite de 5 kg por alimento en el carrito se aplica sobre líneas consolidadas.

Origen confirmado: bolsas cerradas. Mantener sus SKU separados del alimento suelto. ConfiguraciónFraccionamiento propone vincular origen, destino y contenido neto por bolsa en gramos. AperturaBolsa conserva esos datos y la cantidad de bolsas de cada operación histórica. El módulo de inventario aplica salida de unidades y entrada de gramos juntas, con transacción e idempotencia y validación concurrente frente a ventas y otras aperturas. Las reglas están en operacion.md; no se activa la conversión desde el carrito.

El carrito no es una venta realizada. Se propone persistirlo en el navegador y validar sus datos en el backend antes de preparar el mensaje. Confirmado: pulsar Coordinar por WhatsApp crea una compra pendiente en el backend antes de abrir el chat. Estados comerciales: pendiente, realizada y cancelada. Solo pendiente → realizada descuenta stock, con transacción, idempotencia y control de concurrencia frente a ediciones. Editar o cancelar pendientes no altera stock. Pago y entrega no se infieren del estado realizada.

## Seguridad y consistencia

Confirmado: login administrativo con usuario y hash Argon2id en PostgreSQL; sesiones en base con cookie segura, máximo 12 horas y 30 minutos de inactividad; recuperación por correo con enlace de un solo uso válido 15 minutos; revocar sesiones al cambiar contraseña y limitar intentos. Credenciales y proveedor de correo pendientes. Detalles y propuestas restantes en [autenticacion.md](./autenticacion.md).

La creación pública de pendientes web requiere nombre y teléfono validados en el backend. Guardarlos asociados a la compra con lectura solo administrativa; no son identidad verificada ni credenciales. Definir normalización y límites en el contrato API.

El panel será utilizado por una sola persona. Alcance derivado: un administrador con acceso completo y sin pantallas de alta de empleados o asignación de roles. Mantener autenticación, autorización administrativa en cada operación del backend, recuperación de acceso y auditoría. No crear un sistema de permisos granulares para el MVP.

- Ruta /admin propuesta, sin enlaces públicos y excluida del sitemap.
- Autenticación y autorización obligatorias en el backend; ocultar la ruta no protege datos.
- Denegar operaciones administrativas por defecto y evitar registro público de administradores.
- Definir alta inicial, recuperación, sesiones y MFA para administradores.
- El backend es la autoridad sobre precios, disponibilidad y movimientos.
- Transacciones e idempotencia para marcar compras como realizadas y corregir stock.
- Importes exactos, sin cálculos monetarios con punto flotante.
- Moneda inicial confirmada: UYU. Conservar el código de moneda con los importes históricos de las compras. Usar formato coherente en tienda, admin y WhatsApp; cualquier cambio futuro requiere una decisión explícita y no reinterpreta compras anteriores. Sin conversión cambiaria ni selector multimoneda en el alcance actual.
- Validación de entradas, límites de autenticación y protección de cargas de imágenes.
- Resolver cookies, CSRF y CORS según dominios y sesiones.
- Separar entornos, secretos, backups y restauración verificada.

## Decisiones abiertas

Versiones, driver PostgreSQL, gestor de paquetes, autenticación, contratos API, infraestructura, búsqueda, observabilidad y CI/CD. No agregar colas ni servicios externos sin una necesidad definida.
