const fs = require('node:fs');

const NEWS_PATH = 'assets/news-live.csv';
const SITE_BASE = 'https://ranasports.com.ar/';
const LEGACY_SITE_BASE = 'https://ranamatiustv.github.io/RanaSports/';
const STATE_PATH = '.github/x-publish-state.json';
const BUFFER_API = 'https://api.buffer.com';
const SLOT_MS = 5 * 60 * 1000;
const MAX_FUTURE_PER_CHANNEL = 8;
const CONFIG_PATH = 'config/x-distribution.json';
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

function articleId(item) {
  const identity = JSON.stringify([item.category, item.date, item.title]);
  return Buffer.from(identity, 'utf8').toString('base64url');
}

function articleURL(item) {
  return `${SITE_BASE}noticia.html?n=${articleId(item)}`;
}

function legacyArticleURL(item) {
  return `${LEGACY_SITE_BASE}noticia.html?n=${articleId(item)}`;
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
  const c = item.category, name=normalize(item.sport), headline=normalize(item.title);
  if (c === 'independiente' || name === 'independiente') return 'main';
  if (['f1','f2','f3','formula 1','formula 2','formula 3'].includes(c) || /\\bformula [123]\\b/.test(name)) return 'f1';
  // For mixed football categories, identify CAI only by unambiguous references.
  if (/\\bindependiente\\b/.test(headline) && !/\\bindependiente rivadavia\\b/.test(headline) &&
      /\\b(cai|avellaneda|rojo|vaccari|quinteros)\\b/.test(headline)) return 'main';
  return 'sports';
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

function linkEmojiFor(item, account) {
  const corpus = normalize(`${item.sport} ${item.title} ${item.summary}`);
  if (/choque|choco|accidente|golpe|contra el muro|se estrello|impacto/.test(corpus)) return '💥';
  if (/lesion|lesionado|lesionada|parte medico|hospital|operacion/.test(corpus)) return '🤕';
  if (/campeon|titulo|consagro|gano|victoria|triunfo/.test(corpus)) return '🏆';
  if (/gol|goleo|hat-trick|doblete/.test(corpus)) return '⚽';
  if (/record|historico/.test(corpus)) return '📈';
  if (/pole|clasificacion|qualifying|largara/.test(corpus)) return '⏱️';
  if (/mercado|refuerzo|fichaje|transferencia|contrato|firma|llega|se va|venta|prestamo/.test(corpus)) return '🔄';
  if (/declar|dijo|afirmo|hablo|explico|conto|revelo/.test(corpus)) return '🗣️';
  if (/sancion|suspendido|suspension|expulsado|expulsion|inhabilitado/.test(corpus)) return '🚫';
  if (/polemica|escandalo|cruce|pelea|tension/.test(corpus)) return '🔥';
  if (item.category === 'independiente') return '🔴';
  if (item.category === 'seleccion') return '🇦🇷';
  if (/\bcolapinto\b|\bvarrone\b|\bcolnaghi\b|\bfenestraz\b|\bargentin[oa]s?\b/.test(corpus)) return '🇦🇷';
  if (account === 'f1') return '🏁';
  return '⚽';
}

function hashtagFor(item, account) {
  const corpus = normalize(`${item.sport} ${item.category} ${item.title} ${item.summary}`);

  // 1) Selección Argentina explícita.
  if (
    item.category === 'seleccion' ||
    /\bseleccion argentina\b|\bseleccion mayor\b|\bscaloneta\b/.test(corpus)
  ) return '#Argentina';

  // 2) Disciplina concreta: tiene prioridad sobre una mención genérica a "argentino/a".
  if (/\bbasquet\b|\bbasket\b|\bbaloncesto\b|\bfiba\b/.test(corpus)) return '#Basket';
  if (/\btenis\b/.test(corpus)) return '#Tenis';
  if (/\brugby\b/.test(corpus)) return '#Rugby';
  if (/\bhockey\b/.test(corpus)) return '#Hockey';
  if (/\bboxeo\b/.test(corpus)) return '#Boxeo';
  if (/\bvoley\b|\bvolley\b/.test(corpus)) return '#Voley';
  if (/\bhandball\b/.test(corpus)) return '#Handball';
  if (/\bciclismo\b/.test(corpus)) return '#Ciclismo';
  if (/\batletismo\b/.test(corpus)) return '#Atletismo';
  if (/\bnatacion\b/.test(corpus)) return '#Natacion';

  // 3) Automovilismo y fórmulas.
  if (/\bcolapinto\b/.test(corpus)) return '#Colapinto';
  if (item.category === 'f2' || /\bformula 2\b|\bf2\b/.test(corpus)) return '#F2';
  if (item.category === 'f3' || /\bformula 3\b|\bf3\b/.test(corpus)) return '#F3';
  if (account === 'f1' || item.category === 'f1' || /\bformula 1\b|\bf1\b/.test(corpus)) return '#F1';
  if (/\bautomovilismo\b/.test(corpus)) return '#Automovilismo';

  // 4) Selecciones/equipos nacionales de otros deportes.
  if (/\blos pumas\b/.test(corpus)) return '#Pumas';
  if (/\blas leonas\b/.test(corpus)) return '#Leonas';
  if (/\blos leones\b/.test(corpus)) return '#Leones';

  // 5) Futbolistas argentinos / Selección cuando el protagonista individual es el eje.
  if (
    /\bmessi\b|\bdibu\b|\bjulian alvarez\b|\blautaro\b|\bmac allister\b|\benzo fernandez\b|\bgarnacho\b|\bmastantuono\b|\balmada\b|\bfoyth\b/.test(corpus)
  ) return '#Argentina';

  // 6) Clubes de fútbol.
  if (/\bindependiente rivadavia\b/.test(corpus)) return '#IndependienteRivadavia';
  if (item.category === 'independiente') return '#Independiente';
  if (/\bboca( juniors)?\b/.test(corpus)) return '#Boca';
  if (/\briver( plate)?\b/.test(corpus)) return '#River';
  if (/\bracing( club)?\b/.test(corpus)) return '#Racing';
  if (/\bsan lorenzo\b/.test(corpus)) return '#SanLorenzo';
  if (/\bhuracan\b/.test(corpus)) return '#Huracan';

  // 7) Deportista argentino individual sin disciplina más específica detectada.
  if (/\bargentin[oa]s?\b/.test(corpus)) return '#Argentina';

  if (item.category === 'futbol' || /\bfutbol\b/.test(corpus)) return '#Futbol';
  return '#Deportes';
}

function postText(item, account, url) {
  const emoji = emojiFor(item, account);
  const hashtag = hashtagFor(item, account);
  const linkEmoji = linkEmojiFor(item, account);
  let title = item.title.trim();
  if (title.length > 190) title = title.slice(0, 187).trimEnd() + '…';
  return `${emoji}${linkEmoji} ${title}\n${hashtag}\n\n🔗 ${url}`;
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
        'User-Agent': 'RanaSports/1.0 (+https://ranasports.com.ar/)',
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
  // Always rediscover X channels to validate handles.

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
  const sports = twitter.find(ch => matches(ch, 'RanaSportsAR'));
  if (sports) state.buffer.sportsChannelId = sports.id;
  if (!main || !f1 || !sports) throw new Error('Falta un canal de X conectado a Buffer. Encontrados: '+twitter.map(ch=>ch.displayName || ch.name).join(', '));
}

async function createBufferPost(apiKey, channelId, text, image, dueAt, sendNow = false) {
  const schedule = sendNow
    ? 'mode:shareNow'
    : `mode:customScheduled,\n      dueAt:${gqlString(dueAt)}`;
  const imageAssets = image ? `,\n      assets:[{image:{url:${gqlString(image)}}}]` : '';
  const query = `mutation CreatePost {
    createPost(input:{
      text:${gqlString(text)},
      channelId:${gqlString(channelId)},
      schedulingType:automatic,
      ${schedule}${imageAssets}
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

async function refreshPublishedLinks(apiKey, state) {
  const organizationId = state.buffer?.organizationId;
  const channelIds = [state.buffer?.mainChannelId, state.buffer?.f1ChannelId, state.buffer?.sportsChannelId].filter(Boolean);
  if (!organizationId || !channelIds.length) return 0;

  const byId = new Map();
  for (const channelId of channelIds) {
    const query = `query SentPosts {
      posts(
        first:100,
        input:{
          organizationId:${gqlString(organizationId)},
          filter:{status:[sent],channelIds:[${gqlString(channelId)}]},
          sort:[{field:dueAt,direction:desc}]
        }
      ) {
        edges { node { id externalLink status sentAt dueAt channelId } }
      }
    }`;
    try {
      const data = await bufferRequest(apiKey, query);
      for (const edge of data?.posts?.edges || []) {
        const post = edge?.node;
        if (post?.id) byId.set(post.id, post);
      }
    } catch (error) {
      console.error(`ERROR Buffer al recuperar enlaces publicados (${channelId}): ${error.message}`);
    }
  }

  let updated = 0;
  for (const entry of Object.values(state.processed || {})) {
    const post = byId.get(entry.bufferPostId);
    if (!post?.externalLink) continue;
    if (entry.externalLink !== post.externalLink || entry.sentAt !== post.sentAt) {
      entry.externalLink = post.externalLink;
      if (post.sentAt) entry.sentAt = post.sentAt;
      updated++;
    }
  }
  if (updated) console.log(`Enlaces públicos de X recuperados desde Buffer: ${updated}`);
  return updated;
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


function localParts(ms) {
 const f = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const x=Object.fromEntries(f.formatToParts(new Date(ms)).map(y=>[y.type,y.value]));
 return { day:x.year+'-'+x.month+'-'+x.day, hour:+x.hour, minute:+x.minute };
}
function score(item) {
 const s=normalize(item.title+' '+item.summary);
 let n=priority(item);
 if(item.featured)n+=10;
 if(/\b(oficial|confirm|campeon|titulo|final|gol|sancion|renuncia|lesion|abandono|pole|record|messi|colapinto)\b/.test(s))n+=4;
 if(/\b(viral|insolito|bloop|polemica)\b/.test(s))n+=2;
 return n;
}
function targets(config,now) {
 const result={};
 const hourMs=60*60000;
 for (const [account,policy] of Object.entries(config.accounts)) {
  const desired=policy.hourlyMax;
  const existing=[];
  for (const x of Object.values(config._state.processed||{})) if(x.account===account && x.bufferPostId)existing.push(x);
  const timeSlots=[];
  for(let h=0;h<8;h++){
   const at=Math.ceil((now+60000)/hourMs)*hourMs+h*hourMs;
   for(let index=0;index<desired;index++){
    const slot=at+index*policy.minGapMinutes*60000;
    if(slot>=at+hourMs)continue;
    const l=localParts(slot);
    if(account==='sports' && (l.hour<8 || l.hour>23))continue;
    const blocked=existing.some(x=>Math.abs(Date.parse(x.dueAt)-slot)<policy.minGapMinutes*60000);
    if(!blocked)timeSlots.push(slot);
   }
  }
  result[account]=timeSlots;
 }
 return result;
}
function sameDayPublishedCount(state,account,day) {
 return Object.values(state.processed||{}).filter(e=>e.account===account && localParts(Date.parse(e.dueAt||e.createdAt||0)).day===day && e.bufferPostId).length;
}
async function main() {
 const cfg=JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'));
 if(cfg.enabled!==true || cfg.dryRun!==false){
  console.log('X PAUSADO. Este distribuidor no envía publicaciones.'); return;
 }
 const key=process.env.BUFFER_API_KEY;
 if(!key)throw Error('Falta BUFFER_API_KEY');
 if(!cfg.activationAt || !Number.isFinite(Date.parse(cfg.activationAt)))throw Error('activationAt inválido; prohibido rescatar noticias históricas');
 const state=readState();
 state.processed||={};state.buffer||={};
 const now=Date.now(),activation=Date.parse(cfg.activationAt);
 const news=readNews(fs.readFileSync(NEWS_PATH,'utf8'));
 await discoverChannels(key,state);
 // Verify exact handles before any write. DiscoverChannels must always refresh on start.
 const ids={main:state.buffer.mainChannelId,f1:state.buffer.f1ChannelId,sports:state.buffer.sportsChannelId};
 if(Object.values(ids).some(x=>!x) || new Set(Object.values(ids)).size!==3)throw Error('Buffer no confirmó tres canales X diferentes');
 // Preserve all prior links and deduplication state.
 const candidates=[];
 for(const item of news){
  if(item.date<activation || item.date>now || now-item.date>cfg.selection.maxAgeHours*3600000)continue;
  const url=articleURL(item),legacy=legacyArticleURL(item);
  if(state.processed[url]||state.processed[legacy])continue;
  candidates.push({item,url,account:accountFor(item),score:score(item)});
 }
 candidates.sort((a,b)=>b.score-a.score || b.item.date-a.item.date);
 const slots=targets({...cfg,_state:state},now);
 const scheduled={main:0,f1:0,sports:0};
 const failed=new Set();
 for (const x of candidates) {
  const account=x.account,pol=cfg.accounts[account],slot=slots[account]?.shift();
  if(!slot || failed.has(account))continue;
  const day=localParts(slot).day;
  if(pol.dailyMax!=null && sameDayPublishedCount(state,account,day)+scheduled[account]>=pol.dailyMax)continue;
  if(futureCount(state,account,now)>=MAX_FUTURE_PER_CHANNEL)continue;
  const image=await validateImage(x.item.image);
  try{
   const post=await createBufferPost(key,ids[account],postText(x.item,account,x.url),image,new Date(slot).toISOString(),false);
   state.processed[x.url]={account,title:x.item.title,dueAt:post.dueAt||new Date(slot).toISOString(),mode:'customScheduled',bufferPostId:post.id,createdAt:new Date().toISOString()};
   scheduled[account]++;writeState(state);
  }catch(err){ console.error('HALT '+account+' '+err.message);failed.add(account); }
 }
 console.log(JSON.stringify({scheduled,failed:[...failed],candidates:candidates.length,channels:ids}));
 if(failed.size)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
