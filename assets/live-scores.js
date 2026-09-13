(() => {
  const module = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  if (standings) standings.hidden = true;
  if (!module) return;

  const LIVE_URL = 'https://api.sofascore.com/api/v1/sport/football/events/live';
  const REFRESH_MS = 60000;
  let refreshTimer = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);

  function statusText(event) {
    const type = event?.status?.type || '';
    const description = event?.status?.description || '';
    if (type === 'halftime') return 'ET';
    if (type === 'paused') return 'PAUSA';
    if (type === 'inprogress') {
      const period = String(description).toLowerCase();
      if (period.includes('1st') || period.includes('first')) return '1T';
      if (period.includes('2nd') || period.includes('second')) return '2T';
      if (period.includes('extra')) return 'ALARGUE';
      return 'EN JUEGO';
    }
    return description ? description.toUpperCase() : 'EN VIVO';
  }

  function priority(event) {
    const country = String(event?.tournament?.category?.name || '').toLowerCase();
    const tournament = String(event?.tournament?.uniqueTournament?.name || event?.tournament?.name || '').toLowerCase();
    let score = 0;
    if (country.includes('argentina')) score += 100;
    if (/liga profesional|primera|copa argentina|reserva/.test(tournament)) score += 40;
    if (/libertadores|sudamericana|champions|europa league|conference league/.test(tournament)) score += 30;
    if (/world cup|mundial|selecci/.test(tournament)) score += 25;
    return score;
  }

  function eventHTML(event) {
    const home = esc(event?.homeTeam?.name || 'Local');
    const away = esc(event?.awayTeam?.name || 'Visitante');
    const hs = Number.isFinite(event?.homeScore?.current) ? event.homeScore.current : '-';
    const as = Number.isFinite(event?.awayScore?.current) ? event.awayScore.current : '-';
    const status = esc(statusText(event));
    const tournament = esc(event?.tournament?.uniqueTournament?.name || event?.tournament?.name || 'Fútbol');
    const eventId = event?.id;
    const href = eventId ? `https://www.sofascore.com/event/${encodeURIComponent(eventId)}` : 'https://www.sofascore.com/es-la/';
    return `<a class="rs-live-item" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${home} ${hs} a ${as} ${away}, ${status}">
      <span class="rs-live-league">${tournament}</span>
      <strong>${home}</strong><b class="rs-score">${hs}–${as}</b><strong>${away}</strong>
      <span class="rs-live-status">${status}</span>
    </a>`;
  }

  function shell(content, state = 'live') {
    module.dataset.sourceStatus = state;
    module.innerHTML = `<div class="rs-live-ticker" role="region" aria-label="Resultados de fútbol en vivo">
      <div class="rs-live-label"><span class="live-dot"></span><b>EN VIVO</b></div>
      <div class="rs-live-window"><div class="rs-live-track">${content}</div></div>
      <a class="rs-live-all" href="https://www.sofascore.com/es-la/football/livescore" target="_blank" rel="noopener noreferrer" aria-label="Ver todos los resultados">TODOS ↗</a>
    </div>`;
  }

  function render(events) {
    const live = (events || [])
      .filter(event => ['inprogress','halftime','paused'].includes(event?.status?.type))
      .sort((a,b) => priority(b) - priority(a))
      .slice(0,12);

    if (!live.length) {
      shell('<span class="rs-live-empty">No hay partidos de fútbol en vivo ahora</span>', 'idle');
      return;
    }

    const items = live.map(eventHTML).join('<span class="rs-live-sep" aria-hidden="true">•</span>');
    shell(items + '<span class="rs-live-sep" aria-hidden="true">•</span>' + items, 'connected');
    requestAnimationFrame(() => {
      const track = module.querySelector('.rs-live-track');
      if (!track) return;
      const duration = Math.max(28, Math.min(90, track.scrollWidth / 55));
      track.style.setProperty('--ticker-duration', `${duration}s`);
      if (track.scrollWidth <= track.parentElement.clientWidth + 20) track.classList.add('rs-static');
    });
  }

  async function load() {
    try {
      const response = await fetch(LIVE_URL, {cache:'no-store', headers:{'accept':'application/json'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      render(data?.events || []);
    } catch (error) {
      console.warn('RanaSports: no se pudieron actualizar los resultados en vivo.', error);
      shell('<span class="rs-live-empty">Resultados en vivo temporalmente no disponibles</span>', 'error');
    }
  }

  if (!document.getElementById('rs-live-ticker-style')) {
    const style = document.createElement('style');
    style.id = 'rs-live-ticker-style';
    style.textContent = `
      #en-vivo.dashboard-module{padding:0!important;min-height:0!important;overflow:hidden;border-radius:10px;background:#10151b;border:1px solid #252d36}
      .rs-live-ticker{height:46px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;width:100%;overflow:hidden}
      .rs-live-label{height:100%;display:flex;align-items:center;gap:7px;padding:0 12px;border-right:1px solid #29313a;font-size:11px;letter-spacing:.06em;white-space:nowrap}
      .rs-live-label .live-dot{width:8px;height:8px;flex:none}
      .rs-live-window{min-width:0;overflow:hidden;height:100%;display:flex;align-items:center;mask-image:linear-gradient(to right,transparent,#000 18px,#000 calc(100% - 18px),transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 18px,#000 calc(100% - 18px),transparent)}
      .rs-live-track{display:flex;align-items:center;gap:14px;width:max-content;white-space:nowrap;padding-left:18px;animation:rsTicker var(--ticker-duration,45s) linear infinite;will-change:transform}
      .rs-live-track:hover{animation-play-state:paused}
      .rs-live-track.rs-static{animation:none}
      .rs-live-item{display:inline-flex;align-items:center;gap:7px;color:inherit;text-decoration:none;font-size:12px;line-height:1}
      .rs-live-item strong{font-size:12px;color:#eef2f6;font-weight:800}
      .rs-score{font-size:13px;color:#fff;font-variant-numeric:tabular-nums}
      .rs-live-league{font-size:9px;color:#8f9aa7;text-transform:uppercase;max-width:110px;overflow:hidden;text-overflow:ellipsis}
      .rs-live-status{font-size:9px;font-weight:900;color:#ff6262}
      .rs-live-sep{color:#59636f;font-size:10px}
      .rs-live-empty{padding:0 18px;font-size:11px;color:#aab3bd}
      .rs-live-all{height:100%;display:flex;align-items:center;padding:0 12px;border-left:1px solid #29313a;color:#fff;text-decoration:none;font-size:10px;font-weight:900;white-space:nowrap;background:#161c23}
      @keyframes rsTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      @media(max-width:699px){
        .rs-live-ticker{height:42px;grid-template-columns:auto minmax(0,1fr)}
        .rs-live-label{padding:0 9px;font-size:10px}
        .rs-live-all{display:none}
        .rs-live-league{display:none}
        .rs-live-track{gap:11px;padding-left:12px}
        .rs-live-item{gap:5px;font-size:11px}
        .rs-live-item strong{font-size:11px;max-width:110px;overflow:hidden;text-overflow:ellipsis}
      }
      @media(prefers-reduced-motion:reduce){.rs-live-track{animation:none;overflow-x:auto}}
    `;
    document.head.append(style);
  }

  load();
  refreshTimer = window.setInterval(load, REFRESH_MS);
  window.addEventListener('pagehide', () => { if (refreshTimer) clearInterval(refreshTimer); }, {once:true});
})();