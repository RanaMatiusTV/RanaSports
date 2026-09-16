(() => {
  const API='https://sportscore.com/api/widget/matches/?sport=football&limit=50&src=ranasports';
  const DETAIL='https://sportscore.com/api/widget/match/?sport=football&src=ranasports&slug=';
  const SOURCE_URL='https://sportscore.com/';
  const TZ='America/Argentina/Buenos_Aires';
  const REFRESH_MS=60000;

  let timer=null,loading=false,mode='all',lastMatches=[];
  const detailCache=new Map();
  const openDetails=new Set();
  const collapsedCompetitions=new Set();

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const slugFromUrl=url=>String(url||'').match(/\/football\/match\/([^/]+)\/?/)?.[1]||'';
  const parts=(date,opts)=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,...opts}).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const dayKey=date=>{const p=parts(date,{year:'numeric',month:'2-digit',day:'2-digit'});return `${p.year}-${p.month}-${p.day}`;};
  const clock=date=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  const todayKey=()=>dayKey(new Date());
  const todayLabel=()=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,weekday:'short',day:'2-digit',month:'short'}).format(new Date()).replace('.','').toUpperCase();

  function ensureStyles(){
    if(document.querySelector('#rs-live-fix-style'))return;
    const s=document.createElement('style');
    s.id='rs-live-fix-style';
    s.textContent=`
      #en-vivo{grid-column:1/-1!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      body:has(#en-vivo) #newsGrid .news-card[hidden]{display:none!important}
      .rs-scoreboard{width:100%;font-family:inherit;color:#eef2f6}
      .rs-board-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:12px 14px;background:#0c1117;border:1px solid #252d36;border-radius:10px}
      .rs-board-top .rs-kicker{font-size:10px;font-weight:950;letter-spacing:.12em;color:#ff1746}.rs-board-top h2{margin:3px 0 0;font-size:clamp(1.15rem,2.2vw,1.55rem);line-height:1.05;color:#fff}.rs-board-date{font-size:11px;font-weight:900;color:#aeb7c2;white-space:nowrap}
      .rs-board-tabs{display:flex;gap:7px;margin:0 0 9px}.rs-board-tab{border:1px solid #29323c;background:#0d1319;color:#8f9aa7;border-radius:6px;padding:8px 13px;font:900 10px/1 system-ui;letter-spacing:.04em;cursor:pointer}.rs-board-tab.active{background:#ff1746;border-color:#ff1746;color:#fff}
      .rs-board-summary{margin:0 0 12px;font-size:10px;color:#7f8b98}
      .rs-board-state{padding:20px 12px;background:#0d1319;border:1px solid #252d36;border-radius:8px;color:#919ca8;text-align:center;font-size:12px}
      .rs-board-list{display:grid;gap:18px}
      .rs-league{background:transparent;border-bottom:1px solid #242b33;padding-bottom:13px}
      .rs-league-head{appearance:none;width:100%;border:0;background:transparent;color:inherit;display:grid;grid-template-columns:30px minmax(0,1fr) auto 20px;gap:9px;align-items:center;padding:9px 4px 10px;cursor:pointer;text-align:left}
      .rs-league-head img{width:27px;height:27px;object-fit:contain}.rs-league-head .fallback{width:27px;height:27px;border-radius:4px;background:#1a222b}.rs-league-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#dfe4e9;font-size:13px;font-weight:950;letter-spacing:.045em;text-transform:uppercase}.rs-league-count{color:#697581;font-size:10px;font-weight:800}.rs-league-arrow{color:#9aa4af;font-size:16px;text-align:center;transition:transform .15s}.rs-league.collapsed .rs-league-arrow{transform:rotate(-90deg)}
      .rs-games{border:1px solid #242b33;border-radius:4px;overflow:hidden;background:#0b1015}.rs-league.collapsed .rs-games{display:none}
      .rs-game-wrap{border-bottom:2px solid #181f26}.rs-game-wrap:last-child{border-bottom:0}
      .rs-game{appearance:none;width:100%;border:0;background:#101419;color:inherit;display:grid;grid-template-columns:64px minmax(0,1fr) 26px;align-items:stretch;padding:0;cursor:pointer;text-align:left}.rs-game:hover{background:#131a21}.rs-game.live{background:#2b3519}.rs-game.live:hover{background:#323e1d}
      .rs-game-state{display:grid;place-items:center;border-right:1px solid #222a32;padding:10px 5px;color:#b8c0c8;font-size:11px;font-weight:950;line-height:1.05;text-align:center}.rs-game-state.live{color:#c6ef22}.rs-game-state.finished{color:#c3c8ce}.rs-game-state.upcoming{color:#f0f3f6}.rs-game-state.postponed{color:#ffb24b}
      .rs-game-main{min-width:0;padding:11px 10px 9px}.rs-scoreline{display:grid;grid-template-columns:minmax(0,1fr) 27px auto 27px minmax(0,1fr);gap:7px;align-items:center;min-width:0}.rs-side{min-width:0;color:#f0f2f4;font-size:13px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs-side.home{text-align:right}.rs-side.away{text-align:left}.rs-crest{width:25px;height:25px;object-fit:contain}.rs-crest-fallback{display:block;width:24px;height:24px;border-radius:50%;background:#252d36}.rs-score{min-width:54px;text-align:center;color:#fff;font-size:19px;font-weight:950;letter-spacing:.02em}.rs-game.upcoming .rs-score{color:#606a75}.rs-game-sub{min-height:13px;margin-top:6px;text-align:center;color:#7e8994;font-size:10px;font-weight:750}.rs-game.live .rs-game-sub{color:#aabc72}.rs-open-arrow{display:grid;place-items:center;color:#77828d;font-size:15px}
      .rs-detail{background:#0a0f14;border-top:1px solid #20272e;padding:9px 12px 11px 76px;color:#aab3bd;font-size:11px}.rs-detail[hidden]{display:none!important}.rs-detail-title{margin:0 0 6px;color:#75818d;font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.rs-events{display:grid;gap:5px}.rs-event{display:grid;grid-template-columns:37px 18px minmax(0,1fr);gap:4px;align-items:start}.rs-event time{color:#c6ef22;font-weight:950}.rs-event .who{color:#cbd2d8}.rs-detail-loading{color:#7f8a95}
      .rs-board-foot{display:flex;justify-content:space-between;gap:10px;padding:12px 2px 0;color:#717c88;font-size:9px}.rs-board-foot a{color:#9ba5af;text-decoration:none;font-weight:900}
      html[data-theme="light"] .rs-board-top,html[data-theme="light"] .rs-board-state,html[data-theme="light"] .rs-board-tab{background:#fff!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-board-top h2,html[data-theme="light"] .rs-league-name{color:#171b21!important}html[data-theme="light"] .rs-games{background:#fff;border-color:#d8dee6}html[data-theme="light"] .rs-game{background:#fff!important}html[data-theme="light"] .rs-game.live{background:#edf5d3!important}html[data-theme="light"] .rs-game-state{border-color:#e1e6ec}html[data-theme="light"] .rs-side,html[data-theme="light"] .rs-score{color:#171b21!important}html[data-theme="light"] .rs-detail{background:#f6f8fa!important;border-color:#e1e6ec}
      @media(max-width:699px){
        .rs-board-top{padding:11px 12px}.rs-board-top h2{font-size:1.25rem}.rs-league-head{grid-template-columns:27px minmax(0,1fr) auto 18px;padding-left:2px;padding-right:2px}.rs-league-head img{width:24px;height:24px}.rs-league-name{font-size:11px}.rs-game{grid-template-columns:56px minmax(0,1fr) 22px}.rs-game-main{padding:11px 6px 9px}.rs-scoreline{grid-template-columns:minmax(0,1fr) 24px auto 24px minmax(0,1fr);gap:5px}.rs-side{font-size:12px}.rs-crest{width:22px;height:22px}.rs-score{min-width:45px;font-size:18px}.rs-game-state{font-size:10px;padding-left:3px;padding-right:3px}.rs-detail{padding-left:65px}
      }
      @media(max-width:390px){.rs-side{font-size:11px}.rs-scoreline{gap:4px}.rs-score{font-size:17px;min-width:40px}.rs-game{grid-template-columns:51px minmax(0,1fr) 19px}}
    `;
    document.head.append(s);
  }

  function shell(module){
    module.dataset.sourceStatus='sportscore-board-v2';
    module.innerHTML=`<div class="rs-scoreboard">
      <div class="rs-board-top"><div><div class="rs-kicker">● PARTIDOS DE HOY</div><h2>RESULTADOS Y PARTIDOS</h2></div><div class="rs-board-date">${esc(todayLabel())}</div></div>
      <div class="rs-board-tabs"><button class="rs-board-tab active" type="button" data-rs-mode="all">TODOS</button><button class="rs-board-tab" type="button" data-rs-mode="live">EN VIVO</button></div>
      <div id="rs-board-summary" class="rs-board-summary"></div>
      <div id="rs-board-state" class="rs-board-state">Cargando partidos…</div>
      <div id="rs-board-list" class="rs-board-list"></div>
      <div class="rs-board-foot"><span>Hora Argentina · actualización cada 60 s.</span><a href="${SOURCE_URL}" rel="dofollow" target="_blank" title="Datos deportivos por SportScore">Powered by SportScore ↗</a></div>
    </div>`;

    if(!module.dataset.rsBound){
      module.dataset.rsBound='1';
      module.addEventListener('click',async event=>{
        const filter=event.target.closest('[data-rs-mode]');
        if(filter){
          mode=filter.dataset.rsMode||'all';
          module.querySelectorAll('[data-rs-mode]').forEach(b=>b.classList.toggle('active',b.dataset.rsMode===mode));
          paint(lastMatches,module);return;
        }
        const league=event.target.closest('[data-rs-comp]');
        if(league){
          const key=decodeURIComponent(league.dataset.rsComp||'');
          if(collapsedCompetitions.has(key))collapsedCompetitions.delete(key);else collapsedCompetitions.add(key);
          paint(lastMatches,module);return;
        }
        const row=event.target.closest('.rs-game[data-slug]');
        if(!row)return;
        const slug=row.dataset.slug;if(!slug)return;
        if(openDetails.has(slug))openDetails.delete(slug);else openDetails.add(slug);
        paint(lastMatches,module);
        if(openDetails.has(slug)&&!detailCache.has(slug)){
          const box=module.querySelector(`[data-rs-detail="${CSS.escape(slug)}"]`);
          if(box){box.hidden=false;box.innerHTML='<span class="rs-detail-loading">Cargando incidencias…</span>';}
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
      liveMinute:m?.live_minute??null
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
    if(/half time/.test(t))return 'ET';
    if(/1st half|first half/.test(t))return '1T';
    if(/2nd half|second half/.test(t))return '2T';
    if(/extra time/.test(t))return 'TE';
    if(/penalt/.test(t))return 'PEN';
    return 'VIVO';
  }
  function subLabel(m){
    const k=kind(m),t=String(m.statusText||'').trim();
    if(k==='upcoming')return 'Próximo';
    if(k==='finished')return t&&fold(t)!=='finished'?t:'';
    if(k==='postponed')return t;
    if(k==='live')return t&&!/^live$/i.test(t)?t:'En juego';
    return '';
  }
  const score=v=>v===null||v===undefined||v===''?'–':String(v);
  const crest=(src,alt)=>src?`<img class="rs-crest" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rs-crest-fallback'}))">`:'<span class="rs-crest-fallback"></span>';

  async function fetchDetail(slug,force){
    if(!slug)return null;
    if(!force&&detailCache.has(slug))return detailCache.get(slug);
    try{
      const r=await fetch(DETAIL+encodeURIComponent(slug),{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!r.ok)return null;
      const d=(await r.json())?.match||null;
      if(d)detailCache.set(slug,d);
      return d;
    }catch{return null;}
  }

  async function enrichLive(items){
    const lives=items.filter(m=>kind(m)==='live'&&m.slug);
    await Promise.allSettled(lives.map(async m=>{
      const d=await fetchDetail(m.slug,true);if(!d)return;
      if(d.live_minute!==null&&d.live_minute!==undefined&&d.live_minute!=='')m.liveMinute=d.live_minute;
      if(d.status_text)m.statusText=d.status_text;
      if(d.home_score!==undefined)m.homeScore=d.home_score;
      if(d.away_score!==undefined)m.awayScore=d.away_score;
      if(d.home_logo&&!m.homeLogo)m.homeLogo=d.home_logo;
      if(d.away_logo&&!m.awayLogo)m.awayLogo=d.away_logo;
      detailCache.set(m.slug,d);
    }));
  }

  function detailHtml(slug){
    const d=detailCache.get(slug);
    if(!d)return '<span class="rs-detail-loading">Tocá para cargar incidencias.</span>';
    const events=(Array.isArray(d.incidents)?d.incidents:[]).filter(i=>i?.is_goal||i?.is_card||i?.is_sub||/goal|card|substitution|var/i.test(String(i?.type||''))).slice(-14);
    if(!events.length)return '<span class="rs-detail-loading">No hay incidencias disponibles.</span>';
    return `<div class="rs-detail-title">INCIDENCIAS</div><div class="rs-events">${events.map(i=>{
      const type=String(i.type||'');
      const icon=i.is_goal||/goal/i.test(type)?'⚽':/red/i.test(type)?'🟥':/yellow|card/i.test(type)?'🟨':i.is_sub||/substitution/i.test(type)?'↔':'•';
      const who=i.player||[i.player_out,i.player_in].filter(Boolean).join(' → ')||type;
      const sc=i.is_goal&&i.home_score!==undefined?` · ${i.home_score}-${i.away_score}`:'';
      return `<div class="rs-event"><time>${esc(i.time??'')}′</time><span>${icon}</span><span class="who">${esc(who)}${esc(sc)}</span></div>`;
    }).join('')}</div>`;
  }

  function paint(items,module){
    const state=module.querySelector('#rs-board-state'),list=module.querySelector('#rs-board-list'),summary=module.querySelector('#rs-board-summary');
    let shown=mode==='live'?items.filter(m=>kind(m)==='live'):items;
    summary.textContent=mode==='live'?`${shown.length} EN VIVO`:`${shown.length} PARTIDOS · HOY`;
    if(!shown.length){
      state.hidden=false;
      state.textContent=mode==='live'?'No hay partidos en vivo de las competencias seleccionadas.':'No encontramos partidos de hoy de las competencias seleccionadas.';
      list.replaceChildren();return;
    }
    state.hidden=true;
    const groups=new Map();
    for(const m of shown){const key=m.competition||'Otra competencia';if(!groups.has(key))groups.set(key,{logo:m.competitionLogo,items:[]});groups.get(key).items.push(m);}
    const ordered=[...groups.entries()].sort((a,b)=>Math.min(...a[1].items.map(kickoff))-Math.min(...b[1].items.map(kickoff)));
    list.innerHTML=ordered.map(([competition,g])=>{
      const collapsed=collapsedCompetitions.has(competition);
      const games=g.items.sort((a,b)=>kickoff(a)-kickoff(b)).map(m=>{
        const k=kind(m),open=openDetails.has(m.slug),hasScore=k!=='upcoming'&&k!=='postponed';
        const scoreText=hasScore?`${score(m.homeScore)} - ${score(m.awayScore)}`:'–';
        return `<div class="rs-game-wrap"><button class="rs-game ${k}" type="button" ${m.slug?`data-slug="${esc(m.slug)}"`:''}>
          <span class="rs-game-state ${k}">${esc(statusLabel(m))}</span>
          <span class="rs-game-main"><span class="rs-scoreline"><span class="rs-side home">${esc(m.home)}</span>${crest(m.homeLogo,m.home)}<strong class="rs-score">${esc(scoreText)}</strong>${crest(m.awayLogo,m.away)}<span class="rs-side away">${esc(m.away)}</span></span><span class="rs-game-sub">${esc(subLabel(m))}</span></span>
          <span class="rs-open-arrow">${m.slug?(open?'⌃':'⌄'):''}</span>
        </button>${m.slug?`<div class="rs-detail" data-rs-detail="${esc(m.slug)}" ${open?'':'hidden'}>${open?detailHtml(m.slug):''}</div>`:''}</div>`;
      }).join('');
      const compLogo=g.logo?`<img src="${esc(g.logo)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fallback'}))">`:'<span class="fallback"></span>';
      return `<section class="rs-league ${collapsed?'collapsed':''}"><button class="rs-league-head" type="button" data-rs-comp="${encodeURIComponent(competition)}">${compLogo}<span class="rs-league-name">${esc(competition)}</span><span class="rs-league-count">${g.items.length}</span><span class="rs-league-arrow">⌄</span></button><div class="rs-games">${games}</div></section>`;
    }).join('');
  }

  async function refresh(){
    if(loading||location.hash!=='#en-vivo')return;
    const module=document.querySelector('#en-vivo');if(!module)return;
    if(module.dataset.sourceStatus!=='sportscore-board-v2')shell(module);
    const state=module.querySelector('#rs-board-state'),list=module.querySelector('#rs-board-list');
    loading=true;
    try{
      const r=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      let items=(Array.isArray(data?.matches)?data.matches:[]).map(normalize).filter(m=>m.home&&m.away&&isToday(m)&&wanted(m)).sort((a,b)=>kickoff(a)-kickoff(b));
      await enrichLive(items);
      lastMatches=items;
      paint(items,module);
    }catch{
      state.hidden=false;state.textContent='Partidos temporalmente no disponibles. Volvé a intentar en unos instantes.';list.replaceChildren();
    }finally{loading=false;}
  }

  function install(){
    if(location.hash!=='#en-vivo')return;
    const module=document.querySelector('#en-vivo');if(!module)return;
    ensureStyles();
    if(module.dataset.sourceStatus!=='sportscore-board-v2')shell(module);
    refresh();
    clearInterval(timer);timer=setInterval(refresh,REFRESH_MS);
  }
  const schedule=()=>setTimeout(()=>{if(location.hash==='#en-vivo')install();else{clearInterval(timer);timer=null;}},0);
  window.addEventListener('hashchange',schedule);
  document.addEventListener('ranasports:navigation-ready',schedule);
  document.addEventListener('ranasports:news-updated',schedule);
  schedule();
})();