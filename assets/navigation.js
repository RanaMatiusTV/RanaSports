/* Navigation only. The remaining sports are provided by the CSV. */
(() => {
 const nav=document.querySelector('.dynamic-nav');if(!nav)return;
 const navScript=document.querySelector('script[src*="assets/navigation.js"]');
 const base=new URL('../',navScript?.src||location.href);
 const home=Boolean(document.querySelector('#newsGrid'));
 const primary=[['ultimas','Noticias'],['independiente','Independiente'],['seleccion','Selección Argentina'],['futbol','Fútbol'],['f1','F1']];
 const drawer=document.createElement('dialog');drawer.id='navDrawer';drawer.className='nav-drawer';drawer.setAttribute('aria-label','Menú de navegación');
 const close=document.createElement('button');close.type='button';close.className='drawer-close ghost-btn';close.textContent='× Cerrar';
 const drawerNav=document.createElement('nav');drawerNav.className='drawer-nav';drawerNav.setAttribute('aria-label','Secciones');drawer.append(close,drawerNav);document.body.append(drawer);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-menu-button ghost-btn';toggle.textContent='☰';toggle.setAttribute('aria-label','Abrir menú');toggle.setAttribute('aria-controls','navDrawer');toggle.setAttribute('aria-expanded','false');document.querySelector('.header-inner')?.append(toggle);
 toggle.addEventListener('click',()=>{drawer.showModal();toggle.setAttribute('aria-expanded','true');});close.addEventListener('click',()=>drawer.close());drawer.addEventListener('close',()=>toggle.setAttribute('aria-expanded','false'));
 drawer.addEventListener('click',event=>{if(event.target===drawer){const r=drawer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)drawer.close();}});
 const screen=matchMedia('(min-width:1050px)');screen.addEventListener('change',()=>{if(screen.matches&&drawer.open)drawer.close();});
 function anchor(key,label,mobile){const a=document.createElement('a');a.textContent=mobile?label:label.toUpperCase();a.href=home?'#'+encodeURIComponent(key):new URL('#'+encodeURIComponent(key),base).href;return a;}
 function build(entries){
  const extras=entries.filter(([key])=>!primary.some(([fixed])=>fixed===key)&&!['agenda','en-vivo','otros'].includes(key));
  for(const [parent,mobile] of [[nav,false],[drawerNav,true]]){
   parent.replaceChildren();primary.forEach(([key,label])=>parent.append(anchor(key,label,mobile)));
   const more=document.createElement('details');more.className='nav-more';const summary=document.createElement('summary');summary.textContent=mobile?'Más Deportes':'MÁS DEPORTES';const list=document.createElement('div');list.className='nav-more-list';extras.forEach(([key,label])=>list.append(anchor(key,label,mobile)));if(!extras.length){const p=document.createElement('p');p.textContent='Sin otras categorías publicadas.';list.append(p);}more.append(summary,list);parent.append(more,anchor('agenda','Agenda',mobile),anchor('en-vivo','En Vivo',mobile));
  }
  const tabs=document.querySelector('.category-tabs');if(tabs){tabs.replaceChildren();[['todas','Todas'],...primary.slice(1),...extras,['otros','Más deportes'],['agenda','Agenda']].forEach(([key,label])=>{const b=document.createElement('button');b.className='tab';b.dataset.filter=key;b.textContent=label;b.type='button';tabs.append(b);});}
  document.dispatchEvent(new Event('ranasports:navigation-ready'));
 }
 document.addEventListener('ranasports:categories',event=>{build(event.detail);try{localStorage.setItem('ranasports-nav-categories:'+base.pathname,JSON.stringify(event.detail));}catch{}});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))nav.querySelector('details')?.removeAttribute('open');});
 drawerNav.addEventListener('click',event=>{if(event.target.closest('a'))drawer.close();});
 let categories=[];try{categories=JSON.parse(localStorage.getItem('ranasports-nav-categories:'+base.pathname)||'[]');}catch{}build(categories);
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
