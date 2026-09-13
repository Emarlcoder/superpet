# Skills para desarrollo de SuperPet

Investigación complementaria: [skills de maquetado](./skills-maquetado.md). Instaladas frontend-design, web-design-guidelines y react-best-practices; fuentes, nombres y alcance en ese documento.

Preparadas el 2026-09-08 por solicitud del usuario. Se posterga el bocetado de escritorio para priorizar herramientas de desarrollo; esto no inicia la implementación ni aprueba las propuestas técnicas abiertas.

| Skill | Aplicación | Fuente |
| --- | --- | --- |
| superpet-backend | API NestJS, contratos, acceso y persistencia | [SKILL.md](../../skills/superpet-backend/SKILL.md) |
| superpet-frontend | Tienda Next.js, carrito, WhatsApp y admin | [SKILL.md](../../skills/superpet-frontend/SKILL.md) |
| superpet-pedidos-stock | Estados, stock, unidades, concurrencia y fraccionamiento | [SKILL.md](../../skills/superpet-pedidos-stock/SKILL.md) |
| superpet-calidad | Escenarios de prueba y revisión proporcional al cambio | [SKILL.md](../../skills/superpet-calidad/SKILL.md) |

## Instalación y uso

Fuentes mantenidas en skills/ dentro del repositorio. Copias instaladas en C:/Users/Relentlesss/.codex/skills/ con esos mismos nombres; igualdad de archivos verificada por SHA256. No se reemplazaron skills preexistentes. Selección automática habilitada por defecto; cada descripción limita su uso a SuperPet. Se pueden invocar por nombre, por ejemplo `$superpet-pedidos-stock`, cuando el catálogo de skills de la sesión las muestre. La recarga de ese catálogo no se ha comprobado en esta tarea; AGENTS.md enlaza las fuentes para lectura directa desde ahora.

Mantener las fuentes del repositorio como versión revisable y sincronizar las copias instaladas después de cada modificación, validando y comparando archivos. Las skills resuelven las rutas de documentos desde la raíz de SuperPet, no desde su instalación global. No aplicarlas a otros proyectos.

Engram sigue bajo AGENTS.md y engram.md; no se duplica su protocolo como skill. Las reglas comerciales completas permanecen en los documentos de planificación. Las skills no fijan versiones, ORM, hosting ni PostgreSQL por adelantado.

## Validación y límites

Las cuatro fuentes pasaron quick_validate.py de skill-creator. PyYAML se instaló en una carpeta temporal para ejecutar el validador; no se agregó como dependencia del proyecto. Se revisaron alcance, referencias y la separación entre reglas confirmadas y propuestas. No hubo prueba independiente con agentes ni pruebas de aplicación: todavía no existe implementación que validar.

Los escenarios de calidad cubren las regresiones más relevantes y se adaptarán a los contratos y herramientas elegidos. Estas skills no garantizan por sí solas corrección, seguridad ni calidad visual.

Próximo paso propuesto: cerrar decisiones técnicas pendientes y convertir el primer flujo de extremo a extremo en contratos e historias implementables.
