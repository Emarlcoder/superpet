# Backlog de implementación del MVP

Estado: desarrollo autorizado el 2026-09-09. Base, persistencia, acceso, catálogo, inventario, tienda y compras implementados localmente; ver [estado de desarrollo](../desarrollo/estado.md) para evidencia, límites y pendientes. Los criterios de proveedores y preproducción no se consideran verificados por las pruebas locales. No autoriza contratar ni desplegar; infraestructura operativa diferida a preproducción. Sin fechas estimadas.

Fuentes: [entidades](./entidades.md), [API](./contratos-api.md), [operación](./operacion.md), [autenticación](./autenticacion.md), [herramientas](./herramientas.md) e [infraestructura](./infraestructura.md). Ante diferencias prevalecen decisiones vigentes del usuario, no los estados históricos de las skills.

## Antecedentes de planificación (estado histórico)

Cierre técnico adicional: [contrato-correcciones.md](./contrato-correcciones.md) detalla P-03, proyección vigente, compensaciones y retornos; autenticacion.md fija política de contraseñas y límites de login. Restan revisión global documental y validaciones de implementación (no realizadas). No se autoriza código por cerrar estos contratos.

P-03: usuario confirmó compra sin cuenta, exclusión de facturación integrada y corrección por diferencias en [cierre-alcance.md](./cierre-alcance.md). Reglas comerciales aprobadas; falta desarrollar contrato compensatorio, entidades e invariantes de retornos sobre cantidades corregidas. Las menciones históricas de esta tabla a alcance no confirmado quedan superadas.

Reprogramación del usuario (2026-09-09): los pendientes operativos de P-05 se retoman después del desarrollo y antes de la puesta en producción (O-03/O-04/O-05). No bloquean empezar desarrollo cuando se autorice. Se conserva el diseño de conexión/seguridad para construir la aplicación; elección del destino externo, configuración de infraestructura/backups y ensayos reales quedan para preproducción. Esta decisión no autoriza iniciar código por sí sola.

Avance P-05: [conexión y backups](./conexion-backups.md) define API directa en subdominio, cookies/CORS/CSRF y restauración con época de operaciones. Usuario confirmó pérdida tolerable 24h; copias cada 12h/retención30d seleccionadas. Destino externo independiente, scheduler/monitor, permisos y ensayos pendientes; no backups reales.

Avance P-04: [imágenes y correo](./imagenes-correo.md) define formatos/límites, dos buckets R2, transporte multipart, procesamiento y recuperación; Resend, verificación de casilla, enlace y estados de error. Configuración de proveedores, pruebas reales y compatibilidad con proxy pendientes de implementación. No hay correos enviados ni archivos cargados.

Avance P-01: selección principal y resolución de dependencias completadas en [versiones.md](./versiones.md). Definidos ESM/NodeNext para API y Vitest/Playwright. Build real permanece en B-01; linter/formateador y paquetes por módulo se completarán con el scaffolding.

Avance P-02: [validación y reintentos](./validacion-reintentos.md) cierra límites de entradas, cotización de 10 minutos, replay de 30 días con marcadores vencidos, concurrencia, recuperación del carrito y archivo lógico. Contratos/entidades sincronizados. Pendiente revisión final del esquema e índices con DTOs/migraciones al implementar; no hay pruebas ejecutadas. Retención comercial de datos y compensaciones no se deducen del TTL técnico.

| ID | Definición a cerrar | Resultado revisable |
| --- | --- | --- |
| P-01 | Matriz de versiones exactas | Node 24 LTS más versiones estables compatibles de Nest/Next/React/Drizzle/Kit/pg/pnpm/TypeScript/Tailwind; estrategia de módulos, runner backend y navegador. Verificar documentación y registrar resolución; build real al ejecutar B-01. |
| P-02 | Contratos y persistencia | Revisar UUID, centésimos/string, índices, snapshots, estados y contratos; límites de campos/cantidades, archivo de catálogo, retención/replay de intentos y errores. Sin pedir de nuevo reglas de stock aprobadas. |
| P-03 | Límites del alcance | Resolver compra sin cuenta y facturación integrada, que aún figuran propuestas; distinguir registro de venta de comprobante comercial. Definir compensación por error de cantidad/importe en realizada, sin sobrescribir original. |
| P-04 | Imágenes y correo | Límites de archivos y formatos, validación/procesamiento, publicación R2; esquema de envío Resend y estados de error; no hace falta conocer credenciales para especificar. |
| P-05 | Despliegue y recuperación | Decidir cookies/proxy entre Netlify y Render, timeouts, estrategia de backups, pérdida máxima aceptable y recuperación. No asumir que un cron del backend gratuito siempre corre. |

Se puede completar documentación de todas las etapas mientras se resuelven esas definiciones. El cierre de planificación debe enumerar explícitamente lo resuelto y lo pendiente antes de autorizar implementación.

## Etapa 1 — base y acceso

| ID | Entrega | Depende de | Aceptación |
| --- | --- | --- | --- |
| B-01 | Workspace API/web/contracts y entorno local | P-01, autorización de implementar | Instalación reproducible con lockfile, build/tipos/lint y comandos documentados; API y web inician sin secretos en repo. |
| B-02 | Drizzle y migraciones base | B-01, P-02 | Migraciones ejecutan en PostgreSQL vacío de pruebas; restricciones rechazan saldo negativo y duplicados; credenciales solo API. |
| B-03 | Login, sesión y permisos | B-02 | Argon2id; cookie segura; 12h/30min en servidor; logout revoca; visitante no lee contactos ni opera admin. |
| B-04 | Recuperación/cambio de contraseña | B-03, P-04 | Token único 15min; consumo concurrente una vez; cambio revoca sesiones; respuesta de solicitud uniforme; prueba de correo con entorno controlado. |
| B-05 | Base visual tienda/admin | B-01 | Logo original y rojo definido; navegación adaptable, teclado/foco, campos etiquetados; panel sin enlace público; estados de sesión vencida. |

## Etapa 2 — catálogo e inventario

| ID | Entrega | Depende de | Aceptación |
| --- | --- | --- | --- |
| C-01 | Catálogo administrativo | B-02, B-03, B-05 | Productos/SKU, especies, categorías y marcas; publicación valida campos; borradores privados; archivo conserva referencias. |
| C-02 | Fotos R2 | C-01, P-04 | Subida autorizada, validación real del archivo, orden/alt y derivados; originales privados; imágenes sobreviven reinicio del backend. |
| C-03 | Stock inicial y recepciones | C-01 | Unidades y gramos explícitos; bolsas y abierto se cuentan separados; saldo/movimiento juntos y reintentos sin duplicados. |
| C-04 | Apertura de bolsas | C-03 | 4 bolsas de 20kg + 2kg sueltos pasan a 3 bolsas + 22kg; fallo revierte ambas partes; carrera con venta no consume dos veces última bolsa. |
| C-05 | Ajustes y alertas de faltantes | C-03 | Motivo obligatorio; conteo valida versión; diferencia trazable; no negativo; cantidades bajo mínimo identificables. |

## Etapa 3 — recorrido completo de compra

| ID | Entrega | Depende de | Aceptación |
| --- | --- | --- | --- |
| V-01 | Configuración pública del local | B-03, B-05 | WhatsApp, horarios, dirección y cobertura editables; sin secretos; envío desconocido se comunica a coordinar. |
| V-02 | Home, catálogo y producto | C-01, C-02, C-03, B-05 | Solo publicados; filtros/paginación; estados vacío/error/agotado; precios UYU/unidades correctos; diseño móvil/escritorio. |
| V-03 | Carrito y cotización | V-02, P-02 | 1–5kg enteros por alimento consolidado; 2800g permite 2kg; servidor recalcula y cliente revisa cambios; errores conservan carrito. |
| V-04 | Pendiente web y WhatsApp | V-03, V-01 | Contacto obligatorio; guardar antes de abrir; reintento devuelve misma referencia; sin descuento/reserva ni afirmación de mensaje enviado; copiar/reabrir sin recrear. |
| V-05 | Panel de pendientes | V-04, B-03, B-05 | Lista/detalle privados; editar/cancelar sin stock; datos validados; conflictos de versión visibles; conservar historial. |
| V-06 | Marcar realizada | V-05, C-03, P-02 | Estado y todos los descuentos juntos; doble clic una sola vez; stock insuficiente en una línea deja todo pendiente; edición concurrente no se pierde. |
| V-07 | Registro de venta presencial/manual | V-06 | Registrar canal y líneas y usar la misma transición a realizada; no duplicar compra web recibida por WhatsApp. Presentación de Venta rápida sigue propuesta de UX. |

Primer recorrido demostrable: C-01/C-03 → V-02/V-03 → V-04 → V-05/V-06. Usar datos de prueba identificados. No confundir esta demostración con MVP completo: recuperación, apertura, ventas locales y correcciones siguen siendo parte del alcance.

## Etapa 4 — correcciones y operación

| ID | Entrega | Depende de | Aceptación |
| --- | --- | --- | --- |
| O-01 | Correcciones y devoluciones | V-06, C-05, P-03 | Original intacto; motivo/fecha; solo reingresa lo indicado; acumulado no supera original; devoluciones simultáneas y reintentos no duplican ingreso. Compensaciones siguen el contrato definido en P-03. |
| O-02 | Historial y auditoría | V-07, O-01 | Ventas/correcciones/movimientos enlazados; filtros; actor y fecha; sin contraseñas/tokens en respuestas o logs. |
| O-03 | Integración de hosting elegido | B-04, V-06, P-05 | Netlify/Render/Neon/R2/Resend; sesiones/CSRF/proxy funcionan; arranque en frío y timeout recuperan el intento; secretos por entorno; sin pings para evadir límites gratuitos. |
| O-04 | Backups y restauración | B-02, C-02, P-05 | Copia independiente privada con retención aprobada; restaurar base e imágenes en entorno aislado; comprobar vínculos, saldos y tiempo real de recuperación. |
| O-05 | Carga real y validación de lanzamiento | Todas las anteriores | Dominio del usuario, remitente verificado, contacto/local, productos/fotos/precios y conteo inicial revisados; login recuperable; recorrido completo comprobado con dueño. |

## Evidencia de calidad por entrega

Durante desarrollo: unitarias para cantidades/importes y validaciones; integración con PostgreSQL para transacciones, restricciones y concurrencia; navegador para compra, acceso y recuperación ante fallos. Simular apertura WhatsApp sin enviar mensajes reales. En interfaces verificar teclado, foco, legibilidad, desbordes y estados sobre pantallas afectadas.

Cada tarea registra archivos, comandos ejecutados, resultado y limitaciones. No llamar pasado a un test previsto. La build no reemplaza comprobación de stock ni revisión visual.

## Antes de publicar, no necesariamente antes de documentar

Usuario aporta dominio, credenciales iniciales por canal seguro, email administrador, WhatsApp, datos del local, catálogo real y stock contado. Configurar cuentas de proveedores y dominio remitente cuando corresponda; mantener esa información fuera de Engram. Confirmar pérdida máxima tolerable y prueba de restauración. Revisión de costos/cupos y límites de los planes antes del despliegue.

## Fuera de esta entrega

No se implementa aplicación, no se crean cuentas, no se compra ni se publica. No se agregan pagos web, integración de transportistas, empleados ni multi-sucursal. Esta lista ordena trabajo ya definido y expone decisiones pendientes.
