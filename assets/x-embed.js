/* Embed de posts de X/Twitter usados como video en la columna K de RanaSports. */
(() => {
  const detail = document.querySelector('#newsDetail');
  if (!detail) return;

  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
  const normalize = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false;
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
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function isXPost(url) {
    try {
      const u = new URL(url);
      return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname) && /\/status\/\d+/.test(u.pathname);
    } catch { return false; }
  }

  function loadWidgets() {
    if (window.twttr?.widgets) return Promise.resolve(window.twttr);
    return new Promise((resolve, reject) => {
      let s = document.querySelector('script[data-ranasports-x-widgets]');
      if (!s) {
        s = document.createElement('script');
        s.src = 'https://platform.twitter.com/widgets.js';
        s.async = true;
        s.charset = 'utf-8';
        s.dataset.ranasportsXWidgets = '1';
        document.head.appendChild(s);
      }
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.twttr?.widgets) { clearInterval(timer); resolve(window.twttr); }
        else if (Date.now() - started > 10000) { clearInterval(timer); reject(new Error('X widgets timeout')); }
      }, 100);
    });
  }

  async function findXVideoForTitle(title) {
    const r = await fetch(CSV_URL, { cache: 'no-store', credentials: 'omit' });
    if (!r.ok) return '';
    const rows = parseCSV(await r.text());
    if (!rows.length) return '';
    const keys = rows[0].map(normalize);
    const ti = keys.indexOf('titulo');
    const vi = keys.indexOf('url video');
    if (ti < 0 || vi < 0) return '';
    for (let i = rows.length - 1; i >= 1; i--) {
      if ((rows[i][ti] || '').trim() === title) {
        const url = (rows[i][vi] || '').trim();
        return isXPost(url) ? url : '';
      }
    }
    return '';
  }

  async function renderXEmbed() {
    if (detail.querySelector('.x-video-embed')) return;
    const h1 = detail.querySelector('h1');
    const summary = detail.querySelector('.article-summary');
    if (!h1 || !summary) return;
    const url = await findXVideoForTitle(h1.textContent.trim());
    if (!url || detail.querySelector('.x-video-embed')) return;

    const wrap = document.createElement('div');
    wrap.className = 'x-video-embed';
    wrap.style.cssText = 'width:100%;max-width:720px;margin:22px auto;display:flex;justify-content:center;';
    const quote = document.createElement('blockquote');
    quote.className = 'twitter-tweet';
    quote.setAttribute('data-theme', 'dark');
    quote.setAttribute('data-dnt', 'true');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = 'Ver video en X';
    quote.appendChild(a);
    wrap.appendChild(quote);
    summary.insertAdjacentElement('afterend', wrap);

    try {
      const twttr = await loadWidgets();
      await twttr.widgets.load(wrap);
    } catch {
      wrap.style.display = 'block';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  }

  const observer = new MutationObserver(() => renderXEmbed().catch(() => {}));
  observer.observe(detail, { childList: true, subtree: true });
  renderXEmbed().catch(() => {});
})();
