(()=>{
  if(window.__ranaSportScoreCompetitionFilter)return;
  window.__ranaSportScoreCompetitionFilter=true;
  const nativeFetch=window.fetch.bind(window);
  const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function rejectCompetition(name){
    const s=fold(name);

    // Continental competitions: never infer UEFA from a generic or other-confederation name.
    if(/champions league/.test(s)){
      if(/\b(afc|caf|concacaf|ofc)\b|asian|asia|africa|african/.test(s))return true;
      if(!/uefa/.test(s))return true;
    }
    if(/europa league/.test(s)&&!/uefa/.test(s))return true;

    // Domestic names that exist in multiple countries. Only accept explicit country identity.
    if(/premier league/.test(s)&&!/(english|england|epl)/.test(s))return true;
    if(/\bserie a\b/.test(s)&&!/(italian|italy|italia)/.test(s))return true;
    if(/bundesliga/.test(s)&&!/(german|germany|deutsch)/.test(s))return true;
    if(/\bligue 1\b/.test(s)&&!/(french|france)/.test(s))return true;
    if(/\bla ?liga\b|laliga/.test(s)&&!/(spanish|spain|espana|laliga)/.test(s))return true;

    // Cups with generic names.
    if(/league cup/.test(s)&&!/(carabao|english|england|efl)/.test(s))return true;
    if(/coppa italia/.test(s)&&!/(italia|italy|italian|coppa italia)/.test(s))return true;

    return false;
  }

  window.fetch=async function ranaFilteredFetch(input,init){
    const response=await nativeFetch(input,init);
    try{
      const raw=typeof input==='string'?input:input?.url;
      const url=new URL(raw,location.href);
      const target=url.hostname==='sportscore.com'&&url.pathname==='/api/widget/matches/'&&url.searchParams.get('sport')==='football';
      if(!target||!response.ok)return response;
      const data=await response.clone().json();
      if(!Array.isArray(data?.matches))return response;
      const matches=data.matches.filter(m=>!rejectCompetition(m?.competition));
      const headers=new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      headers.delete('content-length');
      headers.delete('content-encoding');
      return new Response(JSON.stringify({...data,matches,count:matches.length}),{status:response.status,statusText:response.statusText,headers});
    }catch{return response}
  };
})();
