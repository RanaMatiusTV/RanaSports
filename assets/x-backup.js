(() => {
 const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub?output=csv';
 const normalize=v=>(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
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
 function isXPost(url){
  try{const u=new URL(url);return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname)&&/\/status\/\d+/.test(u.pathname);}catch{return false;}
 }
 function xPostId(url){
  try{const u=new URL(url);const p=u.pathname.split('/').filter(Boolean);const i=p.indexOf('status');return /^\d+$/.test(p[i+1]||'')?p[i+1]:'';}catch{return '';}
 }
 function ensureWidgets(){
  if(window.twttr?.widgets?.createTweet)return Promise.resolve();
  return new Promise(resolve=>{
   let s=document.querySelector('script[data-ranasports-x-backup-widgets]')||document.querySelector('script[src*="platform.twitter.com/widgets.js"]');
   if(!s){s=document.createElement('script');s.src='https://platform.twitter.com/widgets.js';s.async=true;s.charset='utf-8';s.dataset.ranasportsXBackupWidgets='1';document.body.append(s);}
   const done=()=>resolve();s.addEventListener('load',done,{once:true});setTimeout(done,3500);
  });
 }
 async function renderBackup(url){
  if(!isXPost(url))return;
  const body=document.querySelector('#newsDetail .article-body');if(!body||body.querySelector('.x-backup-block'))return;
  const id=xPostId(url);if(!id)return;
  const section=document.createElement('section');section.className='x-backup-block';
  const title=document.createElement('h3');title.textContent='PUBLICACIÓN EN X';title.style.margin='24px 0 10px';
  const wrap=document.createElement('div');wrap.className='x-embed';wrap.dataset.tweetId=id;
  section.append(title,wrap);body.append(section);
  await ensureWidgets();
  if(!window.twttr?.widgets?.createTweet){section.remove();return;}
  try{const rendered=await window.twttr.widgets.createTweet(id,wrap,{theme:'dark',dnt:true,align:'center'});if(!rendered)section.remove();}catch{section.remove();}
 }
 async function hydrate(){
  const h1=document.querySelector('#newsDetail h1');if(!h1)return false;
  try{
   const text=await fetch(CSV_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('CSV');return r.text();});
   const [head,...rows]=parseCSV(text);const keys=head.map(normalize);const ti=keys.indexOf('titulo'),xi=keys.indexOf('url x respaldo');
   if(ti<0||xi<0)return true;
   const wanted=normalize(h1.textContent);const row=rows.find(r=>normalize(r[ti])===wanted);const url=(row?.[xi]||'').trim();
   if(url)await renderBackup(url);
  }catch{}
  return true;
 }
 let tries=0;const timer=setInterval(async()=>{tries++;if(await hydrate()||tries>30)clearInterval(timer);},250);
})();
