'use strict';
// Preparación segura de la distribución editorial hacia X.
// Este archivo NO llama a Buffer, no programa ni publica tuits.
const fs=require('node:fs');
const cfg=JSON.parse(fs.readFileSync('config/x-distribution.json','utf8'));
function norm(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function csv(source){
 const out=[];let row=[],cell='',quote=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(c==='"'){if(quote&&source[i+1]==='"'){cell+='"';i++}else quote=!quote}
  else if(c===','&&!quote){row.push(cell);cell=''}
  else if((c==='\r'||c==='\n')&&!quote){row.push(cell);if(row.length>1)out.push(row);row=[];cell='';if(c==='\r'&&source[i+1]==='\n')i++}
  else cell+=c;
 }
 if(quote)throw Error('CSV corrupto: comillas sin cerrar');
 if(cell||row.length){row.push(cell);out.push(row)}return out;
}
function millis(d,t) {
 const a=String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 const b=String(t).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
 if(!a||!b)return NaN;
 const ms=Date.UTC(+a[3],+a[2]-1,+a[1],+b[1]+3,+b[2],+(b[3]||0));
 const check=new Date(ms-3*3600000);
 if(check.getUTCFullYear()!==+a[3]||check.getUTCMonth()!==+a[2]-1||check.getUTCDate()!==+a[1])return NaN;
 return ms;
}
function route(row) {
 const cat=norm(row.category),title=norm(row.title);
 // Nunca confundir Independiente Rivadavia con el CAI.
 if(cat==='independiente'||((/\bindependiente\b/.test(title)&&!/\bindependiente rivadavia\b/.test(title))&&/\bavellaneda\b|\bcai\b|\brojo\b/.test(title)))return 'main';
 if(/\bformula\s*[123]\b|\bf[123]\b/.test(cat)||/\bformula\s*[123]\b|\bf[123]\b/.test(title))return 'f1';
 return 'sports';
}
function score(row){
 const s=norm(row.title+' '+row.summary);
 let n=1;
 if(row.featured)n+=7;
 if(/\b(campeon|campeona|campeonato|campeones|final|titulo|ganador|ganadora)\b/.test(s))n+=5;
 if(/\b(ultima hora|oficial|confirmo|confirma|sancion|renuncia|lesion|fallecio|record|gol|abandon|pole)\b/.test(s))n+=3;
 if(/\b(messi|colapinto|seleccion argentina|independiente|river|boca|racing)\b/.test(s))n+=2;
 if(/\b(insolito|viral|bloopers|polemica|denuncio)\b/.test(s))n+=1;
 return n;
}
const rows=csv(fs.readFileSync(cfg.source,'utf8'));
const hdr=rows.shift().map(norm), col=k=>hdr.indexOf(norm(k));
for(const k of ['Publicar','Fecha','Hora','Categoría','Título','Resumen'])if(col(k)<0)throw Error('CSV sin columna '+k);
const now=Date.now(),maxAge=cfg.selection.maxAgeHours*3600000;
const candidates=rows.map((r,i)=>({
 sourceRow:i+2,date:millis(r[col('Fecha')],r[col('Hora')]),category:r[col('Categoría')],
 title:r[col('Título')],summary:r[col('Resumen')],featured:norm(r[col('Destacada')])==='si',published:norm(r[col('Publicar')])==='si'
})).filter(r=>r.published&&Number.isFinite(r.date)&&r.date<=now&&r.date>=now-maxAge&&r.title);
const seen=new Set(), grouped={main:[],f1:[],sports:[]};
for(const row of candidates){
 const key=norm(row.title);
 if(seen.has(key))continue;
 seen.add(key);
 row.account=route(row);row.score=score(row);grouped[row.account].push(row);
}
const plan={mode:'DRY_RUN_ONLY',automaticXPublishingEnabled:cfg.enabled,generatedAt:new Date().toISOString(),accounts:{}};
for(const [account,items]of Object.entries(grouped)){
 const policy=cfg.accounts[account];
 const ordered=items.sort((a,b)=>b.score-a.score||b.date-a.date);
 // Esta simulación jamás hace shareNow ni modifica estado.
 plan.accounts[account]={
  candidates:items.length,dailyCap:policy.dailyMax,hourlyCap:policy.hourlyMax,
  selected:ordered.slice(0,policy.dailyMax == null ? ordered.length : policy.dailyMax).map(x=>({sourceRow:x.sourceRow,score:x.score,date:new Date(x.date).toISOString(),title:x.title})),
  overflow:policy.dailyMax == null ? 0 : Math.max(0,ordered.length-policy.dailyMax)
 };
}
console.log(JSON.stringify(plan,null,2));
if(cfg.enabled||!cfg.dryRun)throw Error('Seguridad: el planificador solo admite modo pausado y sin publicación');