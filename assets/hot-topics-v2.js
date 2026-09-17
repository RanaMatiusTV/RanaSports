

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

// Mantiene solamente X y YouTube en el bloque de redes del portal.
(() => {
  document.querySelectorAll('.social-list a').forEach(link => {
    const href=(link.getAttribute('href')||'').toLowerCase();
    if(href.includes('instagram.com') || href.includes('tiktok.com')) link.remove();
  });
})();
