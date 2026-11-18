# RanaSports · Panel editorial (versión inicial)

Ruta prevista tras incorporar los cambios a la rama principal: https://ranasports.com.ar/editor/

## Funcionamiento

- Aplicación estática, adaptable a celular y computadora.
- Identificación con Google mediante el Firebase Authentication que ya usa RanaSports.
- Solicita autorización OAuth de Google Sheets; las operaciones de lectura y escritura las verifica Google con la cuenta del usuario.
- Lista las noticias leyendo las columnas A:E de la pestaña `Noticias`.
- Al seleccionar una noticia lee las columnas A:S, valida que la fila no haya cambiado y permite editar título, texto, fecha, hora, categoría, publicación, imagen, fuente y URLs de video.
- Para una nota nueva, usa la API `spreadsheets.values.append`, agregando una fila completa de 19 columnas.
- Guarda las ediciones de una nota existente mediante `spreadsheets.values.batchUpdate` de los rangos A:F, H:M y R:S. No modifica G ni N:Q ni las columnas posteriores a S.
- Al guardar establece R (`🔒 BLOQUEO MANUAL`) en TRUE. **Es indispensable verificar que los radares automáticos respeten esta columna**; el panel no puede impedir por sí solo que un radar sobrescriba una nota.
- No crea un backend ni almacena contraseñas, tokens o datos en el repositorio. El token OAuth existe solo en la memoria de la pestaña y se pierde al recargar, por lo que hay que volver a ingresar.

## Antes de usarlo

1. En Firebase Authentication de `ranasports-172b6`, verificar que Google esté habilitado como proveedor y que `ranasports.com.ar` figure como dominio autorizado.
2. En el proyecto Google Cloud relacionado, verificar que la API **Google Sheets API** esté habilitada y que el consentimiento OAuth permita el alcance `https://www.googleapis.com/auth/spreadsheets`. Puede requerir configuración de pantalla de consentimiento y usuarios de prueba o verificación de Google; esta parte no se puede configurar desde el repositorio.
3. Ingresar con una cuenta de Google que tenga permiso de **Editor** en el documento RanaSports Noticias.
4. Probar primero con una noticia de borrador (Publicar=NO); comprobar que aparece en la planilla, que se puede editar y que los campos guardados coinciden antes de publicar.
5. Confirmar la sincronización de Google Sheets -> CSV -> GitHub Pages y la protección manual de las filas frente a los radares.

## Limitaciones de la versión inicial

- Las fotos se ingresan mediante URL pública HTTPS. No hay carga de archivos binarios.
- La publicación en la web no es instantánea: depende de la sincronización del sitio y de Google.
- El código cliente queda publicado, como es habitual en un sitio estático. **La seguridad es el permiso de acceso a Google Sheets, no ocultar la ruta /editor.**
- No hay historial propio de cambios ni restauración automática: usar el historial de versiones de Google Sheets para recuperar un error.
- No está probada todavía la autorización OAuth real en una cuenta de usuario; esa prueba es imprescindible antes de considerar la herramienta operativa.
