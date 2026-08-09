(() => {
  'use strict';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  const $=id=>document.getElementById(id), ui={score:$('score'),level:$('level'),lives:$('lives'),overlay:$('overlay'),title:$('overlayTitle'),text:$('overlayText'),start:$('startButton'),pause:$('pauseButton')};
  const COLS=9,ROWS=12,CELL=W/COLS,MAX_LEVEL=8;
  let lanes=[],player,score=0,level=1,lives=3,state='title',last=0,moveLock=0,deathTimer=0,goalFlash=0;
  const palettes=['#ff7088','#ffb45c','#73f0b0','#69c6ff','#c894ff'];
  const rowY=r=>r*H/ROWS, cellH=H/ROWS;
  function makeLanes(){
    lanes=[];
    for(let row=2;row<=9;row++){
      const rest=row===5||row===8;
      if(rest){lanes.push({row,safe:true,dir:0,speed:0,cars:[]});continue;}
      const dir=(row+level)%2?1:-1, speed=(55+level*13+(row%3)*18)*dir, count=2+((row+level)%2), gap=W/count;
      const cars=[];for(let i=0;i<count;i++)cars.push({x:(i*gap+(row*43+level*29)%Math.floor(gap)),w:CELL*(.8+((row+i)%2)*.35),color:palettes[(row+i+level)%palettes.length]});
      lanes.push({row,safe:false,dir,speed,cars});
    }
    return lanes;
  }
  window.makeLanes=makeLanes;
  function spawn(){player={col:4,row:11,x:4*CELL+CELL/2,y:rowY(11)+cellH/2,r:17,alive:true};moveLock=0;}
  function hud(){ui.score.textContent=String(score).padStart(6,'0');ui.level.textContent=String(level).padStart(2,'0')+' / '+String(MAX_LEVEL).padStart(2,'0');ui.lives.textContent=Array(Math.max(0,lives)).fill('♥').join(' ')||'—';}
  function reset(){score=0;level=1;lives=3;makeLanes();spawn();hud();state='playing';ui.overlay.classList.add('hide');ui.pause.textContent='PAUSE';}
  function show(title,text,button){ui.title.textContent=title;ui.text.textContent=text;ui.start.textContent=button;ui.overlay.classList.remove('hide');}
  function action(){if(state==='title'||state==='over'||state==='won')reset();else if(state==='paused')togglePause();}
  function togglePause(){if(state==='playing'){state='paused';show('PAUSED','TRAFFIC HELD','RESUME');ui.pause.textContent='RESUME';}else if(state==='paused'){state='playing';ui.overlay.classList.add('hide');ui.pause.textContent='PAUSE';last=performance.now();}}
  function move(dir){
    if(state==='title'||state==='over'||state==='won')reset();if(state!=='playing'||!player.alive||moveLock>0)return;
    const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir];if(!d)return;
    const nc=Math.max(0,Math.min(COLS-1,player.col+d[0])),nr=Math.max(0,Math.min(ROWS-1,player.row+d[1]));if(nc===player.col&&nr===player.row)return;
    player.col=nc;player.row=nr;player.x=nc*CELL+CELL/2;player.y=rowY(nr)+cellH/2;moveLock=.075;
    if(dir==='up')score+=10;
    if(player.row===0){score+=500+level*100;goalFlash=.7;level++;if(level>MAX_LEVEL){state='won';hud();show('CITY CROSSED',`FINAL SCORE ${score}`,'CROSS AGAIN');}else{makeLanes();spawn();hud();}}
    hud();
  }
  function hit(){if(!player.alive)return;player.alive=false;deathTimer=.65;lives--;hud();if(navigator.vibrate)navigator.vibrate(80);}
  function update(dt){
    moveLock=Math.max(0,moveLock-dt);goalFlash=Math.max(0,goalFlash-dt);
    for(const lane of lanes){if(lane.safe)continue;for(const car of lane.cars){car.x+=lane.speed*dt;if(lane.speed>0&&car.x>W+car.w/2)car.x=-car.w/2;if(lane.speed<0&&car.x<-car.w/2)car.x=W+car.w/2;}}
    if(!player.alive){deathTimer-=dt;if(deathTimer<=0){if(lives<=0){state='over';show('CROSSING CLOSED',`SCORE ${String(score).padStart(6,'0')}`,'TRY AGAIN');}else spawn();}return;}
    const lane=lanes.find(l=>l.row===player.row);if(lane&&!lane.safe){for(const car of lane.cars){let dx=Math.abs(player.x-car.x);dx=Math.min(dx,W-dx);if(dx<car.w/2+player.r-4){hit();break;}}}
  }
  function drawRoad(){
    ctx.fillStyle='#071017';ctx.fillRect(0,0,W,H);
    for(let r=0;r<ROWS;r++){const y=rowY(r);if(r===0){ctx.fillStyle='#123128';ctx.fillRect(0,y,W,cellH);}else if(r===1||r===10||r===11||r===5||r===8){ctx.fillStyle=r===1||r===10||r===11?'#14212a':'#10251f';ctx.fillRect(0,y,W,cellH);}else{ctx.fillStyle=r%2?'#101722':'#0d141d';ctx.fillRect(0,y,W,cellH);ctx.strokeStyle='#293542';ctx.setLineDash([19,16]);ctx.beginPath();ctx.moveTo(0,y+cellH/2);ctx.lineTo(W,y+cellH/2);ctx.stroke();ctx.setLineDash([]);}}
    ctx.fillStyle=goalFlash?'#e8f0f7':'#73f0b0';for(let x=10;x<W;x+=32)ctx.fillRect(x,8,16,5);
    ctx.fillStyle='#748394';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('EXIT',W/2,34);ctx.fillText('START',W/2,H-14);
  }
  function drawCars(){for(const lane of lanes){if(lane.safe)continue;for(const car of lane.cars){ctx.save();ctx.translate(car.x,rowY(lane.row)+cellH/2);ctx.fillStyle='#020508';ctx.fillRect(-car.w/2+3,-17,car.w,34);ctx.fillStyle=car.color;ctx.fillRect(-car.w/2,-14,car.w,28);ctx.fillStyle='#172733';ctx.fillRect(-car.w*.18,-11,car.w*.36,22);ctx.fillStyle=lane.dir>0?'#ffe9a3':'#ff7088';const nose=lane.dir>0?car.w/2-4:-car.w/2;ctx.fillRect(nose-2,-9,4,5);ctx.fillRect(nose-2,4,4,5);ctx.restore();}}}
  function drawPlayer(){if(!player||(!player.alive&&Math.floor(deathTimer*14)%2===0))return;ctx.save();ctx.translate(player.x,player.y);ctx.fillStyle='#030708';ctx.beginPath();ctx.arc(3,3,player.r+2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8f0f7';ctx.beginPath();ctx.arc(0,-5,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#73f0b0';ctx.lineWidth=5;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(0,14);ctx.moveTo(0,7);ctx.lineTo(-10,13);ctx.moveTo(0,7);ctx.lineTo(10,13);ctx.stroke();ctx.restore();}
  function draw(){drawRoad();drawCars();drawPlayer();ctx.strokeStyle='#263746';ctx.lineWidth=2;ctx.strokeRect(1,1,W-2,H-2);}
  function loop(t){const dt=Math.min(.04,(t-last)/1000||0);last=t;if(state==='playing')update(dt);draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
  const codes={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
  addEventListener('keydown',e=>{if(codes[e.code]){move(codes[e.code]);e.preventDefault();}if(e.code==='KeyP'||e.code==='Escape'){togglePause();e.preventDefault();}if(e.code==='Enter')action();});
  document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();move(b.dataset.dir);}));
  let swipe=null;canvas.addEventListener('pointerdown',e=>{e.preventDefault();swipe={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId);}catch(_){}});canvas.addEventListener('pointerup',e=>{if(!swipe)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.max(Math.abs(dx),Math.abs(dy))<16){move('up');return;}move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});canvas.addEventListener('pointercancel',()=>swipe=null);
  ui.start.addEventListener('click',action);ui.pause.addEventListener('click',()=>state==='title'?action():togglePause());document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause();});
  makeLanes();spawn();hud();draw();
})();
