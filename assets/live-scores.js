(() => {
  const oldModule = document.querySelector('#en-vivo');
  const standings = document.querySelector('#posiciones');
  const livePanels = document.querySelector('#livePanels');
  const topModule = document.querySelector('#rs-live-top');

  if (topModule) topModule.remove();
  if (oldModule) oldModule.remove();
  if (standings) standings.remove();
  if (livePanels) livePanels.remove();
})();
