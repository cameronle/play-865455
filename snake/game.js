(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const COLS = 20, ROWS = 20, CELL = 20;
  const $ = id => document.getElementById(id);
  const scoreEl=$('score'), highScoreEl=$('highScore'), speedEl=$('speed');
  const message=$('message'), messageTitle=$('messageTitle'), messageHint=$('messageHint');
  let snake, food, direction, nextDirection, score=0, highScore=Number(localStorage.getItem('classic-snake-high-score')||0);
  let state='title', timer=0, last=0, stepMs=145;
  highScoreEl.textContent=String(highScore).padStart(6,'0');

  function key(x,y){return x+','+y}
  function wrap(value,max){return (value+max)%max}
  function randomFood(){
    const occupied=new Set(snake.map(part=>key(part.x,part.y)));
    const free=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!occupied.has(key(x,y)))free.push({x,y});
    return free.length?free[Math.floor(Math.random()*free.length)]:null;
  }
  function reset(){
    snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10},{x:7,y:10}];
    direction={x:1,y:0};nextDirection={x:1,y:0};food=randomFood();score=0;timer=0;stepMs=145;updateHud();draw();
  }
  function updateHud(){scoreEl.textContent=String(score).padStart(6,'0');highScoreEl.textContent=String(highScore).padStart(6,'0');speedEl.textContent=String(Math.max(1,Math.floor((145-stepMs)/10)+1)).padStart(2,'0')}
  function showMessage(title,hint,button='START'){messageTitle.textContent=title;messageHint.textContent=hint;$('startButton').textContent=button;message.classList.remove('hidden')}
  function hideMessage(){message.classList.add('hidden')}
  function start(){reset();state='playing';hideMessage()}
  function pause(){if(state==='playing'){state='paused';showMessage('PAUSED','PRESS P OR RESUME','RESUME')}else if(state==='paused'){state='playing';hideMessage()}}
  function gameOver(){state='over';if(score>highScore){highScore=score;localStorage.setItem('classic-snake-high-score',String(highScore))}updateHud();showMessage('GAME OVER','SCORE '+String(score).padStart(6,'0'),'PLAY AGAIN')}
  function gameWon(){state='won';if(score>highScore){highScore=score;localStorage.setItem('classic-snake-high-score',String(highScore))}updateHud();showMessage('YOU WIN','BOARD COMPLETE · SCORE '+String(score).padStart(6,'0'),'PLAY AGAIN')}
  function setDirection(x,y){
    if(state!=='playing')return;
    if(x===-direction.x&&y===-direction.y)return;
    if(x===-nextDirection.x&&y===-nextDirection.y)return;
    nextDirection={x,y};
  }
  function tick(){
    direction=nextDirection;
    const head=snake[0];
    const next={x:wrap(head.x+direction.x,COLS),y:wrap(head.y+direction.y,ROWS)};
    const eating=food&&next.x===food.x&&next.y===food.y;
    const body=eating?snake:snake.slice(0,-1);
    if(body.some(part=>part.x===next.x&&part.y===next.y)){gameOver();return}
    snake.unshift(next);
    if(eating){score+=10;if(score>highScore)highScore=score;stepMs=Math.max(65,145-Math.floor(score/50)*5);food=randomFood();updateHud();if(!food)gameWon()}else snake.pop();
  }
  function drawCell(x,y,color,inset=2){ctx.fillStyle=color;ctx.fillRect(x*CELL+inset,y*CELL+inset,CELL-inset*2,CELL-inset*2)}
  function themeColor(name,fallback){if(typeof getComputedStyle!=='function')return fallback;const value=getComputedStyle(document.documentElement).getPropertyValue(name).trim();return value||fallback}
  function draw(){
    ctx.fillStyle=themeColor('--canvas-bg','#ded8cc');ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle=themeColor('--canvas-grid','rgba(62,57,52,.06)');ctx.lineWidth=1;for(let i=1;i<COLS;i++){ctx.beginPath();ctx.moveTo(i*CELL+.5,0);ctx.lineTo(i*CELL+.5,canvas.height);ctx.stroke()}for(let i=1;i<ROWS;i++){ctx.beginPath();ctx.moveTo(0,i*CELL+.5);ctx.lineTo(canvas.width,i*CELL+.5);ctx.stroke()}
    if(food){drawCell(food.x,food.y,'#d86c66',3);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(food.x*CELL+6,food.y*CELL+5,4,4)}
    snake.forEach((part,index)=>{drawCell(part.x,part.y,index===0?'#558d62':'#70a879',index===0?2:3);if(index===0){ctx.fillStyle=themeColor('--snake-eye','#faf8ef');const eyeX=part.x*CELL+(direction.x>=0?13:4),eyeY=part.y*CELL+(direction.y>=0?13:4);ctx.fillRect(eyeX,eyeY,3,3)}});
  }
  function action(name){if(name==='up')setDirection(0,-1);if(name==='down')setDirection(0,1);if(name==='left')setDirection(-1,0);if(name==='right')setDirection(1,0)}
  function loop(time){const dt=Math.min(100,time-last||0);last=time;if(state==='playing'){timer+=dt;if(timer>=stepMs){timer=0;tick();draw()}}requestAnimationFrame(loop)}

  $('startButton').addEventListener('click',()=>{if(state==='paused')pause();else start()});$('newGameButton').addEventListener('click',start);$('pauseButton').addEventListener('click',pause);
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','p','P'].includes(e.key))e.preventDefault();if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')action('up');if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')action('down');if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')action('left');if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')action('right');if(e.key==='p'||e.key==='P')pause()});
  document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('pointerdown',e=>{e.preventDefault();action(button.dataset.action)}));
  if(document.addEventListener)document.addEventListener('themechange',draw);
  reset();showMessage('SNAKE','PRESS START TO PLAY','START');requestAnimationFrame(loop);
})();
