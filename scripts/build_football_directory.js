// RanaSports — índice liviano del archivo completo; actualizado en la sincronización.
'use strict';
const fs=require('node:fs');
const frontend=fs.readFileSync('assets/news-feed.js','utf8');
const taxStart=frontend.indexOf(' const FOOTBALL_CLUBS=');
const taxEnd=frontend.indexOf(' const required=',taxStart);
const csvStart=frontend.indexOf(' function parseCSV(');
const csvEnd=frontend.indexOf(' function timestamp(',csvStart);
if([taxStart,taxEnd,csvStart,csvEnd].some(n=>n<0))throw Error('No se encontró la taxonomía de fútbol');
// Este código procede exclusivamente de un archivo confiable del mismo repositorio.
const fn="const normalize=v=>(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLowerCase();"+
 frontend.slice(taxStart,taxEnd)+frontend.slice(csvStart,csvEnd)+
 'return {classifyFootball,parseCSV,footballClubDefs,footballTournamentDefs};';
const {classifyFootball,parseCSV,footballClubDefs,footballTournamentDefs}=new Function(fn)();
const rows=parseCSV(fs.readFileSync('assets/news-archive.csv','utf8'));
if(!rows.length)throw Error('CSV de archivo vacío');
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const header=rows[0].map(normalized);
const index=name=>{const i=header.indexOf(name);if(i<0)throw Error('Falta columna '+name);return i;};
const pub=index('publicar'),category=index('categoria'),title=index('titulo'),summary=index('resumen');
const clubs=new Set(),tournaments=new Set(),youth=new Set(),footballCategories=new Set();
const fallbackLabels=new Map();
for(const row of rows.slice(1)){
 if(normalized(row[pub])!=='si')continue;
 const kind=String(row[category]||'').trim();
 const tax=classifyFootball(kind,row[title]||'',row[summary]||'');
 if(tax.football)footballCategories.add(normalized(kind));
 for(const key of tax.clubs)clubs.add(key);
 for(const key of tax.tournaments){
  tournaments.add(key);
  if(!fallbackLabels.has(key))fallbackLabels.set(key,kind);
 }
 if(tax.selection.startsWith('sub-'))youth.add(tax.selection);
}
const byName=(a,b)=>a[1].localeCompare(b[1],'es');
const clubList=footballClubDefs.filter(x=>clubs.has(x.key)).map(x=>[x.key,x.label]).sort(byName);
const tournamentList=[...tournaments].map(key=>{
 const def=footballTournamentDefs.find(x=>x.key===key);
 return [key,def?.label||fallbackLabels.get(key)||key];
}).sort(byName);
const youthList=[...youth].map(key=>[key,'Sub-'+key.slice(4)]).sort((a,b)=>Number(a[0].slice(4))-Number(b[0].slice(4)));
const directory={version:1,source:'assets/news-archive.csv',clubs:clubList,tournaments:tournamentList,youth:youthList,footballCategories:[...footballCategories].sort()};
if(!clubList.length||!tournamentList.length)throw Error('Directorio incompleto');
fs.writeFileSync('assets/football-directory.json',JSON.stringify(directory,null,2)+'\n','utf8');
console.log('Directorio: '+clubList.length+' clubes, '+tournamentList.length+' torneos, '+youthList.length+' categorías juveniles');
