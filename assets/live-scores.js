(() => {
  const live = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');

  if (live) {
    live.dataset.sourceStatus = 'external-live';
    live.innerHTML = `
      <div class="module-heading">
        <h2 id="liveTitle"><span class="live-dot"></span> EN VIVO AHORA</h2>
        <span class="module-status">SOFASCORE</span>
      </div>
      <div class="module-topics"><span>RESULTADOS EN VIVO</span><span>FÚTBOL</span></div>
      <div class="live-empty" style="padding:24px 18px">
        <span class="score-symbol" aria-hidden="true">⚽</span>
        <h3>Marcadores en vivo</h3>
        <p>SeguÍ los partidos que se están jugando ahora y los resultados del día.</p>
        <a class="primary-btn" href="https://www.sofascore.com/es-la/football/livescore" target="_blank" rel="noopener noreferrer">VER PARTIDOS EN VIVO ↗</a>
      </div>
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-top:1px solid #29313a;font-size:11px;color:#aeb7c2">
        <span>Marcadores: Sofascore.</span>
        <a href="https://www.sofascore.com/es-la/football/tournament/argentina/liga-profesional-de-futbol/155" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:none;font-weight:800">LIGA PROFESIONAL ↗</a>
      </div>`;
  }

  if (standings) {
    standings.dataset.sourceStatus = 'connected';
    standings.innerHTML = `
      <div class="module-heading">
        <h2 id="standingsTitle">TABLA DE POSICIONES</h2>
        <span class="module-status">LIGA PROFESIONAL · 2026</span>
      </div>
      <div style="background:#fff;overflow:auto;max-height:700px">
        <iframe
          id="sofa-standings-embed-155-87913"
          title="Tabla de posiciones de la Liga Profesional 2026 por Sofascore"
          src="https://widgets.sofascore.com/embed/unique-tournament/155/season/87913/multiple-standings?widgetTitle=Liga+Profesional+de+F%C3%BAtbol&showCompetitionLogo=true&widgetTheme=light"
          frameborder="0"
          scrolling="no"
          loading="lazy"
          style="display:block;width:100%;height:1587px;border:0;background:#fff;max-width:768px;margin:0 auto">
        </iframe>
      </div>
      <a class="module-link" href="https://www.sofascore.com/es-la/football/tournament/argentina/liga-profesional-de-futbol/155" target="_blank" rel="noopener noreferrer">Tabla y fixture completos en Sofascore ↗</a>`;
  }
})();
