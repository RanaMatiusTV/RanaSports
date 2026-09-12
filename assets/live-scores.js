(() => {
  const module = document.querySelector('#en-vivo');
  if (!module) return;

  const API = 'https://api.sofascore.com/api/v1/sport/football/events/live';
  const REFRESH_MS = 30000;
  const MAX_MATCHES = 18;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const priority = event => {
    const tournament = normalize(event?.tournament?.name || event?.tournament?.uniqueTournament?.name);
    const category = normalize(event?.tournament?.category?.name || event?.tournament?.category?.country?.name);
    const teams = normalize(`${event?.homeTeam?.name || ''} ${event?.awayTeam?.name || ''}`);
    let score = 0;
    if (category.includes('argentina') || tournament.includes('argentina')) score += 100;
    if (/libertadores|sudamericana|champions league|europa league|conference league|premier league|laliga|serie a|bundesliga|ligue 1|brasileir/.test(tournament)) score += 60;
    if (/river|boca|independiente|racing|san lorenzo|huracan|argentina/.test(teams)) score += 80;
    if (/south america|sudamerica|world|international/.test(category)) score += 30;
    return score;
  };

  function liveLabel(event) {
    const description = event?.status?.description || '';
    const type = event?.status?.type || '';
    if (type === 'halftime') return 'ET';
    const start = Number(event?.time?.currentPeriodStartTimestamp || 0) * 1000;
    if (start && type === 'inprogress') {
      const elapsed = Math.max(1, Math.floor((Date.now() - start) / 60000));
      const period = normalize(description);
      const minute = period.includes('2nd') || period.includes('second') ? Math.min(90, 45 + elapsed) : Math.min(45, elapsed);
      return `${minute}'`;
    }
    return description || 'EN VIVO';
  }

  function tournamentName(event) {
    return event?.tournament?.uniqueTournament?.name || event?.tournament?.name || 'Fútbol';
  }

  function render(events) {
    const live = [...events]
      .filter(event => event?.status?.type === 'inprogress' || event?.status?.type === 'halftime')
      .sort((a,b) => priority(b) - priority(a) || (a.startTimestamp || 0) - (b.startTimestamp || 0))
      .slice(0, MAX_MATCHES);

    const cards = live.map(event => {
      const home = escapeHtml(event?.homeTeam?.shortName || event?.homeTeam?.name || 'Local');
      const away = escapeHtml(event?.awayTeam?.shortName || event?.awayTeam?.name || 'Visitante');
      const hs = event?.homeScore?.current ?? event?.homeScore?.display ?? '-';
      const as = event?.awayScore?.current ?? event?.awayScore?.display ?? '-';
      const competition = escapeHtml(tournamentName(event));
      const status = escapeHtml(liveLabel(event));
      const id = Number(event?.id || 0);
      const href = id ? `https://www.sofascore.com/es-la/event/${id}` : 'https://www.sofascore.com/es-la/';
      return `<a class="rs-live-match" href="${href}" target="_blank" rel="noopener noreferrer">
        <div class="rs-live-competition">${competition}<span>${status}</span></div>
        <div class="rs-live-team"><span>${home}</span><b>${escapeHtml(hs)}</b></div>
        <div class="rs-live-team"><span>${away}</span><b>${escapeHtml(as)}</b></div>
      </a>`;
    }).join('');

    module.dataset.sourceStatus = 'connected';
    module.innerHTML = `
      <div class="module-heading"><h2 id="liveTitle"><span class="live-dot"></span> EN VIVO AHORA</h2><span class="module-status">SOFASCORE · AUTO 30s</span></div>
      <div class="module-topics"><span>PARTIDOS EN JUEGO</span><span>${live.length} EN VIVO</span></div>
      <div class="rs-live-list">${cards || `<div class="rs-live-empty"><strong>No hay partidos de fútbol en juego ahora.</strong><span>El panel se actualiza automáticamente cada 30 segundos.</span></div>`}</div>
      <div class="rs-live-footer"><span>Marcadores: Sofascore.</span><a href="https://www.sofascore.com/es-la/" target="_blank" rel="noopener noreferrer">VER TODOS ↗</a></div>`;
  }

  function renderError() {
    module.dataset.sourceStatus = 'error';
    module.innerHTML = `
      <div class="module-heading"><h2 id="liveTitle"><span class="live-dot"></span> EN VIVO AHORA</h2><span class="module-status">REINTENTANDO…</span></div>
      <div class="rs-live-empty"><strong>No pudimos actualizar los marcadores en este instante.</strong><span>RanaSports reintenta automáticamente cada 30 segundos.</span><a class="primary-btn" href="https://www.sofascore.com/es-la/" target="_blank" rel="noopener noreferrer">VER SOFASCORE ↗</a></div>`;
  }

  async function update() {
    try {
      const response = await fetch(`${API}?_rs=${Date.now()}`, {cache:'no-store', credentials:'omit', mode:'cors'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data?.events)) throw new Error('Respuesta inválida');
      render(data.events);
    } catch (error) {
      console.warn('RanaSports live scores:', error);
      renderError();
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .rs-live-list{display:grid;gap:0;background:#0d1218}
    .rs-live-match{display:block;padding:12px;border-bottom:1px solid #29313a;color:#fff;text-decoration:none;background:#10151b}
    .rs-live-match:hover{background:#161d25}
    .rs-live-competition{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px;color:#aeb7c2;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.35px}
    .rs-live-competition span{color:#ff3154;white-space:nowrap}
    .rs-live-team{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:15px;line-height:1.35;padding:2px 0}
    .rs-live-team span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .rs-live-team b{font-size:20px;min-width:22px;text-align:right}
    .rs-live-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;color:#9fa9b5;font-size:10px}
    .rs-live-footer a{color:#fff;font-weight:900;text-decoration:none;white-space:nowrap}
    .rs-live-empty{padding:24px 16px;text-align:center;display:grid;gap:9px;color:#aeb7c2;background:radial-gradient(ellipse at 50% 30%,#24141d,transparent)}
    .rs-live-empty strong{color:#fff;font-size:15px}.rs-live-empty span{font-size:12px;line-height:1.4}.rs-live-empty .primary-btn{justify-self:center;margin-top:4px}
    @media(min-width:700px){.rs-live-list{grid-template-columns:1fr 1fr}.rs-live-match:nth-child(odd){border-right:1px solid #29313a}}
    @media(min-width:1050px){.rs-live-list{grid-template-columns:1fr}.rs-live-match:nth-child(odd){border-right:0}.rs-live-team{font-size:14px}.rs-live-team b{font-size:18px}}
  `;
  document.head.append(style);
  update();
  setInterval(update, REFRESH_MS);
})();