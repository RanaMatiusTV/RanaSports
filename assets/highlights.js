(() => {
 if(!document.querySelector('#newsGrid'))return;
 const script=document.querySelector('script[src*="assets/highlights.js"]');
 const url=new URL('trends.json',script?.src||location.href);
 const normalize=text=>(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=text=>normalize(text).replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
 let snapshot;

 const strongEntities=[
  ['independiente',120],['boca',105],['river',105],['seleccion argentina',110],['argentina',75],
  ['messi',115],['colapinto',100],['formula 1',75],['f1',75],['racing',80],['san lorenzo',75],['huracan',70],
  ['real madrid',65],['barcelona',65],['champions',70],['libertadores',85],['sudamericana',65]
 ];
 const impactTerms=[
  ['campeon',95],['titulo',85],['final',80],['clasifico',75],['eliminado',75],['eliminacion',75],
  ['golazo',55],['goleada',55],['remontada',55],['sobre la hora',50],['agonico',50],['penales',45],
  ['mercado de pases',45],['oferta',35],['refuerzo',40],['venta',35],['fichaje',45],['acuerdo',40],['firma',35],
  ['lesion',40],['parte medico',45],['baja',30],['sancion',35],['expulsado',35],
  ['renuncio',55],['despedido',55],['elecciones',35],['escandalo',65],['polemica',50],['cruce',35],
  ['record',55],['historico',60],['viral',45],['insolito',55],['bloop',40],['accidente',55],['choque',45]
 ];
 const weakTerms=['entrenamiento','practica','lista de convocados','concentrados','probable equipo','agenda','horarios','amistoso','declaracion breve'];

 function textOf(card){
  return normalize([
   card.querySelector('h3')?.textContent||'',
   card.querySelector('.news-excerpt')?.textContent||'',
   card.querySelector('.badge')?.textContent||''
  ].join(' '));
 }

 function editorialScore(card,now=Date.now()){
  const text=textOf(card);
  const date=Date.parse(card.querySelector('time')?.dateTime||'');
  if(!Number.isFinite(date)||date>now)return 0;
  const ageHours=(now-date)/3600000;
  if(ageHours>36)return 0;

  let score=0;
  for(const [term,value] of strongEntities) if(text.includes(term)) score+=value;
  for(const [term,value] of impactTerms) if(text.includes(term)) score+=value;
  for(const term of weakTerms) if(text.includes(term)) score-=25;

  if(/\b\d+\s*[-–]\s*\d+\b/.test(text)) score+=28;
  if(/gano|vencio|derroto|empato|perdio/.test(text)) score+=18;
  if(/vs\.?|ante /.test(text) && /final|semifinal|clasif|elimin/.test(text)) score+=35;

  if(ageHours<=3) score+=35;
  else if(ageHours<=8) score+=25;
  else if(ageHours<=16) score+=15;
  else if(ageHours<=24) score+=8;

  return Math.max(0,score);
 }

 function trendScore(card,now=Date.now()){
  if(!snapshot||snapshot.region!=='AR'||now-Date.parse(snapshot.updatedAt)>86400000||Date.parse(snapshot.updatedAt)>now)return 0;
  const date=Date.parse(card.querySelector('time')?.dateTime||'');
  if(!Number.isFinite(date)||date>now||now-date>86400000)return 0;
  const text=new Set(words((card.querySelector('h3')?.textContent||'')+' '+(card.querySelector('.news-excerpt')?.textContent||'')));
  return Math.max(0,...snapshot.trends.map(trend=>{
   const started=Date.parse(trend.startedAt);if(!Number.isFinite(started)||started>now||now-started>86400000)return 0;
   const terms=words(trend.query).filter(word=>word.length>2&&!['del','las','los','por','con','para','una','uno','the','and','vs'].includes(word));
   return terms.length&&terms.every(word=>text.has(word))?Number(trend.volume)||0:0;
  }));
 }

 window.ranaEditorialScore=editorialScore;
 window.ranaTrendScore=(card,now=Date.now())=>{
  const editorial=editorialScore(card,now);
  const trend=trendScore(card,now);
  const trendBoost=trend>0?Math.min(80,Math.log10(trend+1)*18):0;
  return editorial+trendBoost;
 };

 async function refresh(){
  try{
   const response=await fetch(url,{cache:'no-cache'});
   if(!response.ok)return;
   const data=await response.json();
   if(!Array.isArray(data.trends))return;
   snapshot=data;
   document.dispatchEvent(new Event('ranasports:trends'));
  }catch{}
 }
 refresh();
 setInterval(refresh,15*60*1000);
 setInterval(()=>document.dispatchEvent(new Event('ranasports:trends')),60000);
})();
