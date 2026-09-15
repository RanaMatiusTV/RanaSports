/* Recomendaciones automáticas para notas de RanaSports. */
(() => {
 const detail=document.querySelector('#newsDetail');
 if(!detail)return;
 const script=document.querySelector('script[src*="assets/recommended.js"]');
 const siteBase=new URL('../',script?.src||location.href);
 const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
 const normalize=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const STOP=new Set('a al algo ante bajo con contra como de del desde donde durante e el ella ellas ellos en entre era es esa ese eso esta este esto fue ha hay la las le les lo los mas me mi muy ni no o para pero por que se sin sobre su sus te tu un una unas uno unos y ya hoy ayer manana tras ante cada este esta estos estas ese esa esos esas aquel aquella aquellos aquellas ser son fue fueron sera partido partidos fecha juego equipo equipos futbol noticia noticias'.split(' '));

 function parseCSV(text){
  const rows=[];let row=[],field='',quoted=false;text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
   else if(c===','&&!quoted){row.push(field);field='';}
   else if((c==='\n'||c==='\r')&&!quoted){row.push(field);rows.push(row);row=[];field='';if(c==='\r'&&text[i+1]==='\n')i++;}
   else field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}return rows;
 }
 function timestamp(date,time){
  let m=(date||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);let d,mo,y;
  if(m){[,d,mo,y]=m;}else{m=(date||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;[,y,mo,d]=m;}
  const c=(time||'').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);if(!c)return null;
  const [h,mi,s]=[Number(c[1]),Number(c[2]),Number(c[3]||0)];
  return Date.UTC(Number(y),Number(mo)-1,Number(d),h+3,mi,s);
 }
 function safeURL(value){try{const u=new URL((value||'').trim(),location.href);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
 function isXPost(url){try{const u=new URL(url);return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname)&&/\/status\/\d+/.test(u.pathname);}catch{return false;}}
 function imageURL(value){
  const url=safeURL(value);if(!url)return '';
  if(!isXPost(url))return /(^|\.)instagram\.com$/.test(new URL(url).hostname)?'':url;
  try{const u=new URL(url),p=u.pathname.split('/').filter(Boolean),si=p.indexOf('status'),handle=p[0],id=p[si+1];return handle&&/^\d+$/.test(id||'')?`https://d.fxtwitter.com/${encodeURIComponent(handle)}/status/${id}/photo/1`:'';}catch{return '';}
 }
 function articleId(item){
  const identity=JSON.stringify([item.category,item.date,item.title]);
  const bytes=new TextEncoder().encode(identity);
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 }
 function articleURL(item){const u=new URL('noticia.html',siteBase);u.searchParams.set('n',articleId(item));return u.href;}
 function words(value){return new Set(normalize(value).replace(/[^a-z0-9ñ]+/g,' ').split(/\s+/).filter(word=>word.length>=3&&!STOP.has(word)));}
 function overlap(a,b){let total=0;for(const word of a)if(b.has(word))total++;return total;}
 function readNews(text){
  const [head,...rows]=parseCSV(text);if(!head)return [];
  const keys=head.map(normalize),at=name=>keys.indexOf(normalize(name));
  return rows.flatMap(values=>{
   if(normalize(values[at('Publicar')])!=='si')return [];
   let category=normalize(values[at('Categoría')]);category=({'otros deportes':'otros','formula 1':'f1','formula uno':'f1','futbol argentino':'futbol'})[category]||category;
   const date=timestamp(values[at('Fecha')],values[at('Hora')]),title=(values[at('Título')]||'').trim(),summary=(values[at('Resumen')]||'').trim();
   if(!category||date===null||!title||!summary)return [];
   return [{category,sport:(values[at('Categoría')]||category).trim(),date,title,summary,image:imageURL(values[at('URL imagen')])}];
  }).sort((a,b)=>b.date-a.date);
 }
 function score(current,candidate){
  const currentTitle=words(current.title),candidateTitle=words(candidate.title),currentAll=words(current.title+' '+current.summary),candidateAll=words(candidate.title+' '+candidate.summary);
  let points=0;
  if(candidate.category===current.category)points+=120;
  if(normalize(candidate.sport)===normalize(current.sport))points+=60;
  points+=overlap(currentTitle,candidateTitle)*28;
  points+=overlap(currentAll,candidateAll)*8;
  const ageDays=Math.max(0,(Date.now()-candidate.date)/86400000);points+=Math.max(0,18-Math.min(18,ageDays/2));
  return points;
 }
 function addStyles(){
  if(document.querySelector('#recommended-styles'))return;
  const style=document.createElement('style');style.id='recommended-styles';style.textContent=`
   .recommended-news{margin:34px 0 8px;padding-top:22px;border-top:1px solid var(--line,#2a313a)}
   .recommended-news h2{margin:0 0 16px;font-size:clamp(20px,3vw,27px);letter-spacing:-.3px}
   .recommended-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
   .recommended-card{min-width:0;border:1px solid var(--line,#2a313a);border-radius:10px;overflow:hidden;background:var(--panel,#10151c)}
   .recommended-card>a{display:block;color:inherit;text-decoration:none;height:100%}
   .recommended-image{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#171d24}
   .recommended-body{padding:12px 13px 14px}
   .recommended-sport{display:block;margin-bottom:7px;color:var(--muted,#9ba6b2);font-size:10px;font-weight:900;letter-spacing:.5px;text-transform:uppercase}
   .recommended-title{display:block;font-size:15px;line-height:1.22;font-weight:850;color:var(--text,#fff)}
   .recommended-card:hover .recommended-title{text-decoration:underline}
   @media(max-width:699px){.recommended-news{margin-top:28px}.recommended-grid{grid-template-columns:1fr}.recommended-card>a{display:grid;grid-template-columns:124px 1fr}.recommended-image{height:100%;aspect-ratio:auto;min-height:92px}.recommended-body{padding:11px 12px}.recommended-title{font-size:14px}}
  `;document.head.append(style);
 }
 function render(news){
  const requested=new URL(location.href).searchParams.get('n');if(!requested)return;
  const current=news.find(item=>articleId(item)===requested);if(!current)return;
  const picks=news.filter(item=>articleId(item)!==requested).map(item=>({item,score:score(current,item)})).sort((a,b)=>b.score-a.score||b.item.date-a.item.date).slice(0,3).map(x=>x.item);
  if(!picks.length)return;
  document.querySelector('.recommended-news')?.remove();addStyles();
  const section=document.createElement('section');section.className='recommended-news';section.setAttribute('aria-labelledby','recommendedTitle');
  const heading=document.createElement('h2');heading.id='recommendedTitle';heading.textContent='NOTAS RECOMENDADAS';
  const grid=document.createElement('div');grid.className='recommended-grid';
  for(const item of picks){
   const card=document.createElement('article');card.className='recommended-card';
   const a=document.createElement('a');a.href=articleURL(item);
   if(item.image){const img=document.createElement('img');img.className='recommended-image';img.src=item.image;img.alt='';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});a.append(img);}
   const body=document.createElement('span');body.className='recommended-body';
   const sport=document.createElement('span');sport.className='recommended-sport';sport.textContent=item.sport;
   const title=document.createElement('span');title.className='recommended-title';title.textContent=item.title;
   body.append(sport,title);a.append(body);card.append(a);grid.append(card);
  }
  section.append(heading,grid);
  const cta=document.querySelector('.article-cta');if(cta)cta.before(section);else detail.after(section);
 }
 fetch(CSV_URL+'&_recommended='+Date.now(),{cache:'no-store',credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}).then(readNews).then(render).catch(()=>{});
})();
