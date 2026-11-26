/* Navigation only. The remaining sports are provided by the CSV. */
(() => {
 const nav=document.querySelector('.dynamic-nav');if(!nav)return;
 const navScript=document.querySelector('script[src*="assets/navigation.js"]');
 const base=new URL('../',navScript?.src||location.href);
 const home=Boolean(document.querySelector('#newsGrid'));
 const primary=[['ultimas','Noticias'],['f1','F1']];
 const drawer=document.createElement('dialog');drawer.id='navDrawer';drawer.className='nav-drawer';drawer.setAttribute('aria-label','Menú de navegación');
 const close=document.createElement('button');close.type='button';close.className='drawer-close ghost-btn';close.textContent='× Cerrar';
 const drawerNav=document.createElement('nav');drawerNav.className='drawer-nav';drawerNav.setAttribute('aria-label','Secciones');const drawerHeader=document.createElement('div');drawerHeader.className='rs-drawer-header';
 const drawerTitle=document.createElement('strong');drawerTitle.textContent='Explorá RanaSports';
 drawerHeader.append(drawerTitle,close);drawer.append(drawerHeader,drawerNav);document.body.append(drawer);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-menu-button ghost-btn';toggle.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg><span>Menú</span>';toggle.setAttribute('aria-label','Abrir menú');toggle.setAttribute('aria-controls','navDrawer');toggle.setAttribute('aria-expanded','false');document.querySelector('.header-inner')?.append(toggle);
 if(!document.querySelector('#rs-category-menu-style')){
  const style=document.createElement('style');
  style.id='rs-category-menu-style';
  style.textContent=`

   .site-header .header-inner .mobile-menu-button{display:inline-flex!important;align-items:center;justify-content:center;gap:7px;width:auto!important;min-width:76px!important;height:44px!important;min-height:44px!important;padding:0 10px!important;font-size:13px!important;line-height:1;border-radius:8px!important;flex:0 0 auto!important;margin-left:0!important}
   .site-header .header-inner .dynamic-nav{display:flex!important;order:10;flex:0 0 100%;width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap!important;gap:4px;scrollbar-width:none;border-top:1px solid var(--line);margin:0}
   .site-header .dynamic-nav::-webkit-scrollbar{display:none}
   .site-header .dynamic-nav>a{display:flex;align-items:center;justify-content:center;flex:1 0 auto;white-space:nowrap;min-height:44px;padding:8px 12px;font-size:13px;text-transform:none;line-height:1.25;border-bottom:3px solid transparent;border-radius:0}
   .site-header .dynamic-nav>a.active{background:transparent!important;color:var(--text)!important;border-bottom-color:var(--red)!important}
   .site-header .dynamic-nav>a:focus-visible,.nav-drawer button:focus-visible,.nav-drawer a:focus-visible,.nav-drawer summary:focus-visible,.mobile-menu-button:focus-visible{outline:2px solid var(--red);outline-offset:-3px}
   #navDrawer{position:fixed;inset:0 0 0 auto;margin:0 0 0 auto;width:min(100%,420px);max-width:100%;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;padding:0;border:0;border-left:1px solid var(--line);border-radius:0;background:var(--panel);color:var(--text);box-shadow:-12px 0 40px rgba(0,0,0,.3);overflow:auto;overscroll-behavior:contain}
   #navDrawer::backdrop{background:rgba(0,0,0,.52)}
   html:has(#navDrawer[open]){overflow:hidden}
   .rs-drawer-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(14px,env(safe-area-inset-top)) 16px 14px;background:var(--panel);border-bottom:1px solid var(--line)}
   .rs-drawer-header strong{font-size:19px;line-height:1.2}
   #navDrawer .drawer-close{display:inline-flex!important;min-height:44px;margin:0;padding:0 12px;font-size:14px}
   #navDrawer .drawer-nav{display:flex;flex-direction:column;padding:10px 16px max(20px,env(safe-area-inset-bottom));gap:3px}
   #navDrawer .drawer-nav a,#navDrawer .drawer-nav summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:10px 12px;color:var(--text)!important;text-decoration:none;font-size:15px;font-weight:650;border:0;border-radius:8px;white-space:normal;line-height:1.3;overflow-wrap:anywhere}
   #navDrawer .drawer-nav a:hover,#navDrawer .drawer-nav summary:hover,#navDrawer .drawer-nav a.active{background:var(--panel2)!important}
   #navDrawer .drawer-nav a.active{box-shadow:inset 3px 0 var(--red)}
   #navDrawer .drawer-nav summary{list-style:none;cursor:pointer}
   #navDrawer .drawer-nav summary::-webkit-details-marker{display:none}
   #navDrawer .drawer-nav summary::after{content:'';width:8px;height:8px;flex:0 0 8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);margin-right:4px}
   #navDrawer .drawer-nav details[open]>summary::after{transform:rotate(225deg)}
   #navDrawer .drawer-nav details{margin:0;padding:0;border:0}
   #navDrawer .drawer-nav .nav-more-list,#navDrawer .drawer-nav .nav-category-items{position:static;display:flex;flex-direction:column;gap:2px;min-width:0;max-height:none;overflow:visible;margin:0 0 4px 12px;padding:0 0 0 8px;border:0;border-left:2px solid var(--line);box-shadow:none;background:transparent}
   #navDrawer .drawer-nav .nav-category-items a,#navDrawer .drawer-nav .nav-category-group>summary{font-size:14px;font-weight:550}
   #navDrawer .drawer-nav .nav-see-all{font-weight:750!important}
   #navDrawer .drawer-nav .nav-group-empty{font-size:13px;padding:8px 10px;margin:0;color:var(--muted)}
   #navDrawer .drawer-nav .nav-utility-links{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-top:7px;padding-top:7px}
   @media(max-width:1049px){
    .site-header .header-inner{padding-bottom:0!important;gap:8px!important}
    .site-header .header-inner .rs-live-btn{display:none!important}
    .site-header .header-inner .dynamic-nav>a{padding:8px 10px;font-size:12px}
   }
   @media(max-width:699px){
    .site-header .header-inner .theme-toggle{height:44px!important;width:44px!important;min-width:44px!important;flex:0 0 44px!important}
    .site-header .header-inner .dynamic-nav>a{flex:1 0 auto;padding:8px 7px}
    .site-header .header-inner .dynamic-nav>a[href$="#otros"]{display:none}
    #navDrawer{width:min(100%,380px)}
   }
   @media(max-width:360px){.site-header .header-inner .dynamic-nav>a{font-size:11px;padding:8px 7px}}
   @media(prefers-reduced-motion:reduce){#navDrawer *{scroll-behavior:auto!important;transition:none!important}}
  `;
  document.head.append(style);
 }
 toggle.addEventListener('click',()=>{if(!drawer.open){drawer.showModal();toggle.setAttribute('aria-expanded','true');close.focus();}});close.addEventListener('click',()=>drawer.close());drawer.addEventListener('close',()=>{toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});});
 drawer.addEventListener('click',event=>{if(event.target===drawer){const r=drawer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)drawer.close();}});
 function anchor(key,label,mobile){const a=document.createElement('a');a.textContent=mobile?label:label.toUpperCase();a.href=home?'#'+encodeURIComponent(key):new URL('#'+encodeURIComponent(key),base).href;return a;}
 function prettyName(value){
  const original=String(value||'').trim();
  if(original!==original.toLocaleUpperCase('es-AR'))return original;
  return original.toLocaleLowerCase('es-AR')
   .replace(/(^|[\s/-])([a-záéíóúñ])/g,(_,sep,letter)=>sep+letter.toLocaleUpperCase('es-AR'))
   .replace(/\b(nba|ufc|uefa|fifa|f1|f2|f3)\b/gi,word=>word.toUpperCase());
 }

 let footballMenu={clubs:[],tournaments:[],youth:[],footballCategories:[]};
 let fullDirectory=null;
 function mergeFootballMenus(live,directory){
  const a=live||{},b=directory||{};
  const mergePairs=(kind)=>[...new Map([...(b[kind]||[]),...(a[kind]||[])].map(pair=>[pair[0],pair])).values()].sort((x,y)=>kind==='youth'?Number(x[0].slice(4))-Number(y[0].slice(4)):x[1].localeCompare(y[1],'es'));
  return {clubs:mergePairs('clubs'),tournaments:mergePairs('tournaments'),youth:mergePairs('youth'),footballCategories:[...new Set([...(a.footballCategories||[]),...(b.footballCategories||[])])]};
 }
 let latestCategories=[];
 let lastNavSignature='';
 function groupName(key){
  const text=key.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/(?:automovilismo|motogp|formula|karting|motociclismo)/.test(text))return 'motor';
  if(/(?:independiente|boca|river|racing|san.lorenzo|huracan|estudiantes|velez|banfield|argentinos|union|atletico.tucuman|rosario.central|futbol|futsal|liga|copa|libertadores|sudamericana|superclasico|ascenso|primera.nacional|federal.a|torneo|recopa|mundial.sub|mercado.internacional|champions|uefa|messi|maradona|reserva|seleccion|internacional)/.test(text))return 'futbol';
  return 'otros';
 }
 function makeGroup(label,items,hrefFor){
  const section=document.createElement('details');section.className='nav-category-group';
  const title=document.createElement('summary');title.textContent=label;
  const links=document.createElement('div');links.className='nav-category-items';
  for(const [key,name] of items)links.append(anchor(hrefFor(key),prettyName(name),true));
  if(!items.length){const empty=document.createElement('p');empty.className='nav-group-empty';empty.textContent='Sin noticias publicadas por ahora';links.append(empty);}
  section.append(title,links);return section;
 }
 function footballSection(mobile){
  const section=document.createElement('details');section.className='nav-more nav-football';
  const heading=document.createElement('summary');heading.textContent=mobile?'Fútbol':'FÚTBOL';
  const list=document.createElement('div');list.className='nav-more-list';
  const all=anchor('futbol','Todo el fútbol',true);all.className='nav-see-all';list.append(all);
  list.append(makeGroup('Clubes',footballMenu.clubs,key=>'club:'+key));
  list.append(makeGroup('Torneos',footballMenu.tournaments,key=>'torneo:'+key));
  list.append(anchor('seleccion-mayor','Selección Argentina',true));
  const youth=document.createElement('details');youth.className='nav-category-group nav-youth';
  const youthTitle=document.createElement('summary');youthTitle.textContent='Juveniles';
  const youthLinks=document.createElement('div');youthLinks.className='nav-category-items';
  for(const [key,label] of footballMenu.youth)youthLinks.append(anchor('seleccion-'+key,label,true));
  if(!footballMenu.youth.length){const p=document.createElement('p');p.className='nav-group-empty';p.textContent='Sin Sub publicadas por ahora';youthLinks.append(p);}
  youth.append(youthTitle,youthLinks);list.append(youth);
  section.append(heading,list);return section;
 }
 function build(entries){
  latestCategories=entries;
  const signature=JSON.stringify([entries,footballMenu]);
  if(signature===lastNavSignature)return;
  lastNavSignature=signature;
  const footballKeys=new Set(footballMenu.footballCategories);
  const extras=entries
   .filter(([key])=>!primary.some(([fixed])=>fixed===key)&&!['agenda','en-vivo','otros','futbol','seleccion'].includes(key)&&!footballKeys.has(key)&&groupName(key)!=='futbol')
   .sort((a,b)=>prettyName(a[1]).localeCompare(prettyName(b[1]),'es',{sensitivity:'base'}));
  nav.replaceChildren(...[['ultimas','Noticias'],['futbol','Fútbol'],['f1','F1'],['otros','Más deportes'],['agenda','Agenda'],['en-vivo','En vivo']].map(([key,label])=>anchor(key,label,true)));
  nav.hidden=false;
  for(const [parent,mobile] of [[drawerNav,true]]){
   const openGroups=new Set([...parent.querySelectorAll('details[open] > summary')].map(el=>el.textContent));
   parent.replaceChildren();
   parent.append(anchor('ultimas','Últimas noticias',mobile));
   parent.append(footballSection(mobile));
   parent.append(anchor('f1','F1',mobile));
   const more=document.createElement('details');more.className='nav-more';
   const summary=document.createElement('summary');summary.textContent=mobile?'Más deportes':'MÁS DEPORTES';
   const list=document.createElement('div');list.className='nav-more-list';
   const allSports=anchor('otros','Ver más deportes',true);allSports.className='nav-see-all';list.append(allSports);
   for(const [group,label] of [['motor','Automovilismo'],['otros','Otros deportes']]){
    const items=extras.filter(([key])=>groupName(key)===group);
    if(items.length)list.append(makeGroup(label,items,key=>key));
   }
   if(!extras.length){const p=document.createElement('p');p.className='nav-group-empty';p.textContent='Sin otras categorías publicadas';list.append(p);}
   more.append(summary,list);parent.append(more);
   if(mobile){
    const utilities=document.createElement('div');utilities.className='nav-utility-links';
    utilities.append(anchor('agenda','Agenda',true),anchor('en-vivo','En Vivo',true));parent.append(utilities);
   }
   for(const summary of parent.querySelectorAll('details > summary'))if(openGroups.has(summary.textContent))summary.parentElement.open=true;
  }
  document.dispatchEvent(new Event('ranasports:navigation-ready'));
 }
 document.addEventListener('ranasports:categories',event=>{build(event.detail);try{localStorage.setItem('ranasports-nav-categories:'+base.pathname,JSON.stringify(event.detail));}catch{}});
 document.addEventListener('ranasports:football-navigation',event=>{footballMenu=mergeFootballMenus(event.detail,fullDirectory);build(latestCategories);try{localStorage.setItem('ranasports-nav-football:'+base.pathname,JSON.stringify(footballMenu));}catch{}});
 drawerNav.addEventListener('toggle',event=>{const group=event.target;if(group.tagName==='DETAILS'&&group.open){for(const sibling of group.parentElement.children)if(sibling!==group&&sibling.tagName==='DETAILS')sibling.open=false;}},true);
 drawerNav.addEventListener('click',event=>{if(event.target.closest('a'))drawer.close();});
 let categories=[];try{categories=JSON.parse(localStorage.getItem('ranasports-nav-categories:'+base.pathname)||'[]');footballMenu=JSON.parse(localStorage.getItem('ranasports-nav-football:'+base.pathname)||'null')||footballMenu;}catch{}build(categories);
 fetch(new URL('assets/football-directory.json',base).href,{cache:'no-store'})
  .then(response=>response.ok?response.json():null)
  .then(data=>{if(!data||!Array.isArray(data.clubs)||!Array.isArray(data.tournaments))return;fullDirectory=data;footballMenu=mergeFootballMenus(footballMenu,data);build(latestCategories);document.dispatchEvent(new CustomEvent('ranasports:football-navigation',{detail:footballMenu}));})
  .catch(()=>{});
})();

// Mantiene el aviso legal compatible con contribuciones voluntarias al proyecto.
(() => {
 const notice=document.querySelector('.rights-notice');
 if(!notice)return;
 notice.innerHTML='<p style="margin:0 0 7px"><strong>Aviso legal y revisión de contenido.</strong> RanaSports es un proyecto personal e informativo de recopilación y organización de actualidad deportiva. Su acceso es gratuito. Las contribuciones voluntarias, si las hubiera, están destinadas al mantenimiento del proyecto. Las imágenes, videos y otros contenidos de terceros pertenecen a sus respectivos titulares.</p><p style="margin:0">Si sos titular de algún contenido publicado y querés solicitar su revisión, acreditá la titularidad y escribí a <a href="mailto:ranamatius@gmail.com?subject=Solicitud%20de%20revisi%C3%B3n%20de%20contenido%20-%20RanaSports">ranamatius@gmail.com</a>. Cuando corresponda, el material será revisado o retirado.</p>';
})();

// En celulares, el bloque de apoyo aparece antes del listado largo de noticias y en formato compacto.
(() => {
 const supportCard=document.querySelector('.support-card');
 const sidebar=supportCard?.parentElement;
 const supportNext=supportCard?.nextSibling;
 const newsGrid=document.querySelector('#newsGrid');
 if(!supportCard||!sidebar||!newsGrid)return;
 const title=supportCard.querySelector('h3');
 const description=supportCard.querySelector('p');
 const eyebrow=supportCard.querySelector('.eyebrow');
 const alias=supportCard.querySelector('.support-alias');
 const button=supportCard.querySelector('.support-copy');
 const mobile=matchMedia('(max-width:699px)');
 function placeSupport(){
  if(mobile.matches){
   supportCard.style.margin='0 0 14px';
   supportCard.style.padding='12px 14px';
   supportCard.style.display='grid';
   supportCard.style.gridTemplateColumns='1fr auto';
   supportCard.style.alignItems='center';
   supportCard.style.gap='6px 10px';
   if(title)title.style.display='none';
   if(description)description.style.display='none';
   if(eyebrow){eyebrow.style.gridColumn='1/-1';eyebrow.style.margin='0';}
   if(alias){alias.style.margin='0';alias.style.fontSize='15px';alias.style.lineHeight='1.2';}
   if(button){button.style.width='auto';button.style.minHeight='38px';button.style.padding='8px 14px';button.style.fontSize='12px';}
   newsGrid.before(supportCard);
  }else{
   supportCard.style.margin='';
   supportCard.style.padding='';
   supportCard.style.display='';
   supportCard.style.gridTemplateColumns='';
   supportCard.style.alignItems='';
   supportCard.style.gap='';
   if(title)title.style.display='';
   if(description)description.style.display='';
   if(eyebrow){eyebrow.style.gridColumn='';eyebrow.style.margin='';}
   if(alias){alias.style.margin='';alias.style.fontSize='';alias.style.lineHeight='';}
   if(button){button.style.width='';button.style.minHeight='';button.style.padding='';button.style.fontSize='';}
   if(supportNext&&supportNext.parentNode===sidebar)sidebar.insertBefore(supportCard,supportNext);else sidebar.append(supportCard);
  }
 }
 placeSupport();
 mobile.addEventListener('change',placeSupport);
})();

// Tema claro/oscuro global. Guarda la elección de cada visitante en su navegador.
(() => {
 const root=document.documentElement;
 const key='ranasports-theme';
 const system=matchMedia('(prefers-color-scheme: dark)');
 let saved='';
 try{saved=localStorage.getItem(key)||'';}catch{}
 const initial=saved==='light'||saved==='dark'?saved:(system.matches?'dark':'light');

 if(!document.querySelector('#rs-theme-style')){
  const style=document.createElement('style');
  style.id='rs-theme-style';
  style.textContent=`
   .theme-toggle{width:40px;min-width:40px;height:40px;min-height:40px;padding:0!important;border-radius:50%!important;font-size:18px!important;line-height:1;box-shadow:none!important;flex:0 0 auto}
   html[data-theme="light"]{color-scheme:light;--bg:#f4f6f8;--panel:#ffffff;--panel2:#eef2f6;--text:#171b21;--muted:#64707d;--line:#d8dee6;--shadow:0 12px 36px rgba(18,29,43,.10)}
   html[data-theme="dark"]{color-scheme:dark}
   html[data-theme="light"],html[data-theme="light"] body{background:#f4f6f8;color:#171b21}
   html[data-theme="light"] body{background:radial-gradient(900px 520px at 0 0,rgba(255,18,59,.055),transparent 60%),#f4f6f8}
   html[data-theme="light"] .site-header{background:rgba(255,255,255,.94)!important;border-bottom-color:#d9dee5!important}
   html[data-theme="light"] .brand,html[data-theme="light"] .brand-copy b,html[data-theme="light"] h1,html[data-theme="light"] h2,html[data-theme="light"] h3,html[data-theme="light"] h4{color:#171b21}
   html[data-theme="light"] .brand-copy small,html[data-theme="light"] .meta,html[data-theme="light"] .article-meta,html[data-theme="light"] .panel-kicker{color:#66717e!important}
   html[data-theme="light"] .desktop-nav,html[data-theme="light"] .desktop-nav a{border-color:#e0e4e9!important;color:#333b45!important}
   html[data-theme="light"] .desktop-nav a:hover,html[data-theme="light"] .desktop-nav a.active{background:#eceff3!important;color:#11151a!important}
   html[data-theme="light"] .ghost-btn,html[data-theme="light"] .theme-toggle,html[data-theme="light"] .mobile-menu-button{background:#fff!important;color:#171b21!important;border-color:#cfd6df!important}
   html[data-theme="light"] .search-wrap,html[data-theme="light"] .tab,html[data-theme="light"] .side-card,html[data-theme="light"] .social-list a,html[data-theme="light"] dialog,html[data-theme="light"] .article-cta,html[data-theme="light"] .dashboard-module{background:#fff!important;color:#171b21!important;border-color:#d8dee6!important}
   html[data-theme="light"] .search-wrap input{color:#171b21!important}
   html[data-theme="light"] .tab{color:#4c5663!important}
   html[data-theme="light"] .tab.active{background:#fff0f3!important;color:#b50d2e!important;border-color:#ef9aaa!important}
   html[data-theme="light"] .news-card,html[data-theme="light"] .editorial-grid .news-card{background:#fff!important;border-color:#d8dee6!important;box-shadow:0 8px 24px rgba(20,31,45,.07)!important}
   html[data-theme="light"] .card-body h3 a,html[data-theme="light"] .social-list a{color:#171b21!important}
   html[data-theme="light"] .card-body p,html[data-theme="light"] .side-card p,html[data-theme="light"] .news-excerpt,html[data-theme="light"] .article-lead,html[data-theme="light"] .article-body,html[data-theme="light"] .legal-page p,html[data-theme="light"] dialog p,html[data-theme="light"] dialog li{color:#4f5b68!important}
   html[data-theme="light"] .more-news-title,html[data-theme="light"] .section-heading h2{color:#171b21!important}
   html[data-theme="light"] .about-links{border-color:#d8dee6!important;color:#596574!important}
   html[data-theme="light"] .about-links a{color:#4b5866!important}
   html[data-theme="light"] .install-strip{background:#fff!important;border-color:#d8dee6!important}
   html[data-theme="light"] .install-strip p{color:#5c6875!important}
   html[data-theme="light"] .site-footer{background:#e9edf2!important;color:#171b21!important}
   html[data-theme="light"] .footer-grid p,html[data-theme="light"] .footer-grid>div>a:not(.brand),html[data-theme="light"] .footer-bottom,html[data-theme="light"] .support-footer{color:#5e6976!important;border-color:#ccd3dc!important}
   html[data-theme="light"] .rights-notice{color:#5e6976!important;border-color:#ccd3dc!important}
   html[data-theme="light"] .rights-notice strong,html[data-theme="light"] .rights-notice a{color:#171b21!important}
   html[data-theme="light"] .mobile-nav{background:rgba(255,255,255,.96)!important;border-color:#d2d9e1!important;box-shadow:0 12px 30px rgba(20,31,45,.14)!important}
   html[data-theme="light"] .mobile-nav a{color:#596574!important}
   html[data-theme="light"] .mobile-nav a.active{color:#b50d2e!important}
   html[data-theme="light"] .nav-drawer{background:#fff!important;color:#171b21!important}
   html[data-theme="light"] .drawer-nav a,html[data-theme="light"] .nav-more summary{color:#171b21!important}
   html[data-theme="light"] #rs-support-bar{background:#fff!important;border-bottom-color:#d8dee6!important}
   html[data-theme="light"] #rs-support-bar .rs-support-label,html[data-theme="light"] #rs-support-bar .rs-support-alias strong{color:#171b21!important}
   html[data-theme="light"] #rs-support-bar .rs-support-alias{color:#65717e!important}
   html[data-theme="light"] .empty-state{color:#697582!important;border-color:#cfd6df!important}
   html[data-theme="light"] .kicker-link,html[data-theme="light"] .read-more{color:#a10c29!important}
   html[data-theme="light"] .module-topics,html[data-theme="light"] .module-heading{border-color:#d8dee6!important}
   html[data-theme="light"] .live-empty{background:#fff!important}
   html[data-theme="light"] .live-empty p,html[data-theme="light"] .module-status{color:#687481!important}
   html[data-theme="light"] .standings-module th{background:#edf1f5!important;color:#56616e!important}
   html[data-theme="light"] .standings-module td{color:#39434e!important}
   html[data-theme="light"] dialog::backdrop{background:rgba(20,27,36,.42)}
   @media(max-width:699px){.theme-toggle{width:36px;min-width:36px;height:36px;min-height:36px;font-size:16px!important}}
  `;
  document.head.append(style);
 }

 const apply=theme=>{
  root.dataset.theme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=theme==='light'?'#f4f6f8':'#07090f';
  const button=document.querySelector('#themeToggle');
  if(button){
   const light=theme==='light';
   button.textContent=light?'🌙':'☀️';
   button.setAttribute('aria-label',light?'Cambiar a tema oscuro':'Cambiar a tema claro');
   button.title=light?'Cambiar a tema oscuro':'Cambiar a tema claro';
   button.setAttribute('aria-pressed',String(light));
  }
 };

 apply(initial);
 const header=document.querySelector('.header-inner');
 if(header&&!document.querySelector('#themeToggle')){
  const button=document.createElement('button');
  button.id='themeToggle';button.type='button';button.className='ghost-btn theme-toggle';
  const menu=header.querySelector('.mobile-menu-button');
  if(menu)header.insertBefore(button,menu);else header.append(button);
  button.addEventListener('click',()=>{
   const next=root.dataset.theme==='light'?'dark':'light';
   try{localStorage.setItem(key,next);}catch{}
   apply(next);
  });
  apply(root.dataset.theme||initial);
 }

 system.addEventListener?.('change',event=>{
  let choice='';try{choice=localStorage.getItem(key)||'';}catch{}
  if(!choice)apply(event.matches?'dark':'light');
 });
})();

// Social: presentación inequívoca, una red por fila con logo grande y nombre completo.
(() => {
 const style=document.createElement('style');
 style.textContent=`
  .social-list{grid-template-columns:1fr!important;gap:9px!important}
  .social-list a{min-height:58px!important;padding:9px 12px!important;gap:13px!important;border-radius:10px!important}
  .social-brand-icon,.rs-social-icon{width:42px!important;height:42px!important;min-width:42px!important;border-radius:10px!important;display:grid!important;place-items:center!important}
  .social-brand-icon svg,.rs-social-icon svg{width:28px!important;height:28px!important}
  .social-copy strong,.rs-social-name{font-size:15px!important;font-weight:950!important}
  .social-copy small,.rs-social-handle{font-size:11px!important}
 `;
 document.head.append(style);
 const enforce=()=>{
  document.querySelectorAll('.social-list a').forEach(a=>{
   const url=a.href;
   let name='';
   if(url.includes('instagram.com'))name='Instagram';
   else if(url.includes('youtube.com'))name='YouTube';
   else if(url.includes('tiktok.com'))name='TikTok';
   else if(url.includes('x.com')||url.includes('twitter.com'))name='X (Twitter)';
   if(!name)return;
   const label=a.querySelector('.social-copy strong,.rs-social-name');
   if(label)label.textContent=name;
  });
 };
 enforce();
 addEventListener('load',()=>setTimeout(enforce,250));
 setTimeout(enforce,900);
})();
