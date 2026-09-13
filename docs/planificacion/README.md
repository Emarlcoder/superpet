# SuperPet — planificación inicial

Estado: desarrollo autorizado e iniciado el 2026-09-09. Base de aplicaciones en apps/api y apps/web; contratos compartidos en packages/contracts. Consultar README.md de raíz y docs/desarrollo/estado.md para ejecución y evidencia; las propuestas comerciales no aprobadas siguen siendo propuestas.

## Objetivo confirmado

Crear un ecommerce para SuperPet, un pet shop de Uruguay, con backend en NestJS, frontend en Next.js y un panel de administración integrado y sin enlaces públicos.

Referencia confirmada por el usuario: [Gentleman-Programming/engram](https://github.com/Gentleman-Programming/engram). Engram aporta memoria persistente para agentes. La organización de producto, arquitectura y etapas de estos documentos es una convención propia de SuperPet, complementada por su protocolo de memoria.

## Documentos

- [Producto y alcance](./producto.md).
- [Arquitectura y estructura](./arquitectura.md).
- [Etapas, decisiones y criterios de aceptación](./ejecucion.md).
- [Backlog por etapas, dependencias y aceptación](./backlog.md).
- [Flujo de memoria con Engram](./engram.md).
- [Operación de WhatsApp y stock](./operacion.md).
- [Pantallas y recorridos](./pantallas.md).
- [Identidad visual: referencia de Instagram](./identidad-visual.md).
- [Primeros bocetos visuales](./bocetos/README.md).
- [Skills para desarrollo](./skills.md).
- [Herramientas propuestas](./herramientas.md).
- [Matriz de versiones seleccionada y validación](./versiones.md).
- [Modelo de datos: reglas del MVP aprobadas](./modelo-datos.md).
- [Entidades, campos y restricciones propuestas](./entidades.md).
- [Contratos API propuestos](./contratos-api.md).
- [Validaciones, límites y recuperación de intentos](./validacion-reintentos.md).
- [Carga de imágenes y correo de recuperación](./imagenes-correo.md).
- [Conexión segura, backups y restauración](./conexion-backups.md).
- [Cierre de alcance y correcciones aprobado](./cierre-alcance.md).
- [Contrato técnico de correcciones y devoluciones](./contrato-correcciones.md).
- [Infraestructura propuesta](./infraestructura.md).
- [Acceso administrativo y propuestas de recuperación](./autenticacion.md).

## Reglas de trabajo

- Implementar las decisiones vigentes: desarrollo autorizado por el usuario el 2026-09-09. Consultar el estado de desarrollo para evidencia y pendientes.
- Distinguir requisitos confirmados, propuestas y preguntas abiertas.
- Registrar las decisiones y sus motivos antes de implementar sus dependencias.
- No convertir supuestos comerciales en requisitos definitivos.
- No guardar secretos, credenciales ni datos personales en la documentación o memoria del proyecto.

## Confirmado

- Marca: SuperPet.
- Mercado: Uruguay.
- Especies iniciales del catálogo: perros y gatos; ampliación futura por definir.
- Categorías iniciales: alimentos, accesorios, juguetes e higiene.
- Moneda inicial: pesos uruguayos (UYU), confirmada por ahora.
- Backend: NestJS.
- Un solo repositorio con apps/api, apps/web, packages/contracts y docs.
- Base de datos: PostgreSQL con Drizzle ORM y driver pg, alojada inicialmente en Neon Free; versiones de ORM y driver seleccionadas en la matriz. La versión mayor de PostgreSQL se fijará al configurar Neon.
- Infraestructura inicial: Netlify Free, Render Free, Neon Free, Cloudflare R2 dentro de franquicia y Resend Free. Dominio a cargo del usuario; backups pendientes.
- Frontend: Next.js.
- Administración integrada al frontend y oculta de la navegación pública.
- Una sola persona utilizará el panel administrativo en el MVP.
- Acceso con usuario y contraseña; guardar usuario y hash de contraseña en PostgreSQL. Credenciales se proporcionarán más adelante.
- Sin sistema digital previo: catálogo y stock se gestionarán desde el panel.
- Retiro del local o envío.
- Costo de envío coordinado por WhatsApp; sin cotización automática en la web.
- Zona inicial provisoria de envío: Ciudad de la Costa, Canelones, Uruguay; puede cambiar y no constituye una cobertura definitiva.
- Sin pago web: el cliente enviará el carrito por WhatsApp y coordinará con SuperPet.
- Alimento suelto: selección de 1 a 5 kg en pasos de 1 kg entero.
- El stock de alimento suelto se obtiene de bolsas cerradas.
- Todas las ventas se registrarán en el panel, incluidas las presenciales y las coordinadas por WhatsApp.
- Compras pendientes: editar, cancelar o marcar como realizada; descontar stock únicamente al marcar como realizada.
- Pulsar “Coordinar por WhatsApp” crea automáticamente una compra pendiente antes de abrir el chat.
- Solicitar nombre y teléfono del cliente antes de crear la pendiente y abrir WhatsApp.

## Pendiente de confirmar

- Alcance comercial, operaciones actuales e integraciones.
- Experiencia visual e identidad de marca.
- Infraestructura, presupuesto, responsables y fecha objetivo.

Las propuestas de los demás documentos no constituyen decisiones aprobadas.
