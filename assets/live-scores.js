(() => {
  const module = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  const header = document.querySelector('.site-header');
  const breakingButtonWrap = document.querySelector('.breaking-compact');
  const breakingDialog = document.querySelector('#breakingDialog');

  if (standings) standings.hidden = true;
  if (breakingButtonWrap) breakingButtonWrap.remove();
  if (breakingDialog) breakingDialog.remove();
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
      @media(max-width:699px){
        .rs-live-embed-shell,.rs-live-embed{height:96px}
      }
    `;
    document.head.append(style);
  }
})();
