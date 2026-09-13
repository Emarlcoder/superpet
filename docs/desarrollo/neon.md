# Neon conectado — 2026-09-13

Proyecto: `muddy-dawn-04616671`. Rama: `production` (`br-rapid-morning-acbqd1wv`).

CLI global Neon4.17.3 instalada y autenticada. npm/npx instalados en el prefijo de usuario para resolver su ausencia en el runtime. Si una terminal existente no reconoce neon, abrir una nueva o usar el lanzador bajo AppData/Roaming/npm.

Las siete skills oficiales de Neon se instalaron en `.agents/skills`, con `skills-lock.json`. El MCP quedó configurado en Codex, VSCode y GitHub Copilot CLI con URL limitada a solo lectura y a este proyecto. La instalación global por defecto fue rechazada por revisión automática por su acceso amplio; se ejecutó la alternativa con `--read-only --project-id muddy-dawn-04616671`. La clave subyacente es de alcance proyecto, no de toda la cuenta. Puede requerirse recargar el cliente para descubrir las herramientas nuevas.

`neon link` escribió `.neon` y las variables privadas en `.env.local`, ambos excluidos de Git. No copiar sus valores a documentación ni subirlos al repositorio.

`neon.ts` contiene exactamente la política solicitada: `defineConfig({ auth: true })`. `@neon/config` y `@neon/env` se instalaron como dependencias de desarrollo en la raíz con pnpm para conservar el lockfile del monorepo.

## Resultado verificado

- `neon config plan`: sin cambios; PostgreSQL y Neon Auth ya estaban habilitados.
- `neon deploy`: código de salida0, rama coincide con política; cinco variables sincronizadas en `.env.local`.
- `pnpm lint`: correcto.

No se ejecutaron migraciones comerciales ni se reemplazó la autenticación NestJS. La API local sigue leyendo su `.env` de apps/api; la configuración de Neon en la raíz no redirige por sí sola esa API a la base remota. Este comando despliega la política de servicios Neon, no el frontend Next.js ni la API NestJS en Vercel. Integración y despliegue de esas aplicaciones siguen pendientes.

## API conectada y escritura verificada

La API local ahora usa la conexión agrupada de Neon en apps/api/.env. Se conserva la configuración previa en .local/api-before-neon.env. Las migraciones usan DATABASE_URL_UNPOOLED cuando está disponible; TEST_DATABASE_URL sigue apuntando a la base LOCAL anterior, evitando pruebas comerciales sobre production. TLS se configuró explícitamente como verify-full; no se deshabilitó la validación de certificados. Se generaron secreto y época nuevos para esta base.

La base pública estaba vacía. Se aplicaron las cuatro migraciones Drizzle previamente probadas y la configuración inicial sin productos, compras ni administrador de prueba. Health, store y products respondieron200 con una instancia Nest conectada a Neon. Se verificaron escrituras de recibos de idempotencia y replay con un Commerce sobre la transacción remota; rollback final comprobado sin registros persistentes de prueba. Build API durante migración y pnpm lint correctos.

El MCP sigue limitado a lectura: la revisión automática rechazó ampliarlo porque incluiría modificación/eliminación de recursos del proyecto, no solo escritura de la API. Se pidió autorización específica; pendiente respuesta. Esto no limita las escrituras PostgreSQL de NestJS.

Pendiente: aprovisionar administrador definitivo mediante el flujo privado y correo configurado. La cuenta local de QA no fue copiada. El frontend/API todavía no están desplegados en Vercel.
