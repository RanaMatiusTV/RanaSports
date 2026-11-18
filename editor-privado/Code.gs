/**
 * RanaSports — editor privado.
 * SEGURIDAD: desplegar como Web app > Ejecutar como: Yo > Acceso: Solo yo.
 * La autenticación la gestiona Google; NUNCA agregar usuario/contraseña acá.
 * Las credenciales opcionales de GitHub van en Propiedades del script.
 */
const RS = Object.freeze({
  sheetId: '12VE1D_zlnOvmIWFhdCrKAvCHh6VOwXdaYoAczDh0Fw4',
  tab: 'Noticias',
  tz: 'America/Argentina/Buenos_Aires',
  repo: 'RanaMatiusTV/RanaSports',
  maxImageBytes: 4 * 1024 * 1024
});

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RanaSports · Redacción privada')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function sheet_() {
  const sheet = SpreadsheetApp.openById(RS.sheetId).getSheetByName(RS.tab);
  if (!sheet) throw new Error('No encontré la pestaña Noticias.');
  return sheet;
}

function text_(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max || 200000);
}

function now_() {
  const d = new Date();
  return {
    date: Utilities.formatDate(d, RS.tz, 'dd/MM/yyyy'),
    time: Utilities.formatDate(d, RS.tz, 'HH:mm')
  };
}

function digest_(values) {
  const normalized = values.map(x => x instanceof Date ? x.toISOString() : x);
  const hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, JSON.stringify(normalized));
  return Utilities.base64EncodeWebSafe(hash);
}

/**
 * Historial en un documento PRIVADO separado, no en la hoja que publica el portal.
 * Se crea con permisos del dueño del script la primera vez que se edita una nota.
 */
function historySheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('RS_PRIVATE_HISTORY_ID');
  const book = id
    ? SpreadsheetApp.openById(id)
    : SpreadsheetApp.create('RanaSports - Historial editorial privado');
  if (!id) props.setProperty('RS_PRIVATE_HISTORY_ID', book.getId());
  let sheet = book.getSheetByName('Cambios');
  if (!sheet) {
    sheet = book.getSheets()[0];
    sheet.setName('Cambios');
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Momento ARG', 'Fila original', 'Motivo', 'Título anterior',
      'Publicar','Fecha','Hora','Categoría','Título','Resumen','URL nota','URL imagen',
      'Fuente','URL fuente','URL video','Crédito foto','Destacada','URL X respaldo',
      'Estado imagen','Criterio imagen','URL imagen candidata','Bloqueo manual','URL video 2']);
  }
  return sheet;
}

function recordHistory_(sheet, originalRow, action, originalValues) {
  const moment = Utilities.formatDate(new Date(), RS.tz, 'dd/MM/yyyy HH:mm:ss');
  const target = sheet.getRange(sheet.getLastRow() + 1, 1, 1, 23);
  // Formato de texto: una fecha o URL no debe re-interpretarse al restaurar.
  target.setNumberFormat('@');
  target.setValues([[moment, originalRow, action, text_(originalValues[4], 250)]
    .concat(originalValues)]);
}

function searchNews(query) {
  const q = text_(query, 120).toLocaleLowerCase('es');
  if (q.length < 3) throw new Error('Escribí al menos 3 caracteres para buscar.');
  const s = sheet_(), last = s.getLastRow();
  if (last < 2) return { items: [] };
  const all = s.getRange(2, 1, last - 1, 5).getDisplayValues();
  const items = [];
  for (let i = all.length - 1; i >= 0 && items.length < 80; i--) {
    const r = all[i];
    if (String(r[4] || '').toLocaleLowerCase('es').includes(q)) {
      items.push({ row: i + 2, published: r[0] === 'SI', date: r[1],
        time: r[2], category: r[3], title: r[4] });
    }
  }
  return { items };
}

function listNewsHistory(row) {
  const n = Number(row), s = sheet_();
  if (!Number.isInteger(n) || n < 2 || n > s.getLastRow()) throw new Error('Fila inválida.');
  const id = PropertiesService.getScriptProperties().getProperty('RS_PRIVATE_HISTORY_ID');
  if (!id) return [];
  const h = historySheet_(), end = h.getLastRow();
  if (end < 2) return [];
  const records = h.getRange(2, 1, end - 1, 4).getDisplayValues();
  const result = [];
  for (let i = records.length - 1; i >= 0 && result.length < 30; i--) {
    const r = records[i];
    if (Number(r[1]) === n) result.push({ revision: i + 2,
      when: r[0], action: r[2], title: r[3] });
  }
  return result;
}

function restoreNews(row, revision, expectedVersion) {
  const n = Number(row), revisionRow = Number(revision);
  if (!Number.isInteger(n) || n < 2 || !Number.isInteger(revisionRow) || revisionRow < 2)
    throw new Error('Selección inválida.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const s = sheet_();
    if (n > s.getLastRow()) throw new Error('La noticia ya no existe.');
    const range = s.getRange(n, 1, 1, 19);
    const current = range.getValues()[0];
    if (!expectedVersion || digest_(current) !== expectedVersion)
      throw new Error('La noticia cambió desde que la abriste. Recargala antes de restaurar.');
    const id = PropertiesService.getScriptProperties().getProperty('RS_PRIVATE_HISTORY_ID');
    if (!id) throw new Error('Todavía no existe un historial para esta nota.');
    const h = historySheet_();
    if (revisionRow > h.getLastRow() ||
        Number(h.getRange(revisionRow, 2).getValue()) !== n)
      throw new Error('Esa versión no pertenece a la noticia seleccionada.');
    const snapshot = h.getRange(revisionRow, 5, 1, 19).getValues()[0];
    recordHistory_(h, n, 'Antes de restaurar', current);
    snapshot[17] = 'TRUE';
    range.setValues([snapshot]);
    SpreadsheetApp.flush();
    return { row: n, version: digest_(snapshot), published: String(snapshot[0]).trim() === 'SI' };
  } finally {
    lock.releaseLock();
  }
}

function recentNews() {
  const s = sheet_(), last = s.getLastRow();
  const start = Math.max(2, last - 179);
  const values = last >= 2 ? s.getRange(start, 1, last - start + 1, 19).getDisplayValues() : [];
  return {
    now: now_(),
    items: values.map((r, i) => ({
      row: start + i, published: r[0] === 'SI', date: r[1], time: r[2],
      category: r[3], title: r[4], locked: r[17] === 'TRUE'
    })).filter(x => x.title).reverse()
  };
}

function getNews(row) {
  const n = Number(row), s = sheet_();
  if (!Number.isInteger(n) || n < 2 || n > s.getLastRow()) throw new Error('Fila inválida.');
  const range = s.getRange(n, 1, 1, 19);
  const r = range.getDisplayValues()[0], raw = range.getValues()[0];
  return {
    row: n, version: digest_(raw), published: r[0] === 'SI', date: r[1], time: r[2],
    category: r[3], title: r[4], body: r[5], noteUrl: r[6],
    imageUrl: r[7], source: r[8], sourceUrl: r[9],
    embedUrl: r[10], photoCredit: r[11], featured: r[12] === 'SI',
    embedUrl2: r[18], locked: r[17] === 'TRUE'
  };
}

function allowedUrl_(url, field) {
  const value = text_(url, 2000);
  if (!value) return '';
  if (!/^https:\/\/[^\s]+$/i.test(value)) {
    throw new Error(field + ': usá una URL HTTPS completa.');
  }
  return value;
}

function saveNews(data) {
  if (!data || typeof data !== 'object') throw new Error('Faltan los datos de la nota.');
  const action = text_(data.action, 20);
  if (!['draft','publish','unpublish'].includes(action)) throw new Error('Acción incorrecta.');
  const title = text_(data.title, 250).toUpperCase();
  const body = text_(data.body, 45000).replace(/\r\n/g, '\n');
  const date = text_(data.date, 10), time = text_(data.time, 5);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Fecha/hora inválidas: DD/MM/AAAA y HH:MM.');
  }
  const image = allowedUrl_(data.imageUrl, 'Foto');
  const embed = allowedUrl_(data.embedUrl, 'Embed');
  const embed2 = allowedUrl_(data.embedUrl2, 'Segundo embed');
  const note = allowedUrl_(data.noteUrl, 'Nota enlazada');
  const sourceUrl = allowedUrl_(data.sourceUrl, 'Fuente');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let rowNumber;
  try {
    const s = sheet_(), row = Number(data.row || 0);
    const editing = Number.isInteger(row) && row >= 2 && row <= s.getLastRow();
    if (data.row && !editing) throw new Error('La noticia seleccionada ya no existe.');
    const range = editing ? s.getRange(row, 1, 1, 19) : null;
    const before = editing ? range.getValues()[0] : null;
    if (editing && (!data.version || data.version !== digest_(before))) {
      throw new Error('Esta noticia cambió mientras la editabas. Volvé a abrirla para evitar pisar cambios.');
    }
    if (!editing && action === 'unpublish') throw new Error('La noticia todavía no existe.');
    const wasPublished = editing && String(before[0]).trim().toUpperCase() === 'SI';
    const publish = action === 'publish' || (action === 'draft' && wasPublished);
    if (publish && (!title || !body || !text_(data.category, 100)))
      throw new Error('Para publicar necesitás categoría, título y texto.');
    if (publish && !editing && body.split(/\n\s*\n/).filter(Boolean).length < 2)
      throw new Error('Las noticias nuevas deben tener al menos dos párrafos.');
    const v = editing ? before.slice() : Array(19).fill('');
    v[0] = action === 'unpublish' ? 'NO' : (publish ? 'SI' : 'NO');
    v[1] = date;
    v[2] = time;
    v[3] = text_(data.category, 100);
    v[4] = title;
    v[5] = body;
    v[6] = note;
    v[7] = image;
    v[8] = text_(data.source, 150) || 'RanaSports';
    v[9] = sourceUrl;
    v[10] = embed;
    v[11] = text_(data.photoCredit, 250);
    // Conservar la prioridad editorial automática ALTA/MEDIA si no se cambió.
    if (!editing) v[12] = data.featured ? 'SI' : '';
    else if (data.featured) v[12] = 'SI';
    else if (String(v[12]).toUpperCase() === 'SI') v[12] = '';
    // No borrar el estado, crédito ni criterio de la imagen si no cambió.
    if (!editing || image !== text_(before[7], 2000)) {
      v[14] = image ? 'MANUAL' : 'SIN_FOTO';
      v[15] = image ? 'Imagen elegida por la redacción; verificar derechos de uso' : 'Sin fotografía';
      v[16] = image;
    }
    v[17] = 'TRUE'; // Protección editorial; los radares deben respetar R.
    v[18] = embed2;
    if (editing) {
      // La copia privada es obligatoria: si falla, no modificamos producción.
      const history = historySheet_();
      recordHistory_(history, row, action === 'unpublish' ? 'Antes de ocultar' : 'Antes de editar', before);
      range.setValues([v]);
      rowNumber = row;
    } else {
      s.appendRow(v);
      rowNumber = s.getLastRow();
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  // No tocar el pulso del Radar 1: GitHub recoge la planilla mediante su cron.
  const saved = sheet_().getRange(rowNumber, 1, 1, 19).getValues()[0];
  return { row: rowNumber, published: String(saved[0]) === 'SI',
    version: digest_(saved), syncRequested: false };
}

function githubToken_() {
  return PropertiesService.getScriptProperties().getProperty('GITHUB_UPLOAD_TOKEN') || '';
}

function githubRequest_(path, method, data) {
  const token = githubToken_();
  if (!token) throw new Error('Falta GITHUB_UPLOAD_TOKEN en Propiedades del script.');
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };
  if (data) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(data);
  }
  const resp = UrlFetchApp.fetch('https://api.github.com/repos/' + RS.repo + '/contents/' + path, options);
  const status = resp.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('GitHub rechazó la operación (' + status + ').');
  return JSON.parse(resp.getContentText());
}

function uploadPhoto(photo) {
  if (!photo || !photo.base64) throw new Error('Seleccioná una imagen.');
  const mime = text_(photo.mime, 50);
  const extension = ({
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'
  })[mime];
  if (!extension) throw new Error('Usá JPEG, PNG o WebP.');
  const encoded = text_(photo.base64, 8 * 1024 * 1024);
  const bytes = Utilities.base64Decode(encoded);
  if (!bytes.length || bytes.length > RS.maxImageBytes) {
    throw new Error('El tamaño máximo de foto es 4 MB.');
  }
  const b = i => bytes[i] & 255;
  const isJPEG = b(0) === 255 && b(1) === 216 && b(2) === 255;
  const isPNG = b(0) === 137 && b(1) === 80 && b(2) === 78 && b(3) === 71;
  const isWEBP = b(0) === 82 && b(1) === 73 && b(2) === 70 && b(3) === 70
    && b(8) === 87 && b(9) === 69 && b(10) === 66 && b(11) === 80;
  if (!(extension === 'jpg' && isJPEG ||
        extension === 'png' && isPNG ||
        extension === 'webp' && isWEBP)) throw new Error('El archivo no coincide con el formato indicado.');
  const stem = Utilities.formatDate(new Date(), RS.tz, 'yyyyMMdd-HHmmss');
  const filename = stem + '-' + Utilities.getUuid().slice(0, 8) + '.' + extension;
  const path = 'assets/manual/' + filename;
  githubRequest_(path, 'put', {
    message: 'RanaSports: cargar fotografía editorial manual',
    content: encoded,
    branch: 'main'
  });
  return { url: 'https://ranasports.com.ar/' + path };
}
