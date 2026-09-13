(() => {
  const detail=document.querySelector('#newsDetail');
  if(!detail)return;

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current=()=>({title:(detail.querySelector('h1')?.textContent||document.title||'RanaSports').trim(),url:location.href});

  function shareURL(base,title,url){
    const t=encodeURIComponent(title),u=encodeURIComponent(url);
    if(base==='x')return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    if(base==='facebook')return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    if(base==='whatsapp')return `https://wa.me/?text=${t}%20${u}`;
    if(base==='telegram')return `https://t.me/share/url?url=${u}&text=${t}`;
    return url;
  }

  async function copyLink(btn){
    const {url}=current();
    try{await navigator.clipboard.writeText(url);btn.textContent='✓ ENLACE COPIADO';setTimeout(()=>btn.textContent='🔗 COPIAR ENLACE',1800);}
    catch{prompt('Copiá este enlace:',url);}
  }

  function build(){
    if(detail.querySelector('.rs-share-wrap'))return;
    const h1=detail.querySelector('h1');if(!h1)return;
    const wrap=document.createElement('div');wrap.className='rs-share-wrap';
    wrap.innerHTML=`
      <button class="rs-share-main" type="button" aria-expanded="false">↗ COMPARTIR</button>
      <div class="rs-share-menu" hidden>
        <button type="button" data-native>Compartir…</button>
        <a data-share="whatsapp" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a data-share="x" target="_blank" rel="noopener noreferrer">X</a>
        <a data-share="facebook" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a data-share="telegram" target="_blank" rel="noopener noreferrer">Telegram</a>
        <button type="button" data-copy>🔗 COPIAR ENLACE</button>
      </div>`;
    h1.insertAdjacentElement('afterend',wrap);
    const main=wrap.querySelector('.rs-share-main'),menu=wrap.querySelector('.rs-share-menu');
    const sync=()=>{const {title,url}=current();wrap.querySelectorAll('[data-share]').forEach(a=>a.href=shareURL(a.dataset.share,title,url));};
    sync();
    main.addEventListener('click',()=>{const opening=menu.hidden;menu.hidden=!opening;main.setAttribute('aria-expanded',opening?'true':'false');sync();});
    wrap.querySelector('[data-copy]').addEventListener('click',e=>copyLink(e.currentTarget));
    const native=wrap.querySelector('[data-native]');
    if(!navigator.share)native.hidden=true;
    else native.addEventListener('click',async()=>{const {title,url}=current();try{await navigator.share({title,text:title,url});}catch{}});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target)){menu.hidden=true;main.setAttribute('aria-expanded','false');}});
  }

  const style=document.createElement('style');style.textContent=`
    .rs-share-wrap{position:relative;margin:12px 0 18px;display:inline-block}
    .rs-share-main,.rs-share-menu button,.rs-share-menu a{font:inherit}
    .rs-share-main{border:1px solid #35404b;background:#11171d;color:#fff;border-radius:999px;padding:9px 13px;font-size:.78rem;font-weight:900;letter-spacing:.04em;cursor:pointer}
    .rs-share-menu{position:absolute;z-index:40;top:calc(100% + 8px);left:0;min-width:190px;padding:7px;background:#10151b;border:1px solid #2a333d;border-radius:12px;box-shadow:0 14px 36px rgba(0,0,0,.34)}
    .rs-share-menu a,.rs-share-menu button{display:block;width:100%;box-sizing:border-box;border:0;background:transparent;color:#eef2f6;text-align:left;text-decoration:none;padding:10px 11px;border-radius:8px;font-size:.86rem;cursor:pointer}
    .rs-share-menu a:hover,.rs-share-menu button:hover{background:#1a222b}
    @media(max-width:699px){.rs-share-main{padding:8px 12px}.rs-share-menu{position:fixed;left:12px;right:12px;bottom:14px;top:auto;min-width:0}}
  `;document.head.append(style);

  build();
  new MutationObserver(build).observe(detail,{childList:true,subtree:true});
})();
