(() => {
  const grid = document.querySelector('#newsGrid');
  const header = document.querySelector('.site-header');
  if (!grid || !header) return;

  const normalize = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const preferred = [
    'Messi','Inter Miami','Selección Argentina','Boca','River','Independiente','Racing','San Lorenzo',
    'Torneo Clausura','Copa Libertadores','Copa Sudamericana','Fórmula 1','Colapinto','Juegos Suramericanos',
    'Atlético Tucumán','Huracán','Talleres','Estudiantes','Platense','Aldosivi','Independiente Rivadavia'
  ];

  function cards(){ return [...grid.querySelectorAll('.news-card,.lead-story,.secondary-story')]; }

  function topicScore(topic){
    const needle = normalize(topic);
    let score = 0;
    cards().forEach((card, index) => {
      const text = normalize(card.textContent);
      if (!text.includes(needle)) return;
      const freshness = Math.max(1, 18 - index);
      score += 20 + freshness;
      if (card.classList.contains('lead-story')) score += 25;
      const editorial = Number(window.ranaEditorialScore?.(card) || 0);
      score += Math.min(80, editorial / 3);
    });
    return score;
  }

  function detectMatchups(){
    const found = new Set();
    cards().forEach(card => {
      const title = card.querySelector('h3')?.textContent || '';
      const m = title.match(/([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' -]{2,30})\s+(?:vs\.?|v\.|-|–)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' -]{2,30})/i);
      if (m) found.add(`${m[1].trim()} vs ${m[2].trim()}`);
    });
    return [...found];
  }

  function buildTopics(){
    const candidates = [...preferred, ...detectMatchups()];
    const scored = [...new Set(candidates)].map(topic => ({topic, score: topicScore(topic)})).filter(x => x.score > 0);
    scored.sort((a,b) => b.score - a.score);
    return scored.slice(0, 8).map(x => x.topic);
  }

  function applyFilter(topic){
    const needle = normalize(topic).replace(/\s+vs\s+/,' ');
    cards().forEach(card => {
      const text = normalize(card.textContent).replace(/\s+vs\s+/,' ');
      card.hidden = !text.includes(needle);
    });
    const title = document.querySelector('#feedTitle');
    if (title) title.textContent = topic.toUpperCase();
    document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function clearFilter(){
    cards().forEach(card => card.hidden = false);
    const title = document.querySelector('#feedTitle');
    if (title) title.textContent = 'DESTACADAS';
  }

  function render(){
    const topics = buildTopics();
    if (!topics.length) return;
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

  const observer = new MutationObserver(()=>render());
  observer.observe(grid,{childList:true,subtree:true});
  document.addEventListener('ranasports:trends',render);
  setTimeout(render,400);
  setTimeout(render,1500);
})();