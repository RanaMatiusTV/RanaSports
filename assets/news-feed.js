/* CSV público de RanaSports. Las imágenes sociales se muestran como FOTO SOLA, nunca como post completo. */
(() => {
 const grid=document.querySelector('#newsGrid');
 const detail=document.querySelector('#newsDetail');
 if(!grid&&!detail&&!document.querySelector('.dynamic-nav'))return;
 // Aplicar el eslogan también a las cabeceras de artículos archivados.
 document.querySelectorAll('.site-header .brand-copy small').forEach(el=>{el.textContent='Noticias cortitas y al pie.';});
 const script=document.querySelector('script[src*="assets/news-feed.js"]');
 const siteBase=new URL('../',script?.src||location.href);
 const ARCHIVE_URL=new URL('assets/news-archive.csv',siteBase).href;
 const CSV_URLS=[
  new URL('assets/news-live.csv',siteBase).href,
  'https://docs.google.com/spreadsheets/d/12VE1D_zlnOvmIWFhdCrKAvCHh6VOwXdaYoAczDh0Fw4/gviz/tq?tqx=out:csv&sheet=Noticias',
  'https://docs.google.com/spreadsheets/d/12VE1D_zlnOvmIWFhdCrKAvCHh6VOwXdaYoAczDh0Fw4/gviz/tq?tqx=out:csv&sheet=Noticias&tq=select%20*%20limit%2080',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?gid=663081286&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv'
 ];
 const CACHE_KEY='ranasports-news-csv-v111:'+siteBase.pathname;
 const REVOKED_ARTICLE_IDS=new Set(['WyJpbmRlcGVuZGllbnRlIiwxNzkwMzY0OTAwMDAwLCJEVVJPIEdPTFBFIFBBUkEgSU5ERVBFTkRJRU5URTogRkVSUk8gTEUgR0FOw5MgRU4gVklMTEEgRE9Nw41OSUNPIFBPUiBFTCBDTEFVU1VSQSBGRU1FTklOTyJd']);
 const status=document.querySelector('#newsStatus');
 const searchInput=document.querySelector('#searchInput');
 let currentNews=[];
 let detailLookupSettled=!detail;
 const INITIAL_RENDER_LIMIT=30,RENDER_PAGE_SIZE=10;
 let renderLimit=INITIAL_RENDER_LIMIT,loadMoreObserver=null;
 const categories={independiente:'Independiente',futbol:'Fútbol',f1:'F1',seleccion:'Selección Argentina',agenda:'Agenda'};
 const normalize=v=>(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const categoryAlias={'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol','seleccion argentina':'seleccion','boca juniors':'boca','river plate':'river','racing club':'racing','velez sarsfield':'velez'};
 const categoryLabel={boca:'Boca',river:'River',racing:'Racing',velez:'Vélez',f1:'F1',seleccion:'Selección Argentina',futbol:'Fútbol'};
 const FOOTBALL_CLUBS=[["Independiente","independiente"],["Boca Juniors","boca|boca juniors|xeneize|xeneizes"],["River Plate","river|river plate|millonario|millonarios"],["Racing Club","racing|racing club|academia"],["San Lorenzo","san lorenzo|ciclon"],["Huracán","huracan|globo"],["Vélez Sarsfield","velez|velez sarsfield|fortin"],["Estudiantes de La Plata","estudiantes|estudiantes de la plata|pincha"],["Gimnasia y Esgrima La Plata","gimnasia la plata|gimnasia y esgrima la plata|lobo platense"],["Argentinos Juniors","argentinos juniors|bicho"],["Rosario Central","rosario central|canalla"],["Newell's Old Boys","newell|newells|newell s old boys|lepra rosarina"],["Talleres de Córdoba","talleres|talleres de cordoba|talleres cordoba"],["Belgrano","belgrano|belgrano de cordoba|pirata"],["Instituto","instituto|instituto de cordoba|gloria"],["Unión de Santa Fe","union|union de santa fe|tatengue"],["Colón de Santa Fe","colon de santa fe|colon|sabalero"],["Atlético Tucumán","atletico tucuman|decano"],["Lanús","lanus|granate"],["Banfield","banfield|taladro"],["Defensa y Justicia","defensa y justicia|halcon de varela"],["Platense","platense|calamar"],["Tigre","tigre|matador de victoria"],["Godoy Cruz","godoy cruz|tomba"],["Central Córdoba (SdE)","central cordoba|central cordoba de santiago"],["Independiente Rivadavia","independiente rivadavia|lepra mendocina"],["Deportivo Riestra","riestra|deportivo riestra"],["Sarmiento de Junín","sarmiento de junin|sarmiento junin"],["Aldosivi","aldosivi|tiburon"],["Barracas Central","barracas central|guapo"],["Gimnasia de Mendoza","gimnasia de mendoza|gimnasia mendoza"],["Estudiantes de Río Cuarto","estudiantes de rio cuarto|estudiantes rio cuarto"],["San Martín de San Juan","san martin de san juan|san martin san juan"],["San Martín de Tucumán","san martin de tucuman|san martin tucuman"],["Chacarita Juniors","chacarita|chacarita juniors|funebrero"],["Ferro Carril Oeste","ferro|ferro carril oeste"],["Quilmes","quilmes|cervecero"],["Temperley","temperley|gasolero"],["Almirante Brown","almirante brown|fragata"],["Atlanta","atlanta|bohemio"],["Nueva Chicago","nueva chicago|torito de mataderos"],["Los Andes","los andes|milrayitas"],["All Boys","all boys|albo"],["San Telmo","san telmo|candombero"],["Tristán Suárez","tristan suarez"],["Deportivo Morón","deportivo moron|moron|gallito"],["Almagro","almagro|tricolor"],["Racing de Córdoba","racing de cordoba|racing cordoba"],["Güemes (SdE)","guemes de santiago|guemes santiago|guemes"],["Mitre (SdE)","mitre de santiago|mitre santiago"],["Agropecuario","agropecuario|agropecuario argentino"],["Patronato","patronato|patron"],["Estudiantes de Caseros","estudiantes de caseros|estudiantes caseros"],["Arsenal de Sarandí","arsenal de sarandi|arsenal sarandi"],["Defensores de Belgrano","defensores de belgrano|dragon"],["Deportivo Maipú","deportivo maipu|maipu"],["Gimnasia de Jujuy","gimnasia de jujuy|gimnasia jujuy"],["Gimnasia y Tiro","gimnasia y tiro"],["Alvarado","alvarado"],["Guillermo Brown","guillermo brown"],["Chaco For Ever","chaco for ever|chaco forever"],["Deportivo Madryn","deportivo madryn"],["San Martín de Formosa","san martin de formosa|san martin formosa"],["Ferro de General Pico","ferro de general pico|ferro general pico"],["Olimpo","olimpo"],["Villa Dálmine","villa dalmine"],["Dock Sud","dock sud"],["Excursionistas","excursionistas"],["Comunicaciones","comunicaciones"],["Argentino de Quilmes","argentino de quilmes"],["Argentino de Merlo","argentino de merlo"],["Deportivo Armenio","deportivo armenio"],["Acassuso","acassuso"],["Colegiales","colegiales"],["Flandria","flandria"],["Brown de Adrogué","brown de adrogue"],["Defensores Unidos","defensores unidos"],["Midland","midland"],["Sacachispas","sacachispas"],["Ituzaingó","ituzaingo"],["Berazategui","berazategui"],["Laferrere","laferrere|deportivo laferrere"],["Liniers","liniers"],["General Lamadrid","general lamadrid"],["Sportivo Italiano","sportivo italiano"],["Sportivo Belgrano","sportivo belgrano"],["Douglas Haig","douglas haig"],["Crucero del Norte","crucero del norte"],["Juventud Antoniana","juventud antoniana"],["Cipolletti","cipolletti"],["Sol de América","sol de america de formosa"],["9 de Julio (Rafaela)","9 de julio de rafaela"],["Atlético de Rafaela","atletico de rafaela|atletico rafaela"],["Gimnasia de Concepción","gimnasia de concepcion"],["Ciudad de Bolívar","ciudad de bolivar"],["Independiente de Chivilcoy","independiente de chivilcoy"],["Deportivo Rincón","deportivo rincon"],["Círculo Deportivo","circulo deportivo"]];
 const FOOTBALL_TOURNAMENTS=[["Liga Profesional","liga profesional|liga argentina|primera division argentina"],["Torneo Apertura","torneo apertura|apertura 2026"],["Torneo Clausura","torneo clausura|clausura 2026"],["Copa Argentina","copa argentina"],["Copa de la Liga","copa de la liga"],["Supercopa Argentina","supercopa argentina"],["Trofeo de Campeones","trofeo de campeones"],["Recopa de Campeones","recopa de campeones"],["Primera Nacional","primera nacional|segunda division argentina"],["Primera B Metropolitana","primera b metropolitana|primera b metro"],["Primera C","primera c"],["Federal A","federal a|torneo federal a"],["Copa Libertadores","copa libertadores|libertadores"],["Copa Sudamericana","copa sudamericana|sudamericana"],["Recopa Sudamericana","recopa sudamericana"],["Champions League","champions league|liga de campeones"],["Europa League","europa league"],["UEFA Nations League","uefa nations league|nations league"],["Mundial de Clubes","mundial de clubes"],["Mundial Sub-17","mundial sub 17|mundial sub-17"],["Mundial Sub-20","mundial sub 20|mundial sub-20"],["Copa Libertadores Sub-20","libertadores sub 20|libertadores sub-20"],["Copa Federal","copa federal"],["Copa de la Superliga","copa de la superliga"]];

 // Taxonomía de fútbol: se crean opciones solo si existen noticias publicadas para ellas.
 const simpleSlug=value=>normalize(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const footballText=value=>' '+normalize(value).replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
 const footballHas=(text,words)=>text.includes(' '+words+' ');
 const footballClubs=FOOTBALL_CLUBS;
 const footballTournaments=FOOTBALL_TOURNAMENTS;
 const footballClubDefs=footballClubs.map(([name,aliases])=>({key:simpleSlug(name),label:name,aliases:aliases.split('|').map(x=>footballText(x).trim())}));
 const footballTournamentDefs=footballTournaments.map(([name,aliases])=>({key:simpleSlug(name),label:name,aliases:aliases.split('|').map(x=>footballText(x).trim())}));
 const genericFootballCategories=/^(?:futbol|futbol argentino|futbol internacional|futbol femenino|internacional|argentinos por el mundo|argentina|seleccion argentina|seleccion argentina sub[- ]?\d+|superclasico|ascenso|reserva|mercado internacional|mundial sub[- ]?\d+|messi|maradona)$/;
 const nonFootballCategories=/^(?:f1|formula 1|formula uno|formula 2|formula 3|automovilismo|motogp|tenis|rugby|basquet|polideportivo|ciclismo|natacion|padel|voley|voley playa|judo|atletismo|boxeo|ufc|vela|gimnasia|tenis de mesa|remo|wushu|equitacion|skate|hockey|nba)$/;
 function classifyFootball(category,title,summary){
  const cat=footballText(category),heading=footballText(title),excerpt=footballText(summary);
  const catRaw=normalize(category);
  const isOtherSport=nonFootballCategories.test(catRaw);
  const youthMatch=(category+' '+title).match(/\bsub[\s-]*(1[0-9]|2[0-3])\b/i);
  const youth=youthMatch?'Sub-'+youthMatch[1]:'';
  const titleArgentine=/\b(?:seleccion argentina|argentina|albiceleste|la sub[- ]?\d+ argentina)\b/i.test(heading);
  const categoryArgentine=/seleccion argentina/.test(catRaw);
  const isFutsal=/(?:^futsal$|futsal|futbol sala)/.test(catRaw+' '+normalize(title));
  const selection=(!isFutsal&&(categoryArgentine||titleArgentine&&youth||/seleccion argentina|seleccion mayor|seleccion de argentina/.test(heading)))?(youth?'sub-'+youth.slice(4):'mayor'):'';
  const clubNames=[];
  const combined=cat+heading;
  for(const club of footballClubDefs){
   // Priorizar la categoría, luego el título: no sumar clubes nombrados incidentalmente en el cuerpo.
   if(club.aliases.some(alias=>footballHas(combined,alias))){
    if(club.key==='independiente'&&!/\bindependiente(?! rivadavia)\b/.test(combined))continue;
    if(club.key==='racing-club'&&!/\bracing(?! de cordoba| cordoba)\b/.test(combined))continue;
    if(club.key==='estudiantes-de-la-plata'&&!/\bestudiantes(?! de rio cuarto| rio cuarto| de caseros| caseros)\b/.test(combined))continue;
    if(club.key==='ferro-carril-oeste'&&!/\bferro(?! de general pico| general pico)\b/.test(combined))continue;
    clubNames.push(club.key);
   }
  }
  const tournaments=[];
  for(const competition of footballTournamentDefs){
   if(competition.aliases.some(alias=>footballHas(combined,alias)))tournaments.push(competition.key);
  }
  if(!isOtherSport && /^(?:copa |liga |torneo |supercopa |recopa |primera nacional|primera b |primera c|federal a|champions|uefa|mundial sub)/.test(catRaw) && !tournaments.length){
   tournaments.push(simpleSlug(category));
  }
  const football=!isOtherSport&&(selection!==''||clubNames.length>0||tournaments.length>0||genericFootballCategories.test(catRaw)||/\bfutbol\b/.test(catRaw)||/^(?:copa |liga |torneo |supercopa |recopa |primera |federal |mundial sub)/.test(catRaw));
  return {football,clubs:football?clubNames:[],tournaments:football?tournaments:[],selection:football?selection:''};
 }

 const required=['Publicar','Fecha','Hora','Categoría','Título','Resumen','URL nota','URL imagen','Fuente','URL fuente','URL video'].map(normalize);
 const dateFormat=new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});

 function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
   else if(c===','&&!quoted){row.push(field);field='';}
   else if((c==='\n'||c==='\r')&&!quoted){row.push(field);rows.push(row);row=[];field='';if(c==='\r'&&text[i+1]==='\n')i++;}
   else field+=c;
  }
  if(quoted)throw new Error('CSV incompleto');
  if(field||row.length){row.push(field);rows.push(row);}return rows;
 }
 function timestamp(date,time){
  let m=(date||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);let d,mo,y;
  if(m){[,d,mo,y]=m;}else{m=(date||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;[,y,mo,d]=m;}
  const c=(time||'').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!c)return null;
  const [h,mi,s]=[Number(c[1]),Number(c[2]),Number(c[3]||0)];y=Number(y);mo=Number(mo);d=Number(d);
  if(y<2000||mo<1||mo>12||d<1||h>23||mi>59||s>59)return null;
  const check=new Date(Date.UTC(y,mo-1,d));if(check.getUTCMonth()!==mo-1||check.getUTCDate()!==d)return null;
  return Date.UTC(y,mo-1,d,h+3,mi,s);
 }
 function safeURL(value){
  if(!value?.trim())return '';
  try{const u=new URL(value.trim(),location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}
 }
 function imageDataURL(value){
  const v=(value||'').trim();
  return /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)?v:'';
 }
 function imageEmbedURL(value){
  const data=imageDataURL(value);if(data)return data;
  const url=safeURL(value);if(!url)return '';
  try{
   const u=new URL(url);
   if(/\.(?:png|jpe?g|webp|gif|avif)$/i.test(u.pathname))return url;
   if(u.hostname==='pbs.twimg.com'&&/^(?:png|jpe?g|webp|gif)$/i.test(u.searchParams.get('format')||''))return url;
   return '';
  }catch{return '';}
 }
 function isXPost(url){
  try{const u=new URL(url);return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname)&&/\/status\/\d+/.test(u.pathname);}catch{return false;}
 }
 function isInstagramPost(url){
  try{const u=new URL(url);return /(^|\.)instagram\.com$/.test(u.hostname)&&/^\/(p|reel|reels)\//.test(u.pathname);}catch{return false;}
 }
 function xPostId(url){
  try{const u=new URL(url);const parts=u.pathname.split('/').filter(Boolean);const si=parts.indexOf('status');const id=parts[si+1];return /^\d+$/.test(id||'')?id:'';}catch{return '';}
 }
 function xPostToDirectImage(url){
  try{
   const u=new URL(url);const parts=u.pathname.split('/').filter(Boolean);const si=parts.indexOf('status');
   const handle=parts[0],id=parts[si+1];
   if(!handle||!/^\d+$/.test(id||''))return '';
   return `https://d.fxtwitter.com/${encodeURIComponent(handle)}/status/${id}/photo/1`;
  }catch{return '';}
 }
 function imageURL(value){
  const url=safeURL(value);if(!url)return '';
  if(isInstagramPost(url))return '';
  return isXPost(url)?xPostToDirectImage(url):url;
 }
 function proxiedImageURL(url){
  try{
   const u=new URL(url);
   if(u.hostname==='images.weserv.nl'||u.hostname==='s.wordpress.com')return u.href;
   return 'https://images.weserv.nl/?url='+encodeURIComponent(u.href)+'&w=1200&h=675&fit=cover&output=webp&q=82';
  }catch{return '';}
 }
 function sourceScreenshotURL(item){
  const source=safeURL(item?.sourceURL||item?.note||'');
  if(!source)return '';
  return 'https://s.wordpress.com/mshots/v1/'+encodeURIComponent(source)+'?w=1200';
 }
 function commonsFileName(url){
  try{
   const u=new URL(url);
   if(!/(^|\.)wikimedia\.org$/.test(u.hostname)||!u.pathname.includes('/Special:Redirect/file/'))return '';
   return decodeURIComponent(u.pathname.split('/Special:Redirect/file/')[1]||'').replace(/^File:/i,'').trim();
  }catch{return '';}
 }
 async function commonsResolvedImage(url){
  const file=commonsFileName(url);if(!file)return '';
  const api='https://commons.wikimedia.org/w/api.php?';
  const exact=new URLSearchParams({action:'query',titles:'File:'+file,prop:'imageinfo',iiprop:'url|mime',iiurlwidth:'1200',format:'json',formatversion:'2',origin:'*'});
  try{
   let r=await fetch(api+exact,{cache:'force-cache',credentials:'omit'});
   if(r.ok){
    let d=await r.json(),info=d?.query?.pages?.[0]?.imageinfo?.[0];
    if(info&&/^image\//i.test(info.mime||''))return info.thumburl||info.url||'';
   }
  }catch{}
  const query=file.replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' ').trim();
  if(!query)return '';
  const search=new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'url|mime',iiurlwidth:'1200',format:'json',formatversion:'2',origin:'*'});
  try{
   const r=await fetch(api+search,{cache:'force-cache',credentials:'omit'});if(!r.ok)return '';
   const d=await r.json();
   for(const page of d?.query?.pages||[]){
    const info=page?.imageinfo?.[0];
    if(info&&/^image\/(jpeg|png|webp)$/i.test(info.mime||''))return info.thumburl||info.url||'';
   }
  }catch{}
  return '';
 }
 function mediaFallbackImage(url){
  if(!url)return '';
  try{
   const u=new URL(url);
   let id='';
   if(u.hostname==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';
   else if(/(^|\.)youtube\.com$/.test(u.hostname)){
    if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
    else{const p=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(p[0]))id=p[1]||'';}
   }
   if(id)return 'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';
   if(isXPost(url))return xPostToDirectImage(url);
  }catch{}
  return '';
 }
 function originalBehindImageCDN(url){
  try{
   const u=new URL(url);
   if(u.hostname!=='cdnartic.ar')return '';
   const path=decodeURIComponent(u.pathname);
   const start=path.indexOf('/https://');
   if(start<0)return '';
   const original=path.slice(start+1);
   const target=new URL(original);
   return target.protocol==='https:'?target.href:'';
  }catch{return '';}
 }
 function fallbackVisualCandidates(item){
  const queue=[],push=url=>{if(url&&!queue.includes(url))queue.push(url);};
  const embedThumb=mediaFallbackImage(item?.video||'');
  const preferEmbedThumb=item?.imageStatus==='temporal'&&item?.hasYouTubeVideo;
  if(preferEmbedThumb){
   push(embedThumb);
   push(item?.image||'');
   push(originalBehindImageCDN(item?.image||''));
  }else{
   push(item?.image||'');
   push(originalBehindImageCDN(item?.image||''));
   push(item?.extraImage||'');
   push(embedThumb);
  }
  // No fabricar capturas de la fuente como fallback: la portada y la nota deben usar
  // la imagen editorial definida para la noticia. Si falla, se prueban solo medios
  // vinculados a esa misma noticia; nunca un screenshot automático de la página.
  return queue;
 }
 // Evitar reintentar continuamente URLs que acaban de fallar.
 const failedImageSources=new Map();
 const FAILED_SOURCE_RETRY_MS=15*60*1000;
 function imageWithFallback(img,primary,alternates=[],onFail){
  const queue=[];
  const push=url=>{if(url&&!queue.includes(url)&&(failedImageSources.get(url)||0)<Date.now())queue.push(url);};
  img.dataset.rsImageSignature=[primary,...(alternates||[])].filter(Boolean).join('\n');
  img.style.visibility='hidden';
  const originals=[primary,...(alternates||[])].filter(Boolean);

   // Local editorial images load directly; external sports CDNs may need a proxy.
   const local=url=>{try{return new URL(url,location.href).origin===location.origin;}catch{return false;}};
   for(const url of originals)if(local(url))push(url);
   for(const url of originals)if(!local(url))push(proxiedImageURL(url));
   for(const url of originals)push(url);
  let index=0,busy=false,settled=false;
  const next=()=>{
   while(index<queue.length){
    const url=queue[index++];
    if(url&&url!==img.currentSrc&&url!==img.src){img.src=url;return true;}
   }
   if(!settled){settled=true;queueMicrotask(()=>onFail?.());}return false;
  };
  img.addEventListener('load',()=>{settled=true;img.style.visibility='visible';failedImageSources.delete(img.currentSrc||img.src);});
  img.addEventListener('error',()=>{if(busy)return;busy=true;failedImageSources.set(img.currentSrc||img.src,Date.now()+FAILED_SOURCE_RETRY_MS);next();busy=false;});
  next();
 }
 function sameImageSource(current,target){
  if(!current||!target)return false;
  if(current===target||current===proxiedImageURL(target))return true;
  try{return decodeURIComponent(current).includes(target);}catch{return false;}
 }
 function reconcileHomepageImages(authorityNews){
  if(!grid||!Array.isArray(authorityNews)||!authorityNews.length)return;
  const byURL=new Map(authorityNews.map(item=>[articleURL(item),item]));
  grid.querySelectorAll('.news-card').forEach(card=>{
   const href=card.querySelector('h3 a')?.href||'';
   const item=byURL.get(href);if(!item)return;
   const candidates=fallbackVisualCandidates(item),primary=candidates.shift()||'';
   let visual=card.querySelector('.news-image'),img=visual?.querySelector('img');
   if(!primary){visual?.remove();return;}
   if(!visual||!img){
    visual=link(articleURL(item),'','card-visual news-image');img=element('img');
    img.alt=item.title;img.width=800;img.height=450;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
    visual.append(img);card.insertBefore(visual,card.firstChild);
   }
   const current=img.currentSrc||img.src||'';
   const signature=[primary,...candidates].filter(Boolean).join('\n');
   if(img.dataset.rsImageSignature===signature)return;
   if(img.complete&&img.naturalWidth>1&&[primary,...candidates].some(url=>sameImageSource(current,url)))return;
   imageWithFallback(img,primary,candidates,()=>visual.remove());
  });
 }

 function youtubeEmbedURL(url){
  if(!url)return '';
  try{
   const u=new URL(url);let id='';
   if(u.hostname==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';
   else if(/(^|\.)youtube\.com$/.test(u.hostname)){
    if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
    else{const p=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(p[0]))id=p[1]||'';}
   }
   return /^[A-Za-z0-9_-]{6,}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:'';
  }catch{return '';}
 }
 function formula1EmbedURL(url){
  if(!url)return '';
  try{
   const u=new URL(url);
   if(!/(^|\.)formula1\.com$/.test(u.hostname))return '';
   const match=u.pathname.match(/\.(\d+)(?:\.html)?$/),id=match?.[1]||'';
   return /^\d{10,}$/.test(id)?`https://players.brightcove.net/6057949432001/S1WMrhjlh_default/index.html?videoId=${id}`:'';
  }catch{return '';}
 }
 function trustedIframeEmbedURL(url){
  if(!url)return '';
  try{
   const u=new URL(url);
   if(u.hostname==='api.vodgc.net'&&/^\/player\/v2\/embed\//.test(u.pathname))return u.href;
   if(/(^|\.)motorsport\.com$/.test(u.hostname)&&/^\/v\/\d+\/?$/.test(u.pathname))return u.href;
  }catch{}
  return '';
 }
 function videoEmbedURL(url){
  if(!url||isXPost(url))return '';
  return youtubeEmbedURL(url)||formula1EmbedURL(url)||trustedIframeEmbedURL(url);
 }
 function element(tag,className,text){const n=elementNode(tag);if(className)n.className=className;if(text!==undefined&&text!==null)n.textContent=text;return n;}
 function elementNode(tag){return document.createElement(tag);}
 function link(url,text,className){const n=element('a',className,text);n.href=url;if(new URL(url,location.href).origin!==location.origin){n.target='_blank';n.rel='noopener noreferrer';}return n;}
 function articleToken(item){
  const identity=JSON.stringify([item.category,item.date,item.title]);const bytes=new TextEncoder().encode(identity);
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 }
 function articleURL(item){
  const id=articleToken(item),path=window.RS_ARTICLE_ROUTES?.[id];
  if(path&&/^\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(path))return new URL(path.slice(1),siteBase).href;
  const u=new URL('noticia.html',siteBase);u.searchParams.set('n',id);return u.href;
 }
 function renderVideo(container,url){
  const embed=videoEmbedURL(url);if(!embed||container.querySelector('.video-embed,.x-embed'))return false;
  const wrap=element('div','video-embed'),frame=element('iframe');frame.src=embed;frame.title='Contenido embebido de la noticia';frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';wrap.append(frame);container.append(wrap);return true;
 }
 function withXWidgets(callback){
  if(window.twttr?.widgets?.createTweet){callback();return;}
  let s=document.querySelector('script[data-ranasports-x-widgets]');
  if(!s){s=document.createElement('script');s.src='https://platform.twitter.com/widgets.js';s.async=true;s.charset='utf-8';s.dataset.ranasportsXWidgets='1';document.body.append(s);}
  const ready=()=>{if(window.twttr?.widgets?.createTweet)callback();};
  s.addEventListener('load',ready,{once:true});
 }
 function renderXPost(container,url){
  if(!isXPost(url)||container.querySelector('.video-embed,.x-embed'))return false;
  const id=xPostId(url);if(!id)return false;
  const wrap=element('div','x-embed'),frame=element('iframe');
  const params=new URLSearchParams({id,theme:'dark',dnt:'true',lang:'es'});
  frame.src='https://platform.twitter.com/embed/Tweet.html?'+params.toString();
  frame.title='Publicación de X relacionada con la noticia';
  frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.setAttribute('scrolling','no');frame.setAttribute('allow','fullscreen');
  wrap.append(frame);container.append(wrap);
  return true;
 }
 function renderImageEmbed(container,url){
  const src=imageEmbedURL(url);
  if(!src||container.querySelector('.video-embed,.x-embed,.image-embed'))return false;
  const wrap=element('figure','image-embed'),img=element('img');
  img.src=src;img.alt='Captura relacionada con la noticia';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  wrap.append(img);container.append(wrap);return true;
 }
 function renderLinkEmbed(container,url){
  const target=safeURL(url);
  if(!target||!/^https?:\/\//i.test(target)||container.querySelector('.external-embed-card'))return false;
  const card=link(target,'','external-embed-card');
  const title=element('strong','', 'MIRÁ EL VIDEO ACÁ!');
  const description=element('span','', 'Abrir contenido original en otra pestaña');
  card.append(title,description);container.append(card);return true;
 }
 function renderEmbed(container,url){
  if(container.querySelector('.video-embed,.x-embed,.image-embed,.external-embed-card'))return false;
  if(imageEmbedURL(url))return renderImageEmbed(container,url);
  if(isXPost(url))return renderXPost(container,url);
  if(videoEmbedURL(url))return renderVideo(container,url);
  return renderLinkEmbed(container,url);
 }
 function renderSupplementalImage(container,url){
  if(!imageDataURL(url)||container.querySelector('.supplemental-image'))return false;
  const wrap=element('figure','image-embed supplemental-image'),img=element('img');
  img.src=url;img.alt='Captura relacionada con la noticia';img.loading='lazy';img.decoding='async';
  wrap.append(img);container.append(wrap);return true;
 }
 function injectMediaStyles(){
  if(document.getElementById('ranasports-media-styles-v7'))return;
  const s=element('style');s.id='ranasports-media-styles-v7';s.textContent=`
   .video-embed{position:relative;width:100%;aspect-ratio:16/9;margin:22px 0 8px;border-radius:10px;overflow:hidden;background:#000}
   .video-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
   .embed-fallback{display:inline-block;margin:0 0 22px;font-size:.9rem}
   .external-embed-card{display:flex;flex-direction:column;gap:5px;width:100%;margin:22px 0;padding:16px 18px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:#111820;color:#fff;text-decoration:none}
   .external-embed-card strong{font-size:15px}.external-embed-card span{font-size:12px;opacity:.75}
   .x-embed{width:100%;max-width:600px;min-height:120px;margin:22px auto;overflow:hidden}.x-embed iframe{display:block;width:100%;min-height:620px;border:0;background:transparent}
   .x-embed .twitter-tweet{margin-left:auto!important;margin-right:auto!important}
   .image-embed{width:min(100%,460px);margin:22px auto}
   .image-embed img{display:block;width:100%;height:auto;max-height:78vh;object-fit:contain;border-radius:10px;background:#000}
   .article-image{display:block;width:100%;height:auto;object-fit:contain;object-position:center;border-radius:8px}
   .card-visual.news-image{aspect-ratio:16/9!important;min-height:0!important;padding:0!important;background:#171d24}
   .news-image img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 24%;transition:transform .25s}
   .editorial-grid .secondary-story .news-image{aspect-ratio:16/9!important}
   .lead-story:has(.news-image){min-height:0!important;display:block!important}
   .editorial-grid .lead-story>.news-image{position:relative!important;inset:auto!important;width:100%!important;height:auto!important;aspect-ratio:16/9!important;max-height:none!important;z-index:auto!important}
   .lead-story>.news-image:after{display:none!important}
   .lead-story:has(.news-image) .card-body{padding-top:18px!important;pointer-events:auto!important}
   @media(min-width:1050px){
    .editorial-grid .secondary-story .news-image{aspect-ratio:auto!important;align-self:stretch}
    .editorial-grid .secondary-story .news-image img{height:100%;object-position:50% 22%}
   }
  `;document.head.append(s);
 }
 injectMediaStyles();

 function readNews(text){
  const [first,...rows]=parseCSV(text);if(!first)throw new Error('CSV sin encabezados');
  const keys=first.map(normalize);if(!required.every(k=>keys.includes(k)))throw new Error('Encabezados inválidos');
  const items=rows.flatMap(values=>{
   if(values.length!==keys.length)return [];
   const row=Object.fromEntries(keys.map((k,i)=>[k,(values[i]||'').trim()]));if(normalize(row.publicar)!=='si')return [];
   let category=normalize(row.categoria);category=categoryAlias[category]||category;
   const date=timestamp(row.fecha,row.hora);if(!category||!row.titulo||!row.resumen||date===null)return [];
   const footballInfo=classifyFootball(row.categoria,row.titulo,row.resumen);
   const youthLabel=footballInfo.selection.startsWith('sub-')?'Selección Argentina Sub-'+footballInfo.selection.slice(4):'';
   const sportLabel=youthLabel||categoryLabel[category]||row.categoria;
   const video=imageDataURL(row['url video'])||safeURL(row['url video']);const video2=imageDataURL(row['url video 2'])||safeURL(row['url video 2']);const hasYouTubeVideo=!!youtubeEmbedURL(video),hasFormula1Video=!!formula1EmbedURL(video),hasXPost=isXPost(video),hasVideo=!!video&&!hasXPost,hasEmbed=!!video;
   const eventText=normalize([row.categoria,row.titulo,row.resumen,row.fuente,row['url fuente']].filter(Boolean).join(' '));const isSuramericanos=/(juegos suramericanos|santa fe 2026|santafe2026)/.test(eventText);
   return [{category,group:Object.hasOwn(categories,category)?category:'otros',sport:sportLabel,footballInfo,isSuramericanos,photoCredit:row['credito foto']||'',imageStatus:normalize(row['estado imagen']||''),date,title:row.titulo,summary:row.resumen,body:row.cuerpo||row.contenido||row['texto completo']||'',note:safeURL(row['url nota']),image:imageURL(row['url imagen']),source:row.fuente,sourceURL:safeURL(row['url fuente']),video,video2,extraImage:imageDataURL(row['url imagen candidata']),featured:normalize(row.destacada)==='si',hasYouTubeVideo,hasFormula1Video,hasVideo,hasXPost,hasEmbed}];
  }).sort((a,b)=>b.date-a.date);
  const available=new Map();
  const clubs=new Set(),tournaments=new Set(),youth=new Set(),footballCategories=new Set();
  for(const item of items){
   available.set(item.category,categoryLabel[item.category]||item.sport);
   if(item.footballInfo.football)footballCategories.add(item.category);
   for(const name of item.footballInfo.clubs)clubs.add(name);
   for(const name of item.footballInfo.tournaments)tournaments.add(name);
   if(item.footballInfo.selection.startsWith('sub-'))youth.add(item.footballInfo.selection);
  }
  const menu={
   footballCategories:[...footballCategories],
   clubs:[...clubs].map(key=>{const found=footballClubDefs.find(x=>x.key===key);return [key,found?.label||key];}).sort((a,b)=>a[1].localeCompare(b[1],'es')),
   tournaments:[...tournaments].map(key=>{const found=footballTournamentDefs.find(x=>x.key===key);const category=items.find(x=>x.footballInfo.tournaments.includes(key));return [key,found?.label||category?.sport||key];}).sort((a,b)=>a[1].localeCompare(b[1],'es')),
   youth:[...youth].map(key=>[key,'Sub-'+key.slice(4)]).sort((a,b)=>Number(a[0].slice(4))-Number(b[0].slice(4)))
  };
  document.dispatchEvent(new CustomEvent('ranasports:categories',{detail:[...available]}));
  document.dispatchEvent(new CustomEvent('ranasports:football-navigation',{detail:menu}));
  return items;
 }
 function appendArticlePhoto(item){
  const candidates=fallbackVisualCandidates(item),primary=candidates.shift()||'';
  if(!primary){queueMicrotask(()=>document.dispatchEvent(new Event('ranasports:news-updated')));return;}
  const figure=element('figure','article-photo');figure.style.display='none';const img=element('img','article-image');img.alt=item.title;img.width=800;img.height=450;img.decoding='async';img.referrerPolicy='no-referrer';
  const caption=item.photoCredit?element('figcaption','photo-credit','Foto: '+item.photoCredit):null;
  const syncCaption=()=>{if(!caption)return;const src=img.currentSrc||img.src||'';caption.hidden=/\/assets\/fallback-news\.svg(?:\?|$)/i.test(src)||src===mediaFallbackImage(item.video);};
  img.addEventListener('load',()=>{syncCaption();figure.style.display='';});
  imageWithFallback(img,primary,candidates,()=>{figure.remove();queueMicrotask(()=>document.dispatchEvent(new Event('ranasports:news-updated')));});
  figure.append(img);if(caption)figure.append(caption);detail.append(figure);
 }
 function requestedArticleId(){return new URL(location.href).searchParams.get('n')||window.RS_ARTICLE_ID||'';}
 function findRequested(news){const requested=requestedArticleId();return news.find(x=>articleToken(x)===requested)||null;}
 async function fetchArchivedRequested(){
  if(!detail)return null;
  try{
   const response=await fetch(ARCHIVE_URL+(ARCHIVE_URL.includes('?')?'&':'?')+'_='+Date.now(),{cache:'no-store',credentials:'omit'});
   if(!response.ok)return null;
   const archived=readNews(await response.text());
   return findRequested(archived);
  }catch{return null;}
 }
 // Preserve all supplied editorial text as plain text, never as executable HTML.
 // Only remove an exact repeated lead at the beginning of the body.
 function editorialParagraphs(item){
  const split=text=>(text||'').split(/\r?\n\s*\r?\n/).map(p=>p.trim()).filter(Boolean);
  const summary=split(item.summary),body=split(item.body);
  const comparable=text=>text.replace(/\s+/g,' ').trim();
  const repeated=summary.length&&body.length>=summary.length&&summary.every((p,i)=>comparable(p)===comparable(body[i]));
  return [...summary,...(repeated?body.slice(summary.length):body)];
 }
 function renderDetail(news){
  const item=findRequested(news);detail.replaceChildren();
  if(!item){
   if(!detailLookupSettled){if(status){status.hidden=false;status.textContent='Cargando noticia…';}return;}
   if(status){status.textContent='';status.hidden=true;}
   detail.append(element('h1','','Noticia no disponible'),element('p','','La noticia no está en la última versión disponible de la planilla.'));document.title='Noticia no disponible | RanaSports';const permanentExclusion=!requestedArticleId()||REVOKED_ARTICLE_IDS.has(requestedArticleId());document.querySelector('meta[name="robots"]')?.setAttribute('content',permanentExclusion?'noindex,follow':'index,follow');document.querySelector('#articleSchema')?.remove();return;
  }
  detailLookupSettled=true;
  if(status){status.textContent='';status.hidden=true;}
  const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':'badge-site'),item.sport));const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);
  const header=element('header','article-header'),heading=element('h1','',item.title);heading.id='articleTitle';
  const authorInfo=element('p','article-meta');
  const ranaGolLink=link('https://www.youtube.com/@RanaMatiusTV','@RanaSports');
  ranaGolLink.title='Rana Gol en YouTube';ranaGolLink.setAttribute('aria-label','Rana Gol, canal de YouTube');
  authorInfo.append(document.createTextNode('Redacción '),ranaGolLink);
  header.append(meta,heading,authorInfo);detail.append(header);appendArticlePhoto(item);
  document.querySelector('meta[name="author"]')?.setAttribute('content','Redacción RanaSports');
  const paragraphs=editorialParagraphs(item),articleText=paragraphs.join('\n\n');
  const content=element('div','article-body');paragraphs.forEach((text,index)=>content.append(element('p',index===0?'article-summary':'article-paragraph',text)));
  const embedURLs=[item.video,item.video2].filter((url,i,all)=>url&&url!==item.image&&all.indexOf(url)===i);
  for(const url of embedURLs){const embedHost=element('div','article-embed-entry');if(renderEmbed(embedHost,url))content.append(embedHost);}
  if(item.extraImage&&item.extraImage!==item.image&&item.extraImage!==item.video)renderSupplementalImage(content,item.extraImage);if(item.category==='f1'){const p=element('p');p.append(link('https://www.youtube.com/@RanaF1TV','🏎️ YouTube Rana F1','ghost-btn'));content.append(p);}detail.append(content);
  const footer=element('footer','article-sources');
  if(item.source||item.sourceURL){const p=element('p','','Fuente: ');p.append(item.sourceURL?link(item.sourceURL,item.source||'Consultar fuente original'):document.createTextNode(item.source));footer.append(p);}
  if(item.note&&item.note!==articleURL(item)&&item.note!==item.sourceURL){const p=element('p');p.append(link(item.note,'Consultar la nota enlazada'));footer.append(p);}
  const editorial=element('p');editorial.append(link(new URL('legal/politica-editorial.html',siteBase).href,'Política editorial'),' · ',link(new URL('legal/contacto.html',siteBase).href,'Solicitar una corrección'));footer.append(editorial);detail.append(footer);
  document.title=item.title+' | RanaSports';const canonical=articleURL(item);const canon=document.querySelector('link[rel="canonical"]');if(canon)canon.href=canonical;document.querySelector('meta[name="robots"]')?.setAttribute('content','index,follow');
  const socialImage=fallbackVisualCandidates(item)[0]||new URL('assets/icon-512.png',siteBase).href;
  const values={'description':item.summary.slice(0,160),'og:title':document.title,'og:description':item.summary.slice(0,160),'og:url':canonical,'og:image':socialImage};for(const [k,v] of Object.entries(values)){const q=k.startsWith('og:')?`meta[property="${k}"]`:`meta[name="${k}"]`;const n=document.querySelector(q);if(n)n.content=v;}
  let schema=document.querySelector('#articleSchema');if(!schema){schema=element('script');schema.id='articleSchema';schema.type='application/ld+json';document.head.append(schema);}schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:item.title,description:item.summary.slice(0,160),datePublished:new Date(item.date).toISOString(),articleBody:articleText,articleSection:item.sport,inLanguage:'es-AR',mainEntityOfPage:{'@type':'WebPage','@id':canonical},url:canonical,author:{'@type':'Organization',name:'RanaSports',url:new URL('legal/acerca-de.html',siteBase).href},publisher:{'@type':'Organization',name:'RanaSports'},image:socialImage,...(item.sourceURL?{citation:item.sourceURL}:{})});
 }
 function matchesSearch(item,query){
  if(!query)return true;
  return normalize([item.title,item.summary,item.sport,item.source].filter(Boolean).join(' ')).includes(query);
 }
 function mountLoadMore(total){
  document.querySelector('#newsLoadMore')?.remove();loadMoreObserver?.disconnect();loadMoreObserver=null;
  if(!grid||renderLimit>=total)return;
  const more=element('button','ghost-btn news-load-more','Cargar más noticias');more.id='newsLoadMore';more.type='button';
  const load=()=>{renderLimit=Math.min(total,renderLimit+RENDER_PAGE_SIZE);render(currentNews,true);};
  more.addEventListener('click',load);
  grid.insertAdjacentElement('afterend',more);
  if('IntersectionObserver' in window){
   loadMoreObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))load();},{rootMargin:'300px 0px'});
   loadMoreObserver.observe(more);
  }
 }
 let historicalFootballNews=null,footballArchiveRequest=null,footballArchiveUnavailable=false;
 function footballArchiveRoute(){
  const section=decodeURIComponent(location.hash.slice(1));
  return section==='futbol'||section==='seleccion'||section==='seleccion-mayor'||section==='independiente'||section.startsWith('club:')||section.startsWith('torneo:')||section.startsWith('seleccion-sub-');
 }
 function fetchFootballArchive(){
  if(historicalFootballNews||footballArchiveRequest||footballArchiveUnavailable)return;
  footballArchiveRequest=fetch(ARCHIVE_URL,{cache:'no-cache',credentials:'omit'})
   .then(response=>{if(!response.ok)throw Error('Archivo no disponible');return response.text();})
   .then(text=>{
    const all=readNews(text);
    if(!all.length)throw Error('Archivo sin noticias');
    historicalFootballNews=all;
    if(!detail&&footballArchiveRoute())render(lastGoodNews.length?lastGoodNews:currentNews);
   })
   .catch(()=>{footballArchiveUnavailable=true;})
   .finally(()=>{footballArchiveRequest=null;});
 }
 function render(news,appendPage=false){
  if(!detail&&footballArchiveRoute()&&historicalFootballNews){
   const identity=item=>item.category+'|'+item.date+'|'+item.title;
   const seen=new Set(news.map(identity));
   news=[...news,...historicalFootballNews.filter(item=>!seen.has(identity(item)))];
  }
  news=news.filter(item=>!REVOKED_ARTICLE_IDS.has(articleToken(item))).sort((a,b)=>b.date-a.date);
  currentNews=news;
  if(detail){renderDetail(news);document.dispatchEvent(new Event('ranasports:news-updated'));return;}if(!grid)return;const fragment=document.createDocumentFragment();
  const query=normalize(searchInput?.value||'');
  const eventOnly=decodeURIComponent(location.hash.slice(1))==='suramericanos-2026';
  let filtered=eventOnly?news.filter(item=>item.isSuramericanos):news;
  const section=decodeURIComponent(location.hash.slice(1));
  if(section==='futbol')filtered=filtered.filter(item=>item.footballInfo.football);
  else if(section.startsWith('club:'))filtered=filtered.filter(item=>item.footballInfo.clubs.includes(section.slice(5)));
  else if(section.startsWith('torneo:'))filtered=filtered.filter(item=>item.footballInfo.tournaments.includes(section.slice(7)));
  else if(section==='seleccion'||section==='seleccion-mayor')filtered=filtered.filter(item=>item.footballInfo.selection==='mayor');
  else if(section==='independiente')filtered=filtered.filter(item=>item.footballInfo.clubs.includes('independiente'));
  else if(section.startsWith('seleccion-sub-'))filtered=filtered.filter(item=>item.footballInfo.selection==='sub-'+section.slice(14));
  if(!['','ultimas','agenda','en-vivo','futbol','seleccion','seleccion-mayor','independiente','suramericanos-2026'].includes(section)&&!section.startsWith('club:')&&!section.startsWith('torneo:')&&!section.startsWith('seleccion-sub-'))filtered=filtered.filter(item=>item.category===section||item.group===section);
  if(query)filtered=filtered.filter(item=>matchesSearch(item,query));
  // No adelantar destacadas antiguas: la portada se recorre solo por fecha y hora.
  const visibleNews=filtered.slice(0,renderLimit);
  // Al hacer scroll, conservar las tarjetas y sus imágenes ya renderizadas.
  const alreadyLoaded=appendPage?grid.querySelectorAll('.news-card').length:0;
  const canAppend=appendPage&&alreadyLoaded>0&&alreadyLoaded<visibleNews.length;
  (canAppend?visibleNews.slice(alreadyLoaded):visibleNews).forEach((item,offset)=>{
   const index=offset+(canAppend?alreadyLoaded:0);
   const card=element('article','news-card');card.dataset.category=item.group;card.dataset.sport=item.category;card.dataset.football=item.footballInfo.football?'1':'0';card.dataset.clubs=item.footballInfo.clubs.join(',');card.dataset.tournaments=item.footballInfo.tournaments.join(',');card.dataset.selection=item.footballInfo.selection;card.dataset.suramericanos=item.isSuramericanos?'1':'0';card.dataset.featured=item.featured?'1':'0';const body=element('div','card-body');
   {const candidates=fallbackVisualCandidates(item),primary=candidates.shift()||'';if(primary){const visual=link(articleURL(item),'','card-visual news-image'),img=element('img');img.alt=item.title;img.width=800;img.height=450;img.loading=index<4?'eager':'lazy';if(index<2)img.fetchPriority='high';img.decoding='async';img.referrerPolicy='no-referrer';imageWithFallback(img,primary,candidates,()=>{visual.remove();queueMicrotask(()=>document.dispatchEvent(new Event('ranasports:news-updated')));});visual.append(img);card.append(visual);}else{queueMicrotask(()=>document.dispatchEvent(new Event('ranasports:news-updated')));}}
   const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':item.category==='agenda'?'badge-agenda':'badge-site'),item.sport));const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);body.append(meta);const heading=element('h3');heading.append(link(articleURL(item),item.title));body.append(heading,element('p','news-excerpt',item.summary));const actions=element('div','hero-actions');actions.append(link(articleURL(item),'Leer →','read-more'));body.append(actions);card.append(body);fragment.append(card);});
  if(canAppend)grid.append(fragment);else grid.replaceChildren(fragment);mountLoadMore(filtered.length);document.dispatchEvent(new Event('ranasports:news-updated'));if(footballArchiveRoute()&&!historicalFootballNews)fetchFootballArchive();
 }
 // El refresco de hash se realiza en el listener común junto al buscador.
 let snapshot=false,busy=false;
 let lastGoodNews=[];
 const newsIdentity=item=>item.category+'\n'+item.date+'\n'+item.title;
 const newsSignature=item=>[newsIdentity(item),item.summary,item.body,item.source,item.sourceURL,item.note,item.image,item.video,item.video2,item.extraImage,item.featured?'1':'0',item.photoCredit,item.imageStatus].join('\n');
 const sameNewsFeed=(a,b)=>a.length===b.length&&a.every((item,index)=>newsSignature(item)===newsSignature(b[index]));
 function protectAgainstFeedRegression(fresh,previous){
  if(!previous.length)return {news:fresh,regressed:false};
  const freshMax=fresh.reduce((max,item)=>Math.max(max,item.date||0),0);
  const previousMax=previous.reduce((max,item)=>Math.max(max,item.date||0),0);
  if(!freshMax||previousMax<=freshMax)return {news:fresh,regressed:false};
  const seen=new Set(fresh.map(newsIdentity));
  const protectedRecent=previous.filter(item=>(item.date||0)>freshMax&&!seen.has(newsIdentity(item)));
  return {news:[...fresh,...protectedRecent].sort((a,b)=>b.date-a.date),regressed:protectedRecent.length>0};
 }
 // Keep localStorage only as an emergency fallback. Do not paint it on startup:
 // the first visible homepage must already be the stable live feed.
 let cachedFallback=[];
 try{const cached=localStorage.getItem(CACHE_KEY);if(cached!==null&&!detail)cachedFallback=readNews(cached);}catch{}
 async function fetchFeed(baseURL,index,signal){
  try{
   const requestURL=baseURL+(baseURL.includes('?')?'&':'?')+'_='+Date.now();
   const response=await fetch(requestURL,{signal,cache:'no-store',credentials:'omit'});
   if(!response.ok)return null;
   const text=await response.text(),news=readNews(text);if(!news.length)return null;
   const max=news.reduce((value,item)=>Math.max(value,item.date||0),0);
   return {text,news,max,index};
  }catch{return null;}
 }
 async function refresh(){
  if(busy)return;busy=true;
  if(status){
   if(detail&&!detailLookupSettled){status.hidden=false;status.textContent='Cargando noticia…';}
   else if(!snapshot){status.hidden=false;status.textContent=detail?'Cargando noticia…':'Cargando noticias…';}
   else{status.textContent='';status.hidden=true;}
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
   // Fetch the live GitHub feed and Sheets in parallel. The homepage paints only
   // news-live.csv, so the user never sees cache -> GitHub -> Sheets redraws.
   // Sheets remains a background/fallback source and can refresh the stored backup,
   // but it never replaces an already-visible homepage during the same pass.
   const fastPromise=fetchFeed(CSV_URLS[0],0,controller.signal);
   const primaryPromise=fetchFeed(CSV_URLS[1],1,controller.signal);
   const fastAttempt=await fastPromise;
   if(fastAttempt&&!detail){
    // Give Sheets a short chance to answer before first paint. If GitHub's
    // news-live.csv is stale, prefer the newer Sheet so recent stories are never hidden.
    let primaryEarly=null;
    try{
     primaryEarly=await Promise.race([
      primaryPromise,
      new Promise(resolve=>setTimeout(()=>resolve(null),900))
     ]);
    }catch{}
    const firstAuthority=(primaryEarly&&primaryEarly.max>fastAttempt.max)?primaryEarly:fastAttempt;
    const firstNews=firstAuthority.news.sort((a,b)=>b.date-a.date);
    const changed=!snapshot||!sameNewsFeed(firstNews,lastGoodNews);
    if(changed)render(firstNews);
    lastGoodNews=firstNews;snapshot=true;
    try{localStorage.setItem(CACHE_KEY,firstAuthority.text);}catch{}
    if(status){status.textContent='';status.hidden=true;}

    const reconcilePrimary=primaryAttempt=>{
     if(!primaryAttempt)return;
     if(primaryAttempt.max>firstAuthority.max){
      const newer=primaryAttempt.news.sort((a,b)=>b.date-a.date);
      const protectedFeed=protectAgainstFeedRegression(newer,lastGoodNews);
      if(!sameNewsFeed(protectedFeed.news,lastGoodNews))render(protectedFeed.news);
      lastGoodNews=protectedFeed.news;snapshot=true;
      try{localStorage.setItem(CACHE_KEY,primaryAttempt.text);}catch{}
      return;
     }
     if(primaryAttempt.max>=firstAuthority.max){
      // Even when timestamps match, reconcile H so homepage/article photos agree.
      reconcileHomepageImages(primaryAttempt.news);
     }
    };
    if(primaryEarly)reconcilePrimary(primaryEarly);
    else primaryPromise.then(reconcilePrimary).catch(()=>{});
    return;
   }
   const primaryAttempt=await primaryPromise;
   let attempts=[fastAttempt,primaryAttempt].filter(Boolean);
   if(!primaryAttempt){
    const backups=await Promise.all(CSV_URLS.slice(2).map((baseURL,i)=>fetchFeed(baseURL,i+2,controller.signal)));
    attempts.push(...backups.filter(Boolean));
   }
   const preferred=detail?[1,0,2,3,4]:[0,1,2,3,4];
   const authority=attempts.sort((a,b)=>(b.max-a.max)||(preferred.indexOf(a.index)-preferred.indexOf(b.index)))[0];
   if(!authority){
    if(!detail&&cachedFallback.length){render(cachedFallback);lastGoodNews=cachedFallback;snapshot=true;if(status){status.textContent='';status.hidden=true;}return;}
    if(detail&&!findRequested(lastGoodNews)){const archived=await fetchArchivedRequested();if(archived){detailLookupSettled=true;render([archived]);lastGoodNews=[archived];snapshot=true;return;}}
    if(!snapshot)throw new Error('CSV no disponible');detailLookupSettled=true;if(detail)render(lastGoodNews);return;
   }
   // Enrich the chosen feed with missing media from the other live source.
   // This prevents a short Google/GitHub sync lag from hiding a newly-added embed.
   const enrichMedia=(base)=>{
    const alternates=attempts.filter(a=>a!==authority).map(a=>new Map(a.news.map(item=>[newsIdentity(item),item])));
    return base.map(item=>{
     const merged={...item};
     for(const map of alternates){
      const alt=map.get(newsIdentity(item));if(!alt)continue;
      if(!merged.video&&alt.video)merged.video=alt.video;
      if(!merged.image&&alt.image)merged.image=alt.image;
      if(!merged.extraImage&&alt.extraImage)merged.extraImage=alt.extraImage;
     }
     merged.hasYouTubeVideo=!!youtubeEmbedURL(merged.video);
     merged.hasFormula1Video=!!formula1EmbedURL(merged.video);
     merged.hasXPost=isXPost(merged.video);
     merged.hasVideo=!!merged.video&&!merged.hasXPost;
     merged.hasEmbed=!!merged.video;
     return merged;
    });
   };
   const fresh=enrichMedia(authority.news.sort((a,b)=>b.date-a.date));
   // Keep already-visible newer stories if any upstream source briefly lags.
   const protectedFeed=protectAgainstFeedRegression(fresh,lastGoodNews);
   let news=protectedFeed.news;
   if(detail&&!findRequested(news)){const archived=await fetchArchivedRequested();if(archived)news=[archived];}
   detailLookupSettled=true;
   const changed=!snapshot||!sameNewsFeed(news,lastGoodNews);
   if(changed)render(news);
   lastGoodNews=news;snapshot=true;
   if(!protectedFeed.regressed){try{localStorage.setItem(CACHE_KEY,authority.text);}catch{}}
   if(status){status.textContent=protectedFeed.regressed?'Sincronizando: se conservan las noticias más nuevas mientras Google actualiza la planilla.':'';status.hidden=!protectedFeed.regressed;}
  }catch{
   if(status)status.textContent=snapshot?'':'No se pudieron cargar las noticias. Reintentaremos al recuperar la conexión.';
   if(status&&snapshot)status.hidden=true;
  }finally{clearTimeout(timeout);busy=false;}
 }
 searchInput?.addEventListener('input',()=>{renderLimit=INITIAL_RENDER_LIMIT;if(currentNews.length)render(currentNews);});
 window.addEventListener('hashchange',()=>{renderLimit=INITIAL_RENDER_LIMIT;if(lastGoodNews.length||currentNews.length)render(lastGoodNews.length?lastGoodNews:currentNews);});
 // Enlaces cortos: la nota está incluida en su HTML, sin descargar el feed completo.
 // Enlaces antiguos: mostrar una copia local si existe y buscar solo las noticias del día.
 function showFastArticle(csvText){
  try{
   const found=findRequested(readNews(csvText));
   if(!found)return false;
   if(!snapshot||!sameNewsFeed([found],lastGoodNews))render([found]);
   lastGoodNews=[found];snapshot=true;detailLookupSettled=true;
   return true;
  }catch{return false;}
 }
 function requestedLocalDay(){
  try{
   const token=requestedArticleId();
   const plain=atob(token.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-token.length%4)%4));
   const bytes=Uint8Array.from(plain,c=>c.charCodeAt(0));
   const identity=JSON.parse(new TextDecoder().decode(bytes));
   const when=Number(identity?.[1]);
   if(!Number.isFinite(when)||when<Date.UTC(2015,0,1))return '';
   return new Date(when-3*60*60*1000).toISOString().slice(0,10);
  }catch{return '';}
 }
 if(detail){
  // Show bundled or cached article immediately, but always reconcile with live Sheets.
  // A static article/day CSV can predate newly written K video embeds.
  const inlineFound=typeof window.RS_ARTICLE_CSV==='string'&&showFastArticle(window.RS_ARTICLE_CSV);
  if(!inlineFound)try{const prior=localStorage.getItem(CACHE_KEY);if(prior)showFastArticle(prior);}catch{}
  (async()=>{
   if(!inlineFound){
    const day=requestedLocalDay();
    if(day){
     try{
      const oneDay=new URL('assets/news-days/'+day+'.csv',siteBase);
      const response=await fetch(oneDay.href,{cache:'no-store',credentials:'omit'});
      if(response.ok)showFastArticle(await response.text());
     }catch{}
    }
   }
   // Always refresh after the fast article, even when it was found in bundled CSV.
   // This fetch prefers Sheets on equal timestamps and picks up newly added K links.
   await refresh();
  })();
  window.addEventListener('online',refresh);
 }else{
  refresh();window.addEventListener('online',refresh);
  setInterval(()=>{if(document.visibilityState==='visible')refresh();},60*1000);
 }
})();
