(() => {
  if (!document.querySelector('link[data-rs-portal-list]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'assets/portal-list.css?v=20260913-0214';
    css.dataset.rsPortalList = '1';
    document.head.append(css);
  }

  const oldModule = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  const header = document.querySelector('.site-header');
  const headerInner = document.querySelector('.site-header .header-inner');
  const breakingButtonWrap = document.querySelector('.breaking-compact');
  const breakingDialog = document.querySelector('#breakingDialog');

  if (standings) standings.hidden = true;
  if (breakingButtonWrap) breakingButtonWrap.remove();
  if (breakingDialog) breakingDialog.remove();
  if (oldModule) oldModule.style.display = 'none';

  if (headerInner && !headerInner.querySelector('.rs-header-socials')) {
    headerInner.querySelector('.header-youtube')?.remove();
    const socials = document.createElement('nav');
    socials.className = 'rs-header-socials';
    socials.setAttribute('aria-label', 'Redes sociales de RanaSports');
    socials.innerHTML = `
      <a href="https://www.youtube.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="YouTube @RanaMatiusTV" title="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.9 12l-6.3 3.6Z"/></svg></a>
      <a href="https://x.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="X @RanaMatiusTV" title="X"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 2H22l-8.3 9.5L23.5 22h-7.7l-6-7.9L2.9 22H-.9l8.9-10.2L-1.4 2h7.9l5.4 7.2L18.2 2Zm-1.3 18.2H19L5.4 3.7H3.1l13.8 16.5Z"/></svg></a>
      <a href="https://www.instagram.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="Instagram @RanaMatiusTV" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.8A4.2 4.2 0 1 1 7.8 12 4.2 4.2 0 0 1 12 7.8Zm0 2A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Zm5.3-3.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"/></svg></a>
      <a href="https://www.tiktok.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="TikTok @RanaMatiusTV" title="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 2h3a5.4 5.4 0 0 0 4.1 4.1v3a8.3 8.3 0 0 1-4.1-1.1v7.2a6.2 6.2 0 1 1-5.4-6.1v3.2a3.1 3.1 0 1 0 2.4 3V2Z"/></svg></a>`;
    const installButton = headerInner.querySelector('#installBtn');
    headerInner.insertBefore(socials, installButton || null);
  }

  if (!header) return;

  let topModule = document.querySelector('#rs-live-top');
  if (!topModule) {
    topModule = document.createElement('section');
    topModule.id = 'rs-live-top';
    topModule.setAttribute('aria-label', 'Resultados deportivos en vivo');
    topModule.innerHTML = `
      <div class="rs-live-embed-shell" role="region" aria-label="Resultados deportivos en vivo">
        <iframe id="sportbusy-live-ticker-top" class="rs-live-embed" title="Resultados deportivos en vivo" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay"></iframe>
      </div>`;
    header.insertAdjacentElement('afterend', topModule);
  }

  const frame = topModule.querySelector('#sportbusy-live-ticker-top');
  if (frame && !frame.src) {
    try {
      const url = new URL('https://www.sportbusy.com/embed/live');
      url.searchParams.set('variant', 'ticker');
      url.searchParams.set('theme', 'dark');
      url.searchParams.set('sb_parent', location.href);
      frame.src = url.toString();
    } catch {
      frame.src = 'https://www.sportbusy.com/embed/live?variant=ticker&theme=dark';
    }
  }

  if (!document.getElementById('rs-live-embed-style')) {
    const style = document.createElement('style');
    style.id = 'rs-live-embed-style';
    style.textContent = `
      #rs-live-top{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;border-bottom:1px solid #252d36!important;background:#10151b!important}
      #en-vivo{display:none!important}
      #livePanels{display:none!important}
      .rs-live-embed-shell{width:100%;height:104px;overflow:hidden;background:#10151b}
      .rs-live-embed{display:block;width:100%;height:104px;border:0;background:#10151b}
      .breaking-compact,#breakingDialog{display:none!important}
      .rs-header-socials{display:flex;align-items:center;gap:7px;margin-left:auto}
      .rs-header-socials a{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid #2c3540;border-radius:999px;color:#eef2f6;text-decoration:none;background:#11171d;transition:background .15s,border-color .15s,transform .15s}
      .rs-header-socials a:hover{background:#1a222b;border-color:#3b4652;transform:translateY(-1px)}
      .rs-header-socials svg{width:17px;height:17px;fill:currentColor;display:block}
      @media(max-width:899px){.rs-header-socials{gap:5px}.rs-header-socials a{width:31px;height:31px}.rs-header-socials svg{width:15px;height:15px}}
      @media(max-width:699px){.rs-live-embed-shell,.rs-live-embed{height:96px}.rs-header-socials{gap:4px}.rs-header-socials a{width:29px;height:29px}}
    `;
    document.head.append(style);
  }
})();
