(() => {
  const API='https://sportscore.com/api/widget/matches/?sport=football&limit=50&src=ranasports';
  const SOURCE_URL='https://sportscore.com/';
  const REFRESH_MS=60000;
  let timer=null;
  let loading=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const label=value=>typeof value==='string'
    ? value
    : (value?.name||value?.title||value?.short_name||value?.competition_name||value?.league_name||'');

  function ensureStyles(){
    if(document.querySelector('#rs-live-fix-style')) return;
    const style=document.createElement('style');
    style.id='rs-live-fix-style';
    style.textContent=`
      #en-vivo{grid-column:1/-1!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      body:has(#en-vivo) #newsGrid .news-card[hidden]{display:none!important}
      .rs-live-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:13px 14px;border:1px solid #27303a;border-radius:10px;background:#10161d}
      .rs-live-head span{font-size:11px;font-weight:950;letter-spacing:.08em;color:#ff123b}
      .rs-live-head h2{margin:3px 0 0;font-size:clamp(1.15rem,2vw,1.5rem);color:#fff}
      .rs-live-head b{font-size:10px;color:#9ca7b4}
      .rs-live-state{padding:22px 14px;border:1px solid #27303a;border-radius:10px;background:#0d1319;color:#9ca7b4;text-align:center;font-size:13px}
      .rs-live-list{display:grid;gap:12px}
      .rs-live-group{border:1px solid #27303a;border-radius:12px;overflow:hidden;background:#0d1319}
      .rs-live-group h3{margin:0!important;padding:10px 12px!important;background:#151d25;color:#f5f7f9!important;font-size:12px!important;letter-spacing:.02em;border-bottom:1px solid #27303a}
      .rs-live-match{display:grid;grid-template-columns:minmax(0,1fr) 78px minmax(0,1fr);gap:8px;align-items:center;padding:12px;border-bottom:1px solid #202833}
      .rs-live-match:last-child{border-bottom:0}
      .rs-live-team{font-size:13px;font-weight:800;color:#eef2f6;line-height:1.2}
      .rs-live-team.away{text-align:right}
      .rs-live-score{text-align:center}
      .rs-live-score strong{font-size:18px;color:#fff;white-space:nowrap}
      .rs-live-score small{display:block;margin-top:2px;color:#ff4561;font-size:10px;font-weight:900;text-transform:uppercase}
      .rs-live-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px 0;color:#7f8b98;font-size:10px}
      .rs-live-foot a{color:#aeb7c2;text-decoration:none;font-weight:900}
      html[data-theme="light"] .rs-live-head,html[data-theme="light"] .rs-live-group,html[data-theme="light"] .rs-live-state{background:#fff!important;border-color:#d8dee6!important}
      html[data-theme="light"] .rs-live-head h2,html[data-theme="light"] .rs-live-group h3,html[data-theme="light"] .rs-live-team,html[data-theme="light"] .rs-live-score strong{color:#171b21!important}
      html[data-theme="light"] .rs-live-group h3{background:#eef2f6!important;border-color:#d8dee6!important}
      html[data-theme="light"] .rs-live-match{border-color:#e1e6ec!important}
      @media(max-width:699px){
        .rs-live-match{grid-template-columns:minmax(0,1fr) 66px minmax(0,1fr);padding:11px 9px}
        .rs-live-team{font-size:12px}
        .rs-live-score strong{font-size:17px}
      }
    `;
    document.head.append(style);
  }

  function shell(module){
    module.dataset.sourceStatus='sportscore-live-v2';
    module.innerHTML=`
      <div class="rs-live-head"><div><span>● EN DIRECTO</span><h2>RESULTADOS EN VIVO</h2></div><b>FÚTBOL</b></div>
      <div id="rs-live-state" class="rs-live-state">Cargando marcadores…</div>
      <div id="rs-live-list" class="rs-live-list"></div>
      <div class="rs-live-foot"><span>Argentina y competencias principales · actualización cada 60 s.</span><a href="${SOURCE_URL}" rel="dofollow" target="_blank" title="Datos deportivos por SportScore">Powered by SportScore ↗</a></div>`;
  }

  const isLiveStatus=status=>{
    const value=fold(status);
    if(!value) return false;
    if(/finished|full.?time|\bft\b|scheduled|not.?started|upcoming|postponed|cancelled|canceled|abandoned/.test(value)) return false;
    return /live|in.?play|playing|\b1h\b|\b2h\b|first.?half|second.?half|half.?time|\bht\b|extra.?time|penalt|ongoing/.test(value);
  };

  function normalize(match){
    const competitionRaw=match?.competition||match?.league||match?.tournament||'Otra competencia';
    const countryRaw=match?.country||match?.competition?.country||match?.league?.country||match?.tournament?.country||'';
    return {
      home:label(match?.home||match?.home_name||match?.teams?.home)||'',
      away:label(match?.away||match?.away_name||match?.teams?.away)||'',
      homeScore:match?.home_score ?? match?.score?.home ?? match?.scores?.home ?? '-',
      awayScore:match?.away_score ?? match?.score?.away ?? match?.scores?.away ?? '-',
      status:String(match?.status?.name||match?.status||match?.status_name||match?.state||''),
      competition:label(competitionRaw)||'Otra competencia',
      country:label(countryRaw),
      minute:match?.minute ?? match?.elapsed ?? match?.status?.elapsed ?? ''
    };
  }

  function isWanted(match){
    const competition=fold(match.competition);
    const country=fold(match.country);
    const context=`${country} ${competition}`;
    const teams=fold(`${match.home} ${match.away}`);

    // Selección Argentina: siempre entra, sin importar el torneo.
    if(/(^|\s)argentina(\s|$)/.test(teams)) return true;

    // Fútbol argentino prioritario.
    if(/argentina/.test(context) && /(liga profesional|primera division|primera nacional|copa argentina|torneo apertura|torneo clausura)/.test(competition)) return true;

    // CONMEBOL / FIFA.
    if(/libertadores|sudamericana|recopa sudamericana|conmebol|copa america|eliminatorias.*sudamerican|sudamerican.*eliminatorias/.test(competition)) return true;
    if(/fifa|world cup|copa mundial|mundial de clubes|club world cup/.test(competition)) return true;

    // Copas UEFA principales.
    if(/champions league/.test(competition)) return true;
    if(/europa league/.test(competition) && !/conference/.test(competition)) return true;

    // Las cinco grandes ligas europeas.
    if(/england|inglaterra/.test(context) && /premier league/.test(competition)) return true;
    if(/spain|espana/.test(context) && /(la ?liga|primera division)/.test(competition)) return true;
    if(/italy|italia/.test(context) && /serie a/.test(competition)) return true;
    if(/germany|alemania/.test(context) && /bundesliga/.test(competition)) return true;
    if(/france|francia/.test(context) && /ligue 1/.test(competition)) return true;

    return false;
  }

  function priority(match){
    const competition=fold(match.competition);
    const country=fold(match.country);
    const teams=fold(`${match.home} ${match.away}`);
    if(/(^|\s)argentina(\s|$)/.test(teams)) return 0;
    if(/argentina/.test(`${country} ${competition}`) && /(liga profesional|primera division|primera nacional|copa argentina|torneo apertura|torneo clausura)/.test(competition)) return 1;
    if(/libertadores|sudamericana|recopa|conmebol|copa america/.test(competition)) return 2;
    if(/fifa|world cup|copa mundial|mundial de clubes|club world cup/.test(competition)) return 3;
    if(/champions league|europa league/.test(competition)) return 4;
    return 5;
  }

  function render(matches,module){
    const state=module.querySelector('#rs-live-state');
    const list=module.querySelector('#rs-live-list');
    const live=matches
      .map(normalize)
      .filter(item=>item.home&&item.away&&isLiveStatus(item.status)&&isWanted(item))
      .sort((a,b)=>priority(a)-priority(b)||a.competition.localeCompare(b.competition,'es'));

    if(!live.length){
      state.hidden=false;
      state.textContent='No hay partidos en vivo de las competencias seleccionadas en este momento.';
      list.replaceChildren();
      return;
    }

    const groups=new Map();
    for(const match of live){
      const competition=match.competition||'Otra competencia';
      if(!groups.has(competition)) groups.set(competition,[]);
      groups.get(competition).push(match);
    }

    state.hidden=true;
    list.innerHTML=[...groups].map(([competition,items])=>`
      <section class="rs-live-group">
        <h3>${esc(competition)}</h3>
        ${items.map(match=>`
          <div class="rs-live-match">
            <div class="rs-live-team">${esc(match.home)}</div>
            <div class="rs-live-score">
              <strong>${esc(match.homeScore)} - ${esc(match.awayScore)}</strong>
              <small>${esc(match.minute?match.minute+"'":match.status||'EN VIVO')}</small>
            </div>
            <div class="rs-live-team away">${esc(match.away)}</div>
          </div>`).join('')}
      </section>`).join('');
  }

  async function refresh(){
    if(loading||location.hash!=='#en-vivo') return;
    const module=document.querySelector('#en-vivo');
    if(!module) return;
    if(module.dataset.sourceStatus!=='sportscore-live-v2') shell(module);
    const state=module.querySelector('#rs-live-state');
    const list=module.querySelector('#rs-live-list');
    loading=true;
    try{
      const response=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error('HTTP '+response.status);
      const data=await response.json();
      render(Array.isArray(data?.matches)?data.matches:[],module);
    }catch(error){
      state.hidden=false;
      state.textContent='Marcadores temporalmente no disponibles. Volvé a intentar en unos instantes.';
      list.replaceChildren();
    }finally{
      loading=false;
    }
  }

  function install(){
    if(location.hash!=='#en-vivo') return;
    const module=document.querySelector('#en-vivo');
    if(!module) return;
    ensureStyles();
    if(module.dataset.sourceStatus!=='sportscore-live-v2') shell(module);
    refresh();
    clearInterval(timer);
    timer=setInterval(refresh,REFRESH_MS);
  }

  function stopOutsideLive(){
    if(location.hash==='#en-vivo') install();
    else {clearInterval(timer);timer=null;}
  }

  const schedule=()=>setTimeout(stopOutsideLive,0);
  window.addEventListener('hashchange',schedule);
  document.addEventListener('ranasports:navigation-ready',schedule);
  document.addEventListener('ranasports:news-updated',schedule);
  schedule();
})();