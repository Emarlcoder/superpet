# Estado de desarrollo

## Ajustes administrativos — 2026-09-14

- El producto genera su URL desde el nombre al crearse: minúsculas sin tildes y palabras separadas por guiones. Colisiones resueltas con sufijos numéricos mediante la restricción única de PostgreSQL, incluso con creaciones simultáneas. Editar el nombre sin enviar slug conserva los enlaces existentes. El panel ya no pide identificador de URL; API mantiene slug opcional por compatibilidad.
- Sesión administrativa sin cierre por duración o inactividad, conforme a la solicitud del usuario. Mantiene cierre manual, revocación por cambio de contraseña, cookie segura y CSRF. Presesiones y recuperación sí vencen; ver autenticacion.md.

## Implementación local — 2026-09-10

Desarrollo autorizado por el usuario. El monorepo contiene API NestJS, frontend Next.js y PostgreSQL con Drizzle; cuatro migraciones y herramientas de base local, administrador de desarrollo y mantenimiento. No se ha desplegado ni configurado infraestructura productiva.

## Funcionalidad implementada

| Área | Implementación |
| --- | --- |
| Tienda | Inicio con identidad original, catálogo con filtros y paginación, producto con fotos y presentaciones, carrito persistente, cotización calculada por servidor, retiro/envío a coordinar. |
| WhatsApp | Pendiente persistida antes de abrir el chat, clave de reintento conservada en la pestaña, referencia y texto recuperables, enlace y opción de copiar. El usuario envía el mensaje. |
| Acceso | Un administrador, Argon2id, cookies de sesión, expiración/inactividad, origen exacto, CSRF, límites compartidos en PostgreSQL, cambio de contraseña y cierre de sesión. |
| Recuperación | Token de uso único vinculado a casilla verificada, restablecimiento que revoca sesiones, verificación explícita por POST y adaptador Resend con reintentos acotados. |
| Catálogo | Productos, archivo lógico, publicación, presentaciones/precios en UYU, marcas/categorías, fotos WebP y gestión de imagen principal/descripciones. |
| Inventario | Entradas, ajustes, mínimos, movimientos históricos, unidades para bolsas y gramos para suelto; apertura de bolsas atómica. |
| Compras | Pendientes web/manuales, edición, cancelación, realización con descuento único, historial y notas. |
| Posventa | Corrección por diferencias conservando original, vista previa de impacto, devoluciones con reposición explícita y límites acumulados. |

Suelto: 1–5 kg enteros por SKU consolidado; existencias fraccionarias se redondean hacia abajo para disponibilidad. Pendientes no reservan stock. Cambios comerciales usan transacciones, bloqueos, versiones e idempotencia; un recibo vencido conserva un marcador para evitar recrear la operación con la misma clave.

Las líneas originales y vigentes de las compras se persisten como snapshots JSONB en la compra, con validación central del dominio, en lugar de las tablas de líneas separadas propuestas inicialmente. Las cantidades, stock, movimientos y retornos se verifican transaccionalmente. Los contratos compartidos aún son básicos: existen tipos de dominio propios de API y web.

Las imágenes usan reserva con vencimiento y generación para excluir finalizaciones antiguas, procesamiento fuera de la transacción SQL y registro de objetos para limpieza compensatoria. Originales privados separados de derivados públicos. Modo local probado; adaptador R2 implementado.

## Evidencia

- `pnpm check`: 23 pruebas pasadas, formato/lint, tipos y builds optimizados de API/web.
- Pruebas sobre PostgreSQL real aislado: migraciones, cotización, consolidación de cantidades, idempotencia y concurrencia de realización, falta de stock sin cambios parciales, apertura de bolsas, correcciones, devoluciones y recibos vencidos.
- Pruebas HTTP de autenticación, origen/CSRF, verificación de correo, token de reset de uso único y revocación de sesiones; Resend probado con transporte simulado, sin correo real.
- Prueba de imágenes con PNG decodificado, derivados WebP, reintento, archivo inválido, original no público y protección de última foto publicada.
- Navegador: login real local, alta de producto y dos presentaciones, precio con centavos, foto, publicación, entrada de tres bolsas de 10 kg y apertura de una: quedan dos bolsas y 10000 g.
- Navegador: venta manual pendiente de 3 kg a $540, realización y comprobación final de dos bolsas y 7000 g. Producto exclusivo de QA archivado después de probar; historial conservado como prueba local, sin mercancía real.
- Cliente: catálogo y detalle conectados, selección de 3 kg, carrito y cotización de $540. Vista móvil 390×844 sin desborde horizontal (scrollWidth=clientWidth=375). No se abrió ni envió un chat externo.

## Límites y pendientes

- El número real de WhatsApp, dirección, horarios, catálogo y administrador definitivos aún deben proporcionarse. La coordinación externa completa se comprobará con la configuración real; no se inventaron contactos.
- R2 y Resend requieren configuración y pruebas reales de permisos/entrega. La aceptación de Resend no acredita entrega en bandeja.
- Falta ampliar automatización de navegador y revisar accesibilidad de todos los flujos; las comprobaciones manuales anteriores no son una auditoría integral.
- Los reintentos administrativos conservan claves mientras el panel está abierto; después de recargar una operación de resultado incierto se debe consultar el historial antes de repetirla. El carrito conserva contacto/intento en sessionStorage hasta 24 horas; no garantiza recuperación entre dispositivos ni tras cerrar la pestaña.
- Hay historial comercial y contadores de acceso, pero falta una bitácora dedicada de eventos de seguridad. No se ha ensayado carga, cold start productivo ni restauración.
- Dominios, servicios reales, permisos productivos, mantenimiento periódico, backups y restauración siguen diferidos por el usuario. Indexación desactivada hasta lanzamiento.

## Entorno

Node 24.19.0 probado (objetivo 24.20.0), pnpm 11.19.0, TypeScript 6.0.3. TypeScript 7 compiló pero fue incompatible con la API programática usada por Nest watch. PostgreSQL nativo local en `.local/postgres`; no requiere Docker. En este entorno Windows se reiniciaron los procesos propios de desarrollo al perder su supervisor; la API compilada y Next dev volvieron a arrancar.

Consultar el README de raíz para ejecución; no guardar secretos, datos reales ni credenciales en documentación o Engram.

## Verificaciones adicionales — 2026-09-11

`pnpm test`: 31 pruebas pasadas en tres archivos, usando Nest real y PostgreSQL con base temporal creada y eliminada por la suite. `pnpm lint`: formato y análisis estático correctos. Esta ampliación modifica las pruebas, no la aplicación; los builds integrales anteriores siguen como evidencia histórica.

Ocho escenarios añadidos en `apps/api/test/commerce.test.mjs`:

- Dos compras distintas compiten por la última unidad: una realizada, otra pendiente por falta de stock, saldo cero y un solo movimiento.
- Precio enviado por el cliente y contacto ausente: rechazo sin crear compras.
- Lectura de compras y mutación sin sesión: rechazo; conocer referencia no da acceso público.
- Consulta periódica de sesión no renueva inactividad; vencimiento absoluto e inactividad impiden acceder al panel.
- Suelto permite 1 y 5 kg y rechaza 0, negativos, fracciones y 6 kg.
- Precio cambiado después de cotizar: rechazo sin crear pendiente.
- Dos ediciones de una pendiente con la misma versión: una gana y otra se rechaza; envío desconocido sigue siendo null. Cancelación repetida conserva recibo, no genera movimientos y bloquea realización posterior.
- Sesión válida sin CSRF o con época obsoleta: no permite realizar una compra ni modificar inventario.

Se corrigió el auxiliar HTTP de pruebas para aceptar respuestas HTML de rutas inexistentes, además de JSON. Ninguna de estas verificaciones detectó un defecto de la aplicación. No equivalen a ensayos de navegador, carga, restauración o integración con proveedores reales; esos pendientes anteriores permanecen.
