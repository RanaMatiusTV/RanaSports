(() => {
  const CACHE_KEY = 'ranasports-real-images-v3';
  const cache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; } };
  const save = value => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch {} };
  const clean = value => (value || '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  const fallbackImage = src => /(?:^|\/)fallback-[^/]+\.svg(?:\?|$)/i.test(src || '');
  const reusable = meta => {
    const text = [meta?.LicenseShortName?.value, meta?.License?.value, meta?.UsageTerms?.value].filter(Boolean).join(' ').toLowerCase();
    return text.includes('cc0') || text.includes('public domain') || text === 'pd' || text.startsWith('pd-');
  };
  async function commons(query) {
    if (!query) return '';
    const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '1400', format: 'json', formatversion: '2', origin: '*' });
    try {
      const response = await fetch('https://commons.wikimedia.org/w/api.php?' + params, { cache: 'force-cache' });
      if (!response.ok) return '';
      const data = await response.json();
      const wanted = new Set(clean(query).toLowerCase().split(/\s+/).filter(w => w.length > 3));
      let best = null, bestScore = 0;
      for (const page of data?.query?.pages || []) {
        const info = page?.imageinfo?.[0];
        if (!info || !/^image\/(jpeg|png|webp)$/i.test(info.mime || '') || !reusable(info.extmetadata)) continue;
        const title = clean(page.title || '').toLowerCase();
        const score = [...wanted].filter(w => title.includes(w)).length;
        if (score > bestScore) { bestScore = score; best = info.thumburl || info.url || ''; }
      }
      return bestScore >= Math.max(1, Math.min(3, wanted.size)) ? best : '';
    } catch { return ''; }
  }
  function youtubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
      if (/youtube\.com$/.test(u.hostname)) {
        if (u.pathname === '/watch') return u.searchParams.get('v') || '';
        const p = u.pathname.split('/').filter(Boolean);
        if (['shorts', 'embed', 'live'].includes(p[0])) return p[1] || '';
      }
    } catch {}
    return '';
  }
  async function videoForTitle(title) {
    try {
      const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv', { cache: 'no-store' });
      if (!response.ok) return '';
      const text = await response.text();
      const rows = []; let row = []; let field = ''; let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
        else if (c === ',' && !quoted) { row.push(field); field = ''; }
        else if ((c === '\n' || c === '\r') && !quoted) { row.push(field); rows.push(row); row = []; field = ''; if (c === '\r' && text[i + 1] === '\n') i++; }
        else field += c;
      }
      if (field || row.length) { row.push(field); rows.push(row); }
      const headers = rows.shift()?.map(x => x.trim().toLowerCase()) || [];
      const ti = headers.indexOf('título'); const vi = headers.indexOf('url video');
      if (ti < 0 || vi < 0) return '';
      const target = clean(title).toLowerCase();
      const match = rows.find(r => clean(r[ti]).toLowerCase() === target);
      const id = youtubeId(match?.[vi] || '');
      return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
    } catch { return ''; }
  }
  async function findImage(title) {
    const key = clean(title); const c = cache();
    if (Object.prototype.hasOwnProperty.call(c, key)) return c[key];
    let url = await commons(key);
    if (!url) {
      const words = key.split(/\s+/).filter(w => w.length > 3).slice(0, 8).join(' ');
      if (words !== key) url = await commons(words);
    }
    if (!url) url = await videoForTitle(title);
    c[key] = url || null; save(c);
    return url;
  }
  function imageIsUsable(img) { return !!img && !fallbackImage(img.currentSrc || img.src); }
  async function hydrateCard(card) {
    const existing = card.querySelector('.news-image img');
    if (imageIsUsable(existing)) return;
    if (existing?.closest('.news-image')) existing.closest('.news-image').remove();
    const title = card.querySelector('h3')?.textContent?.trim(); if (!title) return;
    const url = await findImage(title); if (!url) return;
    if (card.querySelector('.news-image img')) return;
    const link = document.createElement('a'); link.className = 'card-visual news-image'; link.href = card.querySelector('h3 a')?.href || '#';
    const img = document.createElement('img'); img.src = url; img.alt = title; img.width = 800; img.height = 450; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    link.append(img); card.insertBefore(link, card.firstChild);
  }
  async function hydrateArticle(root) {
    const existing = root.querySelector('.article-photo img');
    if (imageIsUsable(existing)) return;
    if (existing?.closest('.article-photo')) existing.closest('.article-photo').remove();
    const title = root.querySelector('h1')?.textContent?.trim(); if (!title) return;
    const url = await findImage(title); if (!url) return;
    if (root.querySelector('.article-photo img')) return;
    const figure = document.createElement('figure'); figure.className = 'article-photo';
    const img = document.createElement('img'); img.className = 'article-image'; img.src = url; img.alt = title; img.width = 800; img.height = 450; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    figure.append(img); const body = root.querySelector('.article-body'); body ? root.insertBefore(figure, body) : root.append(figure);
    const og = document.querySelector('meta[property="og:image"]'); if (og) og.content = url;
  }
  let queued = false;
  async function scan() {
    if (queued) return; queued = true;
    await new Promise(resolve => setTimeout(resolve, 100)); queued = false;
    const cards = [...document.querySelectorAll('#newsGrid .news-card')];
    for (const card of cards) await hydrateCard(card);
    const article = document.querySelector('#newsDetail'); if (article) await hydrateArticle(article);
  }
  document.addEventListener('ranasports:news-updated', scan);
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();

// EN VIVO: reemplaza cualquier iframe roto por un marcador nativo de RanaSports.
(() => {
  const API='https://tipstercompetition.com/api/widget/live-fixtures';
  const LIVE_URL='https://tipstercompetition.com/livescores';
  let timer=null,loading=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pick=(obj,paths)=>{for(const path of paths){let v=obj;for(const key of path.split('.'))v=v?.[key];if(v!==undefined&&v!==null&&v!=='')return v;}return null;};
  const name=v=>typeof v==='string'?v:(v?.name||v?.team_name||v?.title||v?.short_name||'');
  const fixtureLike=o=>{
    if(!o||typeof o!=='object'||Array.isArray(o))return false;
    const h=pick(o,['home','home_team','homeTeam','teams.home','local','team_home']);
    const a=pick(o,['away','away_team','awayTeam','teams.away','visitor','team_away']);
    return !!(name(h)&&name(a));
  };
  function collect(value,out=[],seen=new WeakSet()){
    if(!value||typeof value!=='object')return out;
    if(seen.has(value))return out;seen.add(value);
    if(Array.isArray(value)){for(const item of value){if(fixtureLike(item))out.push(item);else collect(item,out,seen);}return out;}
    if(fixtureLike(value)){out.push(value);return out;}
    for(const v of Object.values(value))collect(v,out,seen);
    return out;
  }
  function normalize(m){
    const home=pick(m,['home','home_team','homeTeam','teams.home','local','team_home']);
    const away=pick(m,['away','away_team','awayTeam','teams.away','visitor','team_away']);
    const league=pick(m,['league.name','league_name','competition.name','competition_name','tournament.name','tournament_name','league']);
    const country=pick(m,['country.name','country_name','league.country.name','competition.country.name','country']);
    let hs=pick(m,['home_score','score.home','scores.home','goals.home','result.home','homeScore','score_home']);
    let as=pick(m,['away_score','score.away','scores.away','goals.away','result.away','awayScore','score_away']);
    const scoreText=pick(m,['score','result','ft_score']);
    if((hs===null||as===null)&&typeof scoreText==='string'){
      const s=scoreText.match(/(\d+)\s*[-:]\s*(\d+)/);if(s){hs=s[1];as=s[2];}
    }
    const minute=pick(m,['minute','elapsed','status.elapsed','time.elapsed','match_minute']);
    const status=pick(m,['status.short','status.name','status','state','match_status']);
    const live=/live|1h|2h|ht|et|pen|in.?play|playing/i.test(String(status||''))||Number(minute)>0;
    return {home:name(home),away:name(away),league:name(league)||String(league||'Otra competencia'),country:name(country)||String(country||''),hs,as,minute,status:String(status||''),live};
  }
  function shell(){
    return `
      <div class="rs-live-head"><div><span>● EN DIRECTO</span><h2>RESULTADOS EN VIVO</h2></div><b>FÚTBOL</b></div>
      <div id="rs-live-state" class="rs-live-state">Cargando marcadores…</div>
      <div id="rs-live-list" class="rs-live-list"></div>
      <div class="rs-live-foot"><span>Actualización automática cada 15 s.</span><a href="${LIVE_URL}" target="_blank" rel="noopener noreferrer">ABRIR FUENTE ↗</a></div>`;
  }
  function style(){
    if(document.querySelector('#rs-live-native-style'))return;
    const s=document.createElement('style');s.id='rs-live-native-style';s.textContent=`
      #en-vivo{grid-column:1/-1!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      .rs-live-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:13px 14px;border:1px solid #27303a;border-radius:10px;background:#10161d}
      .rs-live-head span{font-size:11px;font-weight:950;letter-spacing:.08em;color:#ff123b}.rs-live-head h2{margin:3px 0 0;font-size:clamp(1.15rem,2vw,1.5rem);color:#fff}.rs-live-head b{font-size:10px;color:#9ca7b4}
      .rs-live-state{padding:22px 14px;border:1px solid #27303a;border-radius:10px;background:#0d1319;color:#9ca7b4;text-align:center;font-size:13px}
      .rs-live-list{display:grid;gap:12px}.rs-live-group{border:1px solid #27303a;border-radius:12px;overflow:hidden;background:#0d1319}.rs-live-group h3{margin:0;padding:10px 12px;background:#151d25;color:#f5f7f9;font-size:12px;letter-spacing:.02em;border-bottom:1px solid #27303a}
      .rs-live-match{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;padding:12px;border-bottom:1px solid #202833}.rs-live-match:last-child{border-bottom:0}.rs-live-team{font-size:13px;font-weight:800;color:#eef2f6}.rs-live-team.away{text-align:right}.rs-live-score{min-width:72px;text-align:center}.rs-live-score strong{font-size:18px;color:#fff}.rs-live-score small{display:block;margin-top:2px;color:#ff4561;font-size:10px;font-weight:900}.rs-live-foot{display:flex;justify-content:space-between;gap:10px;padding:10px 2px 0;color:#7f8b98;font-size:10px}.rs-live-foot a{color:#aeb7c2;text-decoration:none;font-weight:900}
      html[data-theme="light"] .rs-live-head,html[data-theme="light"] .rs-live-group,html[data-theme="light"] .rs-live-state{background:#fff!important;border-color:#d8dee6!important}.rs-live-head h2{color:#fff}html[data-theme="light"] .rs-live-head h2,html[data-theme="light"] .rs-live-group h3,html[data-theme="light"] .rs-live-team,html[data-theme="light"] .rs-live-score strong{color:#171b21!important}html[data-theme="light"] .rs-live-group h3{background:#eef2f6!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-live-match{border-color:#e1e6ec!important}
      @media(max-width:699px){.rs-live-match{grid-template-columns:minmax(0,1fr) 62px minmax(0,1fr);padding:11px 9px}.rs-live-team{font-size:12px}.rs-live-score strong{font-size:17px}}
    `;document.head.append(s);
  }
  async function refresh(){
    if(loading||location.hash!=='#en-vivo')return;loading=true;
    const module=document.querySelector('#en-vivo');if(!module){loading=false;return;}
    const state=module.querySelector('#rs-live-state'),list=module.querySelector('#rs-live-list');
    try{
      const r=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const json=await r.json();
      const rows=[...new Map(collect(json).map(x=>{const n=normalize(x);return [`${n.league}|${n.home}|${n.away}`,n];})).values()].filter(x=>x.home&&x.away);
      if(!rows.length){state.hidden=false;state.innerHTML='No hay partidos en vivo en este momento.';list.replaceChildren();return;}
      state.hidden=true;
      const groups=new Map();for(const row of rows){const key=[row.country,row.league].filter(Boolean).join(' · ')||'Partidos en vivo';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
      list.innerHTML=[...groups].map(([label,matches])=>`<section class="rs-live-group"><h3>${esc(label)}</h3>${matches.map(m=>`<div class="rs-live-match"><div class="rs-live-team">${esc(m.home)}</div><div class="rs-live-score"><strong>${esc(m.hs??'-')} - ${esc(m.as??'-')}</strong><small>${esc(m.minute?m.minute+"'":m.status||'EN VIVO')}</small></div><div class="rs-live-team away">${esc(m.away)}</div></div>`).join('')}</section>`).join('');
    }catch(e){
      state.hidden=false;state.innerHTML=`No pude cargar el proveedor en este momento. <a href="${LIVE_URL}" target="_blank" rel="noopener noreferrer" style="color:#ff4561;font-weight:800">Ver marcadores ↗</a>`;list.replaceChildren();
    }finally{loading=false;}
  }
  function install(){
    const module=document.querySelector('#en-vivo');if(!module)return;
    style();module.dataset.sourceStatus='tipster-native';module.innerHTML=shell();
    if(location.hash==='#en-vivo')refresh();
    clearInterval(timer);timer=setInterval(refresh,15000);
  }
  install();
  window.addEventListener('hashchange',()=>{if(location.hash==='#en-vivo'){if(document.querySelector('#en-vivo')?.dataset.sourceStatus!=='tipster-native')install();refresh();}});
  document.addEventListener('ranasports:news-updated',()=>{if(document.querySelector('#en-vivo')?.dataset.sourceStatus!=='tipster-native')install();});
})();