# RanaSports
Portal deportivo creado por @RanaMatiusTV

Sitio estático oficial: https://ranamatiustv.github.io/RanaSports/

HTML, CSS y JavaScript sin dependencias, servicios pagos ni compilación. Diseño adaptable, búsqueda y filtros, agenda externa y PWA instalable por HTTPS. Las páginas y los iconos quedan disponibles sin conexión tras la primera visita. La agenda externa requiere Internet.

## Publicación
GitHub Pages: Settings → Pages → Deploy from a branch → main → / (root). El archivo .nojekyll permite publicar los archivos estáticos directamente. Cada push a main actualiza el sitio. Se conserva el commit inicial del repositorio.

## Desarrollo
Servir esta carpeta con cualquier servidor HTTP estático. No abrir con file:// para probar la PWA. Probar también bajo /RanaSports/ para reproducir Pages.

## Contenido
Duplicar una página de noticias, actualizar título, descripción, canonical, Open Graph, JSON-LD, fecha y contenido. Agregar la tarjeta en index.html, la URL en sitemap.xml y la página en CORE de sw.js. Incrementar la versión del caché al publicar cambios. No mostrar noticias inventadas en categorías vacías.

## Google AdSense (desactivado)
Los espacios data-ad-slot están reservados y ocultos hasta su configuración. No se cargan scripts publicitarios ni IDs ficticios. Al habilitarlo, usar el código oficial de la cuenta, configurar los bloques y ads.txt según indique Google, actualizar la política de privacidad a la implementación real y configurar el consentimiento cuando corresponda. La preparación técnica no implica aprobación de AdSense.

## Identidad
Nombre: RanaSports. Firma: Creado por @RanaMatiusTV. Arroba de X, Instagram, YouTube y TikTok: @RanaMatiusTV. Se mantiene el enlace original de la Agenda Deportiva de RanaMatiusTV.
