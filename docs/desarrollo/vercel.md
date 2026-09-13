# Despliegue en Vercel — preparación

Solicitud del usuario (2026-09-13): alojar frontend y API en Vercel. Reemplaza la selección previa de Netlify/Render para estas aplicaciones. No autoriza contratar un plan pago ni publicar credenciales locales.

## Dos proyectos desde el mismo repositorio

Repositorio: https://github.com/Emarlcoder/superpet

| Proyecto propuesto | Root Directory | Framework | Build Command |
| --- | --- | --- | --- |
| superpet-web | apps/web | Next.js | pnpm --filter @superpet/contracts build && pnpm --filter @superpet/web build |
| superpet-api | apps/api | NestJS | pnpm --filter @superpet/contracts build && pnpm --filter @superpet/api build |

Permitir acceso a archivos fuera de Root Directory para el workspace packages/contracts. Instalar desde el lockfile del monorepo con pnpm11.19.0; comprobar la versión efectiva en logs y usar Corepack si el entorno no respeta packageManager. Node24.x. No ejecutar db:migrate ni admin:local como parte del build.

Vercel detecta src/main.ts como entrada NestJS; no hace falta reemplazar Nest por otra API. Debe verificarse el build remoto, los módulos nativos argon2/sharp y la inclusión de data/common-passwords.sha256 antes de declarar el backend operativo.

## Datos y variables

- API: DATABASE_URL de PostgreSQL externo, APP_SECRET nuevo de al menos32 caracteres, OPERATION_EPOCH nuevo, WEB_ORIGIN exacto HTTPS de la tienda.
- Imágenes: R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_PRIVATE_BUCKET, R2_PUBLIC_BUCKET; frontend NEXT_PUBLIC_MEDIA_URL según URL pública de derivados. Verificar nombre en apps/web/lib/api.ts antes de cargar valores.
- Correo: RESEND_API_KEY y MAIL_FROM verificado. No considerar recuperación operativa hasta verificar casilla y entrega.
- Web: NEXT_PUBLIC_API_URL debe apuntar a la API publicada o a un proxy del mismo origen, nunca localhost.
- Usar una base vacía propia del despliegue, aplicar migraciones explícitamente y aprovisionar administrador definitivo. No trasladar la cuenta de prueba ni el inventario QA.

## Comunicación y persistencia

Las cookies actuales son host-only, Secure en producción y SameSite=Lax. Dos dominios independientes *.vercel.app no deben asumirse del mismo sitio. Seleccionar subdominios del dominio propio o preparar un proxy del mismo origen antes de probar login; conservar controles de origen/CSRF. No resolverlo relajando cookies sin evaluar la compatibilidad del navegador.

El almacenamiento local de imágenes es solo desarrollo. Las funciones no reemplazan un disco persistente; configurar R2 antes de aceptar cargas. Con PostgreSQL externo, verificar pooling y conexiones al escalar, sin desactivar validación TLS. Revisar también mantenimiento inicial en cada instancia y programación posterior.

## Estado real

Sesión Vercel iniciada mediante GitHub en emarlcoders-projects; plan Hobby confirmado. No se han creado proyectos ni desplegado. Usuario seleccionó y vinculó Neon muddy-dawn-04616671/production; política auth:true aplicada y variables privadas guardadas localmente. Ver neon.md. La API todavía no está conectada a esa base. Pendiente resolver plan comercial y almacenamiento de imágenes. Hobby está limitado a uso personal no comercial; SuperPet no debe considerarse habilitado para uso comercial en ese plan. No hay compra ni upgrade autorizado.

## Referencias verificadas

- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/routing/rewrites
- https://vercel.com/docs/plans/hobby


