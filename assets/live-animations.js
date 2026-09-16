(()=>{
  if(window.__ranaLiveAnimations)return;
  window.__ranaLiveAnimations=true;

  const scores=new Map();
  let scheduled=false;

  const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const matchKey=row=>{
    const home=row.querySelector('.rs-team.h');
    const teams=[...row.querySelectorAll('.rs-team')];
    const away=teams.find(x=>x!==home);
    if(!home||!away)return'';
    return `${fold(home.textContent)}|${fold(away.textContent)}`;
  };
  const scoreValue=row=>{
    const text=row.querySelector('.rs-score')?.textContent||'';
    const m=text.match(/(\d+)\s*[-–:]\s*(\d+)/);
    return m?{home:Number(m[1]),away:Number(m[2]),text:`${m[1]}-${m[2]}`} : null;
  };

  function style(){
    if(document.querySelector('#rs-live-animations-style'))return;
    const s=document.createElement('style');
    s.id='rs-live-animations-style';
    s.textContent=`
      .rs-st.live{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:2px}
      .rs-live-pulse{display:block;width:7px;height:7px;margin-top:3px;border-radius:50%;background:#ff1746;box-shadow:0 0 0 0 rgba(255,23,70,.72);animation:rsLivePulse 1.45s ease-in-out infinite;pointer-events:none}
      @keyframes rsLivePulse{0%,100%{opacity:.42;transform:scale(.76);box-shadow:0 0 0 0 rgba(255,23,70,.12)}50%{opacity:1;transform:scale(1);box-shadow:0 0 0 6px rgba(255,23,70,0)}}
      .rs-score{position:relative}
      .rs-score.rs-goal-hit{animation:rsScoreGoal 1.35s ease both}
      .rs-goal-spin{position:absolute;z-index:4;left:50%;top:50%;display:grid;place-items:center;width:28px;height:28px;margin:-14px 0 0 -14px;font-size:21px;line-height:1;filter:drop-shadow(0 2px 5px rgba(0,0,0,.55));animation:rsGoalSpin 1.25s cubic-bezier(.2,.75,.25,1) both;pointer-events:none}
      @keyframes rsGoalSpin{0%{opacity:0;transform:scale(.35) rotate(0deg)}18%{opacity:1;transform:scale(1.08) rotate(120deg)}72%{opacity:1;transform:scale(1) rotate(620deg)}100%{opacity:0;transform:scale(.45) rotate(820deg)}}
      @keyframes rsScoreGoal{0%{transform:scale(1)}22%{transform:scale(1.24);text-shadow:0 0 14px rgba(255,23,70,.85)}55%{transform:scale(1.08);text-shadow:0 0 8px rgba(255,23,70,.45)}100%{transform:scale(1);text-shadow:none}}
      html[data-theme="light"] .rs-live-pulse{box-shadow:0 0 0 0 rgba(220,0,45,.55)}
      @media(prefers-reduced-motion:reduce){.rs-live-pulse,.rs-score.rs-goal-hit,.rs-goal-spin{animation:none!important}.rs-goal-spin{display:none!important}}
    `;
    document.head.append(s);
  }

  function addPulse(row){
    const status=row.querySelector('.rs-st.live');
    if(!status||status.querySelector('.rs-live-pulse'))return;
    const dot=document.createElement('span');
    dot.className='rs-live-pulse';
    dot.setAttribute('aria-hidden','true');
    status.append(dot);
  }

  function goalAnimation(row){
    const score=row.querySelector('.rs-score');
    if(!score)return;
    score.querySelector('.rs-goal-spin')?.remove();
    score.classList.remove('rs-goal-hit');
    void score.offsetWidth;
    const ball=document.createElement('span');
    ball.className='rs-goal-spin';
    ball.setAttribute('aria-hidden','true');
    ball.textContent='⚽';
    score.append(ball);
    score.classList.add('rs-goal-hit');
    setTimeout(()=>{ball.remove();score.classList.remove('rs-goal-hit')},1500);
  }

  function render(){
    scheduled=false;
    style();
    const liveKeys=new Set();
    document.querySelectorAll('#en-vivo .rs-game.live').forEach(row=>{
      addPulse(row);
      const key=matchKey(row),score=scoreValue(row);
      if(!key||!score)return;
      liveKeys.add(key);
      const prev=scores.get(key);
      if(prev&&score.text!==prev.text&&(score.home+score.away)>(prev.home+prev.away))goalAnimation(row);
      scores.set(key,score);
    });
    if(location.hash==='#en-vivo'){
      for(const key of [...scores.keys()])if(!liveKeys.has(key)&&scores.size>80)scores.delete(key);
    }
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(render);
  }

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  document.addEventListener('ranasports:news-updated',schedule);
  schedule();
})();