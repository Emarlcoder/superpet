---
name: superpet-frontend
description: Planificar, implementar o revisar la tienda Next.js y el panel integrado de SuperPet, incluyendo catálogo, carrito, WhatsApp e interfaces administrativas.
---

# Frontend de SuperPet

## Contexto y alcance

Aplicar solo al proyecto SuperPet. Resolver la raíz desde el workspace que contiene AGENTS.md y docs/planificacion/README.md; las rutas siguientes son relativas a esa raíz, no a la instalación de la skill. Si no están disponibles, solicitar la ubicación del proyecto antes de asumir sus decisiones.

Leer AGENTS.md y docs/planificacion/README.md; seguir allí el protocolo Engram. La etapa actual es planificación: crear especificaciones y contratos, no código de aplicación hasta que el usuario autorice avanzar. Las instrucciones vigentes del usuario prevalecen. Consultar los documentos citados para distinguir confirmado y propuesto; una skill no aprueba propuestas ni fija versiones, ORM o infraestructura.

## Fuentes y composición

Leer docs/planificacion/pantallas.md y, para trabajo visual, identidad-visual.md y bocetos/README.md en la misma carpeta. Los PNG son referencias estáticas con datos ficticios, no activos para montar la interfaz ni catálogo real. Usar docs/planificacion/assets/logo.png directamente; rojo de referencia #C7050E. No generar otra versión del logo para implementar.

Revisar versión y estructura Next.js existentes antes de elegir APIs. Mantener acceso a secretos y datos administrativos en servidor; limitar componentes cliente a lo que requiera interacción. No cachear ni exponer respuestas privadas como páginas públicas. Ajustar estrategias de caché y actualización a la versión elegida, sobre todo después de cambios de precio y stock.

Preparar estructura adaptable a móvil y escritorio aunque los bocetos de escritorio estén postergados. Probar navegación por teclado, foco, etiquetas de formularios, mensajes de error y contraste de los controles que cambien; el color de marca no garantiza contraste por sí solo.

## Recorrido comercial

Mostrar UYU y distinguir precio por kg de precio por unidad. Suelto admite 1–5 kg de a 1 kg; no representarlo como cinco stocks independientes. Consultar operacion.md para límites consolidados y disponibilidad, actualmente propuestas de implementación. El servidor recalcula el pedido y cualquier cambio se presenta para revisión.

Agregar al carrito no crea una compra. Coordinar por WhatsApp requiere nombre, teléfono y retiro/envío; primero guardar pendiente, después abrir chat con datos guardados. Conservar carrito ante errores. Si ya se creó la pendiente y falla abrir el chat, ofrecer reabrir/copiar sin crear otra. No afirmar mensaje enviado, pago recibido ni venta realizada; el usuario envía el mensaje.

Costo de envío desconocido se muestra a coordinar, no cero ni gratis. Zona inicial provisoria y contacto provienen de configuración cuando exista, no de ejemplos de Instagram. No vaciar automáticamente el carrito al abrir WhatsApp. Verificar enlace y comportamiento con documentación vigente y pruebas móvil/escritorio cuando se implemente.

## Panel y estados

No enlazar administración en navegación pública ni sitemap; eso no sustituye autorización backend. Mostrar pendientes con editar, cancelar y marcar realizada; reflejar respuesta del servidor ante stock insuficiente o edición concurrente. No descontar visualmente inventario como definitivo antes de confirmar la operación.

Incluir estados pertinentes al cambio: carga, vacío, sin resultados, agotado, error y recuperación. No inventar precios, stock, marcas, reseñas o datos del local para producción. Datos de demostración deben quedar identificados.

## Entrega

Relacionar pantallas cambiadas con contrato API y estados verificados. No usar un boceto como evidencia de funcionamiento o accesibilidad.
