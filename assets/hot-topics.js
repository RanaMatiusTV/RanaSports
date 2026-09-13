(() => {
  const grid = document.querySelector('#newsGrid');
  const header = document.querySelector('.site-header');
  if (!grid || !header) return;

  const normalize = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const stop = new Set(['el','la','los','las','un','una','unos','unas','de','del','y','en','por','para','con','ante','vs','v','que','se','su','sus','al','a','es','fue','tras','sobre','hoy','ayer','mañana','gano','ganó','termino','terminó','quedo','quedó']);
  const known = [
    'Colapinto','Independiente','Boca','River','Racing','San Lorenzo','Huracán','Messi','Selección Argentina',
    'Romina Imwinkelried','Mammana','Varrone','Colnaghi','MotoGP','Moto3','Fórmula 1','Fórmula 2','Fórmula 3',
    'Juegos Suramericanos','Rosario Central','Newell’s','Vélez','Talleres','Estudiantes','Gimnasia','Argentinos Juniors',
    'Tigre','Sarmiento','Belgrano','Lanús','Banfield','Defensa y Justicia','Godoy Cruz','Unión','Atlético Tucumán',
    'Independiente Rivadavia','Aldosivi','Barracas Central','Central Córdoba','Riestra','Platense'
  ];

  const allCards = () => [...grid.querySelectorAll('.news-card')];
  const publishedAt = card => Date.parse(card.querySelector('time')?.dateTime || '') || 0;
  const textOf = card => normalize([
    card.querySelector('h3')?.textContent || '',
    card.querySelector('.news-excerpt')?.textContent || '',
    card.dataset.sport || ''
  ].join(' '));

  function recentCards() {
    const now = Date.now();
    return allCards().filter(c => {
      const t = publishedAt(c);
      return t && t <= now && now - t <= 36 * 3600000;
    }).sort((a,b) => publishedAt(b)-publishedAt(a));
  }

  function titleCandidates() {
    const scores = new Map();
    recentCards().slice(0,30).forEach((card, idx) => {
      const title = card.querySelector('h3')?.textContent || '';
      const words = title.match(/[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.'-]{2,}/g) || [];
      const multi = title.match(/(?:[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+\s+){1,2}[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ.'-]+/g) || [];
      [...multi, ...words].forEach(raw => {
        const topic = raw.trim().replace(/[,:;.!?]+$/,'');
        const n = normalize(topic);
        if (topic.length < 4 || stop.has(n) || /^\d+$/.test(topic)) return;
        const freshness = Math.max(5, 40 - idx);
        scores.set(topic, (scores.get(topic) || 0) + freshness);
      });
    });
    return [...scores.entries()].sort((a,b)=>b[1]-a[1]).map(([topic])=>topic);
  }

  function scoreTopic(topic) {
    const n = normalize(topic);
    let score = 0;
    const now = Date.now();
    recentCards().forEach((card, idx) => {
      if (!textOf(card).includes(n)) return;
      const age = (now - publishedAt(card)) / 3600000;
      score += age <= 2 ? 180 : age <= 6 ? 120 : age <= 12 ? 80 : age <= 24 ? 45 : 20;
      score += Math.max(0, 30 - idx);
      if (card.classList.contains('lead-story')) score += 100;
      score += Math.min(120, Number(window.ranaEditorialScore?.(card) || 0));
    });
    return score;
  }

  function buildTopics() {
    const candidates = [...new Set([...titleCandidates(), ...known])];
    return candidates.map(topic => ({topic, score: scoreTopic(topic)}))
      .filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0,8)
      .map(x => x.topic);
  }

  let activeTopic = '';

  function syncVisibility() {
    const needle = normalize(activeTopic).replace(/\s+vs\s+/g,' ');
    allCards().forEach(card => {
      if (!needle) {
        card.removeAttribute('data-hot-hidden');
        card.style.removeProperty('display');
        return;
      }
      const hay = textOf(card).replace(/\s+vs\s+/g,' ');
      const match = hay.includes(needle);
      card.toggleAttribute('data-hot-hidden', !match);
      if (!match) card.style.setProperty('display','none','important');
      else card.style.removeProperty('display');
    });
    const heading = document.querySelector('#feedTitle');
    if (heading) heading.textContent = activeTopic ? activeTopic.toUpperCase() : 'DESTACADAS';
  }

  function selectTopic(topic) {
    activeTopic = topic;
    const search = document.querySelector('#searchInput');
    if (search) search.value = topic;
    syncVisibility();
    document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function clearTopic() {
    activeTopic = '';
    const search = document.querySelector('#searchInput');
    if (search) {
      search.value='';
      search.dispatchEvent(new Event('input',{bubbles:true}));
    }
    syncVisibility();
    document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function render() {
    const topics = buildTopics();
    let bar = document.querySelector('#rs-hot-topics');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'rs-hot-topics';
      bar.setAttribute('aria-label','Temas destacados');
      header.insertAdjacentElement('afterend',bar);
    }
    const inner = document.createElement('div');
    inner.className = 'rs-hot-topics-inner';
    const lead = document.createElement('span');
    lead.className = 'rs-hot-label';
    lead.textContent = 'AHORA';
    inner.append(lead);
    topics.forEach(topic => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rs-hot-topic';
      b.dataset.topic = topic;
      b.textContent = topic;
      inner.append(b);
    });
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'rs-hot-topic rs-hot-all';
    all.dataset.topic = '';
    all.textContent = 'Ver todo';
    inner.append(all);
    bar.replaceChildren(inner);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('#rs-hot-topics .rs-hot-topic');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    b.dataset.topic ? selectTopic(b.dataset.topic) : clearTopic();
  }, true);

  if (!document.querySelector('#rs-hot-topics-style')) {
    const style = document.createElement('style');
    style.id='rs-hot-topics-style';
    style.textContent=`
      #rs-hot-topics{width:100%;background:#0c1117;border-bottom:1px solid #232b34;overflow:hidden;position:relative;z-index:20}
      .rs-hot-topics-inner{max-width:1180px;margin:0 auto;padding:8px 14px;display:flex;align-items:center;gap:8px;overflow-x:auto;scrollbar-width:none}
      .rs-hot-topics-inner::-webkit-scrollbar{display:none}
      .rs-hot-label{flex:0 0 auto;font-size:11px;font-weight:900;letter-spacing:.08em;color:#ff5a5f}
      .rs-hot-topic{flex:0 0 auto;border:0;background:transparent;color:#f3f5f7;font:inherit;font-size:13px;font-weight:750;cursor:pointer;padding:6px 9px;border-radius:999px;white-space:nowrap;touch-action:manipulation;pointer-events:auto}
      .rs-hot-topic:hover,.rs-hot-topic:focus-visible{background:#1a222b;color:#fff;outline:none}
      .rs-hot-all{color:#aeb7c2}
      @media(max-width:699px){.rs-hot-topics-inner{padding:7px 10px}.rs-hot-topic{font-size:12px;padding:6px 8px}}
    `;
    document.head.append(style);
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      render();
      if (activeTopic) syncVisibility();
    },120);
  };

  const observer = new MutationObserver(() => {
    schedule();
    if (activeTopic) setTimeout(syncVisibility,0);
  });
  observer.observe(grid,{childList:true,subtree:true});
  document.addEventListener('ranasports:news-updated',schedule);
  document.addEventListener('ranasports:trends',schedule);
  setInterval(render,60000);
  setTimeout(render,250);
  setTimeout(render,1200);
})();