# Herramientas — conjunto aprobado

Versiones principales resueltas por delegación del usuario en [versiones.md](./versiones.md). La resolución de dependencias fue verificada; build y ejecución pendientes del scaffolding. Esta actualización reemplaza las menciones históricas siguientes a la matriz pendiente.

El usuario aprobó Node.js 24 LTS, TypeScript estricto, pnpm workspaces, pg, App Router, Tailwind CSS y shadcn/ui. Monorepositorio también aprobado. Versiones exactas pendientes; no inicia implementación.

| Área | Propuesta | Motivo |
| --- | --- | --- |
| Runtime | Node.js 24 LTS | Base con soporte prolongado para ambos servicios. |
| Lenguaje | TypeScript con strict | Detectar inconsistencias en contratos y estados durante desarrollo. |
| Paquetes | pnpm workspaces | Gestionar API, web y contratos dentro del repositorio aprobado. |
| PostgreSQL | Driver node-postgres (pg) con Drizzle | Driver soportado directamente; conexión y pool explícitos en API. |
| Web | Next.js App Router | Separar renderizado y acceso en servidor de interacciones del cliente. |
| Estilos | Tailwind CSS | Mantener escala de espacios, colores y adaptación responsive. |
| Componentes | shadcn/ui, solo componentes necesarios | Base editable para formularios, diálogos y controles del panel; adaptar a identidad SuperPet. |

Versiones exactas de NestJS, Next.js, React, Drizzle, Drizzle Kit, pg, pnpm, TypeScript y Tailwind pendientes de una matriz de compatibilidad y revisión de releases estables. La documentación pública consultada puede corresponder a distintas generaciones (Nest ya documenta migración a v12); no mezclar ejemplos entre versiones ni afirmar compatibilidad probada. Fijar versiones y lockfile al preparar el scaffolding autorizado, con comprobación de instalación/build. No depender de latest sin fijar la resolución.

No añadir un orquestador adicional al monorepo sin necesidad demostrada. Drizzle y credenciales permanecen en API; contracts no exporta tablas internas ni secretos. Las skills orientan implementación y revisión, no reemplazan bibliotecas ni pruebas de interfaz.

## Fuentes consultadas

- [Node.js: calendario de soporte](https://github.com/nodejs/Release).
- [pnpm workspaces](https://pnpm.io/workspaces).
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql).
- [Next.js instalación](https://nextjs.org/docs/app/getting-started/installation).
- [NestJS migración](https://docs.nestjs.com/migration-guide).
- [Tailwind con Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
- [shadcn/ui](https://ui.shadcn.com/docs).
