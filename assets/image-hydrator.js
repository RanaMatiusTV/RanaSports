(() => {
  const CACHE_KEY = 'ranasports-real-images-v5';
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
  let sheetRowsPromise=null,sheetRowsAt=0;
  function parseCSV(text){
    const rows=[];let row=[],field='',quoted=false;
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
      else if(ch===','&&!quoted){row.push(field);field='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){row.push(field);rows.push(row);row=[];field='';if(ch==='\r'&&text[i+1]==='\n')i++;}
      else field+=ch;
    }
    if(field||row.length){row.push(field);rows.push(row);}
    return rows;
  }
  async function sheetRows(){
    if(sheetRowsPromise&&Date.now()-sheetRowsAt<30000)return sheetRowsPromise;
    sheetRowsAt=Date.now();
    sheetRowsPromise=fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv&_img='+Date.now(),{cache:'no-store',credentials:'omit'})
      .then(r=>{if(!r.ok)throw new Error('CSV');return r.text();})
      .then(text=>{
        const rows=parseCSV(text),headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase());
        return {rows,headers};
      })
      .catch(()=>({rows:[],headers:[]}));
    return sheetRowsPromise;
  }
  function isXPost(url){
    try{const u=new URL(url);return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname)&&/\/status\/\d+/.test(u.pathname);}catch{return false;}
  }
  function xPostId(url){
    try{const u=new URL(url);const p=u.pathname.split('/').filter(Boolean);const i=p.indexOf('status');return /^\d+$/.test(p[i+1]||'')?p[i+1]:'';}catch{return '';}
  }
  async function xThumbnail(url){
    const id=xPostId(url);if(!id)return '';
    try{
      const r=await fetch('https://api.fxtwitter.com/status/'+id,{cache:'no-store',credentials:'omit'});
      if(!r.ok)return '';
      const data=await r.json(),media=data?.tweet?.media||{};
      const video=Array.isArray(media.videos)?media.videos.find(Boolean):null;
      if(video?.thumbnail_url)return video.thumbnail_url;
      const photo=Array.isArray(media.photos)?media.photos.find(p=>p?.url):null;
      return photo?.url||'';
    }catch{return '';}
  }
  async function mediaCandidatesForTitle(title){
    const {rows,headers}=await sheetRows();
    const ti=headers.indexOf('título'),vi=headers.indexOf('url video'),ni=headers.indexOf('url x respaldo'),qi=headers.indexOf('url imagen candidata');
    if(ti<0)return [];
    const target=clean(title).toLowerCase();
    const row=rows.find(r=>clean(r[ti]||'').toLowerCase()===target);
    if(!row)return [];
    const candidates=[];
    const q=qi>=0?(row[qi]||'').trim():'';
    if(/^https?:\/\//i.test(q))candidates.push(q);
    const media=[vi>=0?(row[vi]||'').trim():'',ni>=0?(row[ni]||'').trim():''].filter(Boolean);
    for(const url of media){
      const yid=youtubeId(url);
      if(yid)candidates.push('https://i.ytimg.com/vi/'+yid+'/hqdefault.jpg','https://i.ytimg.com/vi/'+yid+'/maxresdefault.jpg');
      else if(isXPost(url)){
        const thumb=await xThumbnail(url);if(thumb)candidates.push(thumb);
      }
    }
    return [...new Set(candidates)];
  }
  async function findCandidates(title) {
    const key = clean(title), cached = cache();
    if (Array.isArray(cached[key]) && cached[key].length) return cached[key];
    const candidates=await mediaCandidatesForTitle(title);
    let url = await commons(key);
    if (url) candidates.push(url);
    if (!url) {
      const words = key.split(/\s+/).filter(w => w.length > 3).slice(0, 8).join(' ');
      if (words !== key) {
        url = await commons(words);
        if(url)candidates.push(url);
      }
    }
    const unique=[...new Set(candidates.filter(Boolean))];
    cached[key]=unique;save(cached);
    return unique;
  }
  function mountCandidateImage(parent,img,candidates,onExhausted){
    let index=0;
    const tryNext=()=>{
      if(index>=candidates.length){onExhausted?.();return;}
      img.src=candidates[index++];
    };
    img.addEventListener('error',tryNext);
    tryNext();
  }
  function imageIsUsable(img) { return !!img && !fallbackImage(img.currentSrc || img.src); }
  async function hydrateCard(card) {
    const existing = card.querySelector('.news-image img');
    if (imageIsUsable(existing)) return;
    if (existing?.closest('.news-image')) existing.closest('.news-image').remove();
    const title = card.querySelector('h3')?.textContent?.trim(); if (!title) return;
    const candidates = await findCandidates(title); if (!candidates.length) return;
    if (card.querySelector('.news-image img')) return;
    const link = document.createElement('a'); link.className = 'card-visual news-image'; link.href = card.querySelector('h3 a')?.href || '#';
    const img = document.createElement('img'); img.alt = title; img.width = 800; img.height = 450; img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    mountCandidateImage(link,img,candidates,()=>link.remove());
    link.append(img); card.insertBefore(link, card.firstChild);
  }
  async function hydrateArticle(root) {
    const existing = root.querySelector('.article-photo img');
    if (imageIsUsable(existing)) return;
    if (existing?.closest('.article-photo')) existing.closest('.article-photo').remove();
    const title = root.querySelector('h1')?.textContent?.trim(); if (!title) return;
    const candidates = await findCandidates(title); if (!candidates.length) return;
    if (root.querySelector('.article-photo img')) return;
    const figure = document.createElement('figure'); figure.className = 'article-photo';
    const img = document.createElement('img'); img.className = 'article-image'; img.alt = title; img.width = 800; img.height = 450; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    mountCandidateImage(figure,img,candidates,()=>figure.remove());
    figure.append(img); const body = root.querySelector('.article-body'); body ? root.insertBefore(figure, body) : root.append(figure);
    const og = document.querySelector('meta[property="og:image"]'); if (og && candidates[0]) og.content = candidates[0];
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