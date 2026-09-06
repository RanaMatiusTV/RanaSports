const cards = [...document.querySelectorAll('.news-card')];
const tabs = [...document.querySelectorAll('.tab')];
const search = document.querySelector('#searchInput');
const empty = document.querySelector('#emptyState');
const sections = {ultimas:'Últimas noticias', independiente:'Independiente', futbol:'Fútbol', f1:'F1', seleccion:'Selección', otros:'Otros deportes', agenda:'Agenda'};
let active = 'todas';
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
 if (empty) { empty.hidden = count > 0; empty.textContent = q ? 'No encontramos noticias para esa búsqueda.' : 'Todavía no hay noticias publicadas en ' + sections[key] + '. Podés consultar la Agenda Deportiva o ver las últimas noticias.'; }
}
function applyHashFilter() {
 if (!cards.length) return;
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
