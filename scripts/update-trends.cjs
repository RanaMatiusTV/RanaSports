// Read only the public Google Trends RSS. Never execute remote content.
const fs=require('node:fs/promises');
const url='https://trends.google.com/trending/rss?geo=AR';
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|apos);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"})[m]).replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)));
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Google Trends HTTP '+response.status);
 const xml=await response.text();if(!xml.includes('<rss'))throw Error('Invalid RSS');
 const now=Date.now();
 const trends=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([,item])=>{
  const text=tag=>decode(item.match(new RegExp('<'+tag+'>([\\s\\S]*?)</'+tag+'>'))?.[1]||'').trim();
  const query=text('title'),startedAt=text('pubDate');const date=Date.parse(startedAt);
  const raw=text('ht:approx_traffic').toUpperCase().replaceAll(',','');const volume=Number(raw.match(/[\d.]+/)?.[0]||0)*(raw.includes('M')?1000000:raw.includes('K')?1000:1);
  return query&&Number.isFinite(date)&&date<=now&&now-date<=86400000&&volume>0?[{query,startedAt:new Date(date).toISOString(),volume}]:[];
 });
 if(!xml.includes('<item>'))throw Error('RSS has no items; keep last valid snapshot');
 await fs.writeFile('assets/trends.json',JSON.stringify({region:'AR',source:url,updatedAt:new Date(now).toISOString(),trends},null,2)+'\n');console.log('Updated '+trends.length+' recent trends.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
