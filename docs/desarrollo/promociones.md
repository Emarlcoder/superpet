# Promociones del home

Implementado y probado en local. Publicación autorizada posteriormente por el usuario; migración `0004_promotions` aplicada en Neon antes del despliegue. Las imágenes de demostración permanecen exclusivamente en local.

- El bloque de bienvenida se reemplaza por un carrusel de imágenes habilitadas, más recientes primero. Sin promociones activas, se muestra directamente el contenido siguiente del home.
- Administración incluye **Promociones**, con carga de una imagen por vez y un panel inferior con todas las imágenes, su estado, habilitar/deshabilitar y eliminar con confirmación.
- Solo se pide la imagen; no hay títulos, precios ni enlaces que completar. JPEG, PNG o WebP estáticos, hasta 4 MiB y 16 megapíxeles. Recomendación: 1200 × 500 px. Se conserva la proporción sin recortar contenido.
- Rotación cada seis segundos, flechas e indicadores. Pausa al interactuar, con foco o puntero; respeta movimiento reducido. Con una sola imagen se ocultan los controles.
- API: GET `/promotions` público; GET/POST `/admin/promotions`; PATCH/DELETE `/admin/promotions/:id`. Escrituras protegidas por sesión, CSRF, época e idempotencia; edición/eliminación controlan versión.
- Tabla `promotions`, migración `0004_promotions.sql`. No modifica catálogo ni inventario. Las imágenes eliminadas quedan elegibles para limpieza física después de siete días, siguiendo el mecanismo existente; las deshabilitadas permanecen referenciadas.

## Desarrollo local

Desde `apps/api`, con compilación vigente y PostgreSQL local iniciado por `scripts/local-db.mjs`:

```sh
node scripts/dev-local.mjs --migrate
node scripts/dev-local.mjs
```

Esta entrada usa exclusivamente `127.0.0.1`, `.local/database.json` y archivos en `.local/media`; no lee `.env` que puede apuntar a Neon. Para el frontend usar `API_ORIGIN=http://localhost:3001` y `NEXT_PUBLIC_MEDIA_URL` vacío. Credenciales locales existentes: `.local/admin-local.txt` (no versionado).

Validación: 25 pruebas PostgreSQL/HTTP pasadas, incluyendo carga válida/inválida, sesión/CSRF, reintentos sin duplicados, visibilidad pública, versión obsoleta, habilitación y eliminación. Ninguna prueba utiliza datos productivos.
