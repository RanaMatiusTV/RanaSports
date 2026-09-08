# RanaSports
Portal deportivo creado por @RanaMatiusTV

Sitio estático oficial: https://ranamatiustv.github.io/RanaSports/

HTML, CSS y JavaScript sin dependencias, servicios pagos ni compilación. Diseño adaptable, búsqueda y filtros, agenda externa y PWA instalable por HTTPS. Las páginas y los iconos quedan disponibles sin conexión tras la primera visita. La agenda externa requiere Internet.

## Publicación
GitHub Pages: Settings → Pages → Deploy from a branch → main → / (root). El archivo .nojekyll permite publicar los archivos estáticos directamente. Cada push a main actualiza el sitio. Se conserva el commit inicial del repositorio.

## Desarrollo
Servir esta carpeta con cualquier servidor HTTP estático. No abrir con file:// para probar la PWA. Probar también bajo /RanaSports/ para reproducir Pages.

## Noticias automáticas desde CSV
La portada lee la planilla publicada configurada en assets/news-feed.js al abrirse, al recuperar conexión y cada cinco minutos mientras está visible. Google puede demorar en actualizar su CSV publicado. No hace falta un commit por cada noticia.

Columnas: Publicar, Fecha, Hora, Categoría, Título, Resumen, URL nota, URL imagen, Fuente, URL fuente, URL video. Se admite otro orden de columnas. Publicar debe ser SI (se toleran espacios, minúsculas y acento). Las filas requieren fecha, hora, categoría no vacía, título y resumen; las incompletas se omiten. Fechas admitidas: D/M/AAAA o AAAA-MM-DD. Hora: H:mm o HH:mm:ss, en horario argentino. Se ordenan por fecha y hora descendentes.

Categorías principales: Independiente, Fútbol, F1, Selección y Agenda. Cualquier otra categoría no vacía se acepta y se agrupa en Más deportes. La tarjeta y la nota muestran el nombre del deporte tal como llega del CSV; la agrupación no altera la identidad de las URLs existentes. El hash #otros se conserva por compatibilidad. Los enlaces e imagen son opcionales. Cada tarjeta enlaza a noticia.html?n=… desde el título, la imagen y Leer →, incluso sin URL nota. URL nota permanece en la planilla pero ya no determina el destino de esos enlaces. Sin imagen se muestra una tarjeta de texto. URL video habilita ▶ Ver video. Fuente y URL fuente permanecen compatibles con la planilla, pero no se muestran fuentes ni créditos externos. Se conserva la marca Creado por @RanaMatiusTV. Las URLs solo aceptan HTTP/HTTPS y el contenido se trata como texto, nunca como HTML.

El navegador conserva la última carga válida de la planilla para leer las tarjetas sin conexión e informa cuando no puede actualizarla. Una planilla válida sin filas publicables limpia la versión anterior. Si el almacenamiento está deshabilitado, la carga en línea funciona igualmente. Las imágenes y enlaces externos requieren conexión; las notas locales incluidas en CORE de sw.js conservan su modo offline. Los metadatos SEO existentes se mantienen; las tarjetas del CSV se generan mediante JavaScript.

Las presentaciones originales y el template HTML anterior permanecen en index.html; el template es una referencia inerte y el CSV controla el listado de actualidad. No se publican datos de prueba.

Para agregar una nota local opcional, crear su HTML con fuentes verificadas y metadatos, sumar la URL a sitemap.xml y el archivo a CORE de sw.js, y cargar su URL en la planilla. Las notas F1 usan body data-category="f1" y el botón data-f1-channel de noticias/rana-f1.html. El canal especializado no debe agregarse al hero ni a redes generales.

## Google AdSense (desactivado)
Los espacios data-ad-slot están reservados y ocultos hasta su configuración. No se cargan scripts publicitarios ni IDs ficticios. Al habilitarlo, usar el código oficial de la cuenta, configurar los bloques y ads.txt según indique Google, actualizar la política de privacidad a la implementación real y configurar el consentimiento cuando corresponda. La preparación técnica no implica aprobación de AdSense.

## Identidad
Nombre: RanaSports. Firma: Creado por @RanaMatiusTV. Arroba de X, Instagram, YouTube y TikTok: @RanaMatiusTV. Se mantiene el enlace original de la Agenda Deportiva de RanaMatiusTV.

## Vistas individuales automáticas
Las tarjetas recortan visualmente Resumen a tres líneas; noticia.html muestra el mismo Resumen completo, conservando sus saltos de línea, sin generar ni completar texto. No se agregan columnas. La identidad de la URL codifica sin pérdida categoría normalizada, fecha/hora y título. Reordenar filas o editar Resumen, imagen, fuente o video conserva la URL; cambiar título, categoría o fecha/hora genera otra URL. Filas con idéntica categoría, fecha/hora y título representan la misma identidad.

La vista permite acceso directo y recarga por URL en Pages. Comparte la última copia CSV de la portada para lectura offline; las imágenes y videos externos requieren conexión. Una fila retirada o un identificador inválido muestra Noticia no disponible. Los metadatos, canonical y NewsArticle se completan en el navegador al cargar una noticia válida; los rastreadores que no ejecutan JavaScript solo verán los metadatos genéricos. No se generan archivos HTML por fila ni se modifica Google Sheets.
