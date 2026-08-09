(() => {
  'use strict';
  const R = window.SokobanRules;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const ui = {
    level: document.getElementById('level'), moves: document.getElementById('moves'), pushes: document.getElementById('pushes'), best: document.getElementById('best'),
    overlay: document.getElementById('overlay'), title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'), start: document.getElementById('startButton')
  };
  const levels = [
    ['  #####','###   #','#.@$  #','### $.#','#.##$ #','# # . ##','#$ *$$.#','#   .  #','########'],
    [' ####','##  ####','#     .#','#.$#$  #','#  @$$.#','#  #  .#','########'],
    ['  #####','###   #','# . $ #','# #$###','# .@  #','## $  #',' # .###',' #####'],
    ['########','#  . . #','# $$#$ #','#  #   #','## # ###','#  @   #','#  . $.#','########'],
    [' ######','#    .#','# ##$ #','# $   #','##$# ##','# .@. #','#######'],
    ['########','# .  . #','# $$   #','### # ##','#   #  #','# $  @ #','# .    #','########'],
    [' #######','##     #','# .### #','# $  $ #','## #   #','# .# $##','#  @ .#','#######'],
    ['########','#  . . #','# #$#$ #','# $   .#','## # ###','#  $ @ #','# .    #','########']
  ];
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
  function roundedRect(x,y,w,h,r) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); }
  function draw() {
    ctx.fillStyle='#0b111a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const g=tileGeometry(), s=g.size;
    for(let y=0;y<state.height;y++) for(let x=0;x<state.width;x++) {
      const k=`${x},${y}`, px=g.ox+x*s, py=g.oy+y*s;
      if(state.walls[k]) { ctx.fillStyle='#243241'; ctx.fillRect(px+1,py+1,s-2,s-2); ctx.fillStyle='#314457'; ctx.fillRect(px+4,py+4,s-8,4); }
      else if(state.goals[k] || state.boxes[k] || (state.player.x===x&&state.player.y===y)) { ctx.fillStyle='#101923'; ctx.fillRect(px+1,py+1,s-2,s-2); }
      if(state.goals[k]) { ctx.strokeStyle='#ff668f'; ctx.lineWidth=Math.max(2,s*.06); ctx.beginPath();ctx.arc(px+s/2,py+s/2,s*.16,0,Math.PI*2);ctx.stroke(); ctx.beginPath();ctx.moveTo(px+s*.4,py+s/2);ctx.lineTo(px+s*.6,py+s/2);ctx.stroke(); }
      if(state.boxes[k]) { const onGoal=state.goals[k]; ctx.fillStyle=onGoal?'#64e6e0':'#ffb45c'; roundedRect(px+s*.16,py+s*.16,s*.68,s*.68,s*.07);ctx.fill();ctx.strokeStyle=onGoal?'#2a8d8a':'#aa6e2d';ctx.lineWidth=Math.max(2,s*.05);ctx.stroke();ctx.beginPath();ctx.moveTo(px+s*.3,py+s*.3);ctx.lineTo(px+s*.7,py+s*.7);ctx.moveTo(px+s*.7,py+s*.3);ctx.lineTo(px+s*.3,py+s*.7);ctx.stroke(); }
    }
    const px=g.ox+state.player.x*s+s/2, py=g.oy+state.player.y*s+s/2;
    ctx.fillStyle='#e8f0f7';ctx.beginPath();ctx.arc(px,py-s*.08,s*.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#64e6e0';ctx.fillRect(px-s*.16,py+s*.12,s*.32,s*.2);ctx.fillStyle='#091018';ctx.fillRect(px-s*.08,py-s*.12,s*.05,s*.05);ctx.fillRect(px+s*.04,py-s*.12,s*.05,s*.05);
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
  loadLevel(levelIndex,true);
})();
