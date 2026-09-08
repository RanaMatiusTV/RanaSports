let cards = [...document.querySelectorAll('#newsGrid .news-card')];
let tabs = [...document.querySelectorAll('.tab')];
const search = document.querySelector('#searchInput');
const empty = document.querySelector('#emptyState');
const sections = {ultimas:'Últimas noticias', independiente:'Independiente', futbol:'Fútbol', f1:'F1', seleccion:'Selección Argentina', otros:'Más deportes', agenda:'Agenda'};
let active = 'todas';
const liveModule=document.querySelector('#en-vivo');
const standingsModule=document.querySelector('#posiciones');
const moreTitle=document.querySelector('#moreNewsTitle');
function layoutNews() {
 if(!newsGrid || !liveModule)return;
 const seen=new Set();
 const visible=cards.filter(card=>{
  if(card.hidden)return false;const url=card.querySelector('h3 a')?.href;
  if(url&&seen.has(url)){card.hidden=true;return false;}if(url)seen.add(url);return true;
 }).sort((a,b)=>publishedAt(b)-publishedAt(a));
 const now=Date.now();
 const editorial=card=>{
  const title=normalize(card.querySelector('h3')?.textContent||'');
  const impact=/\b(final|campeon|campeona|titulo|clasifica|clasifico|eliminado|eliminada|record|retiro)\b/.test(title)?3:0;
  return impact+(['independiente','seleccion','f1'].includes(card.dataset.sport)?1:0);
 };
 const featured=active==='todas'&&!search?.value.trim()?visible.filter(card=>publishedAt(card)<=now&&now-publishedAt(card)<=86400000).map(card=>({card,score:Math.max(0,Number(card.dataset.trendScore)||window.ranaTrendScore?.(card)||0),editorial:editorial(card)})).sort((a,b)=>b.score-a.score||b.editorial-a.editorial||publishedAt(b.card)-publishedAt(a.card)).slice(0,3).map(item=>item.card):[];
 newsGrid.classList.toggle('no-featured',featured.length===0);newsGrid.classList.toggle('single-featured',featured.length===1);
 const selected=new Set(featured);const latest=visible.filter(card=>!selected.has(card));
 cards.forEach(card=>{card.classList.remove('lead-story','secondary-story','more-story');card.dataset.section=selected.has(card)?'featured':'latest';});
 featured.forEach((card,index)=>{card.classList.add(index===0?'lead-story':'secondary-story');card.style.setProperty('--rank',index);const image=card.querySelector('img');if(image){image.loading=index===0?'eager':'lazy';image.fetchPriority=index===0?'high':'auto';}});
 latest.forEach((card,index)=>{card.classList.add('more-story');card.style.setProperty('--more-row',Math.floor(index/3)+(featured.length?5:3));card.style.setProperty('--more-col',index%3+1);card.style.setProperty('--mobile-row',Math.floor(index/2)+(featured.length?6:4));card.style.setProperty('--mobile-col',(index%2)*3+1);});
 const notice=document.querySelector('#featuredNotice');if(notice)notice.hidden=featured.length>0||active!=='todas'||Boolean(search?.value.trim());
 moreTitle.hidden=false;moreTitle.textContent='ÚLTIMAS NOTICIAS';
 newsGrid.append(...featured,liveModule,standingsModule,moreTitle,...latest,...cards.filter(card=>card.hidden));
}
// Las tarjetas siguen siendo HTML estático, indexable y legible sin JavaScript.
const publishedAt = card => Date.parse(card.querySelector('time')?.dateTime || '') || 0;
cards.sort((a, b) => publishedAt(b) - publishedAt(a));
const newsGrid = document.querySelector('#newsGrid');
const dateFormat = new Intl.DateTimeFormat('es-AR', {timeZone:'America/Argentina/Buenos_Aires', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false});
cards.forEach(card => {
 newsGrid.append(card);
 const time = card.querySelector('time');
 if (time && publishedAt(card)) time.textContent = dateFormat.format(new Date(time.dateTime)) + ' (ARG)';
});
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function apply() {
 const q = normalize(search?.value.trim() || '');
 let count = 0;
 cards.forEach(card => {
  const matches = (active === 'todas' || (card.dataset.sport === active || (active==='otros' && card.dataset.category==='otros') || (!card.dataset.sport && card.dataset.category===active))) && normalize((card.dataset.search || '') + ' ' + card.textContent).includes(q);
  card.hidden = !matches;
  if (matches) count++;
 });
 tabs.forEach(tab => { const selected = tab.dataset.filter === active; tab.classList.toggle('active', selected); tab.setAttribute('aria-pressed', String(selected)); });
 layoutNews();
 const key = location.hash==='#en-vivo' ? 'en-vivo' : active === 'todas' ? 'ultimas' : active;
 const heading = document.querySelector('#feedTitle');
 if (heading) heading.textContent = active==='todas'&&!search?.value.trim()?'DESTACADAS':sections[key] || sections.ultimas;
 document.querySelectorAll('.desktop-nav a, .mobile-nav a').forEach(link => {const selected = link.getAttribute('href') === '#' + key || (key === 'ultimas' && link.getAttribute('href') === './');link.classList.toggle('active',selected); if(selected) link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
 const f1Channel = document.querySelector('#f1Channel');
 if (f1Channel) f1Channel.hidden = active !== 'f1';
 const presentations = document.querySelector('#presentations');
 if (presentations) presentations.hidden = active !== 'todas' || Boolean(q);
 if (empty) { empty.hidden = count > 0; empty.textContent = q ? 'No encontramos noticias para esa búsqueda.' : (active === 'todas' ? 'Todavía no hay noticias deportivas publicadas. Próximamente sumaremos información verificada.' : 'Todavía no hay noticias publicadas en ' + sections[key] + '. Podés consultar la Agenda Deportiva.'); }
}
function applyHashFilter() {
 if (!newsGrid) return;
 const key = decodeURIComponent(location.hash.slice(1)) || 'ultimas';
 if(key==='en-vivo'){active='todas';apply();liveModule?.scrollIntoView({behavior:'instant'});return;}
 if (!Object.hasOwn(sections, key)) return;
 active = key === 'ultimas' ? 'todas' : key;
 apply();
 if (location.hash) document.querySelector(key==='agenda'?'#agendaModule':'#ultimas')?.scrollIntoView({behavior: 'instant'});
}
document.querySelector('.category-tabs')?.addEventListener('click',event=>{
 const tab=event.target.closest('[data-filter]');if(!tab)return;
 const key=tab.dataset.filter==='todas'?'ultimas':tab.dataset.filter;
 if(decodeURIComponent(location.hash.slice(1))===key)applyHashFilter();else location.hash=encodeURIComponent(key);
});
document.addEventListener('ranasports:navigation-ready',()=>{tabs=[...document.querySelectorAll('.tab')];applyHashFilter();});
document.addEventListener('ranasports:categories',event=>{
 for(const [key,label] of event.detail)if(!['ultimas','en-vivo'].includes(key))sections[key]=label;
 tabs=[...document.querySelectorAll('.tab')];
 applyHashFilter();
});
document.addEventListener('ranasports:trends',apply);
search?.addEventListener('input', apply);
window.addEventListener('hashchange', applyHashFilter);
applyHashFilter();
document.addEventListener('ranasports:news-updated', () => {
 cards = [...document.querySelectorAll('#newsGrid .news-card')];
 apply();
});
let deferredPrompt = null;
const installButtons = [...document.querySelectorAll('#installBtn, #installBtn2')];
const dialog = document.querySelector('#installDialog');
const instructions = document.querySelector('#installInstructions');
window.addEventListener('beforeinstallprompt', event => {event.preventDefault();deferredPrompt = event;const button=document.querySelector('#installBtn');if(button) button.hidden=false;});
window.addEventListener('appinstalled', () => {deferredPrompt=null;installButtons.forEach(button=>button.hidden=true);});
async function installAction() {
 if (deferredPrompt) {const prompt=deferredPrompt;deferredPrompt=null;await prompt.prompt();await prompt.userChoice;const button=document.querySelector('#installBtn');if(button)button.hidden=true;return;}
 if (!dialog || !instructions) return;
 const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
 instructions.innerHTML = ios ? '<p>En Safari, tocá <b>Compartir</b>, elegí <b>Añadir a pantalla de inicio</b> y confirmá con <b>Añadir</b>.</p>' : '<p>En Chrome o Edge, abrí el menú del navegador y buscá <b>Instalar RanaSports</b> o <b>Añadir a pantalla principal</b>. La opción depende de tu navegador y dispositivo.</p>';
 dialog.showModal();
}
installButtons.forEach(button=>button.addEventListener('click',installAction));
document.querySelector('.dialog-close')?.addEventListener('click',()=>dialog?.close());
if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) installButtons.forEach(button=>button.hidden=true);
if ('serviceWorker' in navigator) {
 const script=document.querySelector('script[src$="assets/app.js"]');
 if(script) window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('../sw.js',script.src)).catch(error=>console.warn('No se pudo activar el modo sin conexión.',error)));
}

// En futuras notas, data-category="f1" habilita únicamente el canal especializado.
if (document.body.dataset.category === 'f1' && !document.querySelector('[data-f1-channel]')) {
 const article = document.querySelector('.article-body');
 if (article) {
  const paragraph = document.createElement('p');
  paragraph.dataset.f1Channel = '';
  const link = document.createElement('a');
  link.className = 'ghost-btn';
  link.href = 'https://www.youtube.com/@RanaF1TV';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = '🏎️ YouTube Rana F1';
  paragraph.append(link);
  article.prepend(paragraph);
 }
}
