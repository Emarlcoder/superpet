---
name: superpet-calidad
description: Definir o ejecutar pruebas y revisar regresiones de cambios de SuperPet, especialmente pedidos, stock, acceso administrativo y recuperación de WhatsApp. No es una auditoría general automática.
---

# Calidad de SuperPet

## Contexto y alcance

Aplicar solo al proyecto SuperPet. Resolver la raíz desde el workspace que contiene AGENTS.md y docs/planificacion/README.md; las rutas siguientes son relativas a esa raíz, no a la instalación de la skill. Si no están disponibles, solicitar la ubicación del proyecto antes de asumir sus decisiones.

Leer AGENTS.md y docs/planificacion/README.md; seguir allí el protocolo Engram. La etapa actual es planificación: crear especificaciones y contratos, no código de aplicación hasta que el usuario autorice avanzar. Las instrucciones vigentes del usuario prevalecen. Consultar los documentos citados para distinguir confirmado y propuesto; una skill no aprueba propuestas ni fija versiones, ORM o infraestructura.

## Elegir evidencia útil

Leer docs/planificacion/ejecucion.md y el contrato o flujo que cambie. Seleccionar riesgos afectados, no ejecutar una batería indiscriminada. En planificación entregar escenarios y resultados esperados; no crear aplicación ni instalar un framework de tests todavía. En implementación usar el runner y comandos reales del proyecto, sin inventar resultados.

Para lógica pura usar pruebas unitarias; para transacciones y concurrencia usar integración con la persistencia seleccionada; para recorrido cliente usar pruebas de navegador. Los mocks de repositorios no prueban atomicidad ni exclusión concurrente. No enviar mensajes reales ni tocar inventario productivo durante pruebas.

## Escenarios por riesgo

- Pedidos web: contacto ausente o cantidad inválida no crea pendiente; éxito crea pendiente sin movimientos; doble clic/timeout no duplica bajo la idempotencia adoptada; fallo de apertura permite recuperar el mismo intento.
- Stock: crear/editar/cancelar pendiente no cambia cantidades; realizada descuenta una vez; dos consumidores de la última existencia no sobre venden; fallo en una línea revierte todo; edición simultánea no usa cantidades obsoletas.
- Suelto: 1 y 5 kg válidos; 0, negativos, fracciones y 6 inválidos. Si se adopta consolidación, 3 + 3 del mismo alimento se rechaza; si se usan gramos, 2800 g permite 2 kg.
- Apertura, si se adopta: ejemplo 4 bolsas de 20 kg + 2 kg sueltos produce 3 bolsas + 22 kg; falta de bolsas, reintento y fallo entre movimientos no dejan saldos parciales.
- Seguridad: visitante no lee ni modifica pedidos por conocer referencia; backend rechaza operaciones administrativas sin sesión válida; precio manipulado no sustituye precio autorizado; contactos no aparecen en respuestas públicas ni logs.
- Interfaz: vacío, agotado, cambios de precio, recuperación de errores, teclado/foco y disposición móvil/escritorio de pantallas afectadas. WhatsApp se verifica sin enviar mensaje; envío desconocido no se presenta gratis.

Estos escenarios incluyen propuestas técnicas: verificar la decisión vigente antes de convertirlos en aceptación contractual. Para reglas completas consultar operacion.md; no redefinirlas aquí.

## Informe

Indicar qué se verificó, con qué entorno/comando y resultado; separar ejecutado, revisión estática y pendiente. Un comando no ejecutado no es una prueba pasada. Vincular hallazgos con comportamiento reproducible y riesgo concreto. Ampliar pruebas solo ante cambios o dudas nuevas; para cambios documentales basta validación de estructura, referencias y coherencia.
