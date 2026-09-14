# Acceso administrativo

## Actualización confirmada — 2026-09-14

El usuario pidió quitar el límite de la sesión administrativa. Se eliminan los vencimientos de 12 horas y 30 minutos de inactividad descritos históricamente abajo. La sesión autenticada permanece vigente hasta cerrar sesión, cambiar/restablecer contraseña, revocarla o desactivar la cuenta. Las presesiones anónimas y los enlaces de recuperación conservan sus vencimientos. La cookie sigue siendo HttpOnly, Secure y SameSite=Lax; tiene una duración de almacenamiento de 400 días renovada al consultar la sesión, sujeta a que el navegador no la borre. Ese límite del navegador no es un temporizador de cierre del panel.

No requiere migración: las filas autenticadas se distinguen por adminId; expiresAt conserva compatibilidad de esquema y no determina su vigencia. Las nuevas usan fecha centinela 9999-12-31; el mantenimiento solo elimina presesiones vencidas. CSRF y verificación del administrador activo siguen obligatorios.

## Confirmado

Login obligatorio para el panel. PostgreSQL guarda el usuario y el hash de su contraseña. El usuario proporcionará las credenciales más adelante; no se solicitan ahora ni se guardan en documentación o Engram. Un solo administrador. La autorización se verifica en el backend para cada lectura o modificación administrativa.

## Conjunto aprobado por el usuario

Confirmados: Argon2id; sesiones en PostgreSQL con cookie segura; máximo 12 horas y 30 minutos de inactividad con aviso; recuperación por correo con enlace de un solo uso válido 15 minutos; revocación de sesiones al cambiar contraseña y límites de intentos. Los detalles de implementación siguientes desarrollan ese conjunto; el proxy, alta inicial y segundo factor conservan su estado de propuesta.

- Hash Argon2id con salt aleatoria gestionada por la biblioteca. Guardar hash con parámetros; ajustar costo al servidor sin bajar de la referencia OWASP vigente. No almacenar contraseña reversible ni en texto plano.
- Alta inicial propuesta mediante comando privado de aprovisionamiento con entrada oculta, sin contraseña en argumentos, historial, repositorio o logs. Sin registro público. El comando no sobrescribe una cuenta existente de forma implícita.
- Sesiones opacas almacenadas en PostgreSQL, accesibles mediante Drizzle: token aleatorio en cookie HttpOnly, Secure en producción y SameSite=Lax; guardar solo hash del token en base. Rotar identificador al iniciar sesión. Evitar credenciales en localStorage.
- Proponer frontend/API bajo el mismo origen mediante proxy. Validar sesión y vencimiento en backend; proteger mutaciones con token CSRF y validación de origen. Dominios definitivos por resolver.
- Actualización P-05: se elige API en subdominio HTTPS del mismo dominio registrable, sin proxy Netlify para operaciones. Cookie host-only, CORS exacto y CSRF de sesión definidos en [conexión y backups](./conexion-backups.md); sustituye la propuesta de mismo origen anterior.
- Sesión máxima de 12 horas y vencimiento por 30 minutos de inactividad, configurables y aplicados en servidor. Son valores aprobados para SuperPet, no una exigencia de OWASP. Avisar antes de expirar; polling de fondo no debe mantener sesión indefinidamente. No reproducir operaciones de stock automáticamente al volver a iniciar sesión.
- Logout revoca sesión en servidor y borra cookie. Cambio o recuperación de contraseña revoca todas las sesiones y requiere nuevo login.
- Recuperación por correo verificado del administrador: enlace aleatorio de un solo uso, válido por 15 minutos, hash del token en base y consumo atómico. Mensaje uniforme para solicitudes válidas/inexistentes, límites de frecuencia y sin login automático después del cambio. Email y proveedor pendientes; no implementar un flujo ficticio sin entrega de correo.
- Recuperación asistida descartada como flujo principal: el usuario eligió correo. Un eventual procedimiento de emergencia requiere definición aparte.
- Limitar intentos de login por cuenta e IP, con espera progresiva y errores genéricos; evitar bloqueo permanente del único administrador. Auditar eventos sin contraseñas, tokens ni datos sensibles.
- Segundo factor con aplicación autenticadora como mejora propuesta antes de exposición pública; adopción y recuperación del segundo factor pendientes, sin convertirlo en requisito aprobado.

## Política técnica de contraseñas seleccionada

Se aplica por igual al aprovisionamiento, cambio y recuperación. Mínimo 8 y máximo 128 puntos de código Unicode (máximo 512 bytes UTF-8); permitir espacios, frases y pegar desde gestores, sin reglas obligatorias de mayúsculas/números/símbolos ni caducidad periódica. No recortar, truncar, normalizar Unicode ni cambiar mayúsculas; comparar exactamente lo ingresado. Mostrar/ocultar contraseña y confirmación en UI. No imponer el mínimo de creación para verificar una contraseña existente; limitar tamaño de entrada antes del hash.

Rechazar contraseñas comunes o comprometidas mediante lista local versionada de hashes de candidatos conocidos, además del nombre de usuario o marca como contraseña completa. Lista distribuida con despliegue, sin consultar servicios externos con la contraseña y sin registrar candidatos. Seleccionar fuente/licencia y cobertura al implementar; no afirmar que detecta toda filtración. Medidor de fortaleza orientativo, no única defensa. No mantener historial de hashes anteriores en MVP; cambiar ante indicio de compromiso, no por calendario. Esta elección sigue las recomendaciones de longitud, frases y bloqueo de claves comunes de [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

Argon2id con salt aleatoria de al menos 16 bytes y hash de 32 bytes; punto inicial de medición m=19456 KiB, t=2, p=1. Ajustar hacia arriba con benchmark en servidor, sin bajar de ese mínimo; biblioteca guarda parámetros y salt en formato PHC. Limitar concurrencia de hashing (inicialmente 2 por instancia, cola acotada a 4) para evitar agotar memoria. Verificar formatos/parámetros admitidos antes de procesar hashes de base. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) recomienda ese mínimo; el rendimiento real aún no fue medido.

Rehash tras login válido si parámetros quedan antiguos, con actualización condicional sobre hash previo. Antes de crear sesión comprobar bajo bloqueo que cuenta siga activa y passwordChangedAt/versión no hayan cambiado desde verificación, para no abrir sesión con contraseña revocada concurrentemente. Cambio/reset bloquean cuenta y revocan todas las sesiones/tokens atómicamente; el hash costoso se prepara fuera de la transacción y se revalida estado antes de confirmar.

Login: contador compartido por IP (20 intentos/15min) y username normalizado (10 intentos/15min); mismas respuestas para existente/inexistente. Espera por cuenta tras cinco fallos: 30s, 60s, 120s y máximo 300s, sin bloqueo permanente; contar fallos y rechazar durante cooldown sin prolongarlo por cada petición rechazada. Tras ventana limpia restablecer escalado; recuperación conserva contadores separados. 401 credenciales inválidas genérico; 429 con Retry-After cuando corresponda. Usuario inexistente verifica hash ficticio con costo equivalente, sujeto a los mismos límites. No prometer tiempos constantes sin medir. IP solo fiable según P-05.

Los contadores se aplican antes de Argon2; saturación de cola devuelve 503 genérico. currentPassword exige los mismos límites en cambio de clave. Error de política nueva: 422 PASSWORD_POLICY_VIOLATION con requisitos, nunca contraseña devuelta. GET no cambia contraseña. No loguear body/token/cookie ni valor del campo en errores. Los límites específicos de forgot/reset permanecen en imagenes-correo.md.

Casos de aceptación: longitudes14/15/128/129 y Unicode, espacios conservados, pegado, clave bloqueada, login inexistente, límites distribuidos, parámetros rehash, carrera login/reset, doble reset y ninguna sesión antigua válida tras cambio. Son pruebas pendientes de implementación. MFA continúa fuera del conjunto aprobado.

## Configuración pendiente

Recuperación detallada en [imágenes y correo](./imagenes-correo.md): Resend HTTPS, verificación privada de casilla, envío acotado, estados de fallo, límites y consumo del enlace. Ese documento reemplaza las menciones históricas a proveedor y mecanismo de correo pendientes.

Credenciales, email real, librerías/versiones, dominios, fuente de lista de contraseñas y mediciones se completarán al implementar; política técnica definida arriba. Aprovisionamiento y verificación privados seleccionados para la casilla; configuración real todavía no realizada. MFA no forma parte del conjunto aprobado.

## Fuentes

- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
