(()=>{
  if(window.__ranaFreshNewsGate)return;
  window.__ranaFreshNewsGate=true;

  const grid=document.querySelector('#newsGrid');
  if(!grid)return;

  const NEWS_HOST='docs.google.com';
  const NEWS_PATH='/spreadsheets/d/e/2PACX-1vRmbZPf_uxPdpS-phGua9U3PccA2z7Uls3G8r49CLfi37qkMJkpRPDUU7VdAZg_IMI7Ynegy-yxyAhr/pub';
  const nativeFetch=window.fetch.bind(window);
  let released=false;

  const status=document.querySelector('#newsStatus');
  const liveView=location.hash==='#en-vivo';

  if(!liveView){
    grid.style.visibility='hidden';
    grid.setAttribute('aria-busy','true');
    if(status){
      status.hidden=false;
      status.textContent='Cargando noticias…';
    }
  }

  function release(){
    if(released)return;
    released=true;
    setTimeout(()=>{
      grid.style.visibility='';
      grid.removeAttribute('aria-busy');
    },0);
  }

  window.fetch=async function ranaFreshNewsFetch(input,init){
    const raw=typeof input==='string'?input:input?.url;
    let isNews=false;
    try{
      const url=new URL(raw,location.href);
      isNews=url.hostname===NEWS_HOST&&url.pathname===NEWS_PATH&&url.searchParams.get('output')==='csv';
    }catch{}

    if(!isNews)return nativeFetch(input,init);

    try{
      const response=await nativeFetch(input,init);
      release();
      return response;
    }catch(error){
      release();
      throw error;
    }
  };

  // news-feed.js aborta la consulta a los 15 s. Este seguro evita dejar el feed oculto.
  setTimeout(release,16000);
})();
