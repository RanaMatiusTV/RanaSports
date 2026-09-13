(() => {
  const grid = document.querySelector('#newsGrid');
  const header = document.querySelector('.site-header');
  const search = document.querySelector('#searchInput');
  if (!grid || !header || !search) return;

  const normalize = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const entities = [
    'Messi','Inter Miami','Selección Argentina','Boca','River','Independiente','Racing','San Lorenzo','Huracán',
    'Vélez','Argentinos Juniors','Rosario Central','Newell’s','Newells','Estudiantes','Gimnasia','Talleres','Belgrano',
    'Instituto','Platense','Tigre','Sarmiento','Lanús','Banfield','Defensa y Justicia','Godoy Cruz','Unión','Colón',
    'Atlético Tucumán','Independiente Rivadavia','Aldosivi','Barracas Central','Central Córdoba','Riestra',
    'Torneo Clausura','Copa Argentina','Copa Libertadores','Copa Sudamericana','Champions League','Fórmula 1','Colapinto',
    'Nicolás Varrone','Varrone','Mattia Colnaghi','Colnaghi','Fórmula 2','Fórmula 3','MotoGP','Moto3','Juegos Suramericanos'
  ];

  function cards(){ return [...grid.querySelectorAll('.news-card')].filter(card => !card.hidden || !search.value.trim()); }
  function publishedAt(card){ return Date.parse(card.querySelector('time')?.dateTime || '') || 0; }
  function cardText(card){ return normalize([card.querySelector('h3')?.textContent || '', card.querySelector('.news-excerpt')?.textContent || '', card.dataset.sport || ''].join(' ')); }

  function detectMatchups(){
    const found = new Set();
    [...grid.querySelectorAll('.news-card')].forEach(card => {
      const title = card.querySelector('h3')?.textContent || '';
      const m = title.match(/([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' -]{2,30})\s+(?:vs\.?|v\.|-|–)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' -]{2,30})/i);
      if (m) found.add(`${m[1].trim()} vs ${m[2].trim()}`);
    });
    return [...found];
  }

  function topicScore(topic){
    const needle = normalize(topic);
    const now = Date.now();
    let score = 0;
    [...grid.querySelectorAll('.news-card')].forEach(card => {
      const text = cardText(card);
      if (!text.includes(needle)) return;
      const ageH = Math.max(0, (now - publishedAt(card)) / 3600000);
      if (ageH > 36) return;
      score += ageH <= 2 ? 120 : ageH <= 6 ? 85 : ageH <= 12 ? 55 : ageH <= 24 ? 30 : 12;
      if (card.classList.contains('lead-story')) score += 80;
      const editorial = Number(window.ranaEditorialScore?.(card) || 0);
      score += Math.min(180, editorial);
    });
    return score;
  }

  function buildTopics(){
    const candidates = [...new Set([...entities, ...detectMatchups()])];
    const scored = candidates.map(topic => ({topic, score: topicScore(topic)})).filter(x => x.score > 0);
    scored.sort((a,b) => b.score - a.score);
    return scored.slice(0, 8).map(x => x.topic);
  }

  function applyFilter(topic){
    search.value = topic.replace(/\s+vs\s+/i, ' ');
    search.dispatchEvent(new Event('input', {bubbles:true}));
    const title = document.querySelector('#feedTitle');
    if (title) title.textContent = topic.toUpperCase();
    document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function clearFilter(){
    search.value = '';
    search.dispatchEvent(new Event('input', {bubbles:true}));
    document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function render(){
    const topics = buildTopics();
    let bar = document.querySelector('#rs-hot-topics');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'rs-hot-topics';
      bar.setAttribute('aria-label','Temas destacados');
      header.insertAdjacentElement('afterend', bar);
    }
    bar.replaceChildren();
    const inner = document.createElement('div');
    inner.className = 'rs-hot-topics-inner';
    const lead = document.createElement('span');
    lead.className = 'rs-hot-label';
    lead.textContent = 'AHORA';
    inner.append(lead);

    topics.forEach(topic => {
      const b = document.createElement('button');
      b.type='button';
      b.className='rs-hot-topic';
      b.textContent=topic;
      b.addEventListener('click',()=>applyFilter(topic));
      inner.append(b);
    });

    const all = document.createElement('button');
    all.type='button';
    all.className='rs-hot-topic rs-hot-all';
    all.textContent='Ver todo';
    all.addEventListener('click',clearFilter);
    inner.append(all);
    bar.append(inner);
  }

  if (!document.querySelector('#rs-hot-topics-style')) {
    const style = document.createElement('style');
    style.id='rs-hot-topics-style';
    style.textContent=`
      #rs-hot-topics{width:100%;background:#0c1117;border-bottom:1px solid #232b34;overflow:hidden}
      .rs-hot-topics-inner{max-width:1180px;margin:0 auto;padding:8px 14px;display:flex;align-items:center;gap:8px;overflow-x:auto;scrollbar-width:none}
      .rs-hot-topics-inner::-webkit-scrollbar{display:none}
      .rs-hot-label{flex:0 0 auto;font-size:11px;font-weight:900;letter-spacing:.08em;color:#ff5a5f}
      .rs-hot-topic{flex:0 0 auto;border:0;background:transparent;color:#f3f5f7;font:inherit;font-size:13px;font-weight:750;cursor:pointer;padding:5px 8px;border-radius:999px;white-space:nowrap}
      .rs-hot-topic:hover,.rs-hot-topic:focus-visible{background:#1a222b;color:#fff;outline:none}
      .rs-hot-all{color:#aeb7c2}
      @media(max-width:699px){.rs-hot-topics-inner{padding:7px 10px}.rs-hot-topic{font-size:12px;padding:5px 7px}}
    `;
    document.head.append(style);
  }

  let timer;
  const scheduleRender = () => { clearTimeout(timer); timer = setTimeout(render, 120); };
  document.addEventListener('ranasports:news-updated', scheduleRender);
  document.addEventListener('ranasports:trends', scheduleRender);
  search.addEventListener('input', scheduleRender);
  setInterval(render, 5 * 60 * 1000);
  setTimeout(render, 350);
  setTimeout(render, 1500);
})();