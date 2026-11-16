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
  const r = s.getRange(n, 1, 1, 19).getDisplayValues()[0];
  return {
    row: n, published: r[0] === 'SI', date: r[1], time: r[2],
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
  if (action !== 'draft' && action !== 'publish') throw new Error('Acción incorrecta.');
  const publish = action === 'publish';
  const title = text_(data.title, 250).toUpperCase();
  const body = text_(data.body, 50000).replace(/\r\n/g, '\n');
  if (publish && (!title || !body || !text_(data.category, 100))) {
    throw new Error('Para publicar necesitás categoría, título y texto.');
  }
  if (publish && body.split(/\n\s*\n/).filter(Boolean).length < 2) {
    throw new Error('La noticia debe tener como mínimo dos párrafos separados por una línea en blanco.');
  }
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
    const v = editing
      ? s.getRange(row, 1, 1, 19).getValues()[0]
      : Array(19).fill('');
    v[0] = publish ? 'SI' : 'NO';
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
    v[12] = data.featured ? 'SI' : '';
    v[14] = image ? 'MANUAL' : 'SIN_FOTO';
    v[15] = image ? 'Imagen elegida por la redacción; verificar derechos de uso' : 'Sin fotografía';
    v[16] = image;
    v[17] = 'TRUE'; // BLOQUEO MANUAL: radares no deben alterar la nota
    v[18] = embed2;
    if (editing) {
      s.getRange(row, 1, 1, 19).setValues([v]);
      rowNumber = row;
    } else {
      s.appendRow(v);
      rowNumber = s.getLastRow();
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  // El workflow programado de GitHub revisa la hoja periódicamente.
  // Con token opcional, pedimos sincronización al guardar, sin exponerlo al navegador.
  let syncedNow = false;
  if (publish) {
    try { syncedNow = triggerSync_(title); }
    catch (error) { console.warn('Se usará la sincronización periódica: ' + error); }
  }
  return { row: rowNumber, published: publish, syncRequested: syncedNow };
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

function triggerSync_(title) {
  if (!githubToken_()) return false;
  const path = '.github/radar-sync-pulse.txt';
  const file = githubRequest_(path, 'get');
  const current = now_();
  const message = [
    'RANASPORTS — PUBLICACIÓN EDITORIAL MANUAL',
    'Fecha: ' + current.date + ' ' + current.time + ' ARG',
    'Última noticia: ' + title,
    'Origen: editor privado, publicación protegida por R=TRUE.'
  ].join('\n') + '\n';
  githubRequest_(path, 'put', {
    message: 'RanaSports: sincronizar nota publicada desde editor privado',
    content: Utilities.base64Encode(message, Utilities.Charset.UTF_8),
    sha: file.sha,
    branch: 'main'
  });
  return true;
}
