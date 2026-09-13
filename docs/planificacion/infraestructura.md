# Infraestructura — selección inicial MVP

## Conjunto gratuito aprobado por ahora

Usuario prevé poco tráfico y resolverá el dominio personalmente. Aprobado por ahora: Netlify Free para Next.js, Render Free para NestJS, Neon Free para PostgreSQL, Cloudflare R2 dentro de su franquicia y Resend Free para recuperación vía API HTTPS. Selección inicial del MVP, revisable según uso. No se crearon cuentas ni se desplegaron servicios.

Limitación determinante: Render duerme tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en arrancar. Afecta catálogo dinámico, admin y creación de pendientes antes de WhatsApp; puede superar timeouts del proxy y exige recuperación idempotente. Render desaconseja sus instancias gratuitas para producción. Su PostgreSQL gratuito vence a los 30 días: no usarlo como base persistente del comercio. Neon sería la alternativa de base, sujeta a sus cupos y suspensión de cómputo.

Propuesta de prueba inicial a costo cero dentro de cuotas, no promesa de servicio gratuito permanente ni aprobación del despliegue. Netlify consume cupos también por despliegues y cómputo, no solo visitas. R2 puede cobrar excedentes; confirmar facturación antes de habilitar. Backups independientes siguen pendientes. Si la espera es inaceptable, el primer componente a pagar sería el backend siempre activo, conservando los demás gratuitos donde alcancen.

Fuentes adicionales: [Render Free](https://render.com/docs/free), [Netlify Free comercial](https://www.netlify.com/blog/introducing-netlify-free-plan/), [Netlify precios](https://www.netlify.com/pricing/), [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Neon precios](https://neon.com/pricing).

Propuesta para elección del usuario; ningún servicio contratado ni desplegado. Consulta de precios y documentación oficial el 2026-09-08.

## Alternativa paga anterior — no seleccionada

- Railway para Next.js, NestJS y PostgreSQL en servicios separados. API y base en la misma región/red privada; frontend presenta /api mediante proxy si se adopta mismo origen. Región y latencia hacia Uruguay por medir. PostgreSQL desplegado en Railway no elimina responsabilidad de mantenimiento, actualizaciones y recuperación.
- Evaluar Railway Pro para producción comercial: mínimo publicado USD20/mes con USD20 de consumo incluido; recursos adicionales se cobran aparte. No es presupuesto cerrado para tres servicios. Medir RAM/CPU/volumen y tráfico, incluyendo backups y entornos extra, antes de estimar total.
- Cloudflare R2 para imágenes, con prefijo/almacenamiento privado de originales y publicación de versiones procesadas en dominio de medios. No guardar fotos en disco efímero de la aplicación. R2 cobra almacenamiento y operaciones, sin cobro de salida directa; procesamiento de imágenes no está incluido como transformación automática.
- Resend para recuperación de contraseña, usando dominio remitente verificado. Email del administrador puede ser una casilla existente; Resend envía correo, no sustituye una casilla. Plan según volumen/límites vigentes; no confirmar costo cero antes de configurar.
- Dominio propio a elegir y comprobar disponibilidad; DNS configurable para web, medios y autenticación del correo. No se eligió ni compró dominio.

## Alternativas

Vercel Pro para frontend y Railway para API/base: integración especializada Next.js, pero suma proveedores y facturación. Vercel Hobby es para uso personal no comercial; no proponerlo como hosting gratuito del comercio.

VPS para aplicaciones/base: control del servidor y capacidad contratada, con más responsabilidad de parches, TLS, monitoreo y restauración. No es la primera opción sin un responsable de operaciones.

## Recuperación propuesta

Planificación temporal vigente: usuario difiere los pendientes operativos de conexión/backups para después del desarrollo y antes de producción. Conservar decisiones documentadas; no configurar servicios ni resolver ahora el destino externo.

Actualización vigente: usuario acepta hasta 24 horas de operaciones para reconstruir. Se seleccionan copias cada 12 horas y retención 30 días; [conexión y backups](./conexion-backups.md) sustituye la frecuencia diaria propuesta abajo y define restauración. Destino independiente de Cloudflare, monitor y ejecución real pendientes. API en subdominio propio, sin proxy Netlify para operaciones por su timeout de 26s.

Diseño vigente de medios y correo en [imágenes y correo](./imagenes-correo.md): originales y derivados en buckets separados, dominio de medios y remitente a configurar. No confundir esta definición con proveedores ya aprovisionados.

Backups automáticos de base más copia independiente cifrada en almacenamiento privado, nunca junto a imágenes públicas. Proponer diario con 30 días de retención y prueba de restauración antes de lanzamiento. Eso admite hasta 24h de pérdida de ventas/stock: objetivo de recuperación y frecuencia deben aprobarse; si es insuficiente, evaluar recuperación a un punto en el tiempo. Respaldar también originales y metadatos de imágenes. No asumir alta disponibilidad ni respaldo operativo por contratar hosting.

## Fuentes

- [Railway precios](https://railway.com/pricing) y [PostgreSQL](https://docs.railway.com/databases/postgresql).
- [R2 precios](https://developers.cloudflare.com/r2/pricing/).
- [Resend precios](https://resend.com/pricing) y [dominios verificados](https://resend.com/docs/dashboard/domains/introduction).
- [Vercel planes](https://vercel.com/pricing) y [uso comercial](https://vercel.com/docs/limits/fair-use-guidelines).
