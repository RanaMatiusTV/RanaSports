(() => {
 const dialog=document.querySelector('#breakingDialog');
 const button=document.querySelector('#breakingButton');if(!dialog||!button)return;
 let requested=false;
 button.addEventListener('click',()=>{
  dialog.showModal();
  if(requested)return;requested=true;
  const script=document.createElement('script');script.async=true;script.charset='utf-8';script.src='https://platform.twitter.com/widgets.js';
  script.onload=()=>window.twttr?.widgets?.load(document.querySelector('#breakingFeed'));
  script.onerror=()=>{document.querySelector('#xEmbedStatus').textContent='No se pudo cargar X. Usá VER MÁS EN X para abrir el perfil.';};
  document.head.append(script);
 });
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
})();

// Carga el marcador propio de RanaSports después de app.js para reemplazar el fallback.
(() => {
 const script=document.createElement('script');
 script.src='assets/live-scores.js?v=20260912-1';
 script.defer=true;
 document.head.append(script);
})();

// Separa los clubes de "Más Deportes" tanto en escritorio como en el menú móvil.
(() => {
 const normalize=value=>(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const clubs=new Set([
  'aldosivi','all boys','argentinos juniors','arsenal','atletico tucuman','banfield','barracas central','belgrano','boca','boca juniors',
  'central cordoba','chacarita','colon','defensa y justicia','deportivo riestra','estudiantes','estudiantes de la plata','estudiantes de rio cuarto',
  'ferro','gimnasia','gimnasia de la plata','gimnasia de mendoza','godoy cruz','huracan','independiente','independiente rivadavia','instituto',
  'lanus','newells','newells old boys','nueva chicago','platense','quilmes','racing','racing club','river','river plate','rosario central',
  'san lorenzo','san martin de san juan','san martin de tucuman','sarmiento','talleres','temperley','tigre','union','union de santa fe','velez','velez sarsfield'
 ]);
 const isClub=link=>{
  const label=normalize(link.textContent);
  if(clubs.has(label))return true;
  const key=normalize(decodeURIComponent((link.hash||'').replace(/^#/,''))).replace(/-/g,' ');
  return clubs.has(key);
 };
 function splitMenu(parent,mobile){
  if(!parent)return;
  const more=[...parent.querySelectorAll(':scope > details.nav-more')].find(details=>normalize(details.querySelector('summary')?.textContent)==='mas deportes');
  if(!more||parent.querySelector(':scope > details.nav-clubs'))return;
  const sportsList=more.querySelector('.nav-more-list');
  if(!sportsList)return;
  const clubLinks=[...sportsList.querySelectorAll(':scope > a')].filter(isClub);
  if(!clubLinks.length)return;

  const clubMenu=document.createElement('details');
  clubMenu.className='nav-more nav-clubs';
  const summary=document.createElement('summary');summary.textContent=mobile?'Clubes':'CLUBES';
  const clubList=document.createElement('div');clubList.className='nav-more-list';
  clubLinks.forEach(link=>clubList.append(link));
  clubMenu.append(summary,clubList);
  parent.insertBefore(clubMenu,more);
 }
 function splitMenus(){
  splitMenu(document.querySelector('.desktop-nav.dynamic-nav'),false);
  splitMenu(document.querySelector('#navDrawer .drawer-nav'),true);
 }
 document.addEventListener('ranasports:navigation-ready',splitMenus);
 queueMicrotask(splitMenus);
})();
