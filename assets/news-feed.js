/* CSV público de RanaSports. Sin dependencias ni interpretación de HTML remoto. */
(() => {
 const grid = document.querySelector('#newsGrid');
 const detail = document.querySelector('#newsDetail');
 if (!grid && !detail) return;
 const siteBase = new URL('../', document.querySelector('script[src$="assets/news-feed.js"]').src);
 const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
 const CACHE_KEY = 'ranasports-news-csv-v1:' + siteBase.pathname;
 const status = document.querySelector('#newsStatus');
 const categories = {independiente:'Independiente',futbol:'Fútbol',f1:'F1',seleccion:'Selección',otros:'Otros deportes',agenda:'Agenda'};
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
 function readNews(text) {
  const [first,...rows]=parseCSV(text);
  if(!first)throw new Error('CSV sin encabezados');
  const keys=first.map(normalize);
  if(!headers.every(key=>keys.includes(key)))throw new Error('Encabezados inválidos');
  return rows.flatMap(values=>{
   if(values.length!==keys.length)return [];
   const row=Object.fromEntries(keys.map((key,index)=>[key,values[index].trim()]));
   if(normalize(row.publicar)!=='si')return [];
   let category=normalize(row.categoria);
   category=({'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol'})[category]||category;
   const date=timestamp(row.fecha,row.hora);
   if(!categories[category]||!row.titulo||!row.resumen||date===null)return [];
   return [{category,date,title:row.titulo,summary:row.resumen,note:safeURL(row['url nota']),image:safeURL(row['url imagen']),source:row.fuente,sourceURL:safeURL(row['url fuente']),video:safeURL(row['url video'])}];
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
  const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':'badge-site'),categories[item.category]));
  const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);
  detail.append(meta,element('h1','',item.title),element('p','article-meta','Creado por @RanaMatiusTV'));
  if(item.image){const image=element('img','article-image');image.src=item.image;image.alt=item.title;image.width=800;image.height=450;image.decoding='async';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove(),{once:true});detail.append(image);}
  const content=element('div','article-body');content.append(element('p','article-summary',item.summary));
  if(item.source||item.sourceURL){const source=element('p','news-source','Fuente: ');source.append(item.sourceURL?link(item.sourceURL,item.source||new URL(item.sourceURL).hostname,'read-more'):document.createTextNode(item.source));content.append(source);}
  if(item.video)content.append(link(item.video,'▶ Ver video','ghost-btn'));
  if(item.category==='f1'){const paragraph=element('p');paragraph.append(link('https://www.youtube.com/@RanaF1TV','🏎️ YouTube Rana F1','ghost-btn'));content.append(paragraph);}
  detail.append(content);
  document.title=item.title+' | RanaSports';
  const canonical=articleURL(item);
  document.querySelector('link[rel="canonical"]').href=canonical;
  document.querySelector('meta[name="robots"]').content='index,follow';
  const values={'description':item.summary.slice(0,160),'og:title':document.title,'og:description':item.summary.slice(0,160),'og:url':canonical,'og:image':item.image||new URL('assets/icon-512.png',siteBase).href};
  for(const [key,value] of Object.entries(values))document.querySelector('meta['+(key.startsWith('og:')?'property':'name')+'="'+key+'"]').content=value;
  let schema=document.querySelector('#articleSchema');if(!schema){schema=element('script');schema.id='articleSchema';schema.type='application/ld+json';document.head.append(schema);}
  schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:item.title,datePublished:new Date(item.date).toISOString(),articleBody:item.summary,articleSection:categories[item.category],url:canonical,author:{'@type':'Person',name:'@RanaMatiusTV'},publisher:{'@type':'Organization',name:'RanaSports'},...(item.image?{image:item.image}:{})});
 }
 function render(news) {
  if(detail){renderDetail(news);return;}
  const fragment=document.createDocumentFragment();
  news.forEach(item=>{
   const card=element('article','news-card');card.dataset.category=item.category;
   const body=element('div','card-body');
   if(item.image){
    const visual=link(articleURL(item),'','card-visual news-image');
    const img=element('img');img.src=item.image;img.alt=item.title;img.width=800;img.height=450;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>visual.remove(),{once:true});visual.append(img);card.append(visual);
   }
   const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':item.category==='agenda'?'badge-agenda':'badge-site'),categories[item.category]));
   const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);body.append(meta);
   const heading=element('h3');heading.append(link(articleURL(item),item.title));body.append(heading,element('p','news-excerpt',item.summary));
   if(item.source||item.sourceURL){const source=element('p','news-source');source.append(document.createTextNode('Fuente: '));source.append(item.sourceURL?link(item.sourceURL,item.source||new URL(item.sourceURL).hostname,'read-more'):document.createTextNode(item.source));body.append(source);}
   const actions=element('div','hero-actions');
   actions.append(link(articleURL(item),'Leer →','read-more'));
   if(item.video)actions.append(link(item.video,'▶ Ver video','ghost-btn'));
   if(actions.childElementCount)body.append(actions);
   card.append(body);fragment.append(card);
  });
  grid.replaceChildren(fragment);
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
