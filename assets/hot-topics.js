(() => {
  const grid = document.querySelector('#newsGrid');
  const header = document.querySelector('.site-header');
  const search = document.querySelector('#searchInput');
  if (!grid || !header || !search) return;

  const normalize = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const titleCase = s => s.toLowerCase().replace(/(^|\s)([a-záéíóúñ])/g,(_,a,b)=>a+b.toUpperCase());
  const known = [
    'Messi','Inter Miami','Selección Argentina','Boca','River','Independiente','Racing','San Lorenzo','Huracán',
    'Vélez','Argentinos Juniors','Rosario Central','Newell’s','Estudiantes','Gimnasia','Talleres','Belgrano',
    'Instituto','Platense','Tigre','Sarmiento','Lanús','Banfield','Defensa y Justicia','Godoy Cruz','Unión','Colón',
    'Atlético Tucumán','Independiente Rivadavia','Aldosivi','Barracas Central','Central Córdoba','Riestra',
    'Torneo Clausura','Copa Argentina','Copa Libertadores','Copa Sudamericana','Champions League','Fórmula 1','Colapinto',
    'Nicolás Varrone','Varrone','Mattia Colnaghi','Colnaghi','Fórmula 2','Fórmula 3','MotoGP','Moto3','Juegos Suramericanos'
  ];
  const stop = new Set('el la los las un una unos unas de del y en con por para ante tras sobre sin al a que se su sus este esta estos estas fue son es será ser ganó gano gana ganaron terminó termino termina terminó perdió perdio vence venció vencio derrotó derroto empató empato goleó goleo cayó cayo sigue vuelve volvió volver llega llegó llego tiene tuvo habría habria podría podria'.split(' '));

  const allCards = () => [...grid.querySelectorAll('.news-card')];
  const publishedAt = card => Date.parse(card.querySelector('time')?.dateTime || '') || 0;
  const textOf = card => normalize([card.querySelector('h3')?.textContent || '', card.querySelector('.news-excerpt')?.textContent || '', card.dataset.sport || ''].join(' '));

  function recentCards(){
    const now = Date.now();
    return allCards().filter(c=>{ const t=publishedAt(c); return t && t<=now && now-t<=36*3600000; }).sort((a,b)=>publishedAt(b)-publishedAt(a));
  }

  function dynamicTitleTopics(){
    const out=[];
    for(const card of recentCards().slice(0,16)){
      const raw=(card.querySelector('h3')?.textContent||'').replace(/[“”"':,;!?()]/g,' ').replace(/\s+/g,' ').trim();
      if(!raw) continue;
      const words=raw.split(' ').filter(Boolean);
      const useful=words.filter(w=>!stop.has(normalize(w)) && normalize(w).length>3 && !/^\d+$/.test(w));
      if(useful.length){
        const first=useful[0];
        const second=useful[1];
        let label=first;
        if(second && normalize(first).length<14 && normalize(second).length<16) label += ' '+second;
        label=titleCase(label);
        if(label.length>=4 && label.length<=32) out.push(label);
      }
    }
    return out;
  }

  function matchups(){
    const out=[];
    recentCards().forEach(card=>{
      const title=card.querySelector('h3')?.textContent||'';
      const m=title.match(/([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' -]{2,30})\s+(?:vs\.?|v\.|-|–)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ.' -]{2,30})/i);
      if(m) out.push(`${m[1].trim()} vs ${m[2].trim()}`);
    });
    return out;
  }

  function topicScore(topic){
    const needle=normalize(topic).replace(/\s+vs\s+/g,' ');
    const now=Date.now(); let score=0;
    for(const card of recentCards()){
      const text=textOf(card).replace(/\s+vs\s+/g,' ');
      if(!text.includes(needle)) continue;
      const age=(now-publishedAt(card))/3600000;
      score += age<=2?220:age<=6?150:age<=12?90:age<=24?45:20;
      if(card.classList.contains('lead-story')) score+=120;
      score += Math.min(220, Number(window.ranaEditorialScore?.(card)||0));
    }
    return score;
  }

  function buildTopics(){
    const candidates=[...new Set([...dynamicTitleTopics(),...matchups(),...known])];
    return candidates.map(topic=>({topic,score:topicScore(topic)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.topic);
  }

  function applyTopic(topic){
    const value=topic.replace(/\s+vs\s+/i,' ');
    search.value=value;
    search.focus({preventScroll:true});
    search.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));
    search.dispatchEvent(new Event('change',{bubbles:true}));
    requestAnimationFrame(()=>document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function clearTopic(){
    search.value='';
    search.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward',data:null}));
    search.dispatchEvent(new Event('change',{bubbles:true}));
    requestAnimationFrame(()=>document.querySelector('#ultimas')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function render(){
    const topics=buildTopics();
    let bar=document.querySelector('#rs-hot-topics');
    if(!bar){bar=document.createElement('nav');bar.id='rs-hot-topics';bar.setAttribute('aria-label','Temas destacados');header.insertAdjacentElement('afterend',bar);}
    const inner=document.createElement('div');inner.className='rs-hot-topics-inner';
    const lead=document.createElement('span');lead.className='rs-hot-label';lead.textContent='AHORA';inner.append(lead);
    topics.forEach(topic=>{const b=document.createElement('button');b.type='button';b.className='rs-hot-topic';b.textContent=topic;b.dataset.topic=topic;b.addEventListener('pointerup',e=>{e.preventDefault();applyTopic(topic);},{passive:false});b.addEventListener('click',e=>{e.preventDefault();applyTopic(topic);});inner.append(b);});
    const all=document.createElement('button');all.type='button';all.className='rs-hot-topic rs-hot-all';all.textContent='Ver todo';all.addEventListener('click',e=>{e.preventDefault();clearTopic();});inner.append(all);
    bar.replaceChildren(inner);
  }

  if(!document.querySelector('#rs-hot-topics-style')){
    const style=document.createElement('style');style.id='rs-hot-topics-style';style.textContent=`#rs-hot-topics{width:100%;background:#0c1117;border-bottom:1px solid #232b34;overflow:hidden}.rs-hot-topics-inner{max-width:1180px;margin:0 auto;padding:8px 14px;display:flex;align-items:center;gap:8px;overflow-x:auto;scrollbar-width:none}.rs-hot-topics-inner::-webkit-scrollbar{display:none}.rs-hot-label{flex:0 0 auto;font-size:11px;font-weight:900;letter-spacing:.08em;color:#ff5a5f}.rs-hot-topic{flex:0 0 auto;border:0;background:transparent;color:#f3f5f7;font:inherit;font-size:13px;font-weight:750;cursor:pointer;padding:5px 8px;border-radius:999px;white-space:nowrap;touch-action:manipulation}.rs-hot-topic:hover,.rs-hot-topic:focus-visible{background:#1a222b;color:#fff;outline:none}.rs-hot-all{color:#aeb7c2}@media(max-width:699px){.rs-hot-topics-inner{padding:7px 10px}.rs-hot-topic{font-size:12px;padding:5px 7px}}`;document.head.append(style);
  }

  let timer; const schedule=()=>{clearTimeout(timer);timer=setTimeout(render,100);};
  document.addEventListener('ranasports:news-updated',schedule);
  document.addEventListener('ranasports:trends',schedule);
  setInterval(render,60*1000);
  setTimeout(render,250);setTimeout(render,1200);
})();