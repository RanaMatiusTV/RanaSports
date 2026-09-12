(() => {
  const module = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  if (standings) standings.hidden = true;
  if (!module) return;

  module.dataset.sourceStatus = 'connected';
  module.innerHTML = `
    <div class="module-heading">
      <h2 id="liveTitle"><span class="live-dot"></span> EN VIVO AHORA</h2>
      <span class="module-status">SCOREBAT · EN VIVO</span>
    </div>
    <div class="module-topics"><span>PARTIDOS EN JUEGO</span><span>FÚTBOL</span></div>
    <div class="rs-scorebat-wrap">
      <iframe
        class="rs-scorebat-frame"
        title="Resultados de fútbol en vivo"
        src="https://www.scorebat.com/embed/livescore/"
        loading="eager"
        allowfullscreen
        allow="autoplay; encrypted-media"
        referrerpolicy="strict-origin-when-cross-origin">
      </iframe>
    </div>
    <div class="rs-live-footer">
      <span>Marcadores y partidos del momento.</span>
      <a href="posiciones.html">POSICIONES ↗</a>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
    .rs-scorebat-wrap{background:#fff;overflow:hidden;width:100%;height:620px}
    .rs-scorebat-frame{display:block;width:100%;height:100%;border:0;background:#fff}
    .rs-live-footer{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;color:#9fa9b5;font-size:10px;border-top:1px solid #29313a}
    .rs-live-footer a{color:#fff;font-weight:900;text-decoration:none;white-space:nowrap}
    @media(max-width:699px){.rs-scorebat-wrap{height:680px}}
    @media(min-width:1050px){.rs-scorebat-wrap{height:720px}}
  `;
  document.head.append(style);
})();
