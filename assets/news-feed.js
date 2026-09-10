/* CSV público de RanaSports. Sin dependencias ni interpretación de HTML remoto. */
(() => {
 const grid = document.querySelector('#newsGrid');
 const detail = document.querySelector('#newsDetail');
 if (!grid && !detail && !document.querySelector('.dynamic-nav')) return;
 const siteBase = new URL('../', document.querySelector('script[src$="assets/news-feed.js"]').src);
 const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
 const CACHE_KEY = 'ranasports-news-csv-v1:' + siteBase.pathname;
 const status = document.querySelector('#newsStatus');
 const categories = {independiente:'Independiente',futbol:'Fútbol',f1:'F1',seleccion:'Selección Argentina',agenda:'Agenda'};
 const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const headers = ['Publicar','Fecha','Hora','Categoría','Título','Resumen','URL nota','URL imagen','Fuente','URL fuente','URL video'].map(normalize);
 const dateFormat = new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});

 function parseCSV(text) {
  const rows=[]; let row=[],field='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
   const c=text[i];
   if(c==='"') {if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
   else if(c===','&&!quoted){row.push(field);field='';}
   else if((c==='\n'||c==='\r')&&!quoted){row.push(field);rows.push(row);row=[];field='';if(c==='\r'&&text[i+1]==='\n')i++;}
   else field+=c;
  }
  if(quoted)throw new Error('CSV incompleto');
  if(field||row.length){row.push(field);rows.push(row);}
  return rows;
 }
 function timestamp(date,time) {
  let match=date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let day,month,year;
  if(match){[,day,month,year]=match;}else{match=date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!match)return null;[,year,month,day]=match;}
  const clock=time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!clock)return null;
  const [h,m,s]=[Number(clock[1]),Number(clock[2]),Number(clock[3]||0)];
  year=Number(year);month=Number(month);day=Number(day);
  if(year<2000||month<1||month>12||day<1||h>23||m>59||s>59)return null;
  const check=new Date(Date.UTC(year,month-1,day));
  if(check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return null;
  return Date.UTC(year,month-1,day,h+3,m,s); // Planilla en hora argentina (UTC−03:00).
 }
 function safeURL(value) {
  if(!value?.trim())return '';
  try{const url=new URL(value.trim(),location.href);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
 }
 function isXPost(url){
  try{const u=new URL(url);return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname)&&/\/status\/\d+/.test(u.pathname);}catch{return false;}
 }
 function isInstagramPost(url){
  try{const u=new URL(url);return /(^|\.)instagram\.com$/.test(u.hostname)&&/^\/(p|reel|reels)\//.test(u.pathname);}catch{return false;}
 }
 function youtubeEmbedURL(url){
  if(!url)return '';
  try{
   const u=new URL(url);let id='';
   if(u.hostname==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';
   else if(/(^|\.)youtube\.com$/.test(u.hostname)){
    if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
    else {const parts=u.pathname.split('/').filter(Boolean);if(['shorts','embed','live'].includes(parts[0]))id=parts[1]||'';}
   }
   return /^[A-Za-z0-9_-]{6,}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:'';
  }catch{return '';}
 }
 function loadScript(src,id){
  if(document.getElementById(id))return;
  const script=document.createElement('script');script.id=id;script.src=src;script.async=true;script.defer=true;document.head.append(script);
 }
 function socialEmbed(url,compact=false){
  const wrap=element('div','social-embed'+(compact?' social-embed-card':''));
  if(isXPost(url)){
   const quote=element('blockquote','twitter-tweet');quote.dataset.dnt='true';
   const anchor=link(url,'Ver publicación oficial');quote.append(anchor);wrap.append(quote);
   loadScript('https://platform.twitter.com/widgets.js','twitter-wjs');
   if(window.twttr?.widgets)setTimeout(()=>window.twttr.widgets.load(wrap),0);
   return wrap;
  }
  if(isInstagramPost(url)){
   const quote=element('blockquote','instagram-media');quote.dataset.instagramPermalink=url;quote.dataset.instagramVersion='14';
   quote.style.margin='0 auto';quote.style.minWidth='0';quote.style.width='100%';
   quote.append(link(url,'Ver publicación oficial'));wrap.append(quote);
   loadScript('https://www.instagram.com/embed.js','instagram-embed');
   if(window.instgrm?.Embeds)setTimeout(()=>window.instgrm.Embeds.process(),0);
   return wrap;
  }
  return null;
 }
 function injectMediaStyles(){
  if(document.getElementById('ranasports-media-styles'))return;
  const style=document.createElement('style');style.id='ranasports-media-styles';style.textContent=`
   .video-embed{position:relative;width:100%;aspect-ratio:16/9;margin:22px 0;border-radius:10px;overflow:hidden;background:#000}
   .video-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
   .social-embed{width:100%;margin:22px auto;overflow:hidden}
   .social-embed iframe{max-width:100%!important}
   .social-embed-card{margin:0;height:100%;min-height:220px;display:flex;align-items:flex-start;justify-content:center;background:#0f1419;overflow:hidden}
   .social-embed-card blockquote{transform-origin:top center;margin:0!important;max-width:100%!important}
   .card-visual.social-card{display:block;overflow:hidden;min-height:220px;background:#0f1419}
   @media(max-width:699px){.social-embed-card{min-height:260px}.card-visual.social-card{min-height:260px}}
  `;document.head.append(style);
 }
 injectMediaStyles();

 function readNews(text) {
  const [first,...rows]=parseCSV(text);
  if(!first)throw new Error('CSV sin encabezados');
  const keys=first.map(normalize);
  if(!headers.every(key=>keys.includes(key)))throw new Error('Encabezados inválidos');
  const available = new Map();
  rows.forEach(values=>{
   const sport=(values[keys.indexOf('categoria')]||'').trim();if(!sport)return;
   let key=normalize(sport);key=({'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol'})[key]||key;
   available.set(key,key==='seleccion'?'Selección Argentina':sport);
  });
  document.dispatchEvent(new CustomEvent('ranasports:categories',{detail:[...available]}));
  return rows.flatMap(values=>{
   if(values.length!==keys.length)return [];
   const row=Object.fromEntries(keys.map((key,index)=>[key,values[index].trim()]));
   if(normalize(row.publicar)!=='si')return [];
   let category=normalize(row.categoria);
   category=({'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol'})[category]||category;
   const date=timestamp(row.fecha,row.hora);
   if(!category||!row.titulo||!row.resumen||date===null)return [];
   return [{category,group:Object.hasOwn(categories,category)?category:'otros',sport:category==='seleccion'?'Selección Argentina':row.categoria,photoCredit:row['credito foto']||'',date,title:row.titulo,summary:row.resumen,note:safeURL(row['url nota']),image:safeURL(row['url imagen']),source:row.fuente,sourceURL:safeURL(row['url fuente']),video:safeURL(row['url video'])}];
  }).sort((a,b)=>b.date-a.date);
 }
 function element(tag,className,text) {const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
 function link(url,text,className) {const node=element('a',className,text);node.href=url;if(new URL(url).origin!==location.origin){node.target='_blank';node.rel='noopener noreferrer';}return node;}
 // La identidad no depende del orden de filas ni del Resumen. No requiere columnas nuevas.
 function articleURL(item) {
  const identity = JSON.stringify([item.category,item.date,item.title]);
  const bytes = new TextEncoder().encode(identity);
  const id = btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const url = new URL('noticia.html',siteBase);url.searchParams.set('n',id);return url.href;
 }
 function renderVideo(container,url){
  const embed=youtubeEmbedURL(url);
  if(embed){const wrap=element('div','video-embed');const frame=element('iframe');frame.src=embed;frame.title='Video de la noticia';frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;wrap.append(frame);container.append(wrap);return true;}
  return false;
 }
 function renderDetail(news) {
  const requested = new URL(location.href).searchParams.get('n');
  const item = news.find(item=>new URL(articleURL(item)).searchParams.get('n')===requested);
  detail.replaceChildren();
  if(!item){
   detail.append(element('h1','','Noticia no disponible'),element('p','','La noticia no está en la última versión disponible de la planilla.'));
   document.title='Noticia no disponible | RanaSports';
   document.querySelector('meta[name="robots"]').content='noindex,follow';
   document.querySelector('#articleSchema')?.remove();
   return;
  }
  const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':'badge-site'),item.sport));
  const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);
  detail.append(meta,element('h1','',item.title),element('p','article-meta','Creado por @RanaMatiusTV'));
  if(item.image){
   const social=socialEmbed(item.image,false);
   if(social){detail.append(social);}
   else {const figure=element('figure','article-photo');const image=element('img','article-image');image.src=item.image;image.alt=item.title;image.width=800;image.height=450;image.decoding='async';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>figure.remove(),{once:true});figure.append(image);if(item.photoCredit)figure.append(element('figcaption','photo-credit','Foto: '+item.photoCredit));detail.append(figure);}
  }
  const content=element('div','article-body');content.append(element('p','article-summary',item.summary));
  if(item.video&&!renderVideo(content,item.video))content.append(link(item.video,'▶ Ver video','ghost-btn'));
  if(item.category==='f1'){const paragraph=element('p');paragraph.append(link('https://www.youtube.com/@RanaF1TV','🏎️ YouTube Rana F1','ghost-btn'));content.append(paragraph);}
  detail.append(content);
  document.title=item.title+' | RanaSports';
  const canonical=articleURL(item);
  document.querySelector('link[rel="canonical"]').href=canonical;
  document.querySelector('meta[name="robots"]').content='index,follow';
  const ogImage=(item.image&&!isXPost(item.image)&&!isInstagramPost(item.image))?item.image:new URL('assets/icon-512.png',siteBase).href;
  const values={'description':item.summary.slice(0,160),'og:title':document.title,'og:description':item.summary.slice(0,160),'og:url':canonical,'og:image':ogImage};
  for(const [key,value] of Object.entries(values))document.querySelector('meta['+(key.startsWith('og:')?'property':'name')+'="'+key+'"]').content=value;
  let schema=document.querySelector('#articleSchema');if(!schema){schema=element('script');schema.id='articleSchema';schema.type='application/ld+json';document.head.append(schema);}
  schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:item.title,datePublished:new Date(item.date).toISOString(),articleBody:item.summary,articleSection:item.sport,url:canonical,author:{'@type':'Person',name:'@RanaMatiusTV'},publisher:{'@type':'Organization',name:'RanaSports'},...((item.image&&!isXPost(item.image)&&!isInstagramPost(item.image))?{image:item.image}:{})});
 }
 function render(news) {
  if(detail){renderDetail(news);return;}
  if(!grid)return;
  const fragment=document.createDocumentFragment();
  news.forEach(item=>{
   const card=element('article','news-card');card.dataset.category=item.group;card.dataset.sport=item.category;
   const body=element('div','card-body');
   if(item.image){
    const social=socialEmbed(item.image,true);
    if(social){const visual=element('div','card-visual social-card');visual.append(social);card.append(visual);}
    else {
     const visual=link(articleURL(item),'','card-visual news-image');
     const img=element('img');img.src=item.image;img.alt=item.title;img.width=800;img.height=450;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>visual.remove(),{once:true});visual.append(img);card.append(visual);
    }
   }
   const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':item.category==='agenda'?'badge-agenda':'badge-site'),item.sport));
   const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);body.append(meta);
   const heading=element('h3');heading.append(link(articleURL(item),item.title));body.append(heading,element('p','news-excerpt',item.summary));
   const actions=element('div','hero-actions');
   actions.append(link(articleURL(item),'Leer →','read-more'));
   if(item.video)actions.append(element('span','video-present','▶ VIDEO'));
   if(actions.childElementCount)body.append(actions);
   card.append(body);fragment.append(card);
  });
  grid.replaceChildren(fragment);
  if(window.twttr?.widgets)setTimeout(()=>window.twttr.widgets.load(grid),0);
  if(window.instgrm?.Embeds)setTimeout(()=>window.instgrm.Embeds.process(),0);
  document.dispatchEvent(new Event('ranasports:news-updated'));
 }
 let snapshot=false,busy=false;
 try{const cached=localStorage.getItem(CACHE_KEY);if(cached!==null){render(readNews(cached));snapshot=true;}}catch{/* Almacenamiento no disponible: la carga en línea sigue funcionando. */}
 async function refresh() {
  if(busy)return;busy=true;
  if(status){status.hidden=false;status.textContent=snapshot?'Actualizando noticias…':'Cargando noticias…';}
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try {
   const response=await fetch(CSV_URL,{signal:controller.signal,cache:'no-store',credentials:'omit'});
   if(!response.ok)throw new Error('CSV no disponible');
   const text=await response.text();const news=readNews(text);
   render(news);snapshot=true;
   try{localStorage.setItem(CACHE_KEY,text);}catch{/* El almacenamiento puede estar deshabilitado o lleno. */}
   if(status){status.textContent='';status.hidden=true;}
  }catch{
   if(status)status.textContent=snapshot?'Mostrando la última versión guardada. No se pudieron actualizar las noticias.':'No se pudieron cargar las noticias. Reintentaremos al recuperar la conexión.';
  }finally{clearTimeout(timeout);busy=false;}
 }
 refresh();
 window.addEventListener('online',refresh);
 setInterval(()=>{if(document.visibilityState==='visible')refresh();},5*60*1000);
})();
