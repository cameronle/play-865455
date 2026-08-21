(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,$=id=>document.getElementById(id),GRAVITY=1500;
const ui={score:$('score'),best:$('best'),height:$('height'),overlay:$('overlay'),message:$('message'),detail:$('detail'),start:$('startButton'),pause:$('pauseButton')};
const input={left:false,right:false};let state='title',paused=false,player,platforms=[],particles=[],cameraY=0,highest=0,score=0,best=+localStorage.getItem('skyHopperBest')||0,last=0,nextPlatformY=0,runId=0;
function platformType(height){const roll=Math.random(),difficulty=Math.min(.35,height/9000);if(roll<.08+difficulty*.12)return'breaking';if(roll<.17+difficulty*.12)return'moving';if(roll<.23)return'spring';if(roll<.29+difficulty*.08)return'fading';return'normal'}
function makePlatform(y,forced){const type=forced||platformType(-y),w=type==='breaking'?68:78+Math.random()*38;return{x:12+Math.random()*(W-w-24),y,w,h:10,type,vx:type==='moving'?(Math.random()<.5?-1:1)*(45+Math.random()*35):0,broken:false,touched:false,alpha:1}}
function generatePlatforms(){while(nextPlatformY>cameraY-900){const height=-nextPlatformY,gap=72+Math.min(42,height/350);nextPlatformY-=gap+Math.random()*34;platforms.push(makePlatform(nextPlatformY))}}
function reset(){runId++;cameraY=0;highest=0;score=0;particles=[];platforms=[{x:155,y:650,w:170,h:12,type:'normal',vx:0,broken:false,touched:false,alpha:1}];nextPlatformY=600;for(let y=560;y>-220;y-=85+Math.random()*26)platforms.push(makePlatform(y,y>440?'normal':null));nextPlatformY=Math.min(...platforms.map(p=>p.y))-70;player={x:W/2-14,y:590,w:28,h:34,vx:0,vy:-640};generatePlatforms();state='playing';paused=false;ui.pause.textContent='PAUSE';hideOverlay();updateHud();last=performance.now()}
function start(){reset()}
function showOverlay(title,detail,button){ui.message.textContent=title;ui.detail.textContent=detail;ui.start.textContent=button;ui.overlay.classList.remove('hidden')}
function hideOverlay(){ui.overlay.classList.add('hidden')}
function togglePause(){if(state!=='playing')return;paused=!paused;ui.pause.textContent=paused?'RESUME':'PAUSE';if(paused)showOverlay('PAUSED','THE SKY IS WAITING','RESUME');else{hideOverlay();last=performance.now()}}
function gameOver(){if(state!=='playing')return;state='over';paused=false;if(score>best){best=score;localStorage.setItem('skyHopperBest',String(best))}updateHud();showOverlay('FALLEN',`HEIGHT ${Math.floor(highest/10)}m · SCORE ${score}`,'TRY AGAIN')}
function landOnPlatform(platform,previousBottom){if(player.vy<=0||platform.broken||platform.alpha<=.15)return false;const worldBottom=player.y+player.h+cameraY;if(previousBottom>platform.y+3||worldBottom<platform.y||player.x+player.w<platform.x||player.x>platform.x+platform.w)return false;player.y=platform.y-cameraY-player.h;player.vy=platform.type==='spring'?-900:-670;platform.touched=true;if(platform.type==='breaking')platform.breakTimer=.09;if(platform.type==='fading')platform.alpha=.34;const gain=platform.type==='spring'?40:10;score+=gain;burst(player.x+player.w/2,player.y+player.h,'#64e6e0',platform.type==='spring'?12:5);return true}
function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y:y+cameraY,vx:(Math.random()-.5)*120,vy:-40-Math.random()*100,life:.25+Math.random()*.35,color})}
function update(dt){if(state!=='playing'||paused)return;const previousBottom=player.y+player.h+cameraY;const dir=(input.right?1:0)-(input.left?1:0);player.vx+=dir*1350*dt;player.vx*=Math.pow(.82,dt*10);player.vx=Math.max(-310,Math.min(310,player.vx));player.x+=player.vx*dt;if(player.x+player.w<0)player.x=W;else if(player.x>W)player.x=-player.w;player.vy+=GRAVITY*dt;player.y+=player.vy*dt;
platforms.forEach(p=>{if(p.type==='moving'){p.x+=p.vx*dt;if(p.x<4){p.x=4;p.vx=Math.abs(p.vx)}if(p.x+p.w>W-4){p.x=W-4-p.w;p.vx=-Math.abs(p.vx)}}if(p.breakTimer){p.breakTimer-=dt;if(p.breakTimer<=0)p.broken=true}if(p.broken){p.y+=260*dt;p.alpha-=1.8*dt}else if(p.type==='fading'&&p.touched)p.alpha-=.28*dt});
for(const p of platforms)if(landOnPlatform(p,previousBottom))break;
if(player.y<260){const shift=260-player.y;player.y=260;cameraY-=shift;highest=Math.max(highest,-cameraY);score=Math.max(score,Math.floor(highest/5));generatePlatforms()}
particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);platforms=platforms.filter(p=>p.y-cameraY<H+160&&p.alpha>0);if(player.y>H+80)gameOver();updateHud()}
function updateHud(){ui.score.textContent=String(score).padStart(6,'0');ui.best.textContent=String(best).padStart(6,'0');ui.height.textContent=String(Math.floor(highest/10)).padStart(4,'0')+'m'}
function draw(){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  if(isLight){
    ctx.fillStyle = '#f7f4ec';
    ctx.fillRect(0,0,W,H);
  } else {
    const gradient=ctx.createLinearGradient(0,0,0,H);
    gradient.addColorStop(0,'#07111f');
    gradient.addColorStop(1,'#0b2430');
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,W,H);
  }
  for(let i=0;i<65;i++){
    const y=((i*97-cameraY*.13)%H+H)%H;
    ctx.fillStyle=i%6?(isLight?'#8b817733':'#e8f0f733'):(isLight?'#0288d177':'#64e6e077');
    ctx.fillRect((i*83)%W,y,i%9?1:2,i%9?1:2);
  }
  platforms.forEach(drawPlatform);
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*3);ctx.fillStyle=p.color;ctx.fillRect(p.x-2,p.y-cameraY-2,4,4)});
  ctx.globalAlpha=1;
  if(player)drawPlayer();
  if(paused){ctx.fillStyle=isLight ? '#f5f1e8aa' : '#070b1299';ctx.fillRect(0,0,W,H)}
}
function drawPlatform(p){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  const y=p.y-cameraY;if(y<-25||y>H+25)return;
  ctx.globalAlpha=Math.max(0,p.alpha);
  const colors=isLight ? {normal:'#0288d1',moving:'#f77f00',breaking:'#e63946',spring:'#198754',fading:'#6f42c1'} : {normal:'#64e6e0',moving:'#ffb45c',breaking:'#ff6b7a',spring:'#7bf0aa',fading:'#9d8cff'};
  ctx.fillStyle=colors[p.type];ctx.fillRect(p.x,y,p.w,p.h);
  ctx.fillStyle=isLight ? '#f7f4ec' : '#07111f';
  if(p.type==='breaking'){ctx.fillRect(p.x+p.w*.42,y,4,p.h);ctx.fillRect(p.x+p.w*.7,y,3,p.h)}
  if(p.type==='spring'){
    ctx.strokeStyle=isLight ? '#3e3934' : '#e8f0f7';ctx.beginPath();ctx.moveTo(p.x+p.w/2-8,y);ctx.lineTo(p.x+p.w/2,y-12);ctx.lineTo(p.x+p.w/2+8,y);ctx.stroke();
  }
  ctx.globalAlpha=1;
}
function drawPlayer(){
  const isLight = document.documentElement?.dataset?.theme === 'light';
  ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);
  ctx.fillStyle=isLight ? '#3e3934' : '#e8f0f7';ctx.fillRect(-10,-12,20,23);
  ctx.fillStyle=isLight ? '#0288d1' : '#64e6e0';ctx.fillRect(-7,-8,5,5);ctx.fillRect(2,-8,5,5);
  ctx.fillStyle=isLight ? '#f77f00' : '#ffb45c';ctx.fillRect(-13,4,5,13);ctx.fillRect(8,4,5,13);
  ctx.restore();
}
function loop(time){const dt=Math.min(.033,(time-last)/1000||0);last=time;update(dt);draw();requestAnimationFrame(loop)}
function bindHold(id,key){const button=$(id),on=event=>{event.preventDefault();if(state!=='playing')start();input[key]=true;button.classList.add('active');button.setPointerCapture?.(event.pointerId)},off=()=>{input[key]=false;button.classList.remove('active')};button.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(type=>button.addEventListener(type,off))}
bindHold('leftButton','left');bindHold('rightButton','right');canvas.addEventListener('pointerdown',event=>{event.preventDefault();if(state!=='playing')start();const rect=canvas.getBoundingClientRect(),key=event.clientX-rect.left<rect.width/2?'left':'right';input[key]=true;canvas.setPointerCapture?.(event.pointerId);canvas.dataset.held=key});const releaseCanvas=()=>{if(canvas.dataset.held){input[canvas.dataset.held]=false;delete canvas.dataset.held}};['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,releaseCanvas));
addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowleft','a'].includes(key)){event.preventDefault();if(state!=='playing')start();input.left=true}if(['arrowright','d'].includes(key)){event.preventDefault();if(state!=='playing')start();input.right=true}if(key==='p')togglePause()});addEventListener('keyup',event=>{const key=event.key.toLowerCase();if(['arrowleft','a'].includes(key))input.left=false;if(['arrowright','d'].includes(key))input.right=false});ui.start.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause()});
player={x:W/2-14,y:590,w:28,h:34,vx:0,vy:0};platforms=[];showOverlay('SKY HOPPER','BOUNCE UP · DO NOT FALL','START');updateHud();requestAnimationFrame(loop)})();
