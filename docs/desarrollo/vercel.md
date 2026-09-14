# Despliegue en Vercel

Solicitud del usuario (2026-09-13): alojar frontend y API en Vercel. Reemplaza la selección previa de Netlify/Render para estas aplicaciones. No autoriza contratar un plan pago ni publicar credenciales locales.

## Dos proyectos desde el mismo repositorio

Repositorio: https://github.com/Emarlcoder/superpet

| Proyecto propuesto | Root Directory | Framework               | Build Command                                                                |
| ------------------ | -------------- | ----------------------- | ---------------------------------------------------------------------------- |
| superpet-web       | apps/web       | Next.js                 | pnpm --filter @superpet/contracts build && pnpm --filter @superpet/web build |
| superpet-api       | apps/api       | Other (framework: null) | pnpm --filter @superpet/contracts build && pnpm --filter @superpet/api build |

Permitir acceso a archivos fuera de Root Directory para el workspace packages/contracts. Instalar desde el lockfile del monorepo con pnpm11.19.0; comprobar la versión efectiva en logs y usar Corepack si el entorno no respeta packageManager. Node24.x. No ejecutar db:migrate ni admin:local como parte del build.

La API usa una función explícita `api/index.mjs` que carga Nest desde `dist`, compilado por TypeScript con metadatos de decoradores. `framework: null` evita que Vercel seleccione también `src/app.ts` como entrada automática. El handler inicia Nest con `app.init()` y reutiliza la instancia; Vercel controla el listener, por lo que su variable interna PORT no se interpreta como puerto TCP. `src/main.ts` mantiene el arranque local con validación de puerto. El recurso `data/common-passwords.sha256` se incluye en la función. Un build exitoso no sustituye la prueba HTTP de arranque y autenticación.

## Datos y variables

- API: DATABASE_URL de PostgreSQL externo, APP_SECRET nuevo de al menos32 caracteres, OPERATION_EPOCH nuevo, WEB_ORIGIN exacto HTTPS de la tienda.
- Imágenes: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET; frontend NEXT_PUBLIC_MEDIA_URL según URL pública de derivados. Verificar nombre en apps/web/lib/api.ts antes de cargar valores.
- Correo: RESEND_API_KEY y MAIL_FROM verificado. No considerar recuperación operativa hasta verificar casilla y entrega.
- Web: las llamadas del navegador usan `/api/v1`. Configurar `API_ORIGIN=https://superpet-api.vercel.app` en el servidor de Next para el rewrite `/api/v1/:path*`; redeployar después de cambiarlo porque las rutas se generan durante el build. `NEXT_PUBLIC_API_URL` ya no se utiliza. En desarrollo, API_ORIGIN toma `http://localhost:3001` por defecto.
- Usar una base vacía propia del despliegue, aplicar migraciones explícitamente y aprovisionar administrador definitivo. No trasladar la cuenta de prueba ni el inventario QA.

## Comunicación y persistencia

Las cookies son host-only, HttpOnly, Secure en producción y SameSite=Lax. La web reenvía las llamadas a la API mediante el rewrite de Next bajo su mismo origen. WEB_ORIGIN del backend debe ser exactamente `https://superpet-web.vercel.app`. Se conservan Origin, cookies y X-CSRF-Token. El navegador obtiene la presesión mediante POST `/api/v1/auth/csrf` para enviar Origin también bajo el mismo dominio; GET sigue disponible para clientes anteriores que envían Origin explícitamente. No se relajan los controles de sesión, CSRF ni CORS.

El almacenamiento local de imágenes es solo desarrollo. Las funciones no reemplazan un disco persistente; configurar R2 antes de aceptar cargas. Con PostgreSQL externo, verificar pooling y conexiones al escalar, sin desactivar validación TLS. Revisar también mantenimiento inicial en cada instancia y programación posterior.

## Estado real

Existen ambos proyectos publicados y Neon conectado con migraciones aplicadas. El administrador remoto fue aprovisionado; su correo de recuperación aún no está verificado y falta configurar Resend. No guardar credenciales en este documento. Pendientes de la salida comercial: almacenamiento de imágenes, correo, backups y plan de alojamiento comercial. No hay compra ni upgrade autorizado.

Incidente 2026-09-14: la web recibía HTML 404 en `/api/v1` por falta de proxy, y la API devolvía FUNCTION_INVOCATION_FAILED por validar el PORT interno de Vercel. También aparecía una entrada automática `src/app.js` sin export predeterminado. Correcciones: proxy mismo origen, entrada única con JavaScript compilado y errores de respuesta inesperada traducidos a un mensaje recuperable para el usuario. Verificar health JSON, presesión, login, recarga, lecturas administrativas y logout en el despliegue nuevo.

## Referencias verificadas

- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/routing/rewrites
- https://vercel.com/docs/plans/hobby
