(() => {
 if(!document.querySelector('#newsGrid'))return;
 const url=new URL('trends.json',document.querySelector('script[src$="assets/highlights.js"]').src);
 const words=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/);
 let snapshot;
 window.ranaTrendScore=(card,now=Date.now())=>{
  if(!snapshot||snapshot.region!=='AR'||now-Date.parse(snapshot.updatedAt)>86400000||Date.parse(snapshot.updatedAt)>now)return 0;
  const date=Date.parse(card.querySelector('time')?.dateTime||'');if(!Number.isFinite(date)||date>now||now-date>86400000)return 0;
  const text=new Set(words((card.querySelector('h3')?.textContent||'')+' '+(card.querySelector('.news-excerpt')?.textContent||'')));
  return Math.max(0,...snapshot.trends.map(trend=>{
   const started=Date.parse(trend.startedAt);if(!Number.isFinite(started)||started>now||now-started>86400000)return 0;
   const terms=words(trend.query).filter(word=>word.length>2&&!['del','las','los','por','con','para','una','uno','the','and','vs'].includes(word));
   return terms.length&&terms.every(word=>text.has(word))?Number(trend.volume)||0:0;
  }));
 };
 async function refresh(){try{const response=await fetch(url,{cache:'no-cache'});if(!response.ok)return;const data=await response.json();if(!Array.isArray(data.trends))return;snapshot=data;document.dispatchEvent(new Event('ranasports:trends'));}catch{}}
 refresh();setInterval(refresh,15*60*1000);setInterval(()=>document.dispatchEvent(new Event('ranasports:trends')),60000);
})();
