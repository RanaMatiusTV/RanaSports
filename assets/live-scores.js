(() => {
  const module = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  const header = document.querySelector('.site-header');
  const headerInner = document.querySelector('.site-header .header-inner');
  const breakingButtonWrap = document.querySelector('.breaking-compact');
  const breakingDialog = document.querySelector('#breakingDialog');

  if (standings) standings.hidden = true;
  if (breakingButtonWrap) breakingButtonWrap.remove();
  if (breakingDialog) breakingDialog.remove();

  if (headerInner && !headerInner.querySelector('.rs-header-socials')) {
    headerInner.querySelector('.header-youtube')?.remove();
    const socials = document.createElement('nav');
    socials.className = 'rs-header-socials';
    socials.setAttribute('aria-label', 'Redes sociales de RanaSports');
    socials.innerHTML = `
      <a href="https://www.youtube.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="YouTube @RanaMatiusTV">YouTube</a>
      <a href="https://x.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="X @RanaMatiusTV">X</a>
      <a href="https://www.instagram.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="Instagram @RanaMatiusTV">Instagram</a>`;
    const installButton = headerInner.querySelector('#installBtn');
    headerInner.insertBefore(socials, installButton || null);
  }

  if (!module) return;

  module.dataset.sourceStatus = 'connected';
  module.innerHTML = `
    <div class="rs-live-embed-shell" role="region" aria-label="Resultados deportivos en vivo">
      <iframe
        id="sportbusy-live-ticker"
        class="rs-live-embed"
        title="Resultados deportivos en vivo"
        loading="eager"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="autoplay"
      ></iframe>
    </div>`;

  if (header) {
    header.insertAdjacentElement('afterend', module);
  }

  const frame = module.querySelector('#sportbusy-live-ticker');
  if (frame) {
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
      #en-vivo.dashboard-module{padding:0!important;min-height:0!important;overflow:hidden;border-radius:0!important;background:#10151b;border:0!important;border-bottom:1px solid #252d36!important;margin:0!important;width:100%!important;max-width:none!important}
      .rs-live-embed-shell{width:100%;height:104px;overflow:hidden;background:#10151b}
      .rs-live-embed{display:block;width:100%;height:104px;border:0;background:#10151b}
      #livePanels:empty{display:none!important}
      .breaking-compact,#breakingDialog{display:none!important}
      .rs-header-socials{display:flex;align-items:center;gap:8px;margin-left:auto}
      .rs-header-socials a{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 10px;border:1px solid #2c3540;border-radius:999px;color:#eef2f6;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:.02em;background:#11171d;white-space:nowrap}
      .rs-header-socials a:hover{background:#1a222b;border-color:#3b4652}
      @media(max-width:899px){
        .rs-header-socials{gap:5px}
        .rs-header-socials a{height:30px;padding:0 8px;font-size:10px}
      }
      @media(max-width:699px){
        .rs-live-embed-shell,.rs-live-embed{height:96px}
        .rs-header-socials a{width:30px;padding:0;font-size:0}
        .rs-header-socials a::first-letter{font-size:11px}
        .rs-header-socials a[aria-label^="YouTube"]::before{content:'YT';font-size:10px}
        .rs-header-socials a[aria-label^="X "]::before{content:'X';font-size:11px}
        .rs-header-socials a[aria-label^="Instagram"]::before{content:'IG';font-size:10px}
      }
    `;
    document.head.append(style);
  }
})();
