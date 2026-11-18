# RanaSports — redacción privada (Google Apps Script)

Este directorio contiene **código fuente para instalar**, no un panel activo. **No se instala ni autentica dentro de GitHub Pages**: el sitio público no admite sesiones privadas ni contraseñas seguras sin un servicio aparte.

## Acceso seguro

Usamos la cuenta de Google del editor (usuario + contraseña de Google, idealmente con verificación en dos pasos). El proyecto de Apps Script debe desplegarse como:

- **Tipo de implementación:** Aplicación web.
- **Ejecutar como:** Yo.
- **Quién tiene acceso:** **Solo yo**.

La autenticación y el control de acceso los aplica Google. Si no figura «Solo yo», **no desplegar** con «Cualquiera» o «Cualquier usuario con cuenta de Google». No agregar contraseñas ni claves dentro de los archivos HTML/JavaScript, GitHub, Google Sheets ni el chat.

## Instalación inicial

1. Ingresar a [script.google.com](https://script.google.com/) con la misma cuenta que puede editar la planilla **RanaSports Noticias**.
2. Crear un **Nuevo proyecto** y nombrarlo «RanaSports Editor Privado».
3. Abrir el archivo **Code.gs** del proyecto y reemplazar su contenido por el de [Code.gs](./Code.gs).
4. Pulsar **+ > HTML**, crear un archivo llamado **Index** y pegar el contenido de [Index.html](./Index.html) (Apps Script lo guarda como Index.html).
5. Guardar el proyecto y elegir **Implementar > Nueva implementación > Aplicación web**, con **Ejecutar como: Yo** y **Acceso: Solo yo**. Autorizar los permisos de Google Sheets solicitados.
6. Copiar la URL de la aplicación web. Ese es el **panel privado real**. Guardarla como favorito en el teléfono y la PC. El sitio público ranasports.com.ar **no tendrá un enlace al editor**.

Google Apps Script gestiona la cuenta y la autenticación. Código fuente y acceso al panel son cosas distintas: el código está en un repositorio público, pero el despliegue privado solo es accesible por la cuenta autorizada.

## Qué permite

- Crear borradores (A = NO) y publicar artículos (A = SI).
- Editar cualquier nota existente, incluidas las del radar: título, texto, fecha/hora, foto, crédito, fuente, categoría y hasta dos embeds.
- Buscar noticias de cualquier fecha por una parte del título, sin depender de las últimas 180.
- Guardar los cambios de una noticia publicada sin despublicarla accidentalmente.
- Despublicar expresamente una nota, previa confirmación. **Cuidado:** el control de datos antiguos de GitHub puede demorar o impedir que desaparezca la nota más reciente; verificar el resultado público.
- Consultar hasta 30 versiones previas por nota y restaurarlas. Cada modificación conserva el estado anterior en una **planilla nueva, privada e independiente**, creada automáticamente en Google Drive al editar por primera vez.
- Evitar pisar ediciones simultáneas mediante un control de versión: si la fila cambió desde que se abrió, hay que volver a cargarla.
- Cambiar solo una foto o un embed sobre una noticia ya publicada, sin rehacer el resto del contenido.
- Marcar la nota como **protegida** en la columna R = TRUE cuando se guarda manualmente. **Importante:** esta marca solo protege efectivamente contra radares configurados para respetarla; el editor por sí solo no puede impedir cambios hechos desde otro proceso.
- Previsualizar título, párrafos y fotografía.
- Usar una imagen directa por URL HTTPS sin configuración adicional.
- Subir fotografías locales al repositorio, **solo cuando se configure un permiso de GitHub**.

Los artículos manuales se guardan en la pestaña Noticias de la planilla original y se ordenan en la portada según **Fecha** y **Hora** (Argentina), no según el orden de carga. Verificar el horario real del acontecimiento antes de fechar retrospectivamente.

**Importante:** publicar una foto o embed requiere respetar los derechos de autor, las condiciones de inserción y los permisos correspondientes. Una fotografía subida al sitio será **pública**, aunque el editor sea privado.

## Subir fotos desde el dispositivo (opcional)

El botón de subida local necesita un permiso de GitHub. **No compartas un token por chat**.

1. En GitHub, crear un **fine-grained personal access token** limitado **solo** al repositorio RanaMatiusTV/RanaSports, con **Repository permissions > Contents: Read and write**. No darle acceso a otros repositorios ni otros permisos.
2. Dentro del editor de Apps Script ir a **Configuración del proyecto > Propiedades del script > Agregar propiedad**.
3. Nombre: **GITHUB_UPLOAD_TOKEN** / Valor: pegar ahí el token. Guardar. Nunca colocarlo en Code.gs, Index.html, README o Google Sheets.
4. Volver a desplegar la versión actualizada si es necesario y probar una foto propia no sensible. Las subidas se guardarán en assets/manual/ y aparecerán en ranasports.com.ar/assets/manual/ una vez desplegado GitHub Pages.

El token se usa **únicamente para subir fotos**. Publicar/editar notas no escribe en el pulso de los radares ni modifica automatizaciones. Las noticias entran en la planilla y se incorporan al feed mediante la sincronización programada de GitHub, actualmente cada cinco minutos; el tiempo efectivo puede ser mayor por propagación de Google Sheets y GitHub Pages.

**No usar el enlace de prueba /dev como sustituto de la aplicación desplegada /exec** para trabajar cotidianamente; cada actualización del proyecto puede requerir nueva versión de implementación.

## Prueba de aceptación antes de usar en producción

1. Guardar una nota como **borrador**. Verificar en Google Sheets: A = NO, R = TRUE y texto conservado; no debe aparecer públicamente.
2. Volver a abrir el borrador, agregar foto HTTPS y un embed oficial compatible, publicar. Verificar en Sheets: A = SI, R = TRUE; después esperar la sincronización y comprobar la nota en RanaSports.
3. Editar una nota publicada del radar y reemplazar solo la foto o el embed. Confirmar que título/cuerpo, prioridad editorial y metadatos de foto siguen intactos y R queda TRUE.
4. Verificar que el historial privado muestre la versión anterior, restaurar una edición de prueba y revisar el portal tras la sincronización.
5. Abrir la misma URL /exec desde el celular con la misma cuenta de Google. Confirmar que otra cuenta Google o una ventana sin iniciar sesión **no puede abrir el panel privado**. Si puede abrirse, **desactivar la implementación** y corregir quién tiene acceso antes de utilizarlo.

## Restricciones reales

- Este código todavía requiere la **instalación y despliegue manual** por el propietario de la cuenta; el repositorio por sí solo no da una URL privada funcional. Los archivos se guardan solo en la rama `editor-privado-fuentes`, **fuera de GitHub Pages**.
- El acceso desde cualquier dispositivo es mediante navegador y la **misma cuenta de Google** propietaria del despliegue; el panel es adaptable a PC y celular.
- El historial se guarda en otro documento de Sheets privado creado por el script. No compartir ni publicar ese archivo. Para conservarlo, no eliminarlo de Drive.
- Se debe comprobar que las automatizaciones respetan R=TRUE; este editor no cambia sus instrucciones.
- El panel no instala un sistema propio de usuario/contraseña. Aprovecha la autenticación existente de Google, más segura que esconder una clave en una página estática.
- Si algún día necesitás cuentas independientes para otros redactores, roles, auditoría o autenticación exclusiva de RanaSports, necesitaremos un servicio de identidad y un backend con permisos adecuados, no GitHub Pages sin protección.
- Si se cambia fecha, hora o título de una noticia existente, su URL interna puede modificarse, porque el portal usa esos datos para construir el identificador del artículo.
- No guardar datos personales sensibles en la planilla o las fotos; el contenido editorial publicado será público.
