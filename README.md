# RanaSports
Portal deportivo creado por @RanaMatiusTV

Sitio estático oficial: https://ranamatiustv.github.io/RanaSports/

HTML, CSS y JavaScript sin dependencias, servicios pagos ni compilación. Diseño adaptable, búsqueda y filtros, agenda externa y PWA instalable por HTTPS. Las páginas y los iconos quedan disponibles sin conexión tras la primera visita. La agenda externa requiere Internet.

## Publicación
GitHub Pages: Settings → Pages → Deploy from a branch → main → / (root). El archivo .nojekyll permite publicar los archivos estáticos directamente. Cada push a main actualiza el sitio. Se conserva el commit inicial del repositorio.

## Desarrollo
Servir esta carpeta con cualquier servidor HTTP estático. No abrir con file:// para probar la PWA. Probar también bajo /RanaSports/ para reproducir Pages.

## Contenido
La sección Últimas noticias queda vacía hasta contar con noticias deportivas verificadas. Las tres notas originales se conservan como presentaciones bajo «Conocé RanaSports»; no se mezclan con el listado de actualidad.

Para publicar una noticia sin rediseñar la portada:
1. Duplicar una página de noticias y completar el contenido verificado, fuentes, título, descripción, canonical, Open Graph, JSON-LD y fecha real con hora y zona horaria.
2. En index.html, copiar el article del template inerte newsCardTemplate dentro de newsGrid. El template no se muestra ni contiene noticias de ejemplo.
3. Completar data-category con independiente, futbol, f1, seleccion, otros o agenda. Completar el nombre visible de la categoría, título, resumen corto y ambos enlaces a la nota individual.
4. Completar time datetime con la fecha y hora reales en ISO 8601, incluyendo zona horaria (AAAA-MM-DDTHH:mm:ss-03:00), y escribir también la fecha/hora visible para lectores sin JavaScript. No inventar horarios. El navegador ordena las tarjetas de más nueva a más antigua y muestra la hora argentina; agregar las nuevas arriba también conserva ese orden sin JavaScript.
5. La imagen es opcional: descomentar el bloque indicado en el template, completar enlace, src local, alt descriptivo y dimensiones reales. Conservar loading="lazy" y decoding="async". Sin imagen, la tarjeta muestra su contenido textual normalmente.
6. Para notas F1, agregar data-category="f1" al body: app.js agrega el botón exclusivo automáticamente. Se recomienda conservar también el párrafo estático data-f1-channel de noticias/rana-f1.html para lectura sin JavaScript; el script evita duplicarlo. Al reutilizar esa página para otro deporte, quitar tanto el atributo F1 como ese párrafo. No agregar el canal F1 a tarjetas del listado general, hero ni redes generales.
7. Agregar la URL de la nota a sitemap.xml y la página y su imagen local, si tiene, a CORE en sw.js. Incrementar la versión del caché con cada publicación para mantener la lectura sin conexión.
8. Comprobar buscador, categoría, enlace individual, PC, móvil y modo sin conexión antes del push a main.

Canal general: https://www.youtube.com/@RanaMatiusTV. Canal exclusivo F1: https://www.youtube.com/@RanaF1TV, visible solo al filtrar F1 y dentro de sus notas.

## Google AdSense (desactivado)
Los espacios data-ad-slot están reservados y ocultos hasta su configuración. No se cargan scripts publicitarios ni IDs ficticios. Al habilitarlo, usar el código oficial de la cuenta, configurar los bloques y ads.txt según indique Google, actualizar la política de privacidad a la implementación real y configurar el consentimiento cuando corresponda. La preparación técnica no implica aprobación de AdSense.

## Identidad
Nombre: RanaSports. Firma: Creado por @RanaMatiusTV. Arroba de X, Instagram, YouTube y TikTok: @RanaMatiusTV. Se mantiene el enlace original de la Agenda Deportiva de RanaMatiusTV.
