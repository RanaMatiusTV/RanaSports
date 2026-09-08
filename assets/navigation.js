/* Only the menu and filters: categories come from the existing CSV. */
(() => {
 const nav=document.querySelector('.dynamic-nav');if(!nav)return;
 const script=document.querySelector('script[src$="assets/navigation.js"]');
 const base=new URL('../',script.src);
 const home=Boolean(document.querySelector('#newsGrid'));
 const primary=[['ultimas','NOTICIAS'],['independiente','INDEPENDIENTE'],['seleccion','SELECCIÓN ARGENTINA'],['f1','F1']];
 let categories=[];
 function anchor(key,label){const a=document.createElement('a');a.textContent=label.toUpperCase();a.href=home?'#'+encodeURIComponent(key):new URL('#'+encodeURIComponent(key),base).href;return a;}
 function build(entries){
  categories=entries;
  nav.replaceChildren();
  primary.forEach(([key,label])=>{const a=anchor(key,label);a.className='nav-primary';nav.append(a);});
  const extras=entries.filter(([key])=>!primary.some(([fixed])=>fixed===key)&&!['agenda','en-vivo','otros'].includes(key));
  const links=extras.map(([key,label])=>anchor(key,label));
  const more=document.createElement('details');more.className='nav-more';
  const summary=document.createElement('summary');summary.textContent='MÁS DEPORTES';
  const list=document.createElement('div');list.className='nav-more-list';more.append(summary,list);
  const agenda=anchor('agenda','AGENDA'),live=anchor('en-vivo','EN VIVO');
  nav.append(...links,more,agenda,live);
  function fit(){
   links.forEach(a=>nav.insertBefore(a,more));more.hidden=false;
   if(matchMedia('(max-width: 699px)').matches)links.forEach(a=>list.append(a));
   else{
    const width=()=>[...nav.children].filter(el=>!el.hidden).reduce((sum,el)=>sum+el.getBoundingClientRect().width,0);
    for(let i=links.length-1;i>=0&&width()>nav.clientWidth;i--)list.prepend(links[i]);
   }
   more.hidden=!list.childElementCount;
  }
  fit();nav._fit=fit;
  const tabs=document.querySelector('.category-tabs');
  if(tabs){
   tabs.replaceChildren();
   [['todas','Todas'],...primary.slice(1).map(([key,label])=>[key,label]),...extras,['otros','Más deportes'],['agenda','Agenda']].forEach(([key,label])=>{const b=document.createElement('button');b.className='tab';b.dataset.filter=key;b.textContent=label;b.type='button';tabs.append(b);});
  }
  document.dispatchEvent(new Event('ranasports:navigation-ready'));
 }
 document.addEventListener('ranasports:categories',event=>build(event.detail));
 nav.addEventListener('click',event=>{if(event.target.closest('a'))nav.querySelector('details')?.removeAttribute('open');});
 new ResizeObserver(()=>nav._fit?.()).observe(nav);
 // Static notes can reuse the last published category list without another request.
 try{const raw=localStorage.getItem('ranasports-nav-categories:'+base.pathname);if(raw)categories=JSON.parse(raw);}catch{}
 build(categories);
 document.addEventListener('ranasports:categories',event=>{try{localStorage.setItem('ranasports-nav-categories:'+base.pathname,JSON.stringify(event.detail));}catch{}});
})();
