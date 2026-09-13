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
