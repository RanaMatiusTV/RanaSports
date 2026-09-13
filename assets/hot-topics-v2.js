(() => {
  const grid = document.querySelector('#newsGrid');
  const header = document.querySelector('.site-header');
  const search = document.querySelector('#searchInput');
  if (!grid || !header) return;

  const normalize = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const known = [
    'Messi','Inter Miami','Selección Argentina','Boca','River','Independiente','Racing','San Lorenzo','Huracán',
    'Vélez','Argentinos Juniors','Rosario Central','Newell’s','Estudiantes','Gimnasia','Talleres','Belgrano',
    'Instituto','Platense','Tigre','Sarmiento','Lanús','Banfield','Defensa y Justicia','Godoy Cruz','Unión','Colón',
    'Atlético Tucumán','Independiente Rivadavia','Aldosivi','Barracas Central','Central Córdoba','Riestra',
    'Colapinto','Nicolás Varrone','Varrone','Mattia Colnaghi','Colnaghi','Fórmula 1','Fórmula 2','Fórmula 3',
    'MotoGP','Moto3','Juegos Suramericanos','Copa Argentina','Copa Libertadores','Copa Sudamericana','Torneo Clausura'
  ];
  const stop = new Set('el la los las un una unos unas de del y en con por para ante tras sobre sin al a que se su sus este esta estos estas fue son es sera ser gano gana ganaron termino termina perdio vence vencio derroto empato goleo cayo sigue vuelve volvio volver llega llego tiene tuvo habria podria domino dominó'.split(' '));
  let activeTopic = '';
  let renderTimer;

  const allCards = () => [...grid.querySelectorAll('.news-card')];
  const publishedAt = card => Date.parse(card.querySelector('time')?.dateTime || '') || 0;
  const cardText = card => normalize([card.querySelector('h3')?.textContent || '', card.querySelector('.news-excerpt')?.textContent || '', card.dataset.sport || ''].join(' '));

  function recentCards() {
    const now = Date.now();
    return allCards().filter(card => { const t = publishedAt(card); return t && t <= now && now - t <= 36 * 3600000; }).sort((a,b) => publishedAt(b) - publishedAt(a));
  }

  function addScore(map, topic, score) {
    if (!topic || topic.length < 3 || topic.length > 34) return;
    map.set(topic, (map.get(topic) || 0) + score);
  }

  function dynamicFromTitle(card) {
    const raw = (card.querySelector('h3')?.textContent || '').replace(/[“”\"':,;!?()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    const useful = raw.split(' ').filter(word => { const n = normalize(word); return n.length > 3 && !stop.has(n) && !/^\d+$/.test(n); });
    if (!useful.length) return '';
    const words = useful.slice(0,2).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    return words.join(' ');
  }

  function buildTopics() {
    const scores = new Map();
    const now = Date.now();
    for (const card of recentCards().slice(0,24)) {
      const text = cardText(card);
      const age = Math.max(0, (now - publishedAt(card)) / 3600000);
      const base = age <= 2 ? 260 : age <= 6 ? 190 : age <= 12 ? 125 : age <= 24 ? 70 : 35;
      const lead = card.classList.contains('lead-story') ? 160 : 0;
      const editorial = Math.min(220, Number(window.ranaEditorialScore?.(card) || 0));
      const weight = base + lead + editorial;
      for (const topic of known) if (text.includes(normalize(topic))) addScore(scores, topic, weight + 60);
      const dynamic = dynamicFromTitle(card); if (dynamic) addScore(scores, dynamic, weight);
    }
    return [...scores.entries()].sort((a,b) => b[1] - a[1]).slice(0,8).map(([topic]) => topic);
  }

  function setActiveButton() {
    document.querySelectorAll('#rs-hot-topics-v2 [data-topic]').forEach(btn => {
      const on = activeTopic && btn.dataset.topic === activeTopic;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(Boolean(on)));
    });
  }

  function forceFilter(topic) {
    const needle = normalize(topic).replace(/\s+vs\s+/g,' ');
    let count = 0;
    allCards().forEach(card => {
      const text = cardText(card).replace(/\s+vs\s+/g,' ');
      const matches = text.includes(needle);
      card.hidden = !matches;
      if (matches) count++;
    });
    const title = document.querySelector('#feedTitle');
    if (title) title.textContent = topic.toUpperCase();
    const empty = document.querySelector('#emptyState');
    if (empty) { empty.hidden = count > 0; if (!count) empty.textContent = 'No encontramos noticias para este tema.'; }
    const notice = document.querySelector('#featuredNotice');
    if (notice) notice.hidden = true;
    setActiveButton();
  }

  function applyTopic(topic, doScroll = true) {
    activeTopic = topic;
    if (search) {
      search.value = topic;
      search.dispatchEvent(new Event('input', {bubbles:true}));
      search.dispatchEvent(new Event('change', {bubbles:true}));
    }
    requestAnimationFrame(() => {
      forceFilter(topic);
      if (doScroll) document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  function clearTopic(doScroll = true) {
    activeTopic = '';
    if (search) {
      search.value = '';
      search.dispatchEvent(new Event('input', {bubbles:true}));
      search.dispatchEvent(new Event('change', {bubbles:true}));
    }
    requestAnimationFrame(() => {
      allCards().forEach(card => card.hidden = false);
      const title = document.querySelector('#feedTitle'); if (title) title.textContent = 'DESTACADAS';
      const empty = document.querySelector('#emptyState'); if (empty) empty.hidden = allCards().length > 0;
      setActiveButton();
      if (doScroll) document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  function ensureStyle() {
    if (document.querySelector('#rs-hot-topics-v2-style')) return;
    const style = document.createElement('style');
    style.id = 'rs-hot-topics-v2-style';
    style.textContent = `#rs-hot-topics-v2{width:100%;background:#0c1117;border-bottom:1px solid #232b34;overflow:hidden;position:relative;z-index:20}#rs-hot-topics-v2 .rs-hot-inner{max-width:1180px;margin:0 auto;padding:8px 14px;display:flex;align-items:center;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}#rs-hot-topics-v2 .rs-hot-inner::-webkit-scrollbar{display:none}#rs-hot-topics-v2 .rs-hot-label{flex:0 0 auto;font-size:11px;font-weight:900;letter-spacing:.08em;color:#ff5a5f}#rs-hot-topics-v2 button{flex:0 0 auto;border:0;background:transparent;color:#f3f5f7;font:inherit;font-size:13px;font-weight:750;cursor:pointer;padding:6px 9px;border-radius:999px;white-space:nowrap;touch-action:manipulation;-webkit-tap-highlight-color:transparent}#rs-hot-topics-v2 button:hover,#rs-hot-topics-v2 button:focus-visible,#rs-hot-topics-v2 button.active{background:#1a222b;color:#fff;outline:none}#rs-hot-topics-v2 .rs-hot-all{color:#aeb7c2}@media(max-width:699px){#rs-hot-topics-v2 .rs-hot-inner{padding:7px 10px}#rs-hot-topics-v2 button{font-size:12px;padding:6px 8px}}`;
    document.head.append(style);
  }

  function render() {
    ensureStyle();
    const topics = buildTopics();
    let bar = document.querySelector('#rs-hot-topics-v2');
    if (!bar) {
      document.querySelector('#rs-hot-topics')?.remove();
      bar = document.createElement('nav');
      bar.id = 'rs-hot-topics-v2';
      bar.setAttribute('aria-label','Temas destacados');
      header.insertAdjacentElement('afterend', bar);
    }
    const inner = document.createElement('div'); inner.className = 'rs-hot-inner';
    const lead = document.createElement('span'); lead.className = 'rs-hot-label'; lead.textContent = 'AHORA'; inner.append(lead);
    topics.forEach(topic => { const button = document.createElement('button'); button.type='button'; button.dataset.topic=topic; button.textContent=topic; inner.append(button); });
    const all = document.createElement('button'); all.type='button'; all.dataset.action='all'; all.className='rs-hot-all'; all.textContent='Ver todo'; inner.append(all);
    bar.replaceChildren(inner);
    setActiveButton();
    if (activeTopic) requestAnimationFrame(() => forceFilter(activeTopic));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#rs-hot-topics-v2 button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.dataset.action === 'all') clearTopic();
    else if (button.dataset.topic) applyTopic(button.dataset.topic);
  }, true);

  document.addEventListener('pointerup', event => {
    const button = event.target.closest?.('#rs-hot-topics-v2 button');
    if (!button) return;
    event.preventDefault();
    if (button.dataset.action === 'all') clearTopic();
    else if (button.dataset.topic) applyTopic(button.dataset.topic);
  }, true);

  function scheduleRender(){ clearTimeout(renderTimer); renderTimer=setTimeout(render,100); }
  document.addEventListener('ranasports:news-updated', scheduleRender);
  document.addEventListener('ranasports:trends', scheduleRender);
  const observer = new MutationObserver(() => { if (activeTopic) requestAnimationFrame(() => forceFilter(activeTopic)); });
  observer.observe(grid,{childList:true});
  setInterval(render,60*1000);
  setTimeout(render,250); setTimeout(render,1200);
})();