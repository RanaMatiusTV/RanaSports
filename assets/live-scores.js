(() => {
  // Mantener el diseño moderno de portada, pero sin módulo de partidos/resultados.
  if (!document.querySelector('link[data-rs-portal-list]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'assets/portal-list.css?v=20260913-0354';
    css.dataset.rsPortalList = '1';
    document.head.append(css);
  }

  const oldModule = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  const livePanels = document.querySelector('#livePanels');
  const topModule = document.querySelector('#rs-live-top');
  const breakingButtonWrap = document.querySelector('.breaking-compact');
  const breakingDialog = document.querySelector('#breakingDialog');
  const headerInner = document.querySelector('.site-header .header-inner');

  if (topModule) topModule.remove();
  if (oldModule) oldModule.remove();
  if (standings) standings.remove();
  if (livePanels) livePanels.remove();
  if (breakingButtonWrap) breakingButtonWrap.remove();
  if (breakingDialog) breakingDialog.remove();

  if (headerInner && !headerInner.querySelector('.rs-header-socials')) {
    headerInner.querySelector('.header-youtube')?.remove();
    const socials = document.createElement('nav');
    socials.className = 'rs-header-socials';
    socials.setAttribute('aria-label', 'Redes sociales de RanaSports');
    socials.innerHTML = `
      <a href="https://www.youtube.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="YouTube @RanaMatiusTV" title="YouTube">▶</a>
      <a href="https://x.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="X @RanaMatiusTV" title="X">𝕏</a>
      <a href="https://www.instagram.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="Instagram @RanaMatiusTV" title="Instagram">◎</a>
      <a href="https://www.tiktok.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="TikTok @RanaMatiusTV" title="TikTok">♪</a>`;
    const installButton = headerInner.querySelector('#installBtn');
    headerInner.insertBefore(socials, installButton || null);
  }

  if (!document.getElementById('rs-header-socials-style')) {
    const style = document.createElement('style');
    style.id = 'rs-header-socials-style';
    style.textContent = `
      .rs-header-socials{display:flex;align-items:center;gap:7px;margin-left:auto}
      .rs-header-socials a{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid #2c3540;border-radius:999px;color:#eef2f6;text-decoration:none;background:#11171d;font-weight:800}
      @media(max-width:699px){.rs-header-socials{gap:4px}.rs-header-socials a{width:29px;height:29px;font-size:12px}}
    `;
    document.head.append(style);
  }
})();
