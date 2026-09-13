# Conexión segura y recuperación — P-05

Definición técnica del 2026-09-09 por solicitud del usuario. No configura DNS, infraestructura, tareas programadas ni copias reales. Usuario confirmó hasta 24 horas de operaciones para reconstruir manualmente. Se selecciona frecuencia de 12 horas y retención técnica de 30 días; tiempo objetivo y destino externo siguen pendientes de validación.

## Conexión elegida

Frontend en dominio principal de SuperPet (Netlify); API en api del mismo dominio registrable (Render); medios en su propio subdominio (R2). Nombres reales pendientes del dominio que aportará el usuario. Todos HTTPS. Navegador llama directamente a la API, sin rewrite de Netlify para compras, autenticación o archivos. Esta decisión sustituye la propuesta de proxy de mismo origen.

El proxy de Netlify tiene timeout de 26 segundos. El diseño directo evita ese intermediario, aunque no elimina arranque en frío ni fallos de Render. Render admite dominio personalizado y TLS administrado. [Netlify proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/), [Render custom domains](https://render.com/docs/custom-domains).

Frontend y API son orígenes diferentes, pero pertenecen al mismo sitio con HTTPS y dominio registrable común. No probar autenticación productiva usando netlify.app frente a onrender.com como si fueran equivalentes. Desarrollo usa orígenes locales explícitos y base de pruebas; previews nunca reciben credenciales ni CORS de producción. Elegir un único origen web canónico y redirigir sus alias antes de login.

- Cookie API __Host-superpet_session, Secure, HttpOnly, SameSite=Lax, Path=/ y sin Domain. Host-only en API, máximo 12h; backend aplica también inactividad 30min. Borrado usa mismo nombre/path. Fetch admin/login con credentials:include. La cookie no se comparte con frontend/medios.
- CORS permite solo origen web canónico exacto; Access-Control-Allow-Credentials:true; Vary:Origin. Sin comodines, reflejo libre de Origin ni allowlist por sufijo. Métodos y headers explícitos: Content-Type, X-CSRF-Token, Idempotency-Key y X-Operation-Epoch; exponer Retry-After e Idempotency-Replayed. OPTIONS sin sesión ni efectos, validado contra origen/método/headers. [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS), [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).
- CORS no autoriza operaciones. Todas las rutas privadas exigen sesión en NestJS. Mutaciones de navegador rechazan Origin ausente, null o distinto del permitido. Público no usa cookie admin como autorización. No impedir GET público servidor-a-servidor por carecer de Origin.
- GET /auth/csrf emite token aleatorio ligado a una sesión previa anónima de 10min, cookie host-only separada, respuesta no-store; no produce login. Login exige ese token en header y origen válido, y destruye sesión previa al rotar a sesión autenticada. /auth/me devuelve token CSRF de sesión para las mutaciones posteriores; frontend lo mantiene solo en memoria. Logout/cambio/stock/cargas exigen token+sesión+origen. Forgot/reset/verificación de email exigen origen y token previo anónimo; GET de correo no muta.
- /admin de Next renderiza solo estructura pública vacía hasta /auth/me. No hidratar contactos/stock ni datos privados desde SSR: la cookie API no llega al host Next. La protección efectiva es de NestJS; una redirección del frontend es UX. Respuestas privadas/auth y errores con datos sensibles: no-store; sin cache CDN compartido.
- Secretos exclusivamente en backend/runner correspondiente: PostgreSQL, R2, Resend, HMAC. NEXT_PUBLIC solo URLs/configuración pública; nunca claves. SSR de catálogo consulta API pública con timeout acotado y fallback visible, sin credenciales admin.
- Aceptar Host de API configurado; deshabilitar dominio por defecto de Render al verificar dominio propio si configuración lo permite. Generar URLs de reset desde configuración fija, nunca headers suministrados por cliente. No exponer Postgres al navegador; conexión TLS verificada.

Para IP/protocolo, configurar confianza en proxy únicamente tras verificar la cadena real de Render. No usar trust proxy=true sin delimitación ni tomar el primer X-Forwarded-For libremente. Probar spoofing, rutas alternativas y si el edge reemplaza headers; si no se puede obtener IP fiable, aplicar límites globales/cuenta y documentar limitación antes de publicar, sin llamarlos límites por cliente. Cookies Secure se fijan explícitamente en producción.

## Latencia y archivos

Mantener timeout cliente de 90s e idempotencia definida. Arranque en frío no da permiso para cambiar claves. Mostrar conexión en curso, luego resolver intento; no generar pings periódicos para evitar suspensión. Para admin/login una respuesta perdida requiere consultar sesión antes de repetir acciones; nunca repetir automáticamente descuentos después de relogin.

Carga multipart de 4MiB va directamente a Render. Verificar POST y OPTIONS, límites de cuerpo, memoria y tiempo extremo a extremo. Presupuesto de procesamiento 60s se mide con API activa; inicio en frío puede exceder espera del cliente y la recuperación usa lease/estado. Si las mediciones no cumplen, revisar transporte/procesamiento o plan, no afirmar que el dominio propio aumenta capacidad del servidor.

## Objetivos de backup propuestos

Objetivo confirmado por usuario: hasta 24 horas de actividad a reconstruir manualmente. Selección técnica: copia cada 12 horas (03:17 y 15:17 America/Montevideo; traducir a UTC al configurar), alerta al superar 18 horas sin copia íntegra y estado crítico al superar 24 horas. Retener todos los conjuntos completos durante 30 días. Tiempo de recuperación propuesto: 4 horas desde atención del incidente, sujeto a prueba y disponibilidad del responsable. La frecuencia deja margen para reintentar, pero no garantiza el objetivo sin monitoreo y atención.

Ejecutor propuesto: GitHub Actions en repositorio privado controlado por el usuario, independiente de Render, con ejecución manual además de schedule. Confirmar repositorio, permisos, minutos y cuotas al configurar; no se ha autorizado ni creado un workflow activo. GitHub advierte que los schedules pueden demorarse o descartarse bajo carga, por lo que no sostienen por sí solos un RPO contractual. [GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Para sostener el objetivo de 24 horas, antes del lanzamiento elegir ejecución/monitoreo que lo soporte y evaluar recuperación a un punto en el tiempo según el plan Neon vigente; no dar por incluido ese servicio ni comprarlo. Medir duración/costo/transferencia de dumps y medios; no prometer gratuidad de esta frecuencia.

## Contenido y destino

Cada conjunto contiene dump PostgreSQL en formato custom, manifiesto con instante del snapshot/esquema/versión de app/checksums, originales y derivados referenciados por ese snapshot. Objetos inmutables se copian incrementalmente; ningún conjunto se marca completo hasta tener todos sus objetos verificables. Conservar claves originales para restaurar vínculos; no usar listado de R2 tomado en otro instante como sustituto del manifiesto de base.

Exportar snapshot consistente y usarlo tanto para pg_dump como para generar manifiesto de imágenes, manteniendo viva la transacción exportadora hasta acabar ambas lecturas. Suspender limpieza de objetos mediante lease de backup renovable y acotado durante copia; si se pierde lease, abortar/validar conjunto antes de publicarlo. Las cargas siguen escribiendo claves nuevas. Retener medios en destino mientras cualquier backup vigente los referencie: la retención de 7 días de imágenes desvinculadas en origen no alcanza para backups de 30 días.

pg_dump sobre conexión directa Neon, no pooler; usar herramientas de versión compatible con major PostgreSQL seleccionada y restauración con pg_restore. [Neon import/export](https://neon.com/docs/import/migrate-from-neon). No copiar el disco efímero de Render ni depender solo de una rama en la misma base.

Destino principal: bucket R2 privado exclusivo de backups con credenciales separadas; la API de aplicación no tiene acceso. Cifrar conjuntos y manifiestos antes de subir con herramienta mantenida y cifrado autenticado; clave privada de recuperación fuera del repo, Render y bucket, en gestor seguro del responsable con copia de emergencia offline. El runner solo necesita clave pública de cifrado. No subir dumps como artifacts de Actions ni imprimir connection strings, datos o claves.

Separar credenciales de creación/limpieza donde el proveedor lo permita; no presumir permisos write-only si R2 no los ofrece. Revisar retención/locks de bucket antes de configurar cualquier regla que impida borrar; no declarar backups inmutables solo por usar otro bucket. El runner es un acceso privilegiado: jobs de backup solo desde rama confiable, sin PR/forks no confiables, dependencias fijadas y secretos limitados.

Otro bucket de la misma cuenta R2 no cubre pérdida de esa cuenta. Replicar cada conjunto cifrado a almacenamiento fuera de Cloudflare bajo custodia del usuario, con manifiesto y prueba de lectura; destino pendiente de elegir y evaluar costo. El estado de protección completa requiere ambos destinos verificados; hasta configurarlo, la pérdida de cuenta R2 no está cubierta. No considerar P-05 completamente cerrado sin ese destino.

Guardar estado operativo de backups (id, inicio, snapshotAt, fin, bytes, checksum, estado y error sanitizado). Un log de exit0 o un dump vacío no demuestra restaurabilidad: validar formato, manifiesto, objetos y publicar marcador complete al final. Alertas de fallo y de ausencia deben ejecutarse fuera de Render; si el scheduler nunca inicia, su propio correo de fallo no sirve. Seleccionar monitor/canal independiente al desplegar, con destinatario autorizado; no se envían alertas reales desde esta planificación. Panel admin muestra fecha de última copia válida y estado; evita un indicador verde si el dato está vencido.

## Restauración y reintentos antiguos

1. Poner la API en mantenimiento: bloquear nuevas compras y todas las mutaciones, conservando carrito local y mostrando coordinación directa con el local. No simular pedidos guardados. Registrar hora de incidente y último conjunto íntegro disponible.
2. Restaurar en base y buckets aislados. Comprobar descifrado/checksums, esquema, filas, vínculos, saldo no negativo, movimientos y compras. Restaurar con propietarios/permisos controlados, no ejecutar con superusuario por comodidad.
3. Revocar TODAS las sesiones, tokens reset/verificación y envíos pendientes restaurados; no reenviar correos antiguos. Deshabilitar tareas de limpieza hasta verificar medios y leases. Mantener registros de idempotencia incluidos; no volver a ejecutar operaciones externas para reproducir historial.
4. Rotar época de operaciones (UUID generado fuera del backup en configuración de despliegue) antes de habilitar escrituras. /store y /auth/me anuncian operationEpoch; todas las mutaciones comerciales y de imágenes exigen X-Operation-Epoch, incluido en huella del intento. El cliente conserva la época original con cada intento. Una petición con época anterior devuelve 409 RECOVERY_REVIEW_REQUIRED sin ejecutar ni regenerar clave automáticamente. Esto bloquea replays de pedidos/ventas que existían después del backup y se perdieron al restaurar. Crear otro intento exige revisión explícita del usuario/admin. Reinicio habitual no rota época.
5. Conciliar operaciones entre snapshot e incidente con comprobantes/WhatsApp y conteo físico. No asumir que el stock restaurado coincide con el local ni que el mensaje WhatsApp tiene los importes definitivos. Registrar ajustes/correcciones auditados y no duplicar ventas que sí quedaron en backup. La época nueva impide replays automáticos, pero no reconstruye datos perdidos.
6. Aprobar conciliación con responsable, cambiar conexiones, verificar login/recuperación y habilitar escrituras. Conservar conjunto original y acta sin datos personales innecesarios. Medir tiempo real de recuperación y nueva copia válida.

Ensayo obligatorio antes de lanzamiento y mensual propuesto: restauración aislada de copia elegida, medios accesibles, sesión vieja inválida, intento de época vieja rechazado, stock/historial consistente. Un ensayo no cambia producción ni envía correos. Ante rollback de app, comprobar compatibilidad de esquema y evitar revertir migraciones destructivamente.

## Estado de cierre

Reprogramado por el usuario el 2026-09-09: retomar pendientes de configuración, destino de copia externa y pruebas de recuperación después del desarrollo y antes de la puesta en producción. El diseño permanece como referencia de desarrollo; no exigir cierre operativo de P-05 para avanzar con la aplicación cuando se autorice.

Resuelto técnicamente: API en subdominio, cookies/CORS/CSRF, límites de confianza en proxy, recorrido de carga, formato y consistencia de backups, restauración y barrera contra reintentos de datos perdidos. Confirmado: pérdida tolerable de hasta 24 horas. Seleccionado: copias cada 12 horas y retención 30 días. Pendientes: tiempo objetivo medido y destino de segunda copia fuera de cuenta. Pendiente despliegue: dominio, permisos, cuotas, scheduler/monitor, pruebas y medición. Nada está respaldado todavía; no se han creado automatizaciones.
