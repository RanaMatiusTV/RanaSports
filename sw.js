const PREFIX = 'ranasports-' + self.registration.scope;
const CACHE = PREFIX + 'v9';
const CORE = ['./', './index.html', './noticia.html', './assets/styles.css', './assets/redesign.css', './assets/app.js', './assets/navigation.js', './assets/highlights.js', './assets/trends.json', './assets/news-feed.js', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './manifest.webmanifest', './noticias/bienvenidos.html', './noticias/agenda-deportiva.html', './noticias/rana-f1.html', './legal/acerca-de.html', './legal/contacto.html', './legal/privacidad.html'];
const coreURLs = new Set(CORE.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url = new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 url.search='';
 if(!coreURLs.has(url.href))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try {const response=await fetch(event.request);if(response.ok && response.type==='basic')event.waitUntil(cache.put(url.href,response.clone()));return response;}
  catch {const cached=await cache.match(url.href);return cached || Response.error();}
 })());
});
