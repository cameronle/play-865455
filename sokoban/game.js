(() => {
  'use strict';
  const R = window.SokobanRules;
  const levels = window.SokobanLevels;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const ui = {
    level: document.getElementById('level'), moves: document.getElementById('moves'), pushes: document.getElementById('pushes'), best: document.getElementById('best'),
    overlay: document.getElementById('overlay'), title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'), start: document.getElementById('startButton')
  };

  let levelIndex = Math.max(0, Math.min(levels.length - 1, Number(localStorage.getItem('sokobanUnlocked') || 0)));
  let state, history = [], active = false, swipeStart = null;
  function cloneState(s) { return {width:s.width,height:s.height,walls:{...s.walls},goals:{...s.goals},boxes:{...s.boxes},player:{...s.player},moves:s.moves,pushes:s.pushes}; }
  function bestKey() { return `sokobanBest${levelIndex}`; }
  function loadLevel(index, showIntro = false) {
    levelIndex = (index + levels.length) % levels.length; state = R.parseLevel(levels[levelIndex]); history = []; active = !showIntro;
    updateUi(); draw();
    if (showIntro) showOverlay('SOKOBAN', 'PUSH EVERY CRATE ONTO A GOAL', 'START'); else hideOverlay();
  }
  function updateUi() {
    ui.level.textContent = `${String(levelIndex + 1).padStart(2,'0')} / ${String(levels.length).padStart(2,'0')}`;
    ui.moves.textContent = String(state.moves).padStart(3,'0'); ui.pushes.textContent = String(state.pushes).padStart(3,'0');
    const best = localStorage.getItem(bestKey()); ui.best.textContent = best === null ? '---' : String(best).padStart(3,'0');
  }
  function showOverlay(title, text, button) { ui.title.textContent=title; ui.text.textContent=text; ui.start.textContent=button; ui.overlay.classList.remove('hide'); }
  function hideOverlay() { ui.overlay.classList.add('hide'); }
  function tileGeometry() {
    const size = Math.floor(Math.min(canvas.width / state.width, canvas.height / state.height));
    return {size, ox: Math.floor((canvas.width-state.width*size)/2), oy: Math.floor((canvas.height-state.height*size)/2)};
  }
  function palette() {
    if(typeof getComputedStyle!=='function') return {board:'#0d151f',floor:'#121c27',wall:'#293746',wallMark:'#384a5b',goal:'#ff668f',box:'#ffb45c',boxGoal:'#64e6e0',player:'#e8f0f7',playerMark:'#070b12'};
    const css=getComputedStyle(document.documentElement), get=(name,fallback)=>css.getPropertyValue(name).trim()||fallback;
    return {board:get('--board','#0d151f'),floor:get('--floor','#121c27'),wall:get('--wall','#293746'),wallMark:get('--wall-mark','#384a5b'),goal:get('--goal','#ff668f'),box:get('--gold','#ffb45c'),boxGoal:get('--cyan','#64e6e0'),player:get('--player','#e8f0f7'),playerMark:get('--bg','#070b12')};
  }
  function draw() {
    const colors=palette(); ctx.fillStyle=colors.board; ctx.fillRect(0,0,canvas.width,canvas.height);
    const g=tileGeometry(), s=g.size;
    for(let y=0;y<state.height;y++) for(let x=0;x<state.width;x++) {
      const k=`${x},${y}`, px=g.ox+x*s, py=g.oy+y*s;
      if(state.walls[k]) { ctx.fillStyle=colors.wall; ctx.fillRect(px+1,py+1,s-2,s-2); ctx.fillStyle=colors.wallMark; ctx.fillRect(px+s*.18,py+s*.18,s*.64,Math.max(2,s*.05)); }
      else if(state.goals[k] || state.boxes[k] || (state.player.x===x&&state.player.y===y)) { ctx.fillStyle=colors.floor; ctx.fillRect(px+1,py+1,s-2,s-2); }
      if(state.goals[k]) { ctx.strokeStyle=colors.goal; ctx.lineWidth=Math.max(2,s*.06);ctx.strokeRect(px+s*.36,py+s*.36,s*.28,s*.28); }
      if(state.boxes[k]) { const onGoal=state.goals[k];ctx.fillStyle=onGoal?colors.boxGoal:colors.box;ctx.fillRect(px+s*.18,py+s*.18,s*.64,s*.64);ctx.strokeStyle=colors.playerMark;ctx.lineWidth=Math.max(1,s*.035);ctx.strokeRect(px+s*.18,py+s*.18,s*.64,s*.64);ctx.beginPath();ctx.moveTo(px+s*.32,py+s*.5);ctx.lineTo(px+s*.68,py+s*.5);ctx.moveTo(px+s*.5,py+s*.32);ctx.lineTo(px+s*.5,py+s*.68);ctx.stroke(); }
    }
    const px=g.ox+state.player.x*s+s/2, py=g.oy+state.player.y*s+s/2;
    ctx.fillStyle=colors.player;ctx.fillRect(px-s*.18,py-s*.18,s*.36,s*.36);ctx.fillStyle=colors.playerMark;ctx.fillRect(px-s*.07,py-s*.07,s*.05,s*.05);ctx.fillRect(px+s*.02,py-s*.07,s*.05,s*.05);
  }
  function attempt(dx,dy) {
    if(!active) { active=true; hideOverlay(); }
    const before=cloneState(state);
    if(!R.move(state,dx,dy)) return;
    history.push(before); updateUi(); draw();
    if(R.isComplete(state)) {
      active=false; const old=Number(localStorage.getItem(bestKey()) || Infinity);
      if(state.moves<old) localStorage.setItem(bestKey(),state.moves);
      const unlocked=Math.max(Number(localStorage.getItem('sokobanUnlocked')||0),Math.min(levels.length-1,levelIndex+1)); localStorage.setItem('sokobanUnlocked',unlocked);
      updateUi(); showOverlay('LEVEL CLEAR',`${state.moves} MOVES · ${state.pushes} PUSHES`,levelIndex===levels.length-1?'PLAY AGAIN':'NEXT LEVEL');
    }
  }
  function undo() { if(!history.length)return; state=history.pop(); active=true; hideOverlay();updateUi();draw(); }
  const directions={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
  window.addEventListener('keydown',e=>{if(directions[e.code]){e.preventDefault();attempt(...directions[e.code]);}else if(e.code==='KeyR')loadLevel(levelIndex);else if(e.code==='KeyZ')undo();});
  document.querySelectorAll('[data-dir]').forEach(button=>button.addEventListener('pointerdown',e=>{e.preventDefault();const map={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};attempt(...map[button.dataset.dir]);}));
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);swipeStart={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;if(Math.abs(dx)>Math.abs(dy))attempt(Math.sign(dx),0);else attempt(0,Math.sign(dy));});
  canvas.addEventListener('pointercancel',()=>swipeStart=null);
  document.getElementById('resetButton').addEventListener('click',()=>loadLevel(levelIndex));
  document.getElementById('undoButton').addEventListener('click',undo);
  document.getElementById('previousButton').addEventListener('click',()=>loadLevel(levelIndex-1));
  document.getElementById('nextButton').addEventListener('click',()=>loadLevel(levelIndex+1));
  ui.start.addEventListener('click',()=>{if(R.isComplete(state))loadLevel(levelIndex===levels.length-1?0:levelIndex+1);else{active=true;hideOverlay();}});
  if(document.addEventListener)document.addEventListener('themechange',draw);
  loadLevel(levelIndex,true);
})();
