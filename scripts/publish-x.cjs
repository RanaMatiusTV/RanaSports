const fs = require('node:fs');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
const SITE_BASE = 'https://ranamatiustv.github.io/RanaSports/';
const STATE_PATH = '.github/x-publish-state.json';
const BUFFER_API = 'https://api.buffer.com';
const SLOT_MS = 5 * 60 * 1000;
const MAX_FUTURE_PER_CHANNEL = 10;
const MAIN_HANDLE = (process.env.BUFFER_MAIN_HANDLE || 'RanaMatiusTV').replace(/^@/, '');
const F1_HANDLE = (process.env.BUFFER_F1_HANDLE || 'RanaF1TV').replace(/^@/, '');

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      row.push(field); rows.push(row); row = []; field = '';
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else field += c;
  }
  if (quoted) throw new Error('CSV incompleto');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function timestamp(date, time) {
  let m = String(date || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let d, mo, y;
  if (m) [, d, mo, y] = m;
  else {
    m = String(date || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    [, y, mo, d] = m;
  }
  const c = String(time || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!c) return null;
  const [h, mi, s] = [Number(c[1]), Number(c[2]), Number(c[3] || 0)];
  y = Number(y); mo = Number(mo); d = Number(d);
  if (y < 2000 || mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return null;
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  // Argentina is UTC-3. This mirrors the website's news-feed.js identity timestamp.
  return Date.UTC(y, mo - 1, d, h + 3, mi, s);
}

function safeURL(value) {
  if (!String(value || '').trim()) return '';
  try {
    const u = new URL(String(value).trim());
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch { return ''; }
}

function isXPost(url) {
  try {
    const u = new URL(url);
    return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname) && /\/status\/\d+/.test(u.pathname);
  } catch { return false; }
}

function isInstagramPost(url) {
  try {
    const u = new URL(url);
    return /(^|\.)instagram\.com$/.test(u.hostname) && /^\/(p|reel|reels)\//.test(u.pathname);
  } catch { return false; }
}

function xPostToDirectImage(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const si = parts.indexOf('status');
    const handle = parts[0], id = parts[si + 1];
    if (!handle || !/^\d+$/.test(id || '')) return '';
    return `https://d.fxtwitter.com/${encodeURIComponent(handle)}/status/${id}/photo/1`;
  } catch { return ''; }
}

function imageURL(value) {
  const url = safeURL(value);
  if (!url) return '';
  if (isXPost(url)) return xPostToDirectImage(url);
  if (isInstagramPost(url)) return '';
  return url;
}

function canonicalCategory(raw) {
  let c = normalize(raw);
  return ({
    'formula 1': 'f1',
    'formula uno': 'f1',
    'futbol argentino': 'futbol',
    'seleccion argentina': 'seleccion',
    'otros deportes': 'otros'
  })[c] || c;
}

function articleURL(item) {
  const identity = JSON.stringify([item.category, item.date, item.title]);
  const id = Buffer.from(identity, 'utf8').toString('base64url');
  return `${SITE_BASE}noticia.html?n=${id}`;
}

function readNews(text) {
  const [header, ...rows] = parseCSV(text);
  if (!header) throw new Error('CSV sin encabezados');
  const keys = header.map(normalize);
  const idx = name => keys.indexOf(normalize(name));
  const needed = ['Publicar', 'Fecha', 'Hora', 'Categoría', 'Título', 'Resumen', 'URL imagen'];
  if (!needed.every(h => idx(h) >= 0)) throw new Error('Encabezados insuficientes en CSV');

  return rows.flatMap(values => {
    const get = name => idx(name) >= 0 ? String(values[idx(name)] || '').trim() : '';
    if (normalize(get('Publicar')) !== 'si') return [];
    const date = timestamp(get('Fecha'), get('Hora'));
    const category = canonicalCategory(get('Categoría'));
    const title = get('Título');
    const summary = get('Resumen');
    if (date === null || !category || !title || !summary) return [];
    return [{
      category,
      sport: get('Categoría'),
      date,
      title,
      summary,
      image: imageURL(get('URL imagen')),
      featured: normalize(get('Destacada')) === 'si'
    }];
  }).sort((a, b) => a.date - b.date);
}

function accountFor(item) {
  const c = item.category;
  const corpus = normalize(`${item.sport} ${item.title} ${item.summary}`);
  const isF1 = c === 'f1' || /\bformula 1\b|\bf1\b/.test(normalize(item.sport));
  if (isF1) return 'f1';

  const isIndependiente = c === 'independiente';
  const isSeleccion = c === 'seleccion';
  if (isIndependiente || isSeleccion) return 'main';

  const footballish = c === 'futbol' || /futbol|champions|libertadores|sudamericana|premier|laliga|serie a|bundesliga|ligue 1/.test(corpus);
  const argentinaInterest = /\bargentin[oa]s?\b|\bmessi\b|\bdibu\b|\bjulian alvarez\b|\blautaro\b|\bmac allister\b|\benzo fernandez\b|\bgarnacho\b|\bmastantuono\b|\bpaz\b/.test(corpus);
  if (item.featured && (footballish || argentinaInterest)) return 'main';
  return null;
}

function priority(item) {
  if (item.category === 'independiente' || item.category === 'seleccion') return 3;
  if (item.featured) return 2;
  return 1;
}

function emojiFor(item, account) {
  if (account === 'f1') return '🏁';
  if (item.category === 'independiente') return '🔴';
  if (item.category === 'seleccion' || /argentin/.test(normalize(`${item.title} ${item.summary}`))) return '🇦🇷';
  return '⚽';
}

function postText(item, account, url) {
  const emoji = emojiFor(item, account);
  let title = item.title.trim();
  if (title.length > 190) title = title.slice(0, 187).trimEnd() + '…';
  return `${emoji} ${title}\n\n${url}`;
}

async function validateImage(url) {
  if (!url) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'RanaSports/1.0 (+https://ranamatiustv.github.io/RanaSports/)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    const type = (response.headers.get('content-type') || '').toLowerCase();
    if (!response.ok || !type.startsWith('image/')) return '';
    try { await response.body?.cancel(); } catch {}
    return safeURL(response.url) || url;
  } catch { return ''; }
  finally { clearTimeout(timer); }
}

function gqlString(value) { return JSON.stringify(String(value)); }

async function bufferRequest(apiKey, query) {
  const response = await fetch(BUFFER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ query })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errors?.length) throw new Error(data.errors?.[0]?.message || `Buffer HTTP ${response.status}`);
  return data.data;
}

async function discoverChannels(apiKey, state) {
  state.buffer ||= {};
  if (state.buffer.mainChannelId && state.buffer.f1ChannelId) return;

  const orgData = await bufferRequest(apiKey, `query GetOrganizations { account { organizations { id name } } }`);
  const org = orgData?.account?.organizations?.[0];
  if (!org?.id) throw new Error('Buffer no devolvió una organización');
  state.buffer.organizationId = org.id;

  const channelData = await bufferRequest(apiKey, `query GetChannels { channels(input:{organizationId:${gqlString(org.id)}}){ id name displayName service } }`);
  const channels = channelData?.channels || [];
  const twitter = channels.filter(ch => normalize(ch.service) === 'twitter');
  const matches = (ch, handle) => {
    const needle = normalize(handle);
    return [ch.name, ch.displayName].some(v => normalize(v).replace(/^@/, '').includes(needle));
  };
  const main = twitter.find(ch => matches(ch, MAIN_HANDLE));
  const f1 = twitter.find(ch => matches(ch, F1_HANDLE));
  if (main) state.buffer.mainChannelId = main.id;
  if (f1) state.buffer.f1ChannelId = f1.id;
}

async function createBufferPost(apiKey, channelId, text, image, dueAt) {
  const query = `mutation CreatePost {
    createPost(input:{
      text:${gqlString(text)},
      channelId:${gqlString(channelId)},
      schedulingType:automatic,
      mode:customScheduled,
      dueAt:${gqlString(dueAt)},
      assets:[{image:{url:${gqlString(image)}}}]
    }) {
      ... on PostActionSuccess { post { id text dueAt channelId } }
      ... on MutationError { message }
    }
  }`;
  const data = await bufferRequest(apiKey, query);
  const result = data?.createPost;
  if (!result?.post?.id) throw new Error(result?.message || 'Buffer no creó la publicación');
  return result.post;
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch { return { activationAt: new Date().toISOString(), processed: {}, nextAt: {}, buffer: {} }; }
}

function writeState(state) {
  const entries = Object.entries(state.processed || {}).sort((a, b) => Date.parse(b[1].createdAt || 0) - Date.parse(a[1].createdAt || 0)).slice(0, 600);
  state.processed = Object.fromEntries(entries);
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
}

function ceilFiveMinutes(ms) {
  return Math.ceil(ms / SLOT_MS) * SLOT_MS;
}

function futureCount(state, account, now) {
  return Object.values(state.processed || {}).filter(x => x.account === account && Date.parse(x.dueAt || 0) > now).length;
}

function nextDueAt(state, account, now) {
  state.nextAt ||= {};
  const earliest = ceilFiveMinutes(now + 60_000);
  const remembered = Date.parse(state.nextAt[account] || 0);
  const due = Math.max(earliest, Number.isFinite(remembered) ? remembered : 0);
  state.nextAt[account] = new Date(due + SLOT_MS).toISOString();
  return new Date(due).toISOString();
}

async function main() {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) {
    console.log('BUFFER_API_KEY no está configurado; no se publica nada todavía.');
    return;
  }

  const state = readState();
  state.processed ||= {};
  state.nextAt ||= {};
  state.buffer ||= {};
  const activation = Date.parse(state.activationAt || 0) || Date.now();

  const csvResponse = await fetch(CSV_URL, { cache: 'no-store', headers: { 'User-Agent': 'RanaSports/1.0' } });
  if (!csvResponse.ok) throw new Error(`No se pudo leer el CSV (${csvResponse.status})`);
  const news = readNews(await csvResponse.text());

  let candidates = news.flatMap(item => {
    if (item.date < activation) return [];
    const account = accountFor(item);
    if (!account) return [];
    const url = articleURL(item);
    if (state.processed[url]) return [];
    return [{ item, account, url }];
  });

  candidates.sort((a, b) => priority(b.item) - priority(a.item) || a.item.date - b.item.date);
  if (!candidates.length) {
    console.log('Sin noticias nuevas aptas para X.');
    return;
  }

  await discoverChannels(apiKey, state);
  writeState(state);

  const now = Date.now();
  let scheduled = 0;
  for (const candidate of candidates) {
    const { item, account, url } = candidate;
    const channelId = account === 'f1' ? state.buffer.f1ChannelId : state.buffer.mainChannelId;
    if (!channelId) {
      console.log(`Canal de Buffer faltante para ${account === 'f1' ? '@' + F1_HANDLE : '@' + MAIN_HANDLE}; se reintentará.`);
      continue;
    }
    if (futureCount(state, account, now) >= MAX_FUTURE_PER_CHANNEL) {
      console.log(`Cola llena para ${account}; se reintentará en otra ejecución.`);
      continue;
    }

    const validImage = await validateImage(item.image);
    if (!validImage) {
      console.log(`NO PUBLICADO (foto inválida): ${item.title}`);
      continue;
    }

    const dueAt = nextDueAt(state, account, Date.now());
    try {
      const post = await createBufferPost(apiKey, channelId, postText(item, account, url), validImage, dueAt);
      state.processed[url] = {
        account,
        title: item.title,
        dueAt,
        bufferPostId: post.id,
        createdAt: new Date().toISOString()
      };
      scheduled++;
      console.log(`PROGRAMADO ${account} ${dueAt}: ${item.title}`);
      writeState(state);
    } catch (error) {
      console.error(`ERROR Buffer: ${item.title}: ${error.message}`);
      // Undo the reserved slot when Buffer rejected the post.
      state.nextAt[account] = dueAt;
    }
  }

  console.log(`Total programadas en esta ejecución: ${scheduled}`);
  writeState(state);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
