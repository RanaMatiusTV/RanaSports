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