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
