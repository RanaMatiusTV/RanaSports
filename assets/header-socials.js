(()=>{
  if(window.__ranaHeaderSocials)return;
  window.__ranaHeaderSocials=true;

  const X_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2H21l-6.02 6.88L22 22h-5.5l-4.307-5.63L7.266 22H4.508l6.394-7.308L2 2h5.64l3.894 5.148L18.244 2Zm-.965 17.7h1.527L6.81 4.18H5.17L17.28 19.7Z"/></svg>';
  const YT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path class="yt-shell" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z"/><path class="yt-play" d="M9.6 15.6V8.4L15.8 12l-6.2 3.6Z"/></svg>';

  function style(){
    if(document.querySelector('#rs-header-social-style'))return;
    const s=document.createElement('style');
    s.id='rs-header-social-style';
    s.textContent=`
      .rs-header-socials{display:flex;align-items:center;gap:10px;flex:0 0 auto;margin-left:auto}
      .rs-header-social{display:grid!important;place-items:center!important;width:38px!important;height:38px!important;min-width:38px!important;padding:0!important;border:0!important;border-radius:6px!important;background:transparent!important;text-decoration:none!important;box-shadow:none!important;overflow:visible!important;transition:opacity .15s ease,transform .15s ease!important}
      .rs-header-social svg{display:block;pointer-events:none}
      .rs-header-x{color:#fff!important}
      .rs-header-x svg{width:23px;height:23px;fill:currentColor}
      .rs-header-youtube svg{width:28px;height:28px}
      .rs-header-youtube .yt-shell{fill:#ff0000}.rs-header-youtube .yt-play{fill:#fff}
      .rs-header-social:hover{opacity:.82;transform:scale(1.06)}
      .rs-header-social:focus-visible{outline:2px solid #ff1746!important;outline-offset:3px!important}
      html[data-theme="light"] .rs-header-x{color:#050505!important}
      html[data-theme="light"] .rs-header-social{background:transparent!important;border:0!important;box-shadow:none!important}
      @media(max-width:699px){
        /* En celulares el encabezado debe priorizar marca, EN VIVO, tema y menú.
           Las redes siguen disponibles en el sitio, pero no fuerzan un ancho mayor al viewport. */
        .rs-header-socials{display:none!important}
        .site-header .header-inner{max-width:100%!important;min-width:0!important;gap:6px!important}
        .site-header .brand{flex:1 1 auto!important;min-width:0!important;max-width:100%!important;overflow:hidden!important}
        .site-header .brand-copy{min-width:0!important;max-width:100%!important;overflow:hidden!important}
        .site-header .brand-copy small{display:none!important}
        .site-header .brand-copy b{font-size:18px!important;letter-spacing:-.8px!important}
        .site-header .rs-live-btn{margin-left:0!important;flex:0 0 auto!important;padding:6px 8px!important;font-size:9px!important}
        .site-header #installBtn{display:none!important}
        .site-header .theme-toggle,.site-header .mobile-menu-button{flex:0 0 32px!important;width:32px!important;min-width:32px!important}
      }
      @media(max-width:360px){
        .site-header .brand-frog{width:30px!important;height:28px!important}
        .site-header .brand-copy b{font-size:16px!important}
        .site-header .rs-live-btn{padding:5px 7px!important;font-size:8px!important}
      }
    `;
    document.head.append(s);
  }

  function link(cls,label,href,icon){
    const a=document.createElement('a');
    a.className=`rs-header-social ${cls}`;
    a.href=href;a.target='_blank';a.rel='noopener noreferrer';
    a.setAttribute('aria-label',label);a.title=label;a.innerHTML=icon;
    return a;
  }

  function install(){
    style();
    const header=document.querySelector('.site-header .header-inner');
    if(!header)return;
    let wrap=header.querySelector('.rs-header-socials');
    if(!wrap){wrap=document.createElement('div');wrap.className='rs-header-socials';wrap.setAttribute('aria-label','Redes sociales de RanaSports');}

    let yt=header.querySelector('.header-youtube,.rs-header-youtube');
    if(yt){
      yt.className='rs-header-social rs-header-youtube';
      yt.href='https://www.youtube.com/@RanaMatiusTV';yt.target='_blank';yt.rel='noopener noreferrer';
      yt.setAttribute('aria-label','YouTube de @RanaMatiusTV');yt.title='YouTube · @RanaMatiusTV';yt.innerHTML=YT_ICON;
    }else yt=link('rs-header-youtube','YouTube de @RanaMatiusTV','https://www.youtube.com/@RanaMatiusTV',YT_ICON);

    let x=header.querySelector('.rs-header-x');
    if(!x)x=link('rs-header-x','X de @RanaMatiusTV','https://x.com/RanaMatiusTV',X_ICON);

    wrap.replaceChildren(x,yt);
    const installButton=header.querySelector('#installBtn');
    const theme=header.querySelector('#themeToggle');
    const menu=header.querySelector('.mobile-menu-button');
    const before=installButton||theme||menu;
    if(before)header.insertBefore(wrap,before);else header.append(wrap);
  }

  install();
  document.addEventListener('ranasports:navigation-ready',install);
  addEventListener('load',install);
})();