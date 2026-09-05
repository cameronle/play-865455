(() => {
  'use strict';

  const boardCanvas = document.getElementById('board');
  const nextCanvas = document.getElementById('next');
  const ctx = boardCanvas.getContext('2d');
  const nextCtx = nextCanvas.getContext('2d');
  const COLS = 10, ROWS = 20, CELL = 30;
  const COLORS = {I:'#55b7c8',J:'#5b78c8',L:'#e69b52',O:'#e2c45d',S:'#7eb96a',T:'#aa78b8',Z:'#d86c66'};
  const SHAPES = {
    I:[[1,1,1,1]], J:[[1,0,0],[1,1,1]], L:[[0,0,1],[1,1,1]], O:[[1,1],[1,1]],
    S:[[0,1,1],[1,1,0]], T:[[0,1,0],[1,1,1]], Z:[[1,1,0],[0,1,1]]
  };
  const TYPES = Object.keys(SHAPES);
  const $ = id => document.getElementById(id);
  const scoreEl=$('score'), highScoreEl=$('highScore'), levelEl=$('level'), linesEl=$('lines');
  const message=$('message'), messageTitle=$('messageTitle'), messageHint=$('messageHint');
  function cssValue(name,fallback){if(typeof getComputedStyle!=='function')return fallback;return getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback}
  let grid, piece, nextType, score=0, highScore=Number(localStorage.getItem('classic-tetris-high-score')||0), level=1, lines=0;
  let state='title', dropTimer=0, lastTime=0, softDropRequested=false, softDropHeld=false;
  highScoreEl.textContent=String(highScore).padStart(6,'0');

  function emptyGrid(){return Array.from({length:ROWS},()=>Array(COLS).fill(null))}
  function randomType(){return TYPES[Math.floor(Math.random()*TYPES.length)]}
  function cloneMatrix(m){return m.map(row=>row.slice())}
  function rotate(matrix){return matrix[0].map((_,i)=>matrix.map(row=>row[i]).reverse())}
  function newPiece(type=randomType()){
    const matrix=cloneMatrix(SHAPES[type]);
    return {type,matrix,x:Math.floor((COLS-matrix[0].length)/2),y:0};
  }
  function collides(p,dx=0,dy=0,matrix=p.matrix){
    for(let y=0;y<matrix.length;y++) for(let x=0;x<matrix[y].length;x++) if(matrix[y][x]){
      const nx=p.x+x+dx, ny=p.y+y+dy;
      if(nx<0||nx>=COLS||ny>=ROWS||(ny>=0&&grid[ny][nx])) return true;
    }
    return false;
  }
  function drawCell(context,x,y,color,size){
    const pad=Math.max(1,size*.08); context.fillStyle=color;context.fillRect(x*size+pad,y*size+pad,size-pad*2,size-pad*2);
    context.fillStyle='rgba(255,255,255,.22)';context.fillRect(x*size+pad,y*size+pad,size-pad*2,Math.max(2,size*.1));
    context.strokeStyle=cssValue('--canvas-grid','rgba(62,57,52,.14)');context.strokeRect(x*size+pad+.5,y*size+pad+.5,size-pad*2-1,size-pad*2-1);
  }
  function draw(){
    ctx.fillStyle=cssValue('--canvas-bg','#d8d1c5');ctx.fillRect(0,0,boardCanvas.width,boardCanvas.height);
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) if(grid[y][x]) drawCell(ctx,x,y,COLORS[grid[y][x]],CELL);
    if(piece){
      const ghost={...piece,y:piece.y};while(!collides(ghost,0,1))ghost.y++;
      piece.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v){ctx.globalAlpha=.12;drawCell(ctx,piece.x+x,ghost.y+y,COLORS[piece.type],CELL);ctx.globalAlpha=1}}));
      piece.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v)drawCell(ctx,piece.x+x,piece.y+y,COLORS[piece.type],CELL)}));
    }
    nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);if(nextType){const m=SHAPES[nextType],size=22,ox=(nextCanvas.width-m[0].length*size)/2,oy=(nextCanvas.height-m.length*size)/2; m.forEach((row,y)=>row.forEach((v,x)=>{if(v){nextCtx.save();nextCtx.translate(ox,oy);drawCell(nextCtx,x,y,COLORS[nextType],size);nextCtx.restore()}}))}
  }
  function updateHud(){scoreEl.textContent=String(score).padStart(6,'0');highScoreEl.textContent=String(highScore).padStart(6,'0');levelEl.textContent=String(level).padStart(2,'0');linesEl.textContent=String(lines).padStart(3,'0')}
  function addScore(points){score+=points;if(score>highScore)highScore=score;updateHud()}
  function showMessage(title,hint,button='START'){messageTitle.textContent=title;messageHint.textContent=hint;document.getElementById('startButton').textContent=button;message.classList.remove('hidden')}
  function hideMessage(){message.classList.add('hidden')}
  function start(){grid=emptyGrid();score=0;level=1;lines=0;nextType=randomType();piece=newPiece();state='playing';dropTimer=0;softDropRequested=false;softDropHeld=false;hideMessage();updateHud();draw()}
  function pause(){if(state==='playing'){state='paused';showMessage('PAUSED','PRESS P OR RESUME','RESUME')}else if(state==='paused'){state='playing';hideMessage()}}
  function gameOver(){state='over';if(score>highScore){highScore=score;localStorage.setItem('classic-tetris-high-score',String(highScore))}updateHud();showMessage('GAME OVER','FINAL SCORE '+String(score).padStart(6,'0'),'PLAY AGAIN')}
  function lock(){piece.matrix.forEach((row,y)=>row.forEach((v,x)=>{if(v&&piece.y+y>=0)grid[piece.y+y][piece.x+x]=piece.type}));clearLines();piece=newPiece(nextType);nextType=randomType();softDropRequested=false;if(collides(piece))gameOver()}
  function clearLines(){let count=0;grid=grid.filter(row=>{if(row.every(Boolean)){count++;return false}return true});while(grid.length<ROWS)grid.unshift(Array(COLS).fill(null));if(count){const points=[0,100,300,500,800][count];lines+=count;level=Math.floor(lines/10)+1;addScore(points*level)}}
  function stepDown(){if(!collides(piece,0,1)){piece.y++;return true}lock();return false}
  function move(dx){if(state==='playing'&&!collides(piece,dx,0)){piece.x+=dx;draw()}}
  function turn(){if(state!=='playing')return;const rotated=rotate(piece.matrix);for(const kick of [0,-1,1,-2,2])if(!collides(piece,kick,0,rotated)){piece.matrix=rotated;piece.x+=kick;draw();return}}
  function hardDrop(){if(state!=='playing')return;let distance=0;while(!collides(piece,0,1)){piece.y++;distance++}addScore(distance*2);lock();draw()}
  function tick(time){const dt=Math.min(100,lastTime?time-lastTime:0);lastTime=time;if(state==='playing'){dropTimer+=dt;const interval=Math.max(80,800-(level-1)*65);if(dropTimer>=interval){dropTimer=0;stepDown()}if(softDropRequested&&stepDown())addScore(1);if(softDropRequested)dropTimer=0;draw()}requestAnimationFrame(tick)}
  function beginSoftDrop(){if(softDropHeld||state!=='playing'||!piece)return;softDropHeld=true;softDropRequested=true;if(stepDown())addScore(1);draw()}
  function endSoftDrop(){softDropHeld=false;softDropRequested=false}
  function action(name){
    if(state!=='playing'||!piece)return;
    if(name==='left')move(-1);if(name==='right')move(1);if(name==='rotate')turn();
    if(name==='down'){if(stepDown())addScore(1);draw()}
    if(name==='drop')hardDrop();
  }

  $('startButton').addEventListener('click',()=>{if(state==='paused')pause();else start()});$('newGameButton').addEventListener('click',start);$('pauseButton').addEventListener('click',pause);
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','p','P'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft'||e.key==='a')action('left');if(e.key==='ArrowRight'||e.key==='d')action('right');if(e.key==='ArrowUp'||e.key==='w')action('rotate');if(e.key==='ArrowDown'||e.key==='s')beginSoftDrop();if(e.key===' ')action('drop');if(e.key==='p'||e.key==='P')pause()});window.addEventListener('keyup',e=>{if(e.key==='ArrowDown'||e.key==='s')endSoftDrop()});
  document.querySelectorAll('[data-action]').forEach(button=>{
    const name=button.dataset.action;
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(name==='down')beginSoftDrop();else action(name)});
    if(name==='down'){
      const stop=e=>{e.preventDefault();softDropRequested=false;softDropHeld=false};
      button.addEventListener('pointerup',stop);
      button.addEventListener('pointercancel',stop);
      button.addEventListener('pointerleave',stop);
    }
  });
  if(document.addEventListener)document.addEventListener('themechange',draw);
  grid=emptyGrid();piece=null;nextType=randomType();updateHud();draw();requestAnimationFrame(tick);
})();
