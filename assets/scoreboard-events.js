(()=>{
  if(window.__ranaScoreboardEvents)return;
  window.__ranaScoreboardEvents=true;

  const nativeFetch=window.fetch.bind(window);
  const ESPN_BASE='https://site.api.espn.com/apis/site/v2/sports/soccer/';
  const store=new Map();
  const summarySeen=new Set();
  let scheduled=false;

  const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const norm=v=>fold(v).replace(/\b(fc|cf|sc|ac|club|deportivo|athletic|futbol club)\b/g,' ').replace(/\s+-\s+(sp|rj|mg|rs|ba|pr|go)$/,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const key=(h,a)=>`${norm(h)}|${norm(a)}`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  function athleteLabel(a){
    if(!a)return'';
    const p=a?.athlete||a;
    return String(p?.shortName||p?.displayName||p?.fullName||p?.name||'').trim();
  }
  function playerName(d){
    const candidates=[
      ...(Array.isArray(d?.athletesInvolved)?d.athletesInvolved:[]),
      ...(Array.isArray(d?.participants)?d.participants:[]),
      ...(Array.isArray(d?.athletes)?d.athletes:[]),
      d?.athlete
    ];
    for(const c of candidates){const n=athleteLabel(c);if(n)return n}
    const raw=String(d?.shortText||d?.text||'').replace(/^Goal\s*[-:]?\s*/i,'').trim();
    if(!raw||/^(goal|gol|scoring play|red card|tarjeta roja)$/i.test(raw))return'';
    return raw;
  }
  function minute(d){
    const raw=String(d?.clock?.displayValue||d?.displayClock||d?.clock||d?.time||'').trim();
    return raw.replace(/\s+/g,'');
  }
  function sideFor(d,homeId,awayId){
    const ids=[
      d?.team?.id,d?.team?.uid,
      d?.athletesInvolved?.[0]?.team?.id,d?.athletesInvolved?.[0]?.team?.uid,
      d?.participants?.[0]?.athlete?.team?.id,d?.participants?.[0]?.athlete?.team?.uid,
      d?.participants?.[0]?.team?.id,d?.participants?.[0]?.team?.uid,
      d?.athletes?.[0]?.team?.id,d?.athletes?.[0]?.team?.uid
    ].filter(Boolean).map(String);
    if(ids.some(x=>x===homeId||x.endsWith(`~t:${homeId}`)))return'home';
    if(ids.some(x=>x===awayId||x.endsWith(`~t:${awayId}`)))return'away';
    const ha=fold(d?.homeAway||d?.team?.homeAway||'');
    return ha==='home'||ha==='away'?ha:'';
  }
  function parseCompetition(c,details){
    const teams=c?.competitors||[];
    const h=teams.find(x=>x.homeAway==='home'),a=teams.find(x=>x.homeAway==='away');
    if(!h||!a)return null;
    const home=String(h.team?.displayName||h.team?.shortDisplayName||''),away=String(a.team?.displayName||a.team?.shortDisplayName||'');
    if(!home||!away)return null;
    const homeId=String(h.team?.id||''),awayId=String(a.team?.id||'');
    const goals={home:[],away:[]},reds={home:[],away:[]};
    for(const d of (Array.isArray(details)?details:[])){
      const type=fold(d?.type?.text||d?.type?.name||d?.type?.abbreviation||d?.text||d?.shortText||'');
      const side=sideFor(d,homeId,awayId);if(!side)continue;
      const isGoal=d?.scoringPlay===true||(/goal|gol/.test(type)&&!/missed|anulado|disallowed/.test(type));
      const isRed=d?.redCard===true||/red card|tarjeta roja|second yellow|segunda amarilla/.test(type);
      if(isGoal){
        const item={minute:minute(d),player:playerName(d)};
        const sig=`${item.minute}|${item.player}`;
        if(!goals[side].some(x=>`${x.minute}|${x.player}`===sig))goals[side].push(item);
      }
      if(isRed){
        const item={minute:minute(d),player:playerName(d)};
        const sig=`${item.minute}|${item.player}`;
        if(!reds[side].some(x=>`${x.minute}|${x.player}`===sig))reds[side].push(item);
      }
    }
    return{home,away,goals,reds};
  }
  function parseEvent(ev){
    const c=ev?.competitions?.[0];
    return parseCompetition(c,Array.isArray(c?.details)?c.details:[]);
  }
  function mergeRicher(base,rich){
    if(!rich)return base;
    return{
      home:base?.home||rich.home,
      away:base?.away||rich.away,
      goals:{
        home:rich.goals.home.length?rich.goals.home:(base?.goals?.home||[]),
        away:rich.goals.away.length?rich.goals.away:(base?.goals?.away||[])
      },
      reds:{
        home:rich.reds.home.length?rich.reds.home:(base?.reds?.home||[]),
        away:rich.reds.away.length?rich.reds.away:(base?.reds?.away||[])
      }
    };
  }
  async function enrichFromSummary(league,ev,base){
    const id=String(ev?.id||'');if(!id||summarySeen.has(id))return;
    const competitors=ev?.competitions?.[0]?.competitors||[];
    const total=competitors.reduce((sum,t)=>sum+(Number(t?.score?.value??t?.score??0)||0),0);
    if(total<=0)return;
    summarySeen.add(id);
    try{
      const r=await nativeFetch(`${ESPN_BASE}${encodeURIComponent(league)}/summary?event=${encodeURIComponent(id)}`,{cache:'no-store',credentials:'omit'});
      if(!r.ok)return;
      const d=await r.json(),c=d?.header?.competitions?.[0];
      const details=[...(Array.isArray(d?.keyEvents)?d.keyEvents:[]),...(Array.isArray(d?.plays)?d.plays:[])];
      const rich=parseCompetition(c,details);
      const merged=mergeRicher(base,rich);
      if(merged){store.set(key(merged.home,merged.away),merged);scheduleRender()}
    }catch{}
  }
  function ingest(data,league){
    for(const ev of data?.events||[]){
      const m=parseEvent(ev);if(!m)continue;
      store.set(key(m.home,m.away),m);
      enrichFromSummary(league,ev,m);
    }
    scheduleRender();
  }

  window.fetch=async function ranaEventsFetch(input,init){
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:input?.url;
      const url=new URL(raw,location.href);
      const hit=url.pathname.match(/\/sports\/soccer\/([^/]+)\/scoreboard$/);
      if(url.hostname==='site.api.espn.com'&&hit&&response.ok){
        ingest(await response.clone().json(),decodeURIComponent(hit[1]));
      }
    }catch{}
    return response;
  };

  function style(){
    if(document.querySelector('#rs-events-style'))return;
    const s=document.createElement('style');s.id='rs-events-style';s.textContent=`
      .rs-arr,.rs-det{display:none!important}.rs-game{grid-template-columns:58px minmax(0,1fr)!important;cursor:default!important}.rs-main{padding-right:12px!important}
      .rs-team{display:flex;align-items:center;gap:4px}.rs-team.h{justify-content:flex-end}.rs-reds{display:inline-flex;gap:2px;flex:0 0 auto}.rs-red-card{display:inline-block;width:7px;height:10px;border-radius:1px;background:#e11d2e;box-shadow:0 0 0 1px rgba(0,0,0,.18)}
      .rs-goals-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:7px;font-size:10px;line-height:1.35;color:#98a3ae}.rs-goals{display:grid;gap:2px}.rs-goals.home{text-align:right;justify-items:end}.rs-goals.away{text-align:left;justify-items:start}.rs-goal b{color:#ff1746}.rs-goal-ball{font-size:9px;margin-right:3px}
      html[data-theme="light"] .rs-goals-grid{color:#56616c}
      @media(max-width:390px){.rs-game{grid-template-columns:50px minmax(0,1fr)!important}.rs-goals-grid{gap:10px;font-size:9px}}
    `;document.head.append(s)
  }
  function redHtml(list){return list.length?`<span class="rs-reds" aria-label="${list.length} expulsado${list.length===1?'':'s'}">${list.map(()=>'<i class="rs-red-card" aria-hidden="true"></i>').join('')}</span>`:''}
  function goalsHtml(list){return list.map(g=>`<span class="rs-goal"><span class="rs-goal-ball">⚽</span>${g.minute?`<b>${esc(g.minute)}</b>`:''}${g.player?` ${esc(g.player)}`:''}</span>`).join('')}

  function render(){
    scheduled=false;style();
    document.querySelectorAll('#en-vivo .rs-game').forEach(row=>{
      const homeEl=row.querySelector('.rs-team.h'),all=[...row.querySelectorAll('.rs-team')],awayEl=all.find(x=>x!==homeEl);
      if(!homeEl||!awayEl)return;
      const homeName=(homeEl.childNodes[0]?.textContent||homeEl.textContent||'').trim(),awayName=(awayEl.childNodes[0]?.textContent||awayEl.textContent||'').trim();
      const data=store.get(key(homeName,awayName));if(!data)return;
      const sig=JSON.stringify(data);if(row.dataset.rsEventSig===sig)return;row.dataset.rsEventSig=sig;
      homeEl.querySelector('.rs-reds')?.remove();awayEl.querySelector('.rs-reds')?.remove();row.querySelector('.rs-goals-grid')?.remove();
      homeEl.insertAdjacentHTML('beforeend',redHtml(data.reds.home));awayEl.insertAdjacentHTML('beforeend',redHtml(data.reds.away));
      if(data.goals.home.length||data.goals.away.length){
        row.querySelector('.rs-main')?.insertAdjacentHTML('beforeend',`<span class="rs-goals-grid"><span class="rs-goals home">${goalsHtml(data.goals.home)}</span><span class="rs-goals away">${goalsHtml(data.goals.away)}</span></span>`);
      }
    })
  }
  function scheduleRender(){if(scheduled)return;scheduled=true;requestAnimationFrame(render)}

  document.addEventListener('click',e=>{if(e.target.closest('#en-vivo .rs-game'))e.stopImmediatePropagation()},true);
  new MutationObserver(scheduleRender).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('ranasports:news-updated',scheduleRender);
  window.addEventListener('hashchange',scheduleRender);
  scheduleRender();
})();
