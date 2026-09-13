/* Navigation only. The remaining sports are provided by the CSV. */
(() => {
 const nav=document.querySelector('.dynamic-nav');if(!nav)return;
 const base=new URL('../',document.querySelector('script[src$="assets/navigation.js"]').src);
 const home=Boolean(document.querySelector('#newsGrid'));
 const primary=[['ultimas','Noticias'],['independiente','Independiente'],['seleccion','Selección Argentina'],['futbol','Fútbol'],['f1','F1']];
 const drawer=document.createElement('dialog');drawer.id='navDrawer';drawer.className='nav-drawer';drawer.setAttribute('aria-label','Menú de navegación');
 const close=document.createElement('button');close.type='button';close.className='drawer-close ghost-btn';close.textContent='× Cerrar';
 const drawerNav=document.createElement('nav');drawerNav.className='drawer-nav';drawerNav.setAttribute('aria-label','Secciones');drawer.append(close,drawerNav);document.body.append(drawer);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-menu-button ghost-btn';toggle.textContent='☰';toggle.setAttribute('aria-label','Abrir menú');toggle.setAttribute('aria-controls','navDrawer');toggle.setAttribute('aria-expanded','false');document.querySelector('.header-inner').append(toggle);
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
 notice.innerHTML='<p style="margin:0 0 7px"><strong style="color:#fff">Aviso legal y revisión de contenido.</strong> RanaSports es un proyecto personal e informativo de recopilación y organización de actualidad deportiva. Su acceso es gratuito. Las contribuciones voluntarias, si las hubiera, están destinadas al mantenimiento del proyecto. Las imágenes, videos y otros contenidos de terceros pertenecen a sus respectivos titulares.</p><p style="margin:0">Si sos titular de algún contenido publicado y querés solicitar su revisión, acreditá la titularidad y escribí a <a href="mailto:ranamatius@gmail.com?subject=Solicitud%20de%20revisi%C3%B3n%20de%20contenido%20-%20RanaSports" style="color:#fff;font-weight:700">ranamatius@gmail.com</a>. Cuando corresponda, el material será revisado o retirado.</p>';
})();

// En celulares, el bloque de apoyo aparece antes del listado largo de noticias.
(() => {
 const supportCard=document.querySelector('.support-card');
 const sidebar=supportCard?.parentElement;
 const supportNext=supportCard?.nextSibling;
 const newsGrid=document.querySelector('#newsGrid');
 if(!supportCard||!sidebar||!newsGrid)return;
 const mobile=matchMedia('(max-width:699px)');
 function placeSupport(){
  if(mobile.matches){
   supportCard.style.margin='0 0 14px';
   newsGrid.before(supportCard);
  }else{
   supportCard.style.margin='';
   if(supportNext&&supportNext.parentNode===sidebar)sidebar.insertBefore(supportCard,supportNext);else sidebar.append(supportCard);
  }
 }
 placeSupport();
 mobile.addEventListener('change',placeSupport);
})();
