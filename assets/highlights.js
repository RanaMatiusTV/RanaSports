(() => {
 if(!document.querySelector('#newsGrid'))return;
 const script=document.querySelector('script[src*="assets/highlights.js"]');
 const url=new URL('trends.json',script?.src||location.href);
 const normalize=text=>(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const words=text=>normalize(text).replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
 let snapshot;

 // Destacadas apunta al interés masivo argentino, no a preferencias partidarias.
 const strongEntities=[
  ['messi',140],['seleccion argentina',135],['argentina',90],
  ['boca',105],['river',105],['colapinto',180],['formula 1',85],['f1',85],
  ['libertadores',95],['champions',80],['sudamericana',70],
  ['independiente',72],['racing',68],['san lorenzo',62],['huracan',55],
  ['real madrid',70],['barcelona',70]
 ];
 const impactTerms=[
  ['campeon',110],['titulo',95],['final',90],['clasifico',85],['eliminado',85],['eliminacion',85],
  ['golazo',65],['goleada',65],['remontada',65],['sobre la hora',60],['agonico',60],['penales',55],
  ['partidazo',65],['clasico',75],['derbi',60],['record',65],['historico',70],['viral',55],['insolito',65],
  ['mercado de pases',45],['oferta',35],['refuerzo',40],['venta',35],['fichaje',45],['acuerdo',40],['firma',35],
  ['lesion',45],['parte medico',50],['baja',35],['sancion',40],['expulsado',40],
  ['renuncio',60],['despedido',60],['escandalo',75],['polemica',60],['cruce',45],['accidente',60],['choque',50]
 ];
 const weakTerms=['entrenamiento','practica','lista de convocados','concentrados','probable equipo','agenda','horarios','amistoso','declaracion breve','juveniles','reserva'];

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
  if(ageHours>30)return 0;

  let score=0;
  for(const [term,value] of strongEntities) if(text.includes(term)) score+=value;
  for(const [term,value] of impactTerms) if(text.includes(term)) score+=value;
  for(const term of weakTerms) if(text.includes(term)) score-=35;

  // Partido reciente terminado: fuerte prioridad aunque no sea de un club grande.
  const hasScore=/\b\d+\s*[-–]\s*\d+\b/.test(text);
  const hasResultVerb=/gano|vencio|derroto|empato|perdio|igualo|cayo/.test(text);
  if(hasScore) score+=55;
  if(hasResultVerb) score+=30;
  if(hasScore && hasResultVerb) score+=45;
  if(/final|termino|resultado final/.test(text) && hasScore) score+=35;

  // Eventos decisivos o de enorme arrastre popular.
  if(/final|semifinal|clasif|elimin|campeon|titulo/.test(text) && /vs\.?|ante |\b\d+\s*[-–]\s*\d+\b/.test(text)) score+=45;
  if(/messi/.test(text) && /gol|asistencia|doblete|triplete|lesion|record/.test(text)) score+=55;
  if(/colapinto/.test(text) && /carrera|clasificacion|qualy|q3|choque|abandono|puntos|podio/.test(text)) score+=45;

  // Un resultado recién terminado de Colapinto es prioridad máxima para RanaSports.
  if(ageHours<=12 && /colapinto/.test(text) && /termino|carrera|puntos|podio|gano|abandono/.test(text)) score+=500;

  // Recencia importa mucho en portada, pero no define sola la selección.
  if(ageHours<=2) score+=55;
  else if(ageHours<=5) score+=40;
  else if(ageHours<=10) score+=28;
  else if(ageHours<=18) score+=16;
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
  const trendBoost=trend>0?Math.min(65,Math.log10(trend+1)*16):0;
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
