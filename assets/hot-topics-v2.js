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

// Redes sociales: logos grandes, claros y reconocibles junto al nombre.
(() => {
  const lists=[...document.querySelectorAll('.social-list')];
  if(!lists.length)return;

  if(!document.querySelector('#rs-social-icons-style')){
    const style=document.createElement('style');
    style.id='rs-social-icons-style';
    style.textContent=`
      .social-list{gap:10px!important}
      .social-list a{display:flex!important;align-items:center!important;gap:12px!important;min-height:54px!important;padding:9px 11px!important;text-decoration:none!important}
      .rs-social-icon{width:36px;height:36px;min-width:36px;border-radius:9px;display:grid;place-items:center;overflow:hidden}
      .rs-social-icon svg{width:24px;height:24px;display:block}
      .rs-social-text{display:flex;flex-direction:column;line-height:1.05;min-width:0}
      .rs-social-name{font-size:14px;font-weight:950;letter-spacing:.1px}
      .rs-social-handle{font-size:10px;font-weight:700;opacity:.7;margin-top:4px}
      .rs-social-x{background:#000;color:#fff}
      .rs-social-instagram{background:linear-gradient(135deg,#833ab4,#fd1d1d 55%,#fcb045);color:#fff}
      .rs-social-youtube{background:#ff0000;color:#fff}
      .rs-social-tiktok{background:#050505;color:#fff}
      html[data-theme="light"] .social-list a{background:#fff!important}
      @media(max-width:699px){
        .rs-social-icon{width:38px;height:38px;min-width:38px}
        .rs-social-icon svg{width:26px;height:26px}
        .rs-social-name{font-size:14px}
      }
    `;
    document.head.append(style);
  }

  const icons={
    x:`<span class="rs-social-icon rs-social-x" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg></span>`,
    instagram:`<span class="rs-social-icon rs-social-instagram" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg></span>`,
    youtube:`<span class="rs-social-icon rs-social-youtube" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#fff" d="M9.5 7.7v8.6L17 12 9.5 7.7Z"/></svg></span>`,
    tiktok:`<span class="rs-social-icon rs-social-tiktok" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14.2 3.2v11.1a4.3 4.3 0 1 1-3.2-4.15v2.65a1.75 1.75 0 1 0 .65 1.36V3.2h2.55Zm0 0c.45 2.3 1.75 3.67 4.15 4.28v2.63a8.1 8.1 0 0 1-4.15-1.57V3.2Z" fill="#25F4EE" transform="translate(-.55 .45)"/><path d="M14.2 3.2v11.1a4.3 4.3 0 1 1-3.2-4.15v2.65a1.75 1.75 0 1 0 .65 1.36V3.2h2.55Zm0 0c.45 2.3 1.75 3.67 4.15 4.28v2.63a8.1 8.1 0 0 1-4.15-1.57V3.2Z" fill="#FE2C55" transform="translate(.55 -.35)"/><path d="M14.2 3.2v11.1a4.3 4.3 0 1 1-3.2-4.15v2.65a1.75 1.75 0 1 0 .65 1.36V3.2h2.55Zm0 0c.45 2.3 1.75 3.67 4.15 4.28v2.63a8.1 8.1 0 0 1-4.15-1.57V3.2Z" fill="#fff"/></svg></span>`
  };

  const config=[
    {match:'x.com',name:'X',icon:'x'},
    {match:'twitter.com',name:'X',icon:'x'},
    {match:'instagram.com',name:'Instagram',icon:'instagram'},
    {match:'youtube.com',name:'YouTube',icon:'youtube'},
    {match:'tiktok.com',name:'TikTok',icon:'tiktok'}
  ];

  lists.forEach(list=>{
    list.querySelectorAll('a').forEach(link=>{
      const item=config.find(entry=>link.href.includes(entry.match));
      if(!item)return;
      link.dataset.rsSocialReady='1';
      link.innerHTML=`${icons[item.icon]}<span class="rs-social-text"><span class="rs-social-name">${item.name}</span><span class="rs-social-handle">@RanaMatiusTV</span></span>`;
      link.setAttribute('aria-label',`${item.name} de @RanaMatiusTV`);
    });
  });
})();
