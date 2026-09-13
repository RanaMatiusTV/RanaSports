(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  // Retira la barra de etiquetas anterior y el bloque grande de apoyo para evitar duplicados.
  document.querySelector('#rs-hot-topics-v2')?.remove();
  document.querySelector('#rs-hot-topics')?.remove();
  const removeLegacyCard = () => document.querySelector('.support-card')?.remove();
  removeLegacyCard();
  const mobile = matchMedia('(max-width:699px)');
  mobile.addEventListener?.('change', () => setTimeout(removeLegacyCard, 0));

  if (!document.querySelector('#rs-support-bar-style')) {
    const style = document.createElement('style');
    style.id = 'rs-support-bar-style';
    style.textContent = `
      #rs-support-bar{width:100%;background:#0c1117;border-bottom:1px solid #232b34;position:relative;z-index:20}
      #rs-support-bar .rs-support-inner{width:min(calc(100% - 24px),1280px);margin:0 auto;min-height:46px;padding:7px 0;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
      #rs-support-bar .rs-support-label{font-size:12px;font-weight:900;letter-spacing:.08em;color:#fff;white-space:nowrap}
      #rs-support-bar .rs-support-alias{font-size:13px;color:#c8ced7;white-space:nowrap}
      #rs-support-bar .rs-support-alias strong{color:#fff}
      #rs-support-bar button{border:1px solid #ff123b;background:#ff123b;color:#fff;border-radius:5px;padding:7px 12px;font:inherit;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap}
      #rs-support-bar button:hover,#rs-support-bar button:focus-visible{filter:brightness(1.08);outline:none}
      @media(max-width:699px){
        #rs-support-bar .rs-support-inner{width:calc(100% - 20px);min-height:42px;padding:6px 0;gap:7px;justify-content:space-between;flex-wrap:nowrap}
        #rs-support-bar .rs-support-label{font-size:10px;letter-spacing:.06em}
        #rs-support-bar .rs-support-alias{font-size:11px}
        #rs-support-bar button{font-size:10px;padding:6px 9px}
      }
    `;
    document.head.append(style);
  }

  let bar = document.querySelector('#rs-support-bar');
  if (!bar) {
    bar = document.createElement('aside');
    bar.id = 'rs-support-bar';
    bar.setAttribute('aria-label','Apoyá RanaSports');
    header.insertAdjacentElement('afterend', bar);
  }

  bar.innerHTML = `
    <div class="rs-support-inner">
      <span class="rs-support-label">☕ APOYÁ RANASPORTS</span>
      <span class="rs-support-alias">Alias: <strong>ranita.mp</strong></span>
      <button type="button" id="rs-copy-support-alias">COPIAR</button>
    </div>`;

  bar.querySelector('#rs-copy-support-alias')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText('ranita.mp');
      button.textContent = '✓ COPIADO';
    } catch {
      button.textContent = 'ranita.mp';
    }
    setTimeout(() => { button.textContent = 'COPIAR'; }, 1800);
  });
})();

// Redes sociales: íconos claros y reconocibles junto al nombre de cada plataforma.
(() => {
  const lists=[...document.querySelectorAll('.social-list')];
  if(!lists.length)return;

  if(!document.querySelector('#rs-social-icons-style')){
    const style=document.createElement('style');
    style.id='rs-social-icons-style';
    style.textContent=`
      .social-list a{display:flex!important;align-items:center!important;gap:11px!important}
      .rs-social-icon{width:30px;height:30px;min-width:30px;border-radius:8px;display:grid;place-items:center;position:relative;font-weight:900;line-height:1;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
      .rs-social-text{display:flex;flex-direction:column;line-height:1.12;min-width:0}
      .rs-social-name{font-size:13px;font-weight:900}
      .rs-social-handle{font-size:10px;font-weight:650;opacity:.68;margin-top:3px}
      .rs-social-x{background:#050505;color:#fff;font-size:17px}
      .rs-social-instagram{background:linear-gradient(135deg,#833ab4 0%,#fd1d1d 52%,#fcb045 100%)}
      .rs-social-instagram:before{content:"";width:15px;height:15px;border:2px solid #fff;border-radius:5px;box-sizing:border-box}
      .rs-social-instagram:after{content:"";position:absolute;width:4px;height:4px;border:2px solid #fff;border-radius:50%;box-sizing:border-box;right:7px;top:7px}
      .rs-social-youtube{background:#ff0033}
      .rs-social-youtube:before{content:"";width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #fff;margin-left:2px}
      .rs-social-tiktok{background:#050505;color:#fff;font-size:19px}
      .rs-social-tiktok span{transform:translateY(-1px);text-shadow:1px 1px 0 #25f4ee,-1px -1px 0 #fe2c55}
      html[data-theme="light"] .rs-social-icon{box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
    `;
    document.head.append(style);
  }

  const config=[
    {match:'x.com',name:'X',cls:'rs-social-x',glyph:'X'},
    {match:'twitter.com',name:'X',cls:'rs-social-x',glyph:'X'},
    {match:'instagram.com',name:'Instagram',cls:'rs-social-instagram',glyph:''},
    {match:'youtube.com',name:'YouTube',cls:'rs-social-youtube',glyph:''},
    {match:'tiktok.com',name:'TikTok',cls:'rs-social-tiktok',glyph:'♪'}
  ];

  lists.forEach(list=>{
    list.querySelectorAll('a').forEach(link=>{
      const item=config.find(entry=>link.href.includes(entry.match));
      if(!item||link.dataset.rsSocialReady)return;
      link.dataset.rsSocialReady='1';
      const icon=document.createElement('span');
      icon.className=`rs-social-icon ${item.cls}`;
      icon.setAttribute('aria-hidden','true');
      if(item.glyph){const glyph=document.createElement('span');glyph.textContent=item.glyph;icon.append(glyph);}
      const text=document.createElement('span');text.className='rs-social-text';
      const name=document.createElement('span');name.className='rs-social-name';name.textContent=item.name;
      const handle=document.createElement('span');handle.className='rs-social-handle';handle.textContent='@RanaMatiusTV';
      text.append(name,handle);
      link.replaceChildren(icon,text);
      link.setAttribute('aria-label',`${item.name} de @RanaMatiusTV`);
    });
  });
})();
