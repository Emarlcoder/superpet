---
name: superpet-backend
description: Planificar, implementar o revisar la API NestJS de SuperPet, sus contratos, acceso administrativo y persistencia. Aplicar a trabajo backend de este proyecto.
---

# Backend de SuperPet

## Contexto y alcance

Aplicar solo al proyecto SuperPet. Resolver la raíz desde el workspace que contiene AGENTS.md y docs/planificacion/README.md; las rutas siguientes son relativas a esa raíz, no a la instalación de la skill. Si no están disponibles, solicitar la ubicación del proyecto antes de asumir sus decisiones.

Leer AGENTS.md y docs/planificacion/README.md; seguir allí el protocolo Engram. La etapa actual es planificación: crear especificaciones y contratos, no código de aplicación hasta que el usuario autorice avanzar. Las instrucciones vigentes del usuario prevalecen. Consultar los documentos citados para distinguir confirmado y propuesto; una skill no aprueba propuestas ni fija versiones, ORM o infraestructura.

## Diseño y ejecución

Leer docs/planificacion/arquitectura.md y las secciones pertinentes de docs/planificacion/pantallas.md. Antes de implementar, revisar manifiestos y contratos existentes; si aún no existen, documentar las elecciones necesarias. NestJS, PostgreSQL y Drizzle ORM están confirmados; monorepo, versiones, driver y mecanismo de sesión siguen pendientes. Consultar documentación oficial de la versión elegida para APIs que se incorporen.

Mantener reglas comerciales en servicios de dominio y límites transaccionales explícitos, evitando duplicarlas en controladores y frontend. Definir por operación entradas, salida pública/administrativa, errores, autorización y efectos sobre datos. Precio, moneda, cantidades y disponibilidad se validan en servidor; importes exactos y moneda histórica, sin confiar en totales del navegador.

## Acceso y datos

El admin integrado y sin enlaces públicos requiere autorización en cada endpoint administrativo, incluso lectura de compras y contactos. Una referencia de pedido no es una credencial. Nombre/teléfono del checkout identifican el pedido, no autentican al cliente. Separar las respuestas públicas del catálogo de los datos de ventas.

Un administrador, sin alta pública de administradores ni roles de empleados en el alcance inicial. Resolver alta inicial, recuperación, sesiones y protección CSRF/CORS según los dominios reales y el mecanismo seleccionado, sin elegir JWT o cookies por inercia. Validar archivos de catálogo y limitar operaciones públicas que crean pendientes. No incluir contactos, secretos ni cuerpos completos de pedidos en logs.

Para ventas, inventario o fraccionamiento leer docs/planificacion/operacion.md y aplicar superpet-pedidos-stock cuando esté disponible. Si no lo está, conservar el documento como fuente suficiente. No añadir pagos, webhooks de cobro o transportistas.

## Entrega

En planificación entregar contrato y decisiones abiertas. Durante implementación entregar cambio, validación pertinente y limitaciones reales. Si hay migraciones, verificar que preserven líneas históricas y definir recuperación según la base elegida; no ejecutar una migración productiva por el solo hecho de preparar código.
