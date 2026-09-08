let cards = [...document.querySelectorAll('#newsGrid .news-card')];
const tabs = [...document.querySelectorAll('.tab')];
const search = document.querySelector('#searchInput');
const empty = document.querySelector('#emptyState');
const sections = {ultimas:'Últimas noticias', independiente:'Independiente', futbol:'Fútbol', f1:'F1', seleccion:'Selección', otros:'Más deportes', agenda:'Agenda'};
let active = 'todas';
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
  const matches = (active === 'todas' || card.dataset.category === active) && normalize((card.dataset.search || '') + ' ' + card.textContent).includes(q);
  card.hidden = !matches;
  if (matches) count++;
 });
 tabs.forEach(tab => { const selected = tab.dataset.filter === active; tab.classList.toggle('active', selected); tab.setAttribute('aria-pressed', String(selected)); });
 const key = active === 'todas' ? 'ultimas' : active;
 const heading = document.querySelector('#feedTitle');
 if (heading) heading.textContent = sections[key];
 document.querySelectorAll('.desktop-nav a, .mobile-nav a').forEach(link => {const selected = link.getAttribute('href') === '#' + key || (key === 'ultimas' && link.getAttribute('href') === './');link.classList.toggle('active',selected); if(selected) link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
 const f1Channel = document.querySelector('#f1Channel');
 if (f1Channel) f1Channel.hidden = active !== 'f1';
 const presentations = document.querySelector('#presentations');
 if (presentations) presentations.hidden = active !== 'todas' || Boolean(q);
 if (empty) { empty.hidden = count > 0; empty.textContent = q ? 'No encontramos noticias para esa búsqueda.' : (active === 'todas' ? 'Todavía no hay noticias deportivas publicadas. Próximamente sumaremos información verificada.' : 'Todavía no hay noticias publicadas en ' + sections[key] + '. Podés consultar la Agenda Deportiva.'); }
}
function applyHashFilter() {
 if (!newsGrid) return;
 const key = location.hash.slice(1) || 'ultimas';
 if (!Object.hasOwn(sections, key)) return;
 active = key === 'ultimas' ? 'todas' : key;
 apply();
 if (location.hash) document.querySelector('#ultimas')?.scrollIntoView({behavior: 'instant'});
}
tabs.forEach(tab => tab.addEventListener('click', () => {const key = tab.dataset.filter === 'todas' ? 'ultimas' : tab.dataset.filter;if(location.hash === '#' + key) applyHashFilter(); else location.hash=key;}));
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
