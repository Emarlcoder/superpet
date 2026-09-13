# SuperPet

## Etapa actual

Desarrollo autorizado explícitamente por el usuario el 2026-09-09. Implementar sobre docs/planificacion/README.md y los documentos relevantes. Distinguir requisitos confirmados de propuestas; no tratar propuestas como aprobaciones. Las menciones históricas a planificación exclusiva quedan superadas por esta autorización. Infraestructura productiva y backups operativos siguen diferidos a antes de producción.

## Skills de desarrollo

Las fuentes revisables están en skills/. Leer el SKILL.md pertinente cuando el trabajo corresponda; no cargar todas para cada tarea:

- skills/superpet-backend/SKILL.md: API NestJS, contratos y acceso administrativo.
- skills/superpet-frontend/SKILL.md: tienda Next.js y panel integrado.
- skills/superpet-pedidos-stock/SKILL.md: estados de compras, inventario y fraccionamiento.
- skills/superpet-calidad/SKILL.md: pruebas y revisión de flujos afectados.

Las skills no autorizan comenzar la aplicación ni convierten propuestas en requisitos. Ver docs/planificacion/skills.md para instalación y mantenimiento.

## Memoria Engram

- Confirmar el proyecto superpet con mem_current_project antes de guardar información.
- Recuperar contexto con mem_context y buscar antecedentes con mem_search antes de repetir decisiones. Leer mem_get_observation para consultar una observación completa.
- Guardar decisiones, restricciones y hallazgos duraderos con mem_save; usar topic_key estable y contenido What / Why / Where / Learned.
- No guardar secretos, datos de clientes ni transcripciones indiscriminadas.
- Antes de cerrar una sesión, guardar mem_session_summary con objetivo, instrucciones, descubrimientos, trabajo realizado, próximos pasos y archivos relevantes.
- Después de una compactación, preservar el traspaso con mem_session_summary y recuperar mem_context.
- Si MCP no está disponible, indicar el estado real; usar la CLI instalada si está accesible y nunca afirmar que una memoria se guardó sin verificarlo.

Las convenciones y el estado de integración están en docs/planificacion/engram.md. Mantener los documentos revisables sincronizados con las decisiones vigentes.
