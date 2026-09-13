# Memoria de SuperPet con Engram

## Referencia y estado

Fuente confirmada por el usuario: [Engram](https://github.com/Gentleman-Programming/engram). Protocolo consultado en su README y [referencia técnica](https://github.com/Gentleman-Programming/engram/blob/main/DOCS.md).

Activación del 2026-09-07: Engram 1.20.0 Windows amd64 instalado con SHA256 verificado contra checksums oficiales. MCP registrado y habilitado en Codex. Handshake, detección del proyecto superpet y guardado de cinco observaciones verificados mediante un cliente MCP directo. Herramientas nativas disponibles y verificadas en la tarea: mem_current_project, mem_context, mem_search y mem_get_observation recuperaron el proyecto y su contexto correctamente.

## Función en este proyecto

Los documentos contienen las especificaciones revisables. Engram conserva decisiones, restricciones y aprendizajes para recuperar contexto entre sesiones. No sustituye la definición de requisitos ni forma parte del backend comercial.

Convención propia: usar el proyecto superpet, una vez comprobada su resolución, y distinguir en cada registro lo confirmado de lo propuesto. No registrar una propuesta como aprobación del usuario.

## Protocolo operativo

Cuando las herramientas estén disponibles:

1. Confirmar el proyecto con mem_current_project y recuperar contexto con mem_context.
2. Buscar antecedentes con mem_search; leer el registro completo con mem_get_observation y usar mem_timeline si hace falta contexto.
3. Guardar conocimiento duradero con mem_save, usando una topic_key estable para cada tema que evolucione.
4. Cerrar con mem_session_summary: objetivo, instrucciones, hallazgos, trabajo realizado, próximos pasos y archivos relevantes.

Dar a cada observación un título buscable y contenido What / Why / Where / Learned. No almacenar transcripciones indiscriminadas ni secretos.

## Temas propios de SuperPet

Especies iniciales confirmadas: perros y gatos. Categorías confirmadas: alimentos, accesorios, juguetes e higiene. Otras especies fuera del alcance inicial; subcategorías y productos concretos por definir.

Moneda inicial confirmada por ahora: pesos uruguayos (UYU). Un eventual cambio futuro queda fuera del alcance actual; preservar moneda histórica de compras.

Actualización confirmada: nombre y teléfono obligatorios antes de crear la pendiente web y abrir WhatsApp. Guardar esta regla, nunca los datos reales de clientes, en la memoria del proyecto.

Estas claves son convenciones del proyecto, no categorías obligatorias de Engram:

| topic_key | Contenido previsto | Estado |
| --- | --- | --- |
| project/scope | Ecommerce SuperPet para Uruguay | Confirmado |
| workflow/planning-first | Planificar antes de implementar | Confirmado |
| architecture/stack | Backend NestJS y frontend Next.js | Confirmado |
| architecture/admin | Panel integrado sin enlaces públicos; una sola persona lo administra; un administrador sin roles de empleados como alcance derivado | Cantidad de personas confirmada; detalles de autenticación pendientes |
| architecture/repository | Monorepositorio y backend modular | Propuesto |
| business/payments | Sin pagos web; coordinación por WhatsApp | Confirmado |
| business/inventory | Sistema nuevo de catálogo y stock en admin; descuento al marcar compra realizada confirmado | Requisito y propuesta diferenciados |
| business/delivery | Retiro del local o envío; Ciudad de la Costa, Canelones, Uruguay como zona inicial provisoria y modificable | Confirmado como provisorio; límites pendientes; costo coordinado por WhatsApp |
| business/whatsapp | Carrito prepara mensaje que el cliente envía a SuperPet | Confirmado |
| business/bulk-food | Alimento suelto de 1 a 5 kg, aumentando/disminuyendo de a 1 kg entero | Confirmado |
| architecture/bulk-inventory | Stock común por alimento; inventario en gramos y límite consolidado por alimento | Propuesto |
| business/bulk-supply | El alimento suelto proviene de bolsas cerradas | Confirmado |
| architecture/bag-opening | Apertura administrativa: salida de bolsas y entrada de su peso con movimientos vinculados e idempotentes | Propuesto |

## Instalación y verificación

Binario: C:/Users/Relentlesss/AppData/Local/Programs/Engram/engram.exe. Configuración global: C:/Users/Relentlesss/.codex/config.toml, servidor engram con ruta absoluta y argumentos mcp --tools=agent. Backup previo: config.toml.before-engram-20260907.bak. Base local predeterminada: C:/Users/Relentlesss/.engram/engram.db. Identidad del proyecto: .engram/config.json. Protocolo del proyecto: AGENTS.md. No se habilitó cloud ni se reemplazaron prompts globales. No se requiere modificar PATH para que Codex lance el servidor.

No crear una base SQLite manual ni simular exportaciones de Engram con archivos Markdown. Este documento es una guía y un traspaso temporal, no memoria sincronizada.

## Traspaso de planificación — persistido en Engram

- Objetivo: planificar SuperPet antes de escribir código.
- Instrucciones: NestJS, Next.js y administración integrada; utilizar Engram del repositorio indicado.
- Hallazgos: Engram provee memoria; no prescribe el árbol de aplicaciones de SuperPet.
- Realizado: borradores de producto, arquitectura, etapas y protocolo de memoria; referencia Engram resuelta.
- Actualización: no existe sistema digital previo; catálogo y stock nuevos en admin, retiro/envío y carrito a WhatsApp sin pago web confirmados. Todas las ventas se registrarán en el panel, incluidas las presenciales. Compras pendientes con edición/cancelación y descuento únicamente al marcar realizada confirmados. Interfaz de Venta rápida propuesta; creación automática al pulsar Coordinar por WhatsApp confirmada.
- Pendiente: validar operación de stock y definir catálogo, datos del local y cobertura de envío.
- Actualización de alimento suelto: rango 1–5 kg, paso 1 kg y abastecimiento desde bolsas cerradas confirmados. Documentados selector, cálculo por kg y propuesta de apertura administrativa atómica con trazabilidad, carga inicial y criterios de aceptación. Requisitos y propuestas guardados en Engram como registros separados.
- Archivos: README.md, producto.md, arquitectura.md, ejecucion.md, operacion.md y engram.md en docs/planificacion. Traspaso incluido en las memorias iniciales del proyecto.
