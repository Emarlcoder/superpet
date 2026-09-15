# Imágenes y correo de recuperación — definición MVP

## Actualización confirmada — 2026-09-14

El usuario eligió ImageKit Forever Free durante la fase de pruebas, hasta terminar la ecommerce. Esta decisión reemplaza R2 solo para esta etapa. Se conservan validaciones, originales privados, variantes WebP, orden e idempotencia. Las imágenes se guardan en `/superpet/originals` (privadas) y `/superpet/public`; API NestJS realiza las cargas con clave privada en Vercel. No usar funciones AI ni activar planes pagos. Plan consultado: 3 GB de almacenamiento y 20 GB/mes de transferencia, con corte de nuevas cargas/entrega al alcanzar los límites ([ImageKit](https://imagekit.io/plans)). La migración posterior de archivos y referencias debe planificarse; cambiar una variable no traslada imágenes existentes.

Las secciones siguientes describen el diseño original de R2 y se conservan como referencia para la etapa posterior.

Decisiones técnicas delegadas por el usuario el 2026-09-09. Completa P-04 sobre R2 y Resend ya seleccionados. Solo planificación: sin cuentas, secretos, mensajes reales ni despliegue. Los límites siguientes son propios de SuperPet, no límites publicados de los proveedores.

## Fotos del catálogo

- Hasta 8 imágenes por producto, opcionalmente asociadas a un SKU del mismo producto. Una principal; orden explícito y texto alternativo de 1–160 caracteres. Publicar exige al menos una imagen lista.
- Aceptar JPEG, PNG y WebP estáticos, hasta 4 MiB por archivo; máximo 16 megapíxeles y 6000 píxeles por lado; mínimo 300 por lado. No GIF, SVG, archivos animados, PDF ni importación desde URL. Mostrar motivo y pedir exportar a formato admitido cuando corresponda.
- Una carga a la vez por administrador. Validar extensión permitida, MIME, firma y decodificación completa; no confiar en nombre o Content-Type. Aplicar límites antes y durante lectura/decodificación, rechazar dimensiones excesivas sin expandir toda la imagen. Esta defensa sigue [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- Procesar en backend con biblioteca mantenida: corregir orientación, convertir a sRGB, quitar EXIF/GPS y demás metadatos de derivados. Generar WebP con lado mayor 320, 640 y 1280, sin agrandar ni recortar el envase; transparencia preservada. Calidad inicial 82, revisable tras verificar texto y etiquetas reales. Guardar ancho/alto y bytes reales. Elegir versión de biblioteca y medir memoria/tiempo en B-01/C-02; no afirmar compatibilidad sin esa prueba.
- Conservar original validado en bucket R2 privado; usar otro bucket para derivados públicos. Un prefijo de un bucket público no hace privados los originales. Nombres generados por servidor mediante UUID/revisión, sin nombre original ni datos personales. No guardar archivos permanentes en Render.
- Servir derivados desde subdominio de medios del dominio que aportará el usuario. Cloudflare distingue dominio personalizado y r2.dev de desarrollo; usar dominio personalizado para publicación. [R2 Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).
- URLs de derivados inmutables por revisión; cache público de un día, sin sobrescribir objetos. Reemplazo crea revisión y cambia referencia. Nunca cachear originales/respuestas admin. Derivados de borradores también serán técnicamente públicos si se conoce su URL: el catálogo los omite, pero no subir material confidencial a esta colección.

## Contrato de carga y ciclo de vida

P-05: transporte directo al subdominio API con CORS/CSRF y época de operación; no pasa por proxy Netlify. La limpieza respeta lease de backup y los conjuntos conservan originales/derivados referenciados durante su retención. Ver [conexión y backups](./conexion-backups.md).

POST /admin/products/:id/images: multipart/form-data con exactamente file, alt, expectedVersion y skuId opcional; Idempotency-Key obligatorio, cookie/CSRF/origen válidos. Máximo de solicitud 4 MiB + 64 KiB, campos de texto sujetos a límites JSON equivalentes. Este transporte reemplaza la propuesta pendiente de contratos-api.md. Probar el límite extremo a extremo en el proxy P-05 antes de habilitar; no ocultar un límite menor del hosting con errores genéricos.

Huella del intento: checksum SHA-256 de bytes originales + campos normalizados + producto. Autenticar antes de leer archivo; streaming con límite, checksum y almacenamiento temporal privado acotado. Límite inicial 10 solicitudes/minuto/admin, procesamiento simultáneo máximo uno por instancia; otra carga devuelve 429/Retry-After. Memoria/CPU deben medirse con archivos límite, no solo miniaturas.

Registrar CargaImagen con admin/producto, keyHash, payloadHash, imageId reservado, estado processing/ready/failed, leaseUntil, expectedProductVersion y claves de objetos generadas. Reservar plaza bajo bloqueo de producto, contando cargas activas dentro del máximo 8. Misma clave y contenido devuelve mismo imageId; contenido distinto, conflicto. Lease de 2 minutos, procesamiento acotado a 60 segundos; ante caída, reintento con mismo archivo puede reclamar lease vencido mediante actualización condicional. Usar generación/fencing para impedir que un proceso anterior finalice después del reemplazo. No mantener transacción SQL abierta mientras se transforma o escribe R2.

Guardar original y todos los derivados primero; luego transacción breve verifica generación, versión del producto y pertenencia del SKU, vincula imagen lista, incrementa versión y confirma recibo idempotente. Si cambió el producto, 409 VERSION_CONFLICT sin adjuntar imagen; revisar y crear nuevo intento. R2 y PostgreSQL no forman una transacción única: claves por generación evitan sobrescrituras y permiten recoger objetos huérfanos. El recibo ready usa la retención de 30 días y marcador vencido de validacion-reintentos.md; los leases son un protocolo específico para efectos externos, no la transacción de compras.

201 devuelve {imageId, status:"ready", variants:[{url,width,height}], alt, position, productVersion}. GET /admin/products/:id/images/:imageId devuelve estado y datos autorizados; nunca credenciales R2 ni original público. Si timeout, consultar/reintentar misma clave; no adjuntar una segunda foto automáticamente.

PATCH de metadatos/orden y DELETE requieren expectedVersion del producto. Para reordenar, PATCH /admin/products/:id/images/order con lista completa de IDs sin repetidos y expectedVersion. La primera posición es principal. Bloquear eliminación de la última imagen de producto publicado; primero agregar reemplazo o pasar producto a borrador. Eliminar separa el vínculo, no afecta ventas/stock.

Limpieza persistida con trabajos reintentables: quitar objetos de cargas fallidas/abandonadas tras 24 horas sin lease activo; imágenes desvinculadas tras 7 días. Antes de borrar comprobar ausencia de vínculos y lease vigente. Archivar producto no elimina sus fotos. Ejecutar lotes pequeños al iniciar API y desde mantenimiento administrativo; registrar pendiente/error para poder reintentar si el servidor duerme. Eliminación extraordinaria urgente incluye purga CDN; no prometer revocar copias ya descargadas. Backups de originales y políticas de borrado de copias se resuelven en P-05.

Errores: 413 IMAGE_TOO_LARGE; 415 IMAGE_TYPE_UNSUPPORTED; 422 IMAGE_INVALID/IMAGE_DIMENSIONS_INVALID; 409 IMAGE_LIMIT_REACHED/VERSION_CONFLICT/IDEMPOTENCY_CONFLICT; 503 IMAGE_STORAGE_UNAVAILABLE. No publicar resultados parciales. UI conserva archivo seleccionado mientras la pestaña lo permita y pide seleccionarlo otra vez si se perdió; no prometer que una recarga conserva bytes.

## Remitente y destinatario de recuperación

Resend vía API HTTPS desde NestJS. Remitente fijo de subdominio de correo del dominio del usuario, nombre visible SuperPet; valor real pendiente de configuración. Destinatario exclusivo: correo de recuperación verificado del único admin en base. No aceptar to/from/redirectUrl arbitrarios desde /auth/password/forgot. Resend requiere verificar el dominio remitente mediante sus registros DNS; no reemplaza la casilla receptora. [Dominios Resend](https://resend.com/docs/dashboard/domains/introduction).

Verificar inicialmente la casilla con enlace de propósito verify_recovery_email, creado mediante comando privado de aprovisionamiento y enviado al correo configurado; 30 minutos, un uso, hash en base. Solo POST de confirmación marca emailVerifiedAt; visitar enlace no lo consume. Reenvío y reintentos con las mismas reglas de envío siguientes. No habrá cambio de email desde el panel en este MVP: un cambio requiere procedimiento privado explícito, contraseña actual y nueva verificación; no sustituir el correo anterior hasta verificar el nuevo. Rotación atómica revoca tokens de recuperación anteriores. No requiere pedir ahora credenciales al usuario.

## Recuperación y envío acotado

POST /auth/password/forgot {username}: 202 uniforme, «Si los datos corresponden a una cuenta habilitada, recibirás instrucciones para recuperar el acceso». No muestra destinatario ni garantiza entrega. Limitación inicial: 5 solicitudes/15 minutos/IP; envíos por cuenta máximo 3/15 minutos y 6/hora, mínimo 60 segundos entre ellos. Contadores compartidos en PostgreSQL; límite de cuenta se oculta bajo el mismo 202 incluso para cuenta inexistente. Límite IP devuelve 429 uniforme. Fallo general de base devuelve 503 independientemente de la cuenta.

Generar token aleatorio criptográfico de 32 bytes, base64url; guardar únicamente hash SHA-256, propósito, adminId, createdAt, expiresAt, consumedAt/revokedAt y versión de correo. Recuperación vence 15 minutos desde creación, no desde apertura o supuesta recepción. Hasta tres tokens vigentes por cuenta; una solicitud nueva no invalida por sí sola los anteriores para evitar que alguien inutilice un correo ya recibido. Tras cambio de contraseña, revocar todos los tokens y sesiones en la misma transacción.

Crear token y registro EnvioCorreo antes de llamar al proveedor. El token original y cuerpo del correo solo viven en memoria durante la petición. Enviar con clave Resend estable email/{deliveryId} y payload idéntico en todos sus reintentos; Resend conserva claves de idempotencia durante 24 horas, suficiente para esta ventana corta. [Idempotencia Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

Presupuesto de envío 8 segundos: hasta dos llamadas con timeout acotado, reintentando timeout/red/5xx o 429 solo si Retry-After cabe en el presupuesto. No reintentar errores de configuración/destinatario ni generar otro token para reintentar la misma llamada. Ruta responde en una ventana uniforme de 9 segundos, también para usuario inexistente, sin correo verificado o límite por cuenta, desde que la API está disponible; límite IP se evalúa antes. Procesar llamada dentro del ciclo de la solicitud, sin setTimeout posterior a responder ni dependencia de worker siempre activo. Verificar la uniformidad de tiempos al implementar; un retraso fijo por sí solo no prueba ausencia de filtraciones.

Si la instancia cae, no hay reenvío automático del token perdido. El registro pasa de sending a unknown por reconciliación tras 2 minutos; el correo quizá fue aceptado. Un token válido recibido sigue funcionando. El usuario puede solicitar otro tras el intervalo permitido. No guardar token reversible en outbox ni prometer entrega garantizada; esta simplificación corresponde a un solo admin y hosting provisional. Se puede adoptar cola duradera más adelante si cambia esa necesidad.

EnvioCorreo: id, purpose, adminId, tokenRecordId, recipientVersion, status sending/accepted/failed/unknown, providerMessageId?, attempts, errorCode sanitizado, createdAt/updatedAt. Sin cuerpo, token, URL ni contraseña. accepted significa aceptado por proveedor, nunca entregado/leído. Sin webhooks en MVP; investigar entrega en panel del proveedor con acceso autorizado. Guardar metadatos 30 días y limpiar; tokens consumidos/vencidos tras 24 horas. Vencimiento/consumo siempre comprobados en servidor, independientemente de la limpieza.

## Pantalla y consumo del enlace

Enlace HTTPS a origen configurado fijo y ruta /admin/restablecer-clave, token en fragmento. La página lo toma en memoria y elimina el fragmento con replaceState; no SSR del token, analítica, recursos de terceros ni tracking de clics/aperturas en este correo. Referrer-Policy: no-referrer y Cache-Control: no-store. No construir el origen con Host no validado. Si se recarga y se pierde el token, volver a abrir el correo. Estas medidas concretan la recuperación con tokens aleatorios y de un uso recomendada por [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

GET muestra formulario y nunca consume token, incluidos prefetch o escáner del correo. POST /auth/password/reset {token,newPassword} verifica propósito, vencimiento, cuenta activa, correo vigente y no consumo, bloquea admin/token y aplica hash nuevo, consumo/revocación de tokens y sesiones juntos. Política de contraseña debe ser la misma que alta/cambio y se termina en el cierre de autenticación. Token vencido/usado/inválido: 422 RESET_TOKEN_INVALID sin distinguir causa. Límite 10 intentos/15 minutos/IP. Éxito 200 y requiere login; sin iniciar sesión automáticamente. Si se pierde esa respuesta, el segundo POST no cambia nada: indicar probar login con la nueva contraseña o pedir otro enlace.

Asunto: «Recuperá tu acceso a SuperPet». HTML simple y texto plano: solicitud de recuperación, botón «Crear nueva contraseña», vencimiento de 15 minutos y «Si no solicitaste este cambio, podés ignorar este correo». Sin contraseña actual/nueva, datos de clientes, promociones o archivos adjuntos. Escape de cualquier texto variable. Desactivar tracking para no reescribir el enlace de acceso.

## Verificación al implementar y datos pendientes

- Imágenes: MIME falso, animación, exceso de bytes/píxeles, EXIF GPS, transparencia, texto del envase, carga repetida, caída entre R2 y SQL, conflicto de versión, novena foto y última foto publicada. Comprobar que bucket privado no sea accesible públicamente y que ninguna clave secreta llegue al navegador.
- Correo: cuenta inexistente, correo sin verificar, límites, caída/timeout del proveedor, replay con mismo deliveryId, token expirado, doble consumo concurrente, enlace escaneado por GET y revocación de todas las sesiones. Ninguna falla de envío cambia la contraseña.
- Antes de producción: probar con casilla controlada y autorización de envío, revisar spam, enlace móvil/escritorio y DNS remitente. Pruebas locales usan adaptador falso y tokens de prueba, nunca credenciales reales en snapshots.

No se ejecutaron estas pruebas ni se cargaron archivos o enviaron correos. Faltan valores reales de dominio, casilla, DNS y secretos por canal seguro; capacidad del proxy, procesamiento medido y backups se validan en implementación/P-05. P-04 queda definido funcional y técnicamente; no certifica que los proveedores estén configurados.
