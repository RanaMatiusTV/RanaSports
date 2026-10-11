/* Aviso independiente de instalación PWA para visitas desde navegador. */
(() => {
  'use strict';
  if (window.__ranaInstallBannerReady) return;
  window.__ranaInstallBannerReady = true;

  const installedKey = 'rs-install-confirmed-v1';
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const read = () => { try { return localStorage.getItem(installedKey) === '1'; } catch { return false; } };
  const rememberInstalled = () => { try { localStorage.setItem(installedKey, '1'); } catch {} };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(navigator.userAgent);
  let installEvent = null;
  let banner = null;
  let completed = isStandalone() || read();

  if (isStandalone()) rememberInstalled();
  if (completed) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event;
  });
  window.addEventListener('appinstalled', () => {
    completed = true;
    rememberInstalled();
    banner?.remove();
    banner = null;
  });

  function instructions() {
    if (isIOS) return 'En Safari, tocá Compartir y después «Añadir a pantalla de inicio». En otros navegadores de iPhone, buscá esa opción en el menú de compartir.';
    if (isAndroid) return 'Abrí el menú ⋮ del navegador y tocá «Instalar aplicación» o «Añadir a pantalla principal».';
    return 'En el menú del navegador, elegí «Instalar RanaSports» o «Crear acceso directo».';
  }

  function createBanner() {
    if (banner || completed || isStandalone()) return;
    // Una visita desde el propio portal no debe tapar cada noticia que se abra.
    try {
      const from = document.referrer ? new URL(document.referrer) : null;
      const navigation = performance.getEntriesByType('navigation')[0];
      if (from?.origin === location.origin && navigation?.type !== 'reload') return;
    } catch {}

    banner = document.createElement('aside');
    banner.className = 'rs-browser-install';
    banner.setAttribute('aria-label', 'Instalar RanaSports como aplicación');
    banner.innerHTML = `
      <img class="rs-browser-install-logo" src="/assets/icon-192.png" alt="" width="52" height="52">
      <div class="rs-browser-install-copy">
        <strong>Instalar RanaSports en tu celular</strong>
        <span>ranasports.com.ar</span>
      </div>
      <button type="button" class="rs-browser-install-action">Instalar</button>
      <button type="button" class="rs-browser-install-close" aria-label="Cerrar aviso de instalación">×</button>
      <p class="rs-browser-install-help" hidden></p>
    `;
    document.body.appendChild(banner);

    const close = banner.querySelector('.rs-browser-install-close');
    const action = banner.querySelector('.rs-browser-install-action');
    const help = banner.querySelector('.rs-browser-install-help');
    close.addEventListener('click', () => { banner.remove(); banner = null; });
    action.addEventListener('click', async () => {
      if (installEvent) {
        const event = installEvent;
        installEvent = null;
        try {
          await event.prompt();
          const choice = await event.userChoice;
          if (choice?.outcome === 'accepted') {
            banner?.remove();
            banner = null;
          } else {
            help.textContent = instructions();
            help.hidden = false;
          }
        } catch {
          help.textContent = instructions();
          help.hidden = false;
        }
        return;
      }
      help.textContent = instructions();
      help.hidden = false;
      action.textContent = 'Cómo instalar';
    });
  }

  async function start() {
    // Evita mostrar el aviso a quien ya instaló la PWA, cuando el navegador
    // ofrece una API capaz de comprobarlo.
    if (typeof navigator.getInstalledRelatedApps === 'function') {
      try {
        const apps = await Promise.race([
          navigator.getInstalledRelatedApps(),
          new Promise(resolve => setTimeout(() => resolve([]), 650))
        ]);
        if (apps.some(app => app.platform === 'webapp' &&
          /ranasports\.com\.ar/i.test(String(app.id || '') + ' ' + String(app.url || '')))) {
          completed = true;
          rememberInstalled();
          return;
        }
      } catch {}
    }
    createBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 550), {once:true});
  } else {
    setTimeout(start, 550);
  }
})();