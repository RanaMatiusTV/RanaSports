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
      <a href="https://www.youtube.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="YouTube @RanaMatiusTV" title="YouTube">▶</a>
      <a href="https://x.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="X @RanaMatiusTV" title="X">𝕏</a>
      <a href="https://www.instagram.com/RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="Instagram @RanaMatiusTV" title="Instagram">◎</a>
      <a href="https://www.tiktok.com/@RanaMatiusTV" target="_blank" rel="noopener noreferrer" aria-label="TikTok @RanaMatiusTV" title="TikTok">♪</a>`;
    const installButton = headerInner.querySelector('#installBtn');
    headerInner.insertBefore(socials, installButton || null);
  }

  if (!header) return;

  let topModule = document.querySelector('#rs-live-top');
  if (!topModule) {
    topModule = document.createElement('section');
    topModule.id = 'rs-live-top';
    topModule.setAttribute('aria-label', 'Partidos del día y resultados en vivo');
    topModule.innerHTML = `
      <div class="rs-live-head"><strong>EN VIVO</strong><span id="rs-live-status">Actualizando…</span></div>
      <div class="rs-live-scroll" id="rs-live-list" role="region" aria-label="Partidos del día"></div>`;
    header.insertAdjacentElement('afterend', topModule);
  }

  const list = topModule.querySelector('#rs-live-list');
  const status = topModule.querySelector('#rs-live-status');

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const argDate = () => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
  const argTime = ts => new Intl.DateTimeFormat('es-AR', {timeZone:'America/Argentina/Buenos_Aires', hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date(ts * 1000));

  function eventPriority(event) {
    const type = event?.status?.type || '';
    if (type === 'inprogress') return 0;
    if (['notstarted','scheduled'].includes(type)) return 1;
    if (['finished','afterpenalties','afterextra'].includes(type)) return 2;
    return 3;
  }

  function scoreValue(score) {
    const value = score?.current ?? score?.display;
    return Number.isFinite(Number(value)) ? String(value) : '-';
  }

  function render(events) {
    if (!list) return;
    const useful = (events || [])
      .filter(e => e?.homeTeam?.name && e?.awayTeam?.name)
      .sort((a,b) => eventPriority(a)-eventPriority(b) || (a.startTimestamp||0)-(b.startTimestamp||0))
      .slice(0, 36);

    if (!useful.length) {
      list.innerHTML = '<div class="rs-live-empty">No hay partidos cargados para hoy.</div>';
      return;
    }

    list.innerHTML = useful.map(e => {
      const type = e?.status?.type || '';
      const live = type === 'inprogress';
      const finished = ['finished','afterpenalties','afterextra'].includes(type);
      const label = live ? 'EN VIVO' : finished ? 'FINAL' : argTime(e.startTimestamp || 0);
      const tournament = e?.tournament?.uniqueTournament?.name || e?.tournament?.name || '';
      const homeScore = scoreValue(e.homeScore);
      const awayScore = scoreValue(e.awayScore);
      const score = (live || finished) ? `<b class="rs-score">${esc(homeScore)}-${esc(awayScore)}</b>` : '<b class="rs-score">vs</b>';
      return `<article class="rs-match${live?' is-live':''}">
        <span class="rs-comp">${esc(tournament)}</span>
        <div class="rs-match-row"><span>${esc(e.homeTeam.name)}</span>${score}<span>${esc(e.awayTeam.name)}</span></div>
        <span class="rs-state">${esc(label)}</span>
      </article>`;
    }).join('');
  }

  async function loadScores() {
    if (!list || !status) return;
    const date = argDate();
    const sources = [
      `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`,
      `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${date}`
    ];
    let lastError;
    for (const url of sources) {
      try {
        const response = await fetch(url, {cache:'no-store', headers:{'Accept':'application/json'}});
        if (!response.ok) throw new Error('HTTP '+response.status);
        const data = await response.json();
        if (!Array.isArray(data?.events)) throw new Error('Formato inválido');
        render(data.events);
        const liveCount = data.events.filter(e => e?.status?.type === 'inprogress').length;
        status.textContent = liveCount ? `${liveCount} en vivo · actualización automática` : 'Partidos de hoy · actualización automática';
        status.dataset.ok = '1';
        return;
      } catch (error) {
        lastError = error;
      }
    }

    status.textContent = 'Fuente principal no disponible · usando respaldo';
    status.dataset.ok = '0';
    list.innerHTML = `<iframe class="rs-live-fallback" title="Resultados deportivos en vivo" loading="eager" referrerpolicy="strict-origin-when-cross-origin" src="https://www.sportbusy.com/embed/live?variant=ticker&theme=dark&sb_parent=${encodeURIComponent(location.href)}"></iframe>`;
    console.warn('RanaSports live scores fallback:', lastError);
  }

  if (!document.getElementById('rs-live-embed-style')) {
    const style = document.createElement('style');
    style.id = 'rs-live-embed-style';
    style.textContent = `
      #rs-live-top{display:block!important;width:100%;border-bottom:1px solid #252d36;background:#10151b;color:#fff}
      #en-vivo,#livePanels{display:none!important}.breaking-compact,#breakingDialog{display:none!important}
      .rs-live-head{display:flex;align-items:center;gap:12px;padding:7px 14px;border-bottom:1px solid #202832;font-size:12px}.rs-live-head strong{color:#ff3655}.rs-live-head span{color:#aeb8c3}
      .rs-live-scroll{display:flex;gap:8px;overflow-x:auto;padding:8px 10px;scrollbar-width:thin;min-height:78px}
      .rs-match{flex:0 0 260px;border:1px solid #29333e;border-radius:9px;background:#141b22;padding:7px 9px}.rs-match.is-live{border-color:#cf2441}
      .rs-comp{display:block;color:#8f9ba8;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px}.rs-match-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:7px;font-size:12px;font-weight:700}.rs-match-row span:last-child{text-align:right}.rs-score{font-size:13px}.rs-state{display:block;margin-top:5px;color:#b9c1ca;font-size:10px}.is-live .rs-state{color:#ff526d;font-weight:800}
      .rs-live-empty{padding:18px;color:#aeb8c3;font-size:12px}.rs-live-fallback{display:block;width:100%;height:96px;border:0;background:#10151b}
      .rs-header-socials{display:flex;align-items:center;gap:7px;margin-left:auto}.rs-header-socials a{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid #2c3540;border-radius:999px;color:#eef2f6;text-decoration:none;background:#11171d;font-weight:800}
      @media(max-width:699px){.rs-match{flex-basis:225px}.rs-live-head{padding:6px 10px}.rs-live-scroll{padding:7px 8px}.rs-header-socials{gap:4px}.rs-header-socials a{width:29px;height:29px;font-size:12px}}
    `;
    document.head.append(style);
  }

  loadScores();
  setInterval(loadScores, 60000);
})();
