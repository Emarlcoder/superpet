# Auditoría móvil de rendimiento — 2026-09-16

## Corrección posterior: espacio de imágenes

Implementada localmente en `product-detail.tsx`: dimensiones intrínsecas de la variante, `srcSet` con variantes existentes, `sizes` según grilla y primera imagen prioritaria; restantes lazy. CSS `height:auto` mantiene proporción y `min-width:0` evita que la galería fuerce el ancho de la grilla.

Tres nuevas ejecuciones móviles sobre el mismo producto y perfil, nueva compilación servida en localhost:3002: puntajes **97/96/94**, LCP **2,38/2,50/2,68 s**, CLS **0/0/0**. Mediana de rendimiento **96** frente a **85** inicial y CLS mediano de **0,256 a 0**. No hubo mejora de LCP: mediana **2,50 s** frente a **2,37 s**; no atribuir una reducción de tiempo de carga a este cambio. La solicitud de imagen observada usa variante **640** en lugar de **1280**. Desaparece el aviso de imágenes sin dimensiones.

Build, TypeScript y lint correctos. Informes `.local/lighthouse-producto-fixed-{1,2,3}.report.{html,json}`, sin runtimeError ni warnings. Persiste el error de limpieza EPERM del lanzador después de guardar reportes válidos. No se publicó ni se probó con una colección de fotos reales de diferentes proporciones.

Medición de la compilación optimizada **local**, sin publicar cambios. Lighthouse 13.4.1, Edge/Chromium 153 headless, perfil móvil 412 × 823, CPU simulada ×4, RTT 150 ms y throughput 1638,4 Kbps. Tres ejecuciones válidas por ruta, secuenciales. PostgreSQL, API y archivos locales; un producto de prueba y promociones de prueba. No representa volumen comercial ni latencia de Vercel/Neon/ImageKit.

## Resultados

Medianas de las tres ejecuciones, con rango de puntajes entre paréntesis. LCP: aparición del elemento de contenido más grande; CLS: desplazamientos visuales; TBT: tiempo de bloqueo durante carga, no INP de usuarios reales.

| Página | Puntaje / 100 | LCP | CLS | TBT |
| --- | --- | --- | --- | --- |
| Inicio | 98 (98–99) | 2,18 s | 0,038 | 93 ms |
| Catálogo | 97 (97–99) | 2,29 s | 0 | 112 ms |
| Ficha | 85 (84–97) | 2,37 s | 0,256 | 88 ms |

Detalle ficha: puntajes 85/97/84, CLS 0,256/0/0,256. El problema depende del momento en que termina de cargar la imagen; la ejecución sin desplazamiento no descarta el defecto. La segunda y tercera ejecución se completaron tras reiniciar los servidores locales por una interrupción entre turnos.

## Prioridad de optimización

1. **Reservar espacio para fotos de la ficha.** Lighthouse atribuye el desplazamiento de 0,256 al bloque de detalles, causado por una imagen sin dimensiones explícitas (`div.gallery > img`). `product-detail.tsx` confirma que no se pasan `width/height`. Usar dimensiones de la variante y CSS que preserve su proporción; comprobar con imágenes reales y distintas proporciones. Es el hallazgo más concreto y repetido.
2. **Entregar los datos iniciales de ficha/catálogo desde servidor.** Hoy dependen de hidratación y consulta posterior. En el catálogo el LCP es el título “Su próximo favorito”, no una tarjeta: un puntaje alto no mide por sí solo cuándo los productos están listos. En la ficha medida el LCP fue la descripción. La mejora propuesta debe verificarse con red lenta y fotografías representativas.
3. **Revisar el JavaScript compartido con evidencia del bundle.** Lighthouse estima unos 25–27 KiB no utilizados y 13 KiB de compatibilidad antigua. Son estimaciones, pueden solaparse y no deben sumarse. No retirar compatibilidad del framework a ciegas.
4. **Repetir imágenes y caché en despliegue.** El banner local tiene unos 10 KiB potencialmente reducibles por tamaño; la prueba utiliza archivos locales, por lo que no evalúa el `srcSet` de ImageKit ya implementado. No extrapolar este aviso al CDN productivo.

## Evidencia y límites

- Informes HTML/JSON completos en `.local/lighthouse-home.report.*`, `.local/lighthouse-home-2.report.*`, `.local/lighthouse-home-3.report.*`, `.local/lighthouse-catalogo-{1,2,3}.report.*` y `.local/lighthouse-producto-{1,2,3}.report.*`.
- Nueve informes válidos sin `runtimeError` ni advertencias de navegación. Dos intentos con servidores detenidos se descartaron y reemplazaron; no se utilizaron sus puntajes nulos.
- El lanzador de Lighthouse reportó EPERM al limpiar perfiles temporales de Windows después de guardar algunos informes completos. Se verificó el contenido de los informes; no se afirma que esos comandos terminaran con código cero.
- No se midió INP real, tráfico de usuarios, cold starts remotos, carga con cientos de productos ni una comparación antes/después bajo condiciones idénticas. No se cambió código de aplicación durante esta auditoría.
- La metodología usa [throttling simulado de Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md); las repeticiones ayudan a observar la [variabilidad de las mediciones](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).
