(() => {
  const API='https://sportscore.com/api/widget/matches/?sport=football&limit=50&src=ranasports';
  const DETAIL='https://sportscore.com/api/widget/match/?sport=football&src=ranasports&slug=';
  const SOURCE_URL='https://sportscore.com/';
  const TZ='America/Argentina/Buenos_Aires';
  const REFRESH_MS=60000;
  let timer=null,loading=false,mode='all',lastMatches=[];
  const detailCache=new Map();
  const openDetails=new Set();

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const slugFromUrl=url=>String(url||'').match(/\/football\/match\/([^/]+)\/?/)?.[1]||'';
  const parts=(date,opts)=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,...opts}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const dayKey=date=>{const p=parts(date,{year:'numeric',month:'2-digit',day:'2-digit'});return `${p.year}-${p.month}-${p.day}`;};
  const clock=date=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  const todayKey=()=>dayKey(new Date());

  function ensureStyles(){
    if(document.querySelector('#rs-live-fix-style')) return;
    const style=document.createElement('style');
    style.id='rs-live-fix-style';
    style.textContent=`
      #en-vivo{grid-column:1/-1!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      body:has(#en-vivo) #newsGrid .news-card[hidden]{display:none!important}
      .rs-day-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 10px;padding:13px 14px;border:1px solid #27303a;border-radius:10px;background:#10161d}
      .rs-day-head .ey{font-size:11px;font-weight:950;letter-spacing:.08em;color:#ff123b}.rs-day-head h2{margin:3px 0 0;font-size:clamp(1.15rem,2vw,1.5rem);color:#fff}.rs-day-head b{font-size:10px;color:#9ca7b4}
      .rs-day-filters{display:flex;gap:8px;margin:0 0 12px}.rs-day-filter{border:1px solid #2a3440;border-radius:999px;background:#10161d;color:#9ca7b4;font:800 11px/1 system-ui;padding:9px 13px;cursor:pointer}.rs-day-filter.active{background:#ff123b;border-color:#ff123b;color:#fff}
      .rs-day-summary{margin:0 0 10px;color:#8f9aa7;font-size:11px}.rs-day-state{padding:22px 14px;border:1px solid #27303a;border-radius:10px;background:#0d1319;color:#9ca7b4;text-align:center;font-size:13px}
      .rs-day-list{display:grid;gap:13px}.rs-comp{border:1px solid #27303a;border-radius:12px;overflow:hidden;background:#0d1319}.rs-comp-head{display:flex;align-items:center;gap:9px;padding:11px 12px;background:#151d25;border-bottom:1px solid #27303a}.rs-comp-head img{width:24px;height:24px;object-fit:contain}.rs-comp-head strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5f7f9;font-size:12px;letter-spacing:.02em}.rs-comp-head small{margin-left:auto;color:#778390;font-size:10px}
      .rs-match-wrap{border-bottom:1px solid #202833}.rs-match-wrap:last-child{border-bottom:0}.rs-match{appearance:none;width:100%;border:0;background:#0d1319;color:inherit;display:grid;grid-template-columns:58px minmax(0,1fr) 22px;gap:10px;align-items:stretch;padding:0;cursor:pointer;text-align:left}.rs-match:hover{background:#111922}.rs-match.live{background:linear-gradient(90deg,rgba(137,173,21,.16),rgba(13,19,25,1) 55%)}
      .rs-status{display:grid;place-items:center;border-right:1px solid #202833;color:#8f9aa7;font-size:11px;font-weight:950;line-height:1.1;text-align:center;padding:10px 4px}.rs-status.live{color:#b8e51b}.rs-status.finished{color:#c8ced5}.rs-status.postponed{color:#ffb14a}
      .rs-teams{display:grid;gap:8px;padding:10px 0}.rs-team-row{display:grid;grid-template-columns:26px minmax(0,1fr) 28px;gap:8px;align-items:center;min-width:0}.rs-team-row img{width:24px;height:24px;object-fit:contain}.rs-team-row .fallback{width:24px;height:24px;border-radius:50%;background:#202832}.rs-team-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#edf1f5;font-size:13px;font-weight:800}.rs-team-score{text-align:center;color:#fff;font-size:17px;font-weight:950}.rs-match.upcoming .rs-team-score{color:#596471}.rs-chevron{display:grid;place-items:center;color:#6f7a86;font-size:16px}
      .rs-detail{padding:10px 12px 12px 70px;background:#0a1016;color:#aab3bd;font-size:11px}.rs-detail[hidden]{display:none!important}.rs-events{display:grid;gap:6px}.rs-event{display:grid;grid-template-columns:34px 18px minmax(0,1fr);gap:5px;align-items:start}.rs-event time{color:#b8e51b;font-weight:900}.rs-event .who{color:#cdd4db}.rs-detail-loading{color:#7e8995}
      .rs-day-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 2px 0;color:#7f8b98;font-size:10px}.rs-day-foot a{color:#aeb7c2;text-decoration:none;font-weight:900}
      html[data-theme="light"] .rs-day-head,html[data-theme="light"] .rs-comp,html[data-theme="light"] .rs-day-state,html[data-theme="light"] .rs-match,html[data-theme="light"] .rs-day-filter{background:#fff!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-comp-head{background:#eef2f6!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-comp-head strong,html[data-theme="light"] .rs-team-name,html[data-theme="light"] .rs-team-score,html[data-theme="light"] .rs-day-head h2{color:#171b21!important}html[data-theme="light"] .rs-match-wrap,html[data-theme="light"] .rs-status{border-color:#e1e6ec!important}html[data-theme="light"] .rs-detail{background:#f6f8fa!important}
      @media(max-width:699px){.rs-day-head{padding:12px}.rs-match{grid-template-columns:52px minmax(0,1fr) 18px;gap:8px}.rs-team-name{font-size:12px}.rs-team-score{font-size:16px}.rs-detail{padding-left:60px}.rs-comp-head strong{font-size:11px}}
    `;
    document.head.append(style);
  }

  function shell(module){
    module.dataset.sourceStatus='sportscore-day-v1';
    module.innerHTML=`
      <div class="rs-day-head"><div><div class="ey">● PARTIDOS DE HOY</div><h2>RESULTADOS Y PARTIDOS</h2></div><b>FÚTBOL</b></div>
      <div class="rs-day-filters"><button class="rs-day-filter active" type="button" data-rs-mode="all">TODOS</button><button class="rs-day-filter" type="button" data-rs-mode="live">EN VIVO</button></div>
      <div id="rs-day-summary" class="rs-day-summary"></div>
      <div id="rs-day-state" class="rs-day-state">Cargando partidos…</div>
      <div id="rs-day-list" class="rs-day-list"></div>
      <div class="rs-day-foot"><span>Horarios de Argentina · actualización cada 60 s.</span><a href="${SOURCE_URL}" rel="dofollow" target="_blank" title="Datos deportivos por SportScore">Powered by SportScore ↗</a></div>`;
    if(!module.dataset.rsBound){
      module.dataset.rsBound='1';
      module.addEventListener('click',async event=>{
        const filter=event.target.closest('[data-rs-mode]');
        if(filter){mode=filter.dataset.rsMode||'all';module.querySelectorAll('[data-rs-mode]').forEach(b=>b.classList.toggle('active',b.dataset.rsMode===mode));paint(lastMatches,module);return;}
        const row=event.target.closest('.rs-match[data-slug]');
        if(!row)return;
        const slug=row.dataset.slug;if(!slug)return;
        if(openDetails.has(slug))openDetails.delete(slug);else openDetails.add(slug);
        paint(lastMatches,module);
        if(openDetails.has(slug)&&!detailCache.has(slug)){
          const box=module.querySelector(`[data-rs-detail="${CSS.escape(slug)}"]`);if(box){box.hidden=false;box.innerHTML='<span class="rs-detail-loading">Cargando incidencias…</span>';}
          await fetchDetail(slug,false);paint(lastMatches,module);
        }
      });
    }
  }

  function normalize(m){
    return {
      home:String(m?.home||''),away:String(m?.away||''),
      homeLogo:String(m?.home_logo||''),awayLogo:String(m?.away_logo||''),competitionLogo:String(m?.competition_logo||''),
      homeScore:m?.home_score,awayScore:m?.away_score,
      status:fold(m?.status||''),statusText:String(m?.status_text||''),
      competition:String(m?.competition||'Otra competencia'),time:String(m?.time||''),url:String(m?.url||''),slug:slugFromUrl(m?.url),
      liveMinute:m?.live_minute??null,incidents:null
    };
  }

  function kind(m){
    const s=`${m.status} ${fold(m.statusText)}`;
    if(/postponed|cancelled|canceled|abandoned/.test(s))return 'postponed';
    if(/finished|full.?time|\bft\b|final/.test(s))return 'finished';
    if(/upcoming|scheduled|not.?started/.test(s))return 'upcoming';
    if(/live|1st half|2nd half|first half|second half|half time|extra time|penalt|ongoing/.test(s))return 'live';
    return 'upcoming';
  }

  function wanted(m){
    const c=fold(m.competition),teams=fold(`${m.home} ${m.away}`);
    if(/(^|\s)argentina(\s|$)/.test(teams))return true;
    if(/argentine division 1|argentine primera|liga profesional|primera nacional|argentine division 2|copa argentina|torneo apertura|torneo clausura/.test(c))return true;
    if(/libertadores|sudamericana|recopa sudamericana|conmebol|copa america|south american.*qualif|world cup qualif.*south america/.test(c))return true;
    if(/fifa|world cup|copa mundial|club world cup|mundial de clubes/.test(c))return true;
    if(/uefa champions league|champions league/.test(c))return true;
    if(/uefa europa league|europa league/.test(c)&&!/conference/.test(c))return true;
    if(/english premier league|premier league/.test(c))return true;
    if(/spanish la liga|\bla liga\b|laliga/.test(c))return true;
    if(/italian serie a|\bserie a\b/.test(c))return true;
    if(/german bundesliga|\bbundesliga\b/.test(c))return true;
    if(/french ligue 1|\bligue 1\b/.test(c))return true;
    return false;
  }

  function isToday(m){if(!m.time)return false;const d=new Date(m.time);return Number.isFinite(d.getTime())&&dayKey(d)===todayKey();}
  function kickoff(m){const d=new Date(m.time);return Number.isFinite(d.getTime())?d.getTime():Number.MAX_SAFE_INTEGER;}
  function statusLabel(m){
    const k=kind(m),t=fold(m.statusText);
    if(k==='finished')return 'FIN';
    if(k==='postponed')return /cancel/.test(t)?'CANC':'POS';
    if(k==='upcoming')return m.time?clock(new Date(m.time)):'—';
    if(m.liveMinute!==null&&m.liveMinute!==undefined&&m.liveMinute!=='')return `${m.liveMinute}'`;
    if(/half time/.test(t))return 'ET';if(/1st half|first half/.test(t))return '1T';if(/2nd half|second half/.test(t))return '2T';if(/extra time/.test(t))return 'TE';if(/penalt/.test(t))return 'PEN';return 'VIVO';
  }
  const score=v=>v===null||v===undefined||v===''?'–':String(v);
  const logo=(src,alt)=>src?`<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fallback'}))">`:'<span class="fallback"></span>';

  async function fetchDetail(slug,force){
    if(!slug)return null;if(!force&&detailCache.has(slug))return detailCache.get(slug);
    try{const r=await fetch(DETAIL+encodeURIComponent(slug),{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});if(!r.ok)return null;const d=(await r.json())?.match||null;if(d)detailCache.set(slug,d);return d;}catch{return null;}
  }

  async function enrichLive(items){
    const lives=items.filter(m=>kind(m)==='live'&&m.slug);
    await Promise.allSettled(lives.map(async m=>{
      const d=await fetchDetail(m.slug,true);if(!d)return;
      if(d.live_minute!==null&&d.live_minute!==undefined&&d.live_minute!=='')m.liveMinute=d.live_minute;
      if(d.status_text)m.statusText=d.status_text;if(d.home_score!==undefined)m.homeScore=d.home_score;if(d.away_score!==undefined)m.awayScore=d.away_score;
      if(Array.isArray(d.incidents))m.incidents=d.incidents;
      if(d.home_logo&&!m.homeLogo)m.homeLogo=d.home_logo;if(d.away_logo&&!m.awayLogo)m.awayLogo=d.away_logo;
      detailCache.set(m.slug,d);
    }));
  }

  function detailHtml(slug){
    const d=detailCache.get(slug);if(!d)return '<span class="rs-detail-loading">Tocá para cargar incidencias.</span>';
    const events=(Array.isArray(d.incidents)?d.incidents:[]).filter(i=>i?.is_goal||i?.is_card||i?.is_sub||/goal|card|substitution|var/i.test(String(i?.type||''))).slice(-12);
    if(!events.length)return '<span class="rs-detail-loading">No hay incidencias disponibles.</span>';
    return `<div class="rs-events">${events.map(i=>{const type=String(i.type||'');const icon=i.is_goal||/goal/i.test(type)?'⚽':/red/i.test(type)?'🟥':/yellow|card/i.test(type)?'🟨':i.is_sub||/substitution/i.test(type)?'↔':'•';const who=i.player||[i.player_out,i.player_in].filter(Boolean).join(' → ')||type;const sc=i.is_goal&&i.home_score!==undefined?` · ${i.home_score}-${i.away_score}`:'';return `<div class="rs-event"><time>${esc(i.time??'')}′</time><span>${icon}</span><span class="who">${esc(who)}${esc(sc)}</span></div>`;}).join('')}</div>`;
  }

  function paint(items,module){
    const state=module.querySelector('#rs-day-state'),list=module.querySelector('#rs-day-list'),summary=module.querySelector('#rs-day-summary');
    let shown=mode==='live'?items.filter(m=>kind(m)==='live'):items;
    summary.textContent=mode==='live'?`${shown.length} partido${shown.length===1?'':'s'} en vivo de las competencias seleccionadas`:`${shown.length} partido${shown.length===1?'':'s'} de hoy · finalizados, en vivo y próximos`;
    if(!shown.length){state.hidden=false;state.textContent=mode==='live'?'No hay partidos en vivo de las competencias seleccionadas.':'No encontramos partidos de hoy de las competencias seleccionadas.';list.replaceChildren();return;}
    state.hidden=true;
    const groups=new Map();
    for(const m of shown){const key=m.competition||'Otra competencia';if(!groups.has(key))groups.set(key,{logo:m.competitionLogo,items:[]});groups.get(key).items.push(m);}
    const ordered=[...groups.entries()].sort((a,b)=>Math.min(...a[1].items.map(kickoff))-Math.min(...b[1].items.map(kickoff)));
    list.innerHTML=ordered.map(([competition,g])=>`<section class="rs-comp"><div class="rs-comp-head">${g.logo?`<img src="${esc(g.logo)}" alt="" loading="lazy">`:''}<strong>${esc(competition)}</strong><small>${g.items.length}</small></div>${g.items.sort((a,b)=>kickoff(a)-kickoff(b)).map(m=>{const k=kind(m),open=openDetails.has(m.slug);const hasScore=k!=='upcoming'&&k!=='postponed';return `<div class="rs-match-wrap"><button class="rs-match ${k}" type="button" ${m.slug?`data-slug="${esc(m.slug)}"`:''}><span class="rs-status ${k}">${esc(statusLabel(m))}</span><span class="rs-teams"><span class="rs-team-row">${logo(m.homeLogo,m.home)}<span class="rs-team-name">${esc(m.home)}</span><strong class="rs-team-score">${hasScore?esc(score(m.homeScore)):''}</strong></span><span class="rs-team-row">${logo(m.awayLogo,m.away)}<span class="rs-team-name">${esc(m.away)}</span><strong class="rs-team-score">${hasScore?esc(score(m.awayScore)):''}</strong></span></span><span class="rs-chevron">${m.slug?(open?'⌃':'⌄'):''}</span></button>${m.slug?`<div class="rs-detail" data-rs-detail="${esc(m.slug)}" ${open?'':'hidden'}>${open?detailHtml(m.slug):''}</div>`:''}</div>`;}).join('')}</section>`).join('');
  }

  async function refresh(){
    if(loading||location.hash!=='#en-vivo')return;const module=document.querySelector('#en-vivo');if(!module)return;if(module.dataset.sourceStatus!=='sportscore-day-v1')shell(module);const state=module.querySelector('#rs-day-state'),list=module.querySelector('#rs-day-list');loading=true;
    try{const r=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);const data=await r.json();let items=(Array.isArray(data?.matches)?data.matches:[]).map(normalize).filter(m=>m.home&&m.away&&isToday(m)&&wanted(m)).sort((a,b)=>kickoff(a)-kickoff(b));await enrichLive(items);lastMatches=items;paint(items,module);}catch{state.hidden=false;state.textContent='Partidos temporalmente no disponibles. Volvé a intentar en unos instantes.';list.replaceChildren();}finally{loading=false;}
  }

  function install(){if(location.hash!=='#en-vivo')return;const module=document.querySelector('#en-vivo');if(!module)return;ensureStyles();if(module.dataset.sourceStatus!=='sportscore-day-v1')shell(module);refresh();clearInterval(timer);timer=setInterval(refresh,REFRESH_MS);}
  const schedule=()=>setTimeout(()=>{if(location.hash==='#en-vivo')install();else{clearInterval(timer);timer=null;}},0);
  window.addEventListener('hashchange',schedule);document.addEventListener('ranasports:navigation-ready',schedule);document.addEventListener('ranasports:news-updated',schedule);schedule();
})();