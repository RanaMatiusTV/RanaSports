(()=>{
const SPORT='https://sportscore.com/api/widget/matches/?sport=football&limit=50&src=ranasports';
const DETAIL='https://sportscore.com/api/widget/match/?sport=football&src=ranasports&slug=';
const ESPN_BASE='https://site.api.espn.com/apis/site/v2/sports/soccer/';
const TZ='America/Argentina/Buenos_Aires';
const ESPN_LEAGUES=[
 ['arg.1','Liga Profesional Argentina'],['arg.2','Primera Nacional'],['arg.copa','Copa Argentina'],
 ['conmebol.libertadores','CONMEBOL Copa Libertadores'],['conmebol.sudamericana','CONMEBOL Copa Sudamericana'],['conmebol.recopa','CONMEBOL Recopa'],['conmebol.america','CONMEBOL Copa América'],
 ['fifa.worldq.conmebol','Eliminatorias CONMEBOL'],['fifa.world','FIFA Mundial'],['fifa.cwc','FIFA Mundial de Clubes'],['fifa.friendly','Amistosos internacionales'],
 ['uefa.champions','UEFA Champions League'],['uefa.europa','UEFA Europa League'],
 ['eng.1','Premier League'],['eng.league_cup','Carabao Cup'],['esp.1','LaLiga'],['ita.1','Serie A'],['ita.coppa_italia','Coppa Italia'],['ger.1','Bundesliga'],['fra.1','Ligue 1']
];
const DAY_RANGE=[-2,-1,0,1,2];
let timer=null,loading=false,mode='all',items=[],selectedOffset=0;
const cache=new Map(),open=new Set(),collapsed=new Set(),espnCache=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const slug=u=>String(u||'').match(/\/football\/match\/([^/]+)\/?/)?.[1]||'';
const parts=d=>Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const day=d=>{const p=parts(d);return`${p.year}-${p.month}-${p.day}`};
const today=()=>day(new Date());
function dateForOffset(offset=0){const[y,m,d]=today().split('-').map(Number);return new Date(Date.UTC(y,m-1,d+offset,12,0,0));}
const selectedDay=()=>day(dateForOffset(selectedOffset));
const apiDay=()=>selectedDay().replaceAll('-','');
const clock=d=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
const fullLabel=o=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,weekday:'short',day:'2-digit',month:'short'}).format(dateForOffset(o)).replaceAll('.','').toUpperCase();
const chipLabel=o=>o===-1?'AYER':o===0?'HOY':o===1?'MAÑANA':new Intl.DateTimeFormat('es-AR',{timeZone:TZ,weekday:'short',day:'2-digit'}).format(dateForOffset(o)).replaceAll('.','').toUpperCase();
const norm=v=>fold(v).replace(/\b(fc|cf|sc|ac|club|deportivo|athletic|futbol club)\b/g,' ').replace(/\s+-\s+(sp|rj|mg|rs|ba|pr|go)$/,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const same=(a,b)=>{a=norm(a);b=norm(b);return a&&b&&(a===b||(a.length>4&&b.includes(a))||(b.length>4&&a.includes(b)))};

function css(){
 if(document.querySelector('#rs-live-fix-style'))return;
 const s=document.createElement('style');s.id='rs-live-fix-style';s.textContent=`
 #en-vivo{grid-column:1/-1!important;width:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important}
 body:has(#en-vivo) #newsGrid .news-card[hidden]{display:none!important}
 .rs-board{color:#eef2f6}.rs-top{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-bottom:10px;background:#0c1117;border:1px solid #252d36;border-radius:10px}
 .rs-top b{display:block;color:#ff1746;font-size:10px;letter-spacing:.1em}.rs-top h2{margin:3px 0 0;color:#fff;font-size:1.35rem}.rs-date{font-size:11px;font-weight:900;color:#aeb7c2;text-align:right}
 .rs-days{display:flex;gap:6px;overflow-x:auto;padding:1px 0 9px;scrollbar-width:none}.rs-days::-webkit-scrollbar{display:none}.rs-day{flex:1 0 auto;min-width:62px;padding:8px 8px;border:1px solid #29323c;border-radius:7px;background:#0d1319;color:#8f9aa7;font-size:9px;font-weight:950;letter-spacing:.025em;white-space:nowrap}.rs-day.active{background:#202833;border-color:#536070;color:#fff}.rs-day.today.active{background:#ff1746;border-color:#ff1746;color:#fff}
 .rs-tabs{display:flex;gap:7px;margin-bottom:10px}.rs-tab{padding:8px 13px;border:1px solid #29323c;border-radius:6px;background:#0d1319;color:#8f9aa7;font-weight:900;font-size:10px}.rs-tab.active{background:#ff1746;border-color:#ff1746;color:#fff}
 .rs-summary{margin:0 0 12px;color:#7f8b98;font-size:10px}.rs-state{padding:20px;border:1px solid #252d36;border-radius:8px;background:#0d1319;color:#919ca8;text-align:center}.rs-list{display:grid;gap:18px}
 .rs-lg{padding-bottom:13px;border-bottom:1px solid #242b33}.rs-lgh{width:100%;display:grid;grid-template-columns:28px minmax(0,1fr) auto 18px;gap:8px;align-items:center;padding:9px 4px 10px;border:0;background:transparent;color:inherit;text-align:left}.rs-lgh img{width:25px;height:25px;object-fit:contain}.rs-fallback{display:block;width:24px;height:24px;border-radius:50%;background:#252d36}.rs-lgn{font-size:12px;font-weight:950;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs-games{border:1px solid #242b33;border-radius:4px;overflow:hidden}.rs-lg.closed .rs-games{display:none}
 .rs-game{width:100%;display:grid;grid-template-columns:58px minmax(0,1fr) 20px;align-items:stretch;border:0;border-bottom:2px solid #181f26;background:#101419;color:inherit;padding:0}.rs-game:last-child{border-bottom:0}.rs-game.live{background:#2b3519}.rs-st{display:grid;place-items:center;border-right:1px solid #222a32;font-size:10px;font-weight:950}.rs-st.live{color:#c6ef22}.rs-st.finished{color:#c3c8ce}.rs-st.upcoming{color:#f0f3f6}.rs-st.postponed{color:#ffb24b}
 .rs-main{padding:12px 6px}.rs-line{display:grid;grid-template-columns:minmax(0,1fr) 24px auto 24px minmax(0,1fr);gap:5px;align-items:center}.rs-team{font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rs-team.h{text-align:right}.rs-crest{width:22px;height:22px;object-fit:contain}.rs-score{min-width:46px;text-align:center;font-size:18px;font-weight:950}.rs-arr{display:grid;place-items:center;color:#77828d}
 .rs-det{padding:9px 10px 10px 66px;background:#0a0f14;border-top:1px solid #20272e;color:#aab3bd;font-size:11px}.rs-det[hidden]{display:none!important}.rs-ev{display:grid;grid-template-columns:36px 18px 1fr;gap:4px;margin:4px 0}.rs-ev time{color:#c6ef22;font-weight:950}
 .rs-foot{display:flex;justify-content:space-between;gap:8px;padding-top:11px;color:#717c88;font-size:9px}.rs-foot a{color:#9ba5af;text-decoration:none;font-weight:900}
 @media(max-width:390px){.rs-game{grid-template-columns:50px minmax(0,1fr) 18px}.rs-team{font-size:11px}.rs-score{min-width:40px;font-size:17px}.rs-day{min-width:58px;padding:8px 6px;font-size:8px}}
 html[data-theme="light"] .rs-top,html[data-theme="light"] .rs-state,html[data-theme="light"] .rs-tab,html[data-theme="light"] .rs-day,html[data-theme="light"] .rs-game{background:#fff!important;color:#171b21!important}html[data-theme="light"] .rs-game.live{background:#edf5d3!important}html[data-theme="light"] .rs-day.active{background:#e9eef4!important}html[data-theme="light"] .rs-day.today.active{background:#ff1746!important;color:#fff!important}`;document.head.append(s)
}

function syncDateUi(m){
 const date=m.querySelector('#rs-date');if(date)date.textContent=fullLabel(selectedOffset);
 const kicker=m.querySelector('#rs-kicker');if(kicker)kicker.textContent=selectedOffset===0?'● PARTIDOS DE HOY':'● PARTIDOS';
 m.querySelectorAll('[data-day]').forEach(b=>{const o=Number(b.dataset.day);b.textContent=chipLabel(o);b.classList.toggle('active',o===selectedOffset);b.classList.toggle('today',o===0);b.title=fullLabel(o)});
}
function shell(m){
 m.dataset.sourceStatus='rana-board-v34';
 m.innerHTML=`<div class="rs-board"><div class="rs-top"><div><b id="rs-kicker">● PARTIDOS DE HOY</b><h2>RESULTADOS Y PARTIDOS</h2></div><div id="rs-date" class="rs-date"></div></div><div class="rs-days">${DAY_RANGE.map(o=>`<button class="rs-day" data-day="${o}" type="button"></button>`).join('')}</div><div class="rs-tabs"><button class="rs-tab active" data-mode="all" type="button">TODOS</button><button class="rs-tab" data-mode="live" type="button">EN VIVO</button></div><div id="rs-summary" class="rs-summary"></div><div id="rs-state" class="rs-state">Cargando partidos…</div><div id="rs-list" class="rs-list"></div><div class="rs-foot"><span>Hora Argentina · hoy se actualiza cada 60 s.</span><a href="https://sportscore.com/" target="_blank" rel="dofollow">Datos en vivo: SportScore ↗</a></div></div>`;
 syncDateUi(m);
 if(!m.dataset.bound){m.dataset.bound='1';m.addEventListener('click',async e=>{
  const d=e.target.closest('[data-day]');if(d){selectedOffset=Math.max(-2,Math.min(2,Number(d.dataset.day)||0));mode='all';open.clear();m.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode==='all'));syncDateUi(m);const state=m.querySelector('#rs-state');if(state){state.hidden=false;state.textContent='Cargando partidos…'}m.querySelector('#rs-list')?.replaceChildren();await refresh(true);resetTimer();return}
  const f=e.target.closest('[data-mode]');if(f){mode=f.dataset.mode;m.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));paint(m);return}
  const l=e.target.closest('[data-comp]');if(l){const k=decodeURIComponent(l.dataset.comp);collapsed.has(k)?collapsed.delete(k):collapsed.add(k);paint(m);return}
  const g=e.target.closest('[data-slug]');if(!g)return;const s=g.dataset.slug;if(!s)return;open.has(s)?open.delete(s):open.add(s);paint(m);if(open.has(s)&&!cache.has(s)){await detail(s);paint(m)}
 })}
}

function mapComp(s){
 s=fold(s);
 for(const [r,n] of [
  [/libertadores/,'CONMEBOL Copa Libertadores'],[/sudamericana/,'CONMEBOL Copa Sudamericana'],[/recopa/,'CONMEBOL Recopa'],[/copa america/,'CONMEBOL Copa América'],
  [/eliminatorias conmebol|world cup qualif.*conmebol|conmebol.*world cup qualif/,'Eliminatorias CONMEBOL'],[/club world cup|mundial de clubes|fifa cwc/,'FIFA Mundial de Clubes'],[/fifa world cup|fifa mundial|world cup/,'FIFA Mundial'],[/amistosos internacionales|friendly/,'Amistosos internacionales'],
  [/copa argentina/,'Copa Argentina'],[/primera nacional|arg\.2|nacional b/,'Primera Nacional'],[/liga profesional argentina|arg\.1|argentin.*primera|liga profesional/,'Liga Profesional Argentina'],
  [/champions league/,'UEFA Champions League'],[/europa league/,'UEFA Europa League'],[/carabao|league cup|eng\.league_cup/,'Carabao Cup'],[/premier league/,'Premier League'],[/laliga|la liga/,'LaLiga'],[/coppa italia|ita\.coppa_italia/,'Coppa Italia'],[/serie a/,'Serie A'],[/bundesliga/,'Bundesliga'],[/ligue 1/,'Ligue 1']
 ])if(r.test(s))return n;
 return''
}
function nSport(x){return{src:'sport',home:String(x?.home||''),away:String(x?.away||''),homeLogo:String(x?.home_logo||''),awayLogo:String(x?.away_logo||''),compLogo:String(x?.competition_logo||''),homeScore:x?.home_score,awayScore:x?.away_score,status:fold(x?.status||''),statusText:String(x?.status_text||''),comp:String(x?.competition||''),time:String(x?.time||''),slug:slug(x?.url),minute:x?.live_minute??null}}
function nEspn(ev,comp,compLogo){const c=ev?.competitions?.[0],a=c?.competitors||[],h=a.find(x=>x.homeAway==='home'),w=a.find(x=>x.homeAway==='away');if(!h||!w)return null;const t=ev?.status?.type||{},state=String(t.state||''),detailText=String(t.detail||t.shortDetail||''),dc=String(ev?.status?.displayClock||'');let status=t.completed||state==='post'?'finished':state==='in'?'live':'upcoming';if(/postpon|cancel|abandon/i.test(detailText))status='postponed';return{src:'espn',home:String(h.team?.displayName||h.team?.shortDisplayName||''),away:String(w.team?.displayName||w.team?.shortDisplayName||''),homeLogo:String(h.team?.logo||''),awayLogo:String(w.team?.logo||''),compLogo:String(compLogo||''),homeScore:h.score,awayScore:w.score,status,statusText:detailText,comp,time:String(ev.date||''),slug:'',minute:(dc.match(/\d+/)||[])[0]||null}}
function kind(x){const s=`${fold(x.status)} ${fold(x.statusText)}`;if(/postponed|cancelled|canceled|abandoned/.test(s))return'postponed';if(/finished|full.?time|\bft\b|final/.test(s))return'finished';if(/live|in.?play|playing|1st half|2nd half|first half|second half|half time|extra time|penalt|ongoing/.test(s))return'live';return'upcoming'}
const wanted=x=>!!mapComp(x.comp),isSelected=x=>{const d=new Date(x.time);return Number.isFinite(d.getTime())&&day(d)===selectedDay()},ko=x=>{const d=new Date(x.time);return Number.isFinite(d.getTime())?d.getTime():9e15};
function st(x){const k=kind(x),t=fold(x.statusText);if(k==='finished')return'FIN';if(k==='postponed')return/cancel/.test(t)?'CANC':'POS';if(k==='upcoming')return x.time?clock(new Date(x.time)):'—';if(x.minute!==null&&x.minute!==undefined&&x.minute!=='')return`${x.minute}'`;if(/half time/.test(t))return'ET';if(/extra time/.test(t))return'TE';if(/penalt/.test(t))return'PEN';return'VIVO'}
const sc=v=>v===null||v===undefined||v===''?'–':String(v),crest=(u,a)=>u?`<img class="rs-crest" src="${esc(u)}" alt="${esc(a)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'rs-fallback'}))">`:'<span class="rs-fallback"></span>';
async function detail(s){try{const r=await fetch(DETAIL+encodeURIComponent(s),{cache:'no-store',credentials:'omit'});if(r.ok){const d=(await r.json())?.match;if(d)cache.set(s,d)}}catch{}}
function det(s){const d=cache.get(s),ev=(d?.incidents||[]).filter(i=>i?.is_goal||i?.is_card||/goal|card/i.test(String(i?.type||''))).slice(-12);if(!ev.length)return'No hay incidencias disponibles.';return ev.map(i=>`<div class="rs-ev"><time>${esc(i.time??'')}′</time><span>${i?.is_goal||/goal/i.test(String(i?.type||''))?'⚽':/red/i.test(String(i?.type||''))?'🟥':'🟨'}</span><span>${esc(i.player||i.type||'')}</span></div>`).join('')}
function merge(e,s){
 const r=[...e];
 for(const x of s){
  if(!wanted(x))continue;
  const liveCarry=selectedOffset===0&&kind(x)==='live';
  if(!isSelected(x)&&!liveCarry)continue;
  const h=r.find(y=>same(y.home,x.home)&&same(y.away,x.away));
  if(h){h.slug=x.slug||h.slug;h.compLogo=x.compLogo||h.compLogo;h.homeLogo=x.homeLogo||h.homeLogo;h.awayLogo=x.awayLogo||h.awayLogo;if(kind(x)==='live'||kind(x)==='finished'){h.status=x.status;h.statusText=x.statusText;h.homeScore=x.homeScore;h.awayScore=x.awayScore;if(x.minute!==null&&x.minute!==undefined&&x.minute!=='')h.minute=x.minute}}
  else{x.comp=mapComp(x.comp)||x.comp;r.push(x)}
 }
 return r.filter(x=>x.home&&x.away&&(isSelected(x)||(selectedOffset===0&&kind(x)==='live'))).sort((a,b)=>ko(a)-ko(b))
}
function priority(name){const n=fold(name);if(/liga profesional argentina|primera nacional|copa argentina/.test(n))return 0;if(/libertadores/.test(n))return 1;if(/sudamericana|recopa/.test(n))return 2;if(/argentina|conmebol|fifa/.test(n))return 3;if(/champions|europa/.test(n))return 4;if(/carabao|coppa italia/.test(n))return 5;return 6}
function paint(m){
 syncDateUi(m);
 const state=m.querySelector('#rs-state'),list=m.querySelector('#rs-list'),sum=m.querySelector('#rs-summary');let a=mode==='live'?items.filter(x=>kind(x)==='live'):items;
 const when=selectedOffset===0?'HOY':fullLabel(selectedOffset);
 sum.textContent=mode==='live'?`${a.length} EN VIVO`:`${a.length} PARTIDOS · ${when}`;
 if(!a.length){state.hidden=false;state.textContent=mode==='live'?'No hay partidos en vivo para esta fecha.':'No encontramos partidos para esta fecha.';list.replaceChildren();return}
 state.hidden=true;const g=new Map();for(const x of a){const k=mapComp(x.comp)||x.comp||'Otra competencia';if(!g.has(k))g.set(k,{logo:x.compLogo,arr:[]});if(!g.get(k).logo&&x.compLogo)g.get(k).logo=x.compLogo;g.get(k).arr.push(x)}
 list.innerHTML=[...g].sort((A,B)=>priority(A[0])-priority(B[0])||Math.min(...A[1].arr.map(ko))-Math.min(...B[1].arr.map(ko))).map(([name,o])=>{const closed=collapsed.has(name),games=o.arr.sort((a,b)=>ko(a)-ko(b)).map(x=>{const k=kind(x),has=k!=='upcoming'&&k!=='postponed',isopen=x.slug&&open.has(x.slug),score=has?`${sc(x.homeScore)} - ${sc(x.awayScore)}`:'–';return`<div><button class="rs-game ${k}" ${x.slug?`data-slug="${esc(x.slug)}"`:''}><span class="rs-st ${k}">${esc(st(x))}</span><span class="rs-main"><span class="rs-line"><span class="rs-team h">${esc(x.home)}</span>${crest(x.homeLogo,x.home)}<strong class="rs-score">${esc(score)}</strong>${crest(x.awayLogo,x.away)}<span class="rs-team">${esc(x.away)}</span></span></span><span class="rs-arr">${x.slug?(isopen?'⌃':'⌄'):''}</span></button>${x.slug?`<div class="rs-det" ${isopen?'':'hidden'}>${isopen?det(x.slug):''}</div>`:''}</div>`}).join('');const logo=o.logo?`<img src="${esc(o.logo)}" alt="">`:'<span class="rs-fallback"></span>';return`<section class="rs-lg ${closed?'closed':''}"><button class="rs-lgh" data-comp="${encodeURIComponent(name)}">${logo}<span class="rs-lgn">${esc(name)}</span><span>${o.arr.length}</span><span>⌄</span></button><div class="rs-games">${games}</div></section>`}).join('')
}
async function fetchEspnLeague([league,comp]){try{const r=await fetch(`${ESPN_BASE}${league}/scoreboard?dates=${apiDay()}&limit=1000`,{cache:'no-store',credentials:'omit'});if(!r.ok)return[];const d=await r.json();const leagueLogo=d?.leagues?.[0]?.logos?.[0]?.href||'';return(d.events||[]).map(ev=>nEspn(ev,comp,leagueLogo)).filter(Boolean)}catch{return[]}}
async function fetchEspn(force=false){
 const key=selectedDay(),ttl=selectedOffset===0?120000:900000,hit=espnCache.get(key);
 if(!force&&hit&&Date.now()-hit.at<ttl)return hit.data;
 const settled=await Promise.allSettled(ESPN_LEAGUES.map(fetchEspnLeague));const data=settled.flatMap(r=>r.status==='fulfilled'?r.value:[]);espnCache.set(key,{at:Date.now(),data});return data
}
async function fetchSport(){try{const r=await fetch(SPORT,{cache:'no-store',credentials:'omit'});if(!r.ok)return[];const d=await r.json();return(d.matches||[]).map(nSport)}catch{return[]}}
async function refresh(force=false){
 if(loading||location.hash!=='#en-vivo')return;const m=document.querySelector('#en-vivo');if(!m)return;if(m.dataset.sourceStatus!=='rana-board-v34')shell(m);loading=true;
 try{const[e,s]=await Promise.all([fetchEspn(force),fetchSport()]);items=merge(e,s);paint(m)}finally{loading=false}
}
function resetTimer(){clearInterval(timer);timer=setInterval(()=>refresh(false),selectedOffset===0?60000:300000)}
function install(){if(location.hash!=='#en-vivo')return;const m=document.querySelector('#en-vivo');if(!m)return;css();if(m.dataset.sourceStatus!=='rana-board-v34')shell(m);syncDateUi(m);refresh(false);resetTimer()}
const schedule=()=>setTimeout(()=>{if(location.hash==='#en-vivo')install();else{clearInterval(timer);timer=null}},0);window.addEventListener('hashchange',schedule);document.addEventListener('ranasports:navigation-ready',schedule);document.addEventListener('ranasports:news-updated',schedule);schedule();
})();