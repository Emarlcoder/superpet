# Investigación de skills de maquetado

Consulta 2026-09-08. Recomendaciones basadas en lectura de fuentes primarias; sin pruebas comparativas de resultados.

Instalación autorizada y completada el 2026-09-08: frontend-design (anthropics/skills), web-design-guidelines y react-best-practices (vercel-labs/agent-skills), desde main mediante skill-installer. Archivos SKILL.md verificados en C:/Users/Relentlesss/.codex/skills/. La última carpeta declara el nombre de invocación vercel-react-best-practices. Disponibles en el siguiente turno. Impeccable no instalado. No se modificaron las skills propias ni se inició código de aplicación.

| Candidata | Aporte y evaluación para SuperPet |
| --- | --- |
| [frontend-design de Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) | Primera elección para dirección visual, tipografía, composición y revisión por capturas. Mantener logo, rojo y contenido comercial de SuperPet por encima de preferencias estéticas genéricas. |
| [web-design-guidelines de Vercel](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | Complemento para revisar interfaz implementada: foco, formularios, teclado, imágenes y layout. Obtiene reglas remotas en cada revisión. Sus convenciones editoriales inglesas deben adaptarse al español; no equivale a certificación de accesibilidad. |
| [vercel-react-best-practices](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md) | Complemento técnico React/Next.js para carga de datos, renderizado y tamaño de bundles; no dirige el maquetado visual. Aplicar reglas pertinentes a la versión y arquitectura elegidas. |
| [Impeccable](https://github.com/pbakaus/impeccable) | Alternativa más amplia de diseño e iteración en navegador. README revisado; no inspección completa de paquete. Evaluarla si hace falta un flujo más extenso, sin sumar dos directores visuales de entrada. |

Recomendación propuesta: frontend-design y web-design-guidelines junto con superpet-frontend; sumar react-best-practices durante implementación. La skill propia conserva dominio e identidad; las externas aportan diseño y revisión. No adoptar Tailwind/shadcn automáticamente: esas elecciones siguen abiertas. No iniciar código por instalar skills.

Fuentes leídas: SKILL.md actual de las tres primeras; [reglas de revisión Vercel](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md); README de Impeccable. La recomendación evalúa contenido y encaje, no superioridad demostrada mediante benchmark.
