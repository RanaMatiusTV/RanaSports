# Preparación de Google AdSense

Estado al 6 de octubre de 2026: integración publicitaria desactivada. No se añade
el script de AdSense, unidades publicitarias, solicitudes de anuncios ni una CMP
activa. `adsense-config.example.js` es una plantilla documental sin referencias
desde las páginas: cambiar sus valores no activa ni bloquea código de terceros.
Los embeds existentes siguen funcionando y pueden tener sus propias cookies o
publicidad; no son unidades AdSense de RanaSports.

## Solicitar la revisión sin activar anuncios

1. Añadir `ranasports.com.ar` en **Sitios** de la cuenta AdSense correcta.
2. Usar el método de verificación que ofrezca la cuenta sin carga de anuncios
   (por ejemplo, propiedad de Search Console, metaetiqueta o ads.txt, si están
   disponibles). Copiar únicamente el identificador real proporcionado por Google.
   No se incluyó un ID ficticio ni un ads.txt inventado. Si se solicita una etiqueta
   de verificación, integrarla y comprobarla antes de enviar la revisión.
3. Mantener **Anuncios automáticos desactivados** y no insertar unidades. La
   aprobación del sitio no debe interpretarse como permiso para activar el código
   sin completar y probar el consentimiento.
4. Revisar el contenido editorial descrito abajo y solicitar la revisión desde
   AdSense. La estructura técnica no garantiza la aprobación.

## CMP de Google: integración posterior, antes de servir anuncios

1. En **Privacidad y mensajes** de AdSense, configurar la CMP certificada de Google
   y el mensaje de normativas europeas para el dominio. Incluir EEE, Reino Unido y
   Suiza, idioma español y demás idiomas necesarios; revisar otras regiones según
   audiencia y requisitos de la cuenta.
2. Vincular `https://ranasports.com.ar/legal/privacidad.html`; revisar finalidades,
   proveedores y sus enlaces, y habilitar opciones de rechazo y gestión de elecciones.
   Actualizar la política con los proveedores efectivamente seleccionados.
3. Publicar el mensaje y seguir las instrucciones actuales de integración que
   muestre la cuenta. Algunas modalidades dependen de la etiqueta de AdSense:
   probarlas en un entorno controlado, con anuncios automáticos y unidades apagados,
   antes de desplegar la carga de anuncios. No copiar IDs ni etiquetas de ejemplos.
4. Añadir el control oficial para reabrir/retirar el consentimiento en los pies de
   todas las páginas donde se integre publicidad y en
   `legal/privacidad.html#consentimiento`, donde ya existe un punto documentado de
   integración. El enlace informativo actual no es un botón de consentimiento.
5. Comprobar en el navegador los estados inicial, aceptar, rechazar, personalizar,
   retirar y visita posterior, incluyendo tráfico de las regiones correspondientes.
   Comprobar el estado TCF, el listado de proveedores y que no se ejecuten solicitudes
   publicitarias sin las condiciones exigidas. Ante fallo de la CMP, mantener la
   publicidad apagada. Probar también tras actualizar el service worker.
6. Solo después de aprobación, publicación y pruebas de la CMP, incorporar el
   código oficial, el ads.txt real si corresponde y unos pocos espacios identificados
   como publicidad. Excluir páginas vacías, errores y notas pendientes de revisión.
   Actualizar la redacción en futuro de la política al activar la integración.

No sustituir una CMP certificada por un banner propio, una bandera en localStorage
o Consent Mode: ninguno de esos elementos por sí solo cumple esa función.

## Contenido editorial y plantilla dinámica

- `Resumen` se muestra completo, dividido en párrafos según las líneas en blanco.
  Los saltos simples también se conservan visualmente. No se recorta el texto de la nota.
- Se admite una columna opcional **Cuerpo** al final de la planilla, después de las
  18 existentes. Como alternativas se reconocen **Contenido** y **Texto completo**,
  en ese orden de prioridad; usar una sola para evitar ambigüedad. La sincronización
  conserva ahora esas columnas tanto en el CSV reciente como en el archivo histórico.
- Se muestra resumen seguido del cuerpo disponible, antes de los embeds. Si el
  cuerpo comienza exactamente con los mismos párrafos del resumen, ese inicio se
  muestra una sola vez. El contenido es texto plano; no se interpreta HTML.
- No se recupera ni se copia automáticamente texto desde `URL nota` o `URL fuente`.
  Se muestran esos enlaces para trazabilidad. El cuerpo debe ser aportado y revisado
  por la redacción, con derechos de uso y valor propio.
- El encabezado, la fecha, los párrafos, las fuentes y los enlaces editoriales son
  visibles; los datos `NewsArticle` contienen el mismo texto editorial mostrado.
  Los identificadores de las notas, las categorías y la lógica de embeds se conservan.
- Los CSV revisados no tienen una columna de cuerpo independiente. Habilitar ese
  campo no agrega contenido a las notas existentes. Revisar especialmente las que
  solo contengan un párrafo breve y un embed: contexto verificable, explicación
  propia, fuente y utilidad para el lector. No rellenar con texto artificial ni
  copiar notas de terceros. No hay un umbral de palabras implementado como supuesto
  requisito de Google, ni se desindexan automáticamente las notas breves.
- La página sigue siendo dinámica y requiere JavaScript. La metadata social se
  actualiza al renderizar; los robots que no ejecutan JS pueden ver la plantilla
  genérica. Esta preparación no añade prerenderizado.

## Verificación antes de activar anuncios

Revisar portada, navegación, nota reciente e histórica, URL inexistente, compartir,
comentarios y embeds de X, YouTube y proveedores admitidos, en escritorio y móvil.
Confirmar que no existen etiquetas `adsbygoogle`, que no se solicitan recursos de
AdSense y que el despliegue **pages build and deployment** corresponde al commit
publicado. El service worker se versionó para renovar los archivos guardados.

## Referencias oficiales consultadas

- [Contenido obligatorio de la política de privacidad](https://support.google.com/adsense/answer/1348695?hl=es)
- [CMP certificada para editores](https://support.google.com/adsense/answer/13554116?hl=es)
- [Preparar las páginas y contenido original](https://support.google.com/adsense/answer/7299563?hl=es)
- [Verificación y revisión del sitio](https://support.google.com/adsense/answer/12176698?hl=es)

Volver a consultar las instrucciones de la cuenta al activar la integración.
