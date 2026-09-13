# SuperPet

Tienda Next.js y API NestJS con PostgreSQL/Drizzle, carrito para coordinar por WhatsApp y administración integrada. MVP funcional local en desarrollo; producción todavía no configurada.

## Requisitos

Node 24 LTS (objetivo 24.20.0; probado 24.19.0) y pnpm 11.19.0. PostgreSQL local nativo incluido como herramienta de desarrollo; no necesita Docker. La primera instalación puede descargar binarios nativos.

## Arranque local

```powershell
pnpm install --frozen-lockfile
pnpm db:local
```

Dejar esa terminal abierta. El comando guarda la base en `.local/postgres`, escucha en loopback:55432 y genera `apps/api/.env` si no existe. No reemplaza configuraciones existentes.

En otra terminal, desde la raíz:

```powershell
pnpm db:migrate
pnpm admin:local
pnpm dev
```

`admin:local` se ejecuta una sola vez: crea una cuenta exclusiva de desarrollo y guarda sus datos en `.local/admin-local.txt`. Rechaza reemplazar un administrador existente. No publicar ese archivo, `.local` ni archivos `.env`.

- Tienda: http://localhost:3000
- Panel: http://localhost:3000/admin
- Liveness API: http://localhost:3001/api/v1/health

Usar `localhost` en el navegador para coincidir con el origen permitido. Health indica vida del proceso, no disponibilidad de la base. No se crea mercadería ficticia al migrar; las cuatro categorías iniciales y la zona provisional sí se incluyen. El número de WhatsApp, dirección y horarios se cargan desde Configuración.

Si un supervisor de desarrollo queda interrumpido en Windows, cerrar sus procesos antes de volver a arrancarlo. También se pueden ejecutar por separado `pnpm --filter @superpet/web dev` y, después de compilar, `pnpm --filter @superpet/api start`.

## Verificación

```powershell
pnpm check
```

Ejecuta formato/lint, tipos, pruebas y builds. Mantener PostgreSQL local activo: las pruebas comerciales crean y eliminan una base aislada, aplican las migraciones y necesitan un rol con permiso CREATEDB. Usan `TEST_DATABASE_URL` o la conexión de desarrollo; nunca apuntarlas a producción. Sin conexión configurada, esa suite se omite y el resultado no acredita las invariantes comerciales.

Última comprobación integral: 23 pruebas, lint, tipos y builds de ambas aplicaciones. Ampliación posterior: 31 pruebas pasadas con PostgreSQL real y lint correcto (2026-09-11). Ver alcance y límites en [estado de desarrollo](docs/desarrollo/estado.md).

## Administración e integraciones

El panel permite catálogo, presentaciones, fotos, marcas/categorías, inventario, apertura de bolsas, compras pendientes/manuales, ventas, correcciones, devoluciones, configuración y seguridad. El stock se descuenta al completar la compra. No hay pago online.

Los `.env.example` documentan las opciones. En desarrollo las imágenes se guardan localmente; existen adaptadores para R2 y Resend, todavía sin verificación con cuentas reales. Después de configurar correo, `pnpm --filter @superpet/api admin:provision` permite aprovisionar el administrador mediante una terminal privada con contraseña oculta; `admin:provision --verify-email` inicia la verificación de otra casilla. Requiere código compilado. Estos comandos pueden enviar correo al ejecutarlos.

`pnpm --filter @superpet/api maintenance` limpia datos técnicos vencidos y archivos huérfanos elegibles; no elimina historial comercial. La API ejecuta además una limpieza limitada al arrancar. Operación periódica, proveedores, dominio, backups y ensayo de restauración siguen diferidos a preproducción.

## Estructura

- `apps/api`: dominio transaccional, autenticación, controladores, migraciones y pruebas.
- `apps/web`: tienda y panel Next.js.
- `packages/contracts`: contratos base compartidos.
- `docs/planificacion`: decisiones y criterios de aceptación.
- `docs/desarrollo`: implementación, evidencia y pendientes.
