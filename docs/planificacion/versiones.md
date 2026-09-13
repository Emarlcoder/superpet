# Matriz de versiones seleccionada

Decisión técnica delegada por el usuario al pedir resolver la matriz. Selección basada en metadatos publicados en npm y documentación oficial consultada el 2026-09-08. No inicia aplicación.

| Componente | Versión exacta seleccionada |
| --- | --- |
| Node.js | 24.20.0 LTS |
| pnpm | 11.19.0 |
| TypeScript | 6.0.3 |
| Next.js | 16.3.4 |
| React / React DOM | 19.2.8 / 19.2.8 |
| Nest core/common/platform-express/testing | 12.0.1 |
| Nest CLI / schematics | 12.0.0 / 12.0.0 |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 |
| node-postgres pg / @types/pg | 8.23.0 / 8.23.1 |
| Tailwind / @tailwindcss/postcss | 4.3.3 / 4.3.3 |
| shadcn CLI | 4.21.0 |
| RxJS / reflect-metadata | 7.8.2 / 0.2.2 |
| Vitest / Vite | 5.0.0 / 8.2.2 |
| Playwright Test | 1.63.0 |

## Fundamento

Actualización verificada durante B-01 (2026-09-09): TypeScript 7.0.2 compilaba, pero nest start --watch falla porque esa versión no expone la API programática de compilación que requiere Nest CLI. Se selecciona TypeScript 6.0.3 para compilar y desarrollar con CLI; supersede la selección 7.0.2 de los antecedentes siguientes. Herramientas adicionales: oxlint1.82.0, Prettier3.9.6, tipos Node24.10.1/React19.2.18/ReactDOM19.2.7. Runtime de esta máquina24.19.0; objetivo24.20.0 sigue en .node-version.

- Node 24.20.0 proviene del índice oficial de releases de la línea LTS elegida; satisface mínimos publicados de Next, Nest, shadcn y Vitest.
- Nest core, common, adaptador Express y testing se mantienen en la misma versión. CLI y schematics tienen su propia numeración. Elegir API ESM, TypeScript NodeNext y emitDecoratorMetadata/experimentalDecorators según integración Nest. En web usar resolución bundler de Next; no imponer la misma configuración de módulos a ambas aplicaciones.
- Nest schematics 12.0.0 declara TypeScript >=6.0.0; se descartó 5.9.3 para esta combinación. TypeScript 7.0.2 satisface ese requisito. No mezclar ejemplos antiguos de configuración sin revisarlos.
- React y React DOM tienen exactamente el mismo parche, dentro del rango admitido por Next. Tailwind y su plugin PostCSS también se alinean.
- Drizzle declara soporte pg >=8. ORM y Kit tienen numeraciones independientes; se seleccionaron sus etiquetas estables consultadas, sin versiones beta. No instalar drivers alternativos solo porque aparezcan como peers opcionales.
- pnpm 11.19.0 es la versión estable disponible en el entorno y usada para resolver la matriz. Existe 12.3.4 publicado, pero no es necesario cambiar de línea solo por ser más nuevo. Fijar packageManager y usar el mismo gestor en local y CI.
- Vitest para lógica y pruebas API; Playwright para navegador. En pruebas Nest conservar metadatos de decoradores mediante compilación TypeScript o transformación compatible verificada, no asumir que cualquier transformador rápido los emite.
- shadcn es CLI y código de componentes incorporado al proyecto, no un paquete de UI único que congele todo su registro remoto. Registrar componentes/primitivas realmente agregados y sus versiones al maquetar.

## Evidencia y alcance

Consultados endpoints npm por versión/etiqueta latest para engines y peerDependencies y https://nodejs.org/dist/index.json para Node. Se creó únicamente un manifiesto temporal de comprobación, fuera del repositorio de aplicación, con los paquetes de la tabla salvo Node/pnpm. Se ejecutó pnpm 11.19.0 install --lockfile-only --ignore-scripts --strict-peer-dependencies y terminó con código 0, 659 paquetes resueltos. No se ejecutaron scripts de instalación ni se crearon apps/api o apps/web.

La resolución notificó dos subdependencias deprecadas (@esbuild-kit/core-utils 3.3.2 y @esbuild-kit/esm-loader 2.6.5). Deprecación no demuestra vulnerabilidad; revisar árbol y advisories al generar el lockfile definitivo, sin aplicar overrides no probados.

Esto valida resolución de dependencias y requisitos declarados, no compilación, ejecución, migraciones, seguridad integral ni compatibilidad del adaptador Netlify. Esas comprobaciones pertenecen a B-01/B-02/O-03 del backlog. El lockfile temporal no es el lockfile definitivo del monorepo: agrupa herramientas que en la aplicación irán en paquetes distintos.

Al crear la aplicación, fijar dependencias directas sin caret/tilde y generar lockfile del workspace; verificar instalación reproducible, build/tipos, pruebas mínimas, metadatos Nest, migración de Drizzle sobre PostgreSQL de pruebas y build de Next con adaptador Netlify. Revisar parches de seguridad publicados desde esta selección antes de desplegar. PostgreSQL alojado: elegir major admitida por Neon y fijar la misma en pruebas al configurar la base; no inventar un parche administrado por el proveedor.

Linter y formateador quedan por resolver con su configuración del scaffolding; no bloquean la selección de runtime/framework/ORM. Versiones de bibliotecas de correo, Argon2 y almacenamiento se fijarán al implementar cada módulo y revisar sus requisitos.

## Fuentes

- [Índice oficial Node](https://nodejs.org/dist/index.json).
- [Migración y requisitos Nest 12](https://docs.nestjs.com/migration-guide).
- [Next.js instalación](https://nextjs.org/docs/app/getting-started/installation).
- [Tailwind 4 y shadcn](https://ui.shadcn.com/docs/tailwind-v4).
- [Registro npm](https://registry.npmjs.org/): consultados los nombres y versiones de la tabla; las etiquetas latest pueden cambiar después de esta consulta.
