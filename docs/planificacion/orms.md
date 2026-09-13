# ORM para SuperPet — Drizzle elegido

PostgreSQL confirmado por el usuario el 2026-09-08. Drizzle ORM elegido explícitamente por el usuario. No instalado ni versión fijada. Evaluación documental, sin benchmark.

| Opción | Ventaja para SuperPet | Costo o compromiso |
| --- | --- | --- |
| Prisma | Esquema declarativo, cliente tipado generado y migraciones; facilita CRUD de catálogo y pedidos. Integración documentada con NestJS. | Lenguaje de esquema y generación adicionales; consultas específicas de PostgreSQL pueden requerir SQL explícito. |
| Drizzle | Consultas cercanas a SQL con tipado TypeScript; control explícito útil para inventario y reportes. | Exige más criterio SQL y organizar convenciones de acceso y relaciones. |
| TypeORM | Integración directa con NestJS mediante módulo/repositorios; entidades con decoradores. | Disciplina con carga de relaciones y uso del manager transaccional; más comportamiento implícito que revisar. |
| MikroORM | Unidad de trabajo, seguimiento de entidades y bloqueo optimista/pesimista; integración NestJS. | Más conceptos y cuidado del contexto de entidades por solicitud; puede ser innecesario para este tamaño. |

Comparativa histórica previa a la elección de Drizzle. Recomendación inicial: Prisma para equilibrio entre productividad y mantenimiento del catálogo/admin; Drizzle si se prioriza control SQL explícito. TypeORM si hay preferencia por repositorios/decoradores de NestJS; MikroORM si se busca un dominio centrado en entidades. Preferencias de evaluación, no resultados medidos ni decisión del usuario.

Todos permiten transacciones. Ninguno evita automáticamente doble descuento o sobreventa: diseñar transición a realizada, restricción de stock, control concurrente, idempotencia y reintentos como una unidad. No mantener una transacción abierta al coordinar WhatsApp. Revisar migraciones antes de aplicarlas. Versiones y compatibilidad se cierran después de elegir ORM.

## Fuentes oficiales consultadas

- [Prisma con NestJS: esquema, cliente y migraciones](https://docs.nestjs.com/recipes/prisma).
- [Transacciones Prisma, referencia versionada v6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions): capacidades de aislamiento/reintento, no selección de versión para el proyecto.
- [Drizzle: consultas](https://orm.drizzle.team/docs/data-querying) y [transacciones](https://orm.drizzle.team/docs/transactions).
- [NestJS: integración TypeORM](https://docs.nestjs.com/techniques/database) y [migraciones TypeORM](https://typeorm.io/docs/migrations/setup/).
- [MikroORM: transacciones y concurrencia](https://mikro-orm.io/docs/transactions) e [integración NestJS](https://mikro-orm.io/docs/usage-with-nestjs).
