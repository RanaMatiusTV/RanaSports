(() => {
  const API='https://tipstercompetition.com/api/widget/live-fixtures';
  const LIVE_URL='https://tipstercompetition.com/livescores';
  let timer=null;
  let loading=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const pick=(obj,paths)=>{
    for(const path of paths){
      let value=obj;
      for(const key of path.split('.')) value=value?.[key];
      if(value!==undefined&&value!==null&&value!=='') return value;
    }
    return null;
  };

  const teamName=value=>typeof value==='string'
    ? value
    : (value?.name||value?.team_name||value?.title||value?.short_name||'');

  function fixtureLike(obj){
    if(!obj||typeof obj!=='object'||Array.isArray(obj)) return false;
    const home=pick(obj,['home','home_team','homeTeam','teams.home','local','team_home']);
    const away=pick(obj,['away','away_team','awayTeam','teams.away','visitor','team_away']);
    return Boolean(teamName(home)&&teamName(away));
  }

  function collect(value,out=[],seen=new WeakSet()){
    if(!value||typeof value!=='object'||seen.has(value)) return out;
    seen.add(value);
    if(Array.isArray(value)){
      for(const item of value){
        if(fixtureLike(item)) out.push(item);
        else collect(item,out,seen);
      }
      return out;
    }
    if(fixtureLike(value)){out.push(value);return out;}
    for(const item of Object.values(value)) collect(item,out,seen);
    return out;
  }

  function normalize(match){
    const home=pick(match,['home','home_team','homeTeam','teams.home','local','team_home']);
    const away=pick(match,['away','away_team','awayTeam','teams.away','visitor','team_away']);
    const league=pick(match,['league.name','league_name','competition.name','competition_name','tournament.name','tournament_name','league']);
    const country=pick(match,['country.name','country_name','league.country.name','competition.country.name','country']);
    let homeScore=pick(match,['home_score','score.home','scores.home','goals.home','result.home','homeScore','score_home']);
    let awayScore=pick(match,['away_score','score.away','scores.away','goals.away','result.away','awayScore','score_away']);
    const scoreText=pick(match,['score','result','ft_score']);
    if((homeScore===null||awayScore===null)&&typeof scoreText==='string'){
      const score=scoreText.match(/(\d+)\s*[-:]\s*(\d+)/);
      if(score){homeScore=score[1];awayScore=score[2];}
    }
    const minute=pick(match,['minute','elapsed','status.elapsed','time.elapsed','match_minute']);
    const status=pick(match,['status.short','status.name','status','state','match_status']);
    return {
      home:teamName(home),away:teamName(away),
      league:teamName(league)||String(league||'Otra competencia'),
      country:teamName(country)||String(country||''),
      homeScore,awayScore,minute,status:String(status||'')
    };
  }

  function ensureStyles(){
    if(document.querySelector('#rs-live-fix-style')) return;
    const style=document.createElement('style');
    style.id='rs-live-fix-style';
    style.textContent=`
      #en-vivo{grid-column:1/-1!important;width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
      .rs-live-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:13px 14px;border:1px solid #27303a;border-radius:10px;background:#10161d}
      .rs-live-head span{font-size:11px;font-weight:950;letter-spacing:.08em;color:#ff123b}.rs-live-head h2{margin:3px 0 0;font-size:clamp(1.15rem,2vw,1.5rem);color:#fff}.rs-live-head b{font-size:10px;color:#9ca7b4}
      .rs-live-state{padding:22px 14px;border:1px solid #27303a;border-radius:10px;background:#0d1319;color:#9ca7b4;text-align:center;font-size:13px}
      .rs-live-list{display:grid;gap:12px}.rs-live-group{border:1px solid #27303a;border-radius:12px;overflow:hidden;background:#0d1319}.rs-live-group h3{margin:0;padding:10px 12px;background:#151d25;color:#f5f7f9;font-size:12px;letter-spacing:.02em;border-bottom:1px solid #27303a}
      .rs-live-match{display:grid;grid-template-columns:minmax(0,1fr) 72px minmax(0,1fr);gap:8px;align-items:center;padding:12px;border-bottom:1px solid #202833}.rs-live-match:last-child{border-bottom:0}.rs-live-team{font-size:13px;font-weight:800;color:#eef2f6}.rs-live-team.away{text-align:right}.rs-live-score{text-align:center}.rs-live-score strong{font-size:18px;color:#fff}.rs-live-score small{display:block;margin-top:2px;color:#ff4561;font-size:10px;font-weight:900}.rs-live-foot{display:flex;justify-content:space-between;gap:10px;padding:10px 2px 0;color:#7f8b98;font-size:10px}.rs-live-foot a{color:#aeb7c2;text-decoration:none;font-weight:900}
      html[data-theme="light"] .rs-live-head,html[data-theme="light"] .rs-live-group,html[data-theme="light"] .rs-live-state{background:#fff!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-live-head h2,html[data-theme="light"] .rs-live-group h3,html[data-theme="light"] .rs-live-team,html[data-theme="light"] .rs-live-score strong{color:#171b21!important}html[data-theme="light"] .rs-live-group h3{background:#eef2f6!important;border-color:#d8dee6!important}html[data-theme="light"] .rs-live-match{border-color:#e1e6ec!important}
      @media(max-width:699px){.rs-live-match{grid-template-columns:minmax(0,1fr) 62px minmax(0,1fr);padding:11px 9px}.rs-live-team{font-size:12px}.rs-live-score strong{font-size:17px}}
    `;
    document.head.append(style);
  }

  function shell(module){
    module.dataset.sourceStatus='tipster-native-v2';
    module.innerHTML=`
      <div class="rs-live-head"><div><span>● EN DIRECTO</span><h2>RESULTADOS EN VIVO</h2></div><b>FÚTBOL</b></div>
      <div id="rs-live-state" class="rs-live-state">Cargando marcadores…</div>
      <div id="rs-live-list" class="rs-live-list"></div>
      <div class="rs-live-foot"><span>Actualización automática cada 15 s.</span><a href="${LIVE_URL}" target="_blank" rel="noopener noreferrer">ABRIR FUENTE ↗</a></div>`;
  }

  async function refresh(){
    if(loading||location.hash!=='#en-vivo') return;
    const module=document.querySelector('#en-vivo');
    if(!module) return;
    if(module.dataset.sourceStatus!=='tipster-native-v2') shell(module);
    const state=module.querySelector('#rs-live-state');
    const list=module.querySelector('#rs-live-list');
    loading=true;
    try{
      const response=await fetch(API,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok) throw new Error('HTTP '+response.status);
      const data=await response.json();
      const matches=[...new Map(collect(data).map(raw=>{
        const item=normalize(raw);
        return [`${item.league}|${item.home}|${item.away}`,item];
      })).values()].filter(item=>item.home&&item.away);
      if(!matches.length){
        state.hidden=false;
        state.textContent='No hay partidos en vivo en este momento.';
        list.replaceChildren();
        return;
      }
      state.hidden=true;
      const groups=new Map();
      for(const match of matches){
        const label=[match.country,match.league].filter(Boolean).join(' · ')||'Partidos en vivo';
        if(!groups.has(label)) groups.set(label,[]);
        groups.get(label).push(match);
      }
      list.innerHTML=[...groups].map(([label,items])=>`<section class="rs-live-group"><h3>${esc(label)}</h3>${items.map(match=>`<div class="rs-live-match"><div class="rs-live-team">${esc(match.home)}</div><div class="rs-live-score"><strong>${esc(match.homeScore??'-')} - ${esc(match.awayScore??'-')}</strong><small>${esc(match.minute?match.minute+"'":match.status||'EN VIVO')}</small></div><div class="rs-live-team away">${esc(match.away)}</div></div>`).join('')}</section>`).join('');
    }catch(error){
      state.hidden=false;
      state.innerHTML=`El proveedor de marcadores no respondió. <a href="${LIVE_URL}" target="_blank" rel="noopener noreferrer" style="color:#ff4561;font-weight:800">Ver resultados ↗</a>`;
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
    if(module.dataset.sourceStatus!=='tipster-native-v2') shell(module);
    refresh();
    clearInterval(timer);
    timer=setInterval(refresh,15000);
  }

  const schedule=()=>setTimeout(install,0);
  window.addEventListener('hashchange',schedule);
  document.addEventListener('ranasports:navigation-ready',schedule);
  document.addEventListener('ranasports:news-updated',schedule);
  schedule();
})();