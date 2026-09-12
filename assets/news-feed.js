/* CSV público de RanaSports. Las imágenes sociales se muestran como FOTO SOLA, nunca como post completo. */
(() => {
 const grid=document.querySelector('#newsGrid');
 const detail=document.querySelector('#newsDetail');
 if(!grid&&!detail&&!document.querySelector('.dynamic-nav'))return;
 const script=document.querySelector('script[src*="assets/news-feed.js"]');
 const siteBase=new URL('../',script?.src||location.href);
 const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
 const CACHE_KEY='ranasports-news-csv-v16:'+siteBase.pathname;
 const status=document.querySelector('#newsStatus');
 const categories={independiente:'Independiente',futbol:'Fútbol',f1:'F1',seleccion:'Selección Argentina',agenda:'Agenda'};
 const normalize=v=>(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
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
  if(isXPost(url))return xPostToDirectImage(url);
  if(isInstagramPost(url))return '';
  return url;
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
 function videoEmbedURL(url){
  if(!url||isXPost(url))return '';
  return youtubeEmbedURL(url)||formula1EmbedURL(url)||safeURL(url);
 }
 function element(tag,className,text){const n=elementNode(tag);if(className)n.className=className;if(text!==undefined&&text!==null)n.textContent=text;return n;}
 function elementNode(tag){return document.createElement(tag);}
 function link(url,text,className){const n=element('a',className,text);n.href=url;if(new URL(url,location.href).origin!==location.origin){n.target='_blank';n.rel='noopener noreferrer';}return n;}
 function articleURL(item){
  const identity=JSON.stringify([item.category,item.date,item.title]);const bytes=new TextEncoder().encode(identity);
  const id=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const u=new URL('noticia.html',siteBase);u.searchParams.set('n',id);return u.href;
 }
 function renderVideo(container,url){
  const embed=videoEmbedURL(url);if(!embed||container.querySelector('.video-embed,.x-embed'))return false;
  const wrap=element('div','video-embed'),frame=element('iframe');frame.src=embed;frame.title='Contenido embebido de la noticia';frame.loading='lazy';frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';wrap.append(frame);container.append(wrap,link(url,'Abrir contenido original ↗','embed-fallback'));return true;
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
  const wrap=element('div','x-embed');wrap.dataset.tweetId=id;container.append(wrap);
  let started=false;
  withXWidgets(()=>{
   if(started||!wrap.isConnected||wrap.dataset.rendered==='1')return;
   started=true;wrap.dataset.rendered='1';wrap.replaceChildren();
   window.twttr.widgets.createTweet(id,wrap,{theme:'dark',dnt:true,align:'center'}).catch(()=>{wrap.replaceChildren(link(url,'Ver publicación en X'));});
  });
  return true;
 }
 function renderEmbed(container,url){
  if(container.querySelector('.video-embed,.x-embed'))return false;
  if(isXPost(url))return renderXPost(container,url);
  if(videoEmbedURL(url))return renderVideo(container,url);
  return false;
 }
 function injectMediaStyles(){
  if(document.getElementById('ranasports-media-styles-v7'))return;
  const s=element('style');s.id='ranasports-media-styles-v7';s.textContent=`
   .video-embed{position:relative;width:100%;aspect-ratio:16/9;margin:22px 0 8px;border-radius:10px;overflow:hidden;background:#000}
   .video-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
   .embed-fallback{display:inline-block;margin:0 0 22px;font-size:.9rem}
   .x-embed{width:100%;max-width:600px;min-height:120px;margin:22px auto}
   .x-embed .twitter-tweet{margin-left:auto!important;margin-right:auto!important}
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
  const available=new Map();rows.forEach(values=>{const sport=(values[keys.indexOf('categoria')]||'').trim();if(!sport)return;let key=normalize(sport);key=({'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol'})[key]||key;available.set(key,key==='seleccion'?'Selección Argentina':sport);});
  document.dispatchEvent(new CustomEvent('ranasports:categories',{detail:[...available]}));
  return rows.flatMap(values=>{
   if(values.length!==keys.length)return [];
   const row=Object.fromEntries(keys.map((k,i)=>[k,(values[i]||'').trim()]));if(normalize(row.publicar)!=='si')return [];
   let category=normalize(row.categoria);category=({'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol'})[category]||category;
   const date=timestamp(row.fecha,row.hora);if(!category||!row.titulo||!row.resumen||date===null)return [];
   const video=safeURL(row['url video']);const hasYouTubeVideo=!!youtubeEmbedURL(video),hasFormula1Video=!!formula1EmbedURL(video),hasXPost=isXPost(video),hasVideo=!!video&&!hasXPost,hasEmbed=!!video;
   return [{category,group:Object.hasOwn(categories,category)?category:'otros',sport:category==='seleccion'?'Selección Argentina':row.categoria,photoCredit:row['credito foto']||'',date,title:row.titulo,summary:row.resumen,note:safeURL(row['url nota']),image:imageURL(row['url imagen']),source:row.fuente,sourceURL:safeURL(row['url fuente']),video,hasYouTubeVideo,hasFormula1Video,hasVideo,hasXPost,hasEmbed}];
  }).sort((a,b)=>b.date-a.date);
 }
 function appendArticlePhoto(item){
  if(!item.image)return;
  const figure=element('figure','article-photo'),img=element('img','article-image');img.src=item.image;img.alt=item.title;img.width=800;img.height=450;img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>figure.remove(),{once:true});figure.append(img);if(item.photoCredit)figure.append(element('figcaption','photo-credit','Foto: '+item.photoCredit));detail.append(figure);
 }
 function renderDetail(news){
  const requested=new URL(location.href).searchParams.get('n');const item=news.find(x=>new URL(articleURL(x)).searchParams.get('n')===requested);detail.replaceChildren();
  if(!item){detail.append(element('h1','','Noticia no disponible'),element('p','','La noticia no está en la última versión disponible de la planilla.'));document.title='Noticia no disponible | RanaSports';document.querySelector('meta[name="robots"]')?.setAttribute('content','noindex,follow');document.querySelector('#articleSchema')?.remove();return;}
  const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':'badge-site'),item.sport));const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);
  detail.append(meta,element('h1','',item.title),element('p','article-meta','Creado por @RanaMatiusTV'));appendArticlePhoto(item);
  const content=element('div','article-body');content.append(element('p','article-summary',item.summary));if(item.hasEmbed)renderEmbed(content,item.video);if(item.category==='f1'){const p=element('p');p.append(link('https://www.youtube.com/@RanaF1TV','🏎️ YouTube Rana F1','ghost-btn'));content.append(p);}detail.append(content);
  document.title=item.title+' | RanaSports';const canonical=articleURL(item);const canon=document.querySelector('link[rel="canonical"]');if(canon)canon.href=canonical;document.querySelector('meta[name="robots"]')?.setAttribute('content','index,follow');
  const values={'description':item.summary.slice(0,160),'og:title':document.title,'og:description':item.summary.slice(0,160),'og:url':canonical,'og:image':item.image||new URL('assets/icon-512.png',siteBase).href};for(const [k,v] of Object.entries(values)){const q=k.startsWith('og:')?`meta[property="${k}"]`:`meta[name="${k}"]`;const n=document.querySelector(q);if(n)n.content=v;}
  let schema=document.querySelector('#articleSchema');if(!schema){schema=element('script');schema.id='articleSchema';schema.type='application/ld+json';document.head.append(schema);}schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:item.title,datePublished:new Date(item.date).toISOString(),articleBody:item.summary,articleSection:item.sport,url:canonical,author:{'@type':'Person',name:'@RanaMatiusTV'},publisher:{'@type':'Organization',name:'RanaSports'},...(item.image?{image:item.image}:{})});
 }
 function render(news){
  if(detail){renderDetail(news);return;}if(!grid)return;const fragment=document.createDocumentFragment();
  news.forEach(item=>{const card=element('article','news-card');card.dataset.category=item.group;card.dataset.sport=item.category;const body=element('div','card-body');
   if(item.image){const visual=link(articleURL(item),'','card-visual news-image'),img=element('img');img.src=item.image;img.alt=item.title;img.width=800;img.height=450;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>visual.remove(),{once:true});visual.append(img);card.append(visual);}
   const meta=element('div','meta');meta.append(element('span','badge '+(item.category==='f1'?'badge-f1':item.category==='agenda'?'badge-agenda':'badge-site'),item.sport));const time=element('time','',dateFormat.format(item.date)+' (ARG)');time.dateTime=new Date(item.date).toISOString();meta.append(time);body.append(meta);const heading=element('h3');heading.append(link(articleURL(item),item.title));body.append(heading,element('p','news-excerpt',item.summary));const actions=element('div','hero-actions');actions.append(link(articleURL(item),'Leer →','read-more'));if(item.hasEmbed)actions.append(element('span','video-present',item.hasVideo?'▶ VIDEO':'𝕏 POST'));body.append(actions);card.append(body);fragment.append(card);});
  grid.replaceChildren(fragment);document.dispatchEvent(new Event('ranasports:news-updated'));
 }
 let snapshot=false,busy=false;
 try{const cached=localStorage.getItem(CACHE_KEY);if(cached!==null){render(readNews(cached));snapshot=true;}}catch{}
 async function refresh(){
  if(busy)return;busy=true;if(status){status.hidden=false;status.textContent=snapshot?'Actualizando noticias…':'Cargando noticias…';}
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch(CSV_URL+(CSV_URL.includes('?')?'&':'?')+'_='+Date.now(),{signal:controller.signal,cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error('CSV no disponible');const text=await response.text(),news=readNews(text);render(news);snapshot=true;try{localStorage.setItem(CACHE_KEY,text);}catch{}if(status){status.textContent='';status.hidden=true;}}
  catch{if(status)status.textContent=snapshot?'Mostrando la última versión guardada. No se pudieron actualizar las noticias.':'No se pudieron cargar las noticias. Reintentaremos al recuperar la conexión.';}
  finally{clearTimeout(timeout);busy=false;}
 }
 refresh();window.addEventListener('online',refresh);setInterval(()=>{if(document.visibilityState==='visible')refresh();},5*60*1000);
})();