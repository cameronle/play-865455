(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,$=id=>document.getElementById(id),GRAVITY=620,LIFT=1050,MIN_GAP=150,MAX_GAP=245;
const ui={distance:$('distance'),best:$('best'),speed:$('speed'),overlay:$('overlay'),message:$('message'),detail:$('detail'),startButton:$('startButton'),pauseButton:$('pauseButton'),thrustButton:$('thrustButton')};
const input={thrust:false};let state='title',paused=false,helicopter,cave=[],obstacles=[],particles=[],distance=0,best=+localStorage.getItem('helicopterCaveBest')||0,scrollSpeed=185,last=0,nextObstacle=900,caveCursor=0;
function generateCaveSegment(){const previous=cave.length?cave[cave.length-1]:{x:0,center:H/2,gap:MAX_GAP},difficulty=Math.min(1,distance/8000),gap=Math.max(MIN_GAP,Math.min(MAX_GAP,previous.gap-(Math.random()*5+difficulty*1.5))),maxShift=20+difficulty*8,center=Math.max(gap/2+28,Math.min(H-gap/2-28,previous.center+(Math.random()-.5)*maxShift*2)),segment={x:previous.x+48,center,gap};cave.push(segment);return segment}
function fillCave(){while(!cave.length||cave[cave.length-1].x<W+300)generateCaveSegment()}
function start(){state='playing';paused=false;distance=0;scrollSpeed=185;nextObstacle=900;caveCursor=0;cave=[{x:-50,center:H/2,gap:MAX_GAP}];fillCave();obstacles=[];particles=[];helicopter={x:145,y:H/2,w:48,h:25,vy:0,rotor:0};input.thrust=false;ui.thrustButton.classList.remove('active');ui.pauseButton.textContent='PAUSE';hideOverlay();updateHud();last=performance.now()}
function showOverlay(title,detail,button){ui.message.textContent=title;ui.detail.textContent=detail;ui.startButton.textContent=button;ui.overlay.classList.remove('hidden')}
function hideOverlay(){ui.overlay.classList.add('hidden')}
function togglePause(){if(state!=='playing')return;paused=!paused;ui.pauseButton.textContent=paused?'RESUME':'PAUSE';if(paused)showOverlay('PAUSED','THE CAVE IS WAITING','RESUME');else{hideOverlay();last=performance.now()}}
function gameOver(){if(state!=='playing')return;state='over';paused=false;input.thrust=false;ui.thrustButton.classList.remove('active');const metres=Math.floor(distance);if(metres>best){best=metres;localStorage.setItem('helicopterCaveBest',String(best))}burst(helicopter.x,helicopter.y,'#ff6b7a',34);updateHud();showOverlay('CRASHED',`DISTANCE ${metres}m · SPEED ${(scrollSpeed/185).toFixed(2)}×`,'FLY AGAIN')}
function caveBoundsAt(x){for(let i=1;i<cave.length;i++)if(x<=cave[i].x){const a=cave[i-1],b=cave[i],t=(x-a.x)/Math.max(1,b.x-a.x),center=a.center+(b.center-a.center)*t,gap=a.gap+(b.gap-a.gap)*t;return{top:center-gap/2,bottom:center+gap/2}}return{top:0,bottom:H}}
function spawnObstacle(){const x=W+80,bounds=caveBoundsAt(W-30),available=bounds.bottom-bounds.top;if(available<MIN_GAP+25)return;const fromTop=Math.random()<.5,height=Math.min(82,available*.32),y=fromTop?bounds.top:bounds.bottom-height;obstacles.push({x,y,w:24+Math.random()*22,h:height,passed:false})}
function checkCollision(){const left=helicopter.x-helicopter.w/2,right=helicopter.x+helicopter.w/2,top=helicopter.y-helicopter.h/2,bottom=helicopter.y+helicopter.h/2,b1=caveBoundsAt(left),b2=caveBoundsAt(right);if(top<=Math.max(b1.top,b2.top)||bottom>=Math.min(b1.bottom,b2.bottom))return true;return obstacles.some(o=>right>o.x&&left<o.x+o.w&&bottom>o.y&&top<o.y+o.h)}
function update(dt){if(state!=='playing'||paused)return;scrollSpeed=Math.min(390,185+distance*.055);helicopter.vy+=(GRAVITY-(input.thrust?LIFT:0))*dt;helicopter.vy=Math.max(-310,Math.min(360,helicopter.vy));helicopter.y+=helicopter.vy*dt;helicopter.rotor+=dt*25;const dx=scrollSpeed*dt;distance+=dx/12;cave.forEach(s=>s.x-=dx);obstacles.forEach(o=>o.x-=dx);cave=cave.filter((s,i)=>i===cave.length-1||s.x>-100);fillCave();obstacles=obstacles.filter(o=>o.x+o.w>-40);nextObstacle-=dx;if(nextObstacle<=0){spawnObstacle();nextObstacle=550+Math.random()*430-Math.min(150,distance*.03)}particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);if(input.thrust&&Math.random()<.75)particles.push({x:helicopter.x-21,y:helicopter.y+9,vx:-70-Math.random()*45,vy:20+Math.random()*35,life:.2,color:'#ffb45c'});if(checkCollision())gameOver();updateHud()}
function updateHud(){ui.distance.textContent=String(Math.floor(distance)).padStart(5,'0')+'m';ui.best.textContent=String(best).padStart(5,'0')+'m';ui.speed.textContent=(scrollSpeed/185).toFixed(2)+'×'}
function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.5)*210,life:.45+Math.random()*.6,color})}
function draw(){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  ctx.fillStyle=isLight ? '#f7f4ec' : '#061019';ctx.fillRect(0,0,W,H);
  drawCave();drawObstacles();
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x-2,p.y-2,4,4)});
  ctx.globalAlpha=1;
  if(state!=='over')drawHelicopter();
  if(paused){ctx.fillStyle=isLight ? '#f5f1e8aa' : '#070b1299';ctx.fillRect(0,0,W,H)}
}
function drawCave(){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  ctx.fillStyle=isLight ? '#d8d0c5' : '#132633';
  ctx.beginPath();ctx.moveTo(0,0);cave.forEach((s,i)=>{const y=s.center-s.gap/2;i?ctx.lineTo(s.x,y):ctx.lineTo(s.x,y)});ctx.lineTo(W,0);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(0,H);cave.forEach(s=>ctx.lineTo(s.x,s.center+s.gap/2));ctx.lineTo(W,H);ctx.closePath();ctx.fill();
  ctx.strokeStyle=isLight ? '#0288d1' : '#64e6e0';ctx.lineWidth=2;
  ctx.beginPath();cave.forEach((s,i)=>i?ctx.lineTo(s.x,s.center-s.gap/2):ctx.moveTo(s.x,s.center-s.gap/2));ctx.stroke();
  ctx.beginPath();cave.forEach((s,i)=>i?ctx.lineTo(s.x,s.center+s.gap/2):ctx.moveTo(s.x,s.center+s.gap/2));ctx.stroke();
}
function drawObstacles(){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  obstacles.forEach(o=>{
    ctx.fillStyle=isLight ? '#e63946' : '#ff6b7a';ctx.fillRect(o.x,o.y,o.w,o.h);
    ctx.fillStyle=isLight ? '#f7f4ec' : '#0b111a';
    for(let y=o.y+8;y<o.y+o.h;y+=15)ctx.fillRect(o.x+5,y,o.w-10,4)
  })
}
function drawHelicopter(){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  ctx.save();ctx.translate(helicopter.x,helicopter.y);
  ctx.rotate(Math.max(-.22,Math.min(.22,helicopter.vy/700)));
  ctx.fillStyle=isLight ? '#3e3934' : '#e8f0f7';ctx.fillRect(-19,-9,32,18);
  ctx.fillStyle=isLight ? '#0288d1' : '#64e6e0';ctx.fillRect(-12,-6,12,8);
  ctx.fillStyle=isLight ? '#3e3934' : '#e8f0f7';ctx.fillRect(13,-3,20,6);ctx.fillRect(27,-10,4,20);
  ctx.strokeStyle=isLight ? '#f77f00' : '#ffb45c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-25,-13);ctx.lineTo(21,-13);ctx.stroke();
  ctx.fillStyle=isLight ? '#f77f00' : '#ffb45c';ctx.fillRect(-17,10,4,5);ctx.fillRect(7,10,4,5);ctx.restore();
}
function loop(time){const dt=Math.min(.033,(time-last)/1000||0);last=time;update(dt);draw();requestAnimationFrame(loop)}
function setThrust(value,event){event?.preventDefault();if(value&&state!=='playing')start();input.thrust=value;ui.thrustButton.classList.toggle('active',value)}
ui.thrustButton.addEventListener('selectstart',event=>event.preventDefault());ui.thrustButton.addEventListener('contextmenu',event=>event.preventDefault());ui.thrustButton.addEventListener('pointerdown',event=>{setThrust(true,event);ui.thrustButton.setPointerCapture?.(event.pointerId)});['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(type=>ui.thrustButton.addEventListener(type,event=>setThrust(false,event)));canvas.addEventListener('pointerdown',event=>{setThrust(true,event);canvas.setPointerCapture?.(event.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,event=>setThrust(false,event)));
addEventListener('keydown',event=>{if(event.code==='Space'){event.preventDefault();if(!event.repeat)setThrust(true,event)}if(event.key.toLowerCase()==='p')togglePause()});addEventListener('keyup',event=>{if(event.code==='Space')setThrust(false,event)});ui.startButton.onclick=()=>paused?togglePause():start();ui.pauseButton.onclick=togglePause;document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause()});
helicopter={x:145,y:H/2,w:48,h:25,vy:0,rotor:0};cave=[{x:-50,center:H/2,gap:MAX_GAP},{x:W+50,center:H/2,gap:MAX_GAP}];showOverlay('HELICOPTER CAVE','HOLD TO RISE · RELEASE TO FALL','START');updateHud();requestAnimationFrame(loop)})();
