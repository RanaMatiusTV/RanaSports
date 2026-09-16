(() => {
  const API='https://sportscore.com/api/widget/matches/?sport=football&limit=50&src=ranasports';
  const DETAIL='https://sportscore.com/api/widget/match/?sport=football&src=ranasports&slug=';
  const SOURCE_URL='https://sportscore.com/';
  const REFRESH_MS=60000;
  let timer=null,loading=false;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const label=v=>typeof v==='string'?v:(v?.name||v?.title||v?.short_name||v?.competition_name||v?.league_name||'');
  const slugFromUrl=url=>String(url||'').match(/\/football\/match\/([^/]+)\/?/)?.[1]||'';

  function ensureStyles(){
    if(document.querySelector('#rs-live-fix-style')) return;
    const style=document.createElement('style');
    style.id='rs-live-fix-style';
    style.textContent=`
      #en-vivo{grid-column:1/-1!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      body:has(#en-vivo) #newsGrid .news-card[hidden]{display:none!important}
      .rs-live-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:13px 14px;border:1px solid #27303a;border-radius:10px;background:#10161d}
      .rs-live-head span{font-size:11px;font-weight:950;letter-spacing:.08em;color:#ff123b}.rs-live-head h2{margin:3px 0 0;font-size:clamp(1.15rem,2vw,1.5rem);color:#fff}.rs-live-head b{font-size:10px;color:#9ca7b4}
      .rs-live-state{padding:22px 14px;border:1px solid #27303a;border-radius:10px;background:#0d1319;color:#9ca7b4;text-align:center;font-size:13px}
      .rs-live-list{display:grid;gap:12px}.rs-live-group{border:1px solid #27303a;border-radius:12px;overflow:hidden;background:#0d1319}.rs-live-group h3{margin:0!important;padding:10px 12px!important;background:#151d25;color:#f5f7f9!important;font-size:12px!important;border-bottom:1px solid #27303a}
      .rs-live-match{display:grid;grid-template-columns:minmax(0,1fr) 78px minmax(0,1fr);gap:8px;align-items:center;padding:12px;border-bottom:1px solid #202833}.rs-live-match:last-child{border-bottom:0}.rs-live-team{font-size:13px;font-weight:800;color:#eef2f6;line-height:1.2}.rs-live-team.away{text-align:right}.rs-live-score{text-align:center}.rs-live-score strong{font-size:18px;color:#fff;white-space:nowrap}.rs-live-score small{display:block;margin-top:2px;color:#ff4561;font-size:10px;font-weight:900;text-transform:uppercase}.rs-live-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px 0;color:#7f8b98;font-size:10px}.rs-live-foot a{color:#aeb7c2;text-decoration:none;font-weight:900}
      html[data-theme="light"] .rs-live-head,html[data-theme="light"] .rs-live-group,html[data-theme="light"] .rs-live-state{background:#fff!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-live-head h2,html[data-theme="light"] .rs-live-group h3,html[data-theme="light"] .rs-live-team,html[data-theme="light"] .rs-live-score strong{color:#171b21!important}html[data-theme="light"] .rs-live-group h3{background:#eef2f6!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-live-match{border-color:#e1e6ec!important}
      @media(max-width:699px){.rs-live-match{grid-template-columns:minmax(0,1fr) 66px minmax(0,1fr);padding:11px 9px}.rs-live-team{font-size:12px}.rs-live-score strong{font-size:17px}}
    `;
    document.head.append(style);
  }

  function shell(module){
    module.dataset.sourceStatus='sportscore-live-v3';
    module.innerHTML=`
      <div class="rs-live-head"><div><span>● EN DIRECTO</span><h2>RESULTADOS EN VIVO</h2></div><b>FÚTBOL</b></div>
      <div id="rs-live-state" class="rs-live-state">Cargando marcadores…</div>
      <div id="rs-live-list" class="rs-live-list"></div>
      <div class="rs-live-foot"><span>Argentina y competencias principales · actualización cada 60 s.</span><a href="${SOURCE_URL}" rel="dofollow" target="_blank" title="Datos deportivos por SportScore">Powered by SportScore ↗</a></div>`;
  }

  const isLiveStatus=status=>{
    const v=fold(status);
    if(!v) return false;
    if(/finished|full.?time|\bft\b|scheduled|not.?started|upcoming|postponed|cancelled|canceled|abandoned/.test(v)) return false;
    return /live|in.?play|playing|\b1h\b|\b2h\b|first.?half|second.?half|half.?time|\bht\b|extra.?time|penalt|ongoing/.test(v);
  };

  function normalize(m){
    const competitionRaw=m?.competition||m?.league||m?.tournament||'Otra competencia';
    const countryRaw=m?.country||m?.competition?.country||m?.league?.country||m?.tournament?.country||'';
    return {
      home:label(m?.home||m?.home_name||m?.teams?.home)||'',away:label(m?.away||m?.away_name||m?.teams?.away)||'',
      homeScore:m?.home_score??m?.score?.home??m?.scores?.home??'-',awayScore:m?.away_score??m?.score?.away??m?.scores?.away??'-',
      status:String(m?.status?.name||m?.status||m?.status_text||m?.status_name||m?.state||''),
      competition:label(competitionRaw)||'Otra competencia',country:label(countryRaw),
      minute:m?.live_minute??m?.minute??m?.elapsed??m?.status?.elapsed??'',slug:slugFromUrl(m?.url)
    };
  }

  function isWanted(m){
    const c=fold(m.competition),country=fold(m.country),context=`${country} ${c}`,teams=fold(`${m.home} ${m.away}`);
    if(/(^|\s)argentina(\s|$)/.test(teams)) return true;
    if(/argentina/.test(context)&&/(liga profesional|primera division|primera nacional|copa argentina|torneo apertura|torneo clausura)/.test(c)) return true;
    if(/libertadores|sudamericana|recopa sudamericana|conmebol|copa america|eliminatorias.*sudamerican|sudamerican.*eliminatorias/.test(c)) return true;
    if(/fifa|world cup|copa mundial|mundial de clubes|club world cup/.test(c)) return true;
    if(/champions league/.test(c)) return true;
    if(/europa league/.test(c)&&!/conference/.test(c)) return true;
    if(/england|inglaterra/.test(context)&&/premier league/.test(c)) return true;
    if(/spain|espana/.test(context)&&/(la ?liga|primera division)/.test(c)) return true;
    if(/italy|italia/.test(context)&&/serie a/.test(c)) return true;
    if(/germany|alemania/.test(context)&&/bundesliga/.test(c)) return true;
    if(/france|francia/.test(context)&&/ligue 1/.test(c)) return true;
    return false;
  }

  function priority(m){
    const c=fold(m.competition),country=fold(m.country),teams=fold(`${m.home} ${m.away}`);
    if(/(^|\s)argentina(\s|$)/.test(teams)) return 0;
    if(/argentina/.test(`${country} ${c}`)&&/(liga profesional|primera division|primera nacional|copa argentina|torneo apertura|torneo clausura)/.test(c)) return 1;
    if(/libertadores|sudamericana|recopa|conmebol|copa america/.test(c)) return 2;
    if(/fifa|world cup|copa mundial|mundial de clubes|club world cup/.test(c)) return 3;
    if(/champions league|europa league/.test(c)) return 4;
    return 5;
  }

  async function enrichMinutes(items){
    await Promise.allSettled(items.map(async item=>{
      if(item.minute!==''&&item.minute!==null&&item.minute!==undefined) return;
      if(!item.slug) return;
      const response=await fetch(DETAIL+encodeURIComponent(item.slug),{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok) return;
      const detail=(await response.json())?.match;
      if(!detail) return;
      const minute=detail.live_minute??detail.minute??detail.elapsed??detail?.status?.elapsed;
      if(minute!==null&&minute!==undefined&&minute!=='') item.minute=minute;
      if(detail.status_text) item.status=detail.status_text;
    }));
    return items;
  }

  function paint(live,module){
    const state=module.querySelector('#rs-live-state'),list=module.querySelector('#rs-live-list');
    if(!live.length){state.hidden=false;state.textContent='No hay partidos en vivo de las competencias seleccionadas en este momento.';list.replaceChildren();return;}
    const groups=new Map();
    for(const m of live){const k=m.competition||'Otra competencia';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);}
    state.hidden=true;
    list.innerHTML=[...groups].map(([competition,items])=>`<section class="rs-live-group"><h3>${esc(competition)}</h3>${items.map(m=>`<div class="rs-live-match"><div class="rs-live-team">${esc(m.home)}</div><div class="rs-live-score"><strong>${esc(m.homeScore)} - ${esc(m.awayScore)}</strong><small>${esc(m.minute!==''&&m.minute!==null&&m.minute!==undefined?m.minute+"'":m.status||'EN VIVO')}</small></div><div class="rs-live-team away">${esc(m.away)}</div></div>`).join('')}</section>`).join('');
  }

  async function refresh(){
    if(loading||location.hash!=='#en-vivo') return;
    const module=document.querySelector('#en-vivo');if(!module)return;
    if(module.dataset.sourceStatus!=='sportscore-live-v3') shell(module);
    const state=module.querySelector('#rs-live-state'),list=module.querySelector('#rs-live-list');
    loading=true;
    try{
      const response=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error('HTTP '+response.status);
      const data=await response.json();
      let live=(Array.isArray(data?.matches)?data.matches:[]).map(normalize).filter(m=>m.home&&m.away&&isLiveStatus(m.status)&&isWanted(m)).sort((a,b)=>priority(a)-priority(b)||a.competition.localeCompare(b.competition,'es'));
      live=await enrichMinutes(live);
      paint(live,module);
    }catch(error){state.hidden=false;state.textContent='Marcadores temporalmente no disponibles. Volvé a intentar en unos instantes.';list.replaceChildren();}
    finally{loading=false;}
  }

  function install(){if(location.hash!=='#en-vivo')return;const module=document.querySelector('#en-vivo');if(!module)return;ensureStyles();if(module.dataset.sourceStatus!=='sportscore-live-v3')shell(module);refresh();clearInterval(timer);timer=setInterval(refresh,REFRESH_MS);}
  const schedule=()=>setTimeout(()=>{if(location.hash==='#en-vivo')install();else{clearInterval(timer);timer=null;}},0);
  window.addEventListener('hashchange',schedule);document.addEventListener('ranasports:navigation-ready',schedule);document.addEventListener('ranasports:news-updated',schedule);schedule();
})();