(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,$=id=>document.getElementById(id),GRAVITY=1500;
const ui={score:$('score'),stars:$('stars'),best:$('best'),height:$('height'),overlay:$('overlay'),message:$('message'),detail:$('detail'),start:$('startButton'),pause:$('pauseButton')};
const input={left:false,right:false},Rules=DoodleHopRules;
let state='title',paused=false,player,platforms=[],stars=[],particles=[],cameraY=0,highest=0,score=0,bonusScore=0,starCount=0,best=+localStorage.getItem('doodleHopBest')||0,bestStars=+localStorage.getItem('doodleHopBestStars')||0,last=0,clock=0,accumulator=0,rafId=0,paletteCache=null,nextPlatformY=0,lastPlatformX=W/2;

function palette(){if(paletteCache)return paletteCache;const style=getComputedStyle(document.documentElement);const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;return paletteCache={paper:read('--paper','#fffaf0'),grid:read('--grid','#b9dfe0'),ink:read('--ink','#3d3832'),muted:read('--muted','#8a7c6e'),mint:read('--mint','#9eddbd'),blue:read('--blue','#8fc9eb'),yellow:read('--yellow','#f7d66c'),coral:read('--coral','#f28c78'),purple:read('--purple','#b8a7e8'),shadow:read('--shadow','#d6c8b7')}}
function platformType(){return ['moving','breaking','fading','spring'][Math.floor(Math.random()*4)]}
function makePlatform(y,forced,anchorX,safe=false){
  const type=forced||platformType(-y),w=safe?132-Math.min(16,Math.max(0,-y)/1500)+Math.random()*8:(type==='breaking'?74:88+Math.random()*24);
  const center=(anchorX??W/2)+(Math.random()-.5)*(safe?180:210);
  const x=Rules.clamp(center-w/2,12,W-w-12);
  return{x,y,w,h:12,type,safe,vx:type==='moving'?(Math.random()<.5?-1:1)*(42+Math.random()*32):0,broken:false,touched:false,alpha:1,seed:Math.random()*10};
}
function addStar(platform,bonus=false){if(!bonus&&(platform.type==='breaking'||Math.random()<.18))return;stars.push({x:platform.x+18+Math.random()*Math.max(20,platform.w-36),y:platform.y-31,r:bonus?11:9,value:bonus?50:25,phase:Math.random()*Math.PI*2,collected:false})}
function addBonusRoute(main,previous,height){
  if(!previous||height<220||Math.random()>.32+Math.min(.16,height/10000))return;
  const bonus=makePlatform(main.y+34,platformType(),main.x+main.w/2<W/2?W-60:60);
  bonus.x=Rules.clamp((main.x+main.w/2<W/2?W-60:60)-bonus.w/2,12,W-bonus.w-12);
  if(bonus.x<main.x+main.w+10&&bonus.x+bonus.w>main.x-10)return;
  if(!Rules.canReach(previous,bonus))return;
  platforms.push(bonus);addStar(bonus,true);
}
function generatePlatforms(){
  while(nextPlatformY>cameraY-940){
    const height=Math.max(0,-nextPlatformY),gap=86+Math.min(20,height/900)+Math.random()*12;
    const previous=platforms.filter(p=>p.safe).at(-1);
    nextPlatformY-=gap;
    let platform;
    for(let attempt=0;attempt<8;attempt++){
      platform=makePlatform(nextPlatformY,'normal',lastPlatformX,true);
      if(!previous||Rules.hasSafeApproach(previous,platform))break;
    }
    if(previous&&!Rules.hasSafeApproach(previous,platform)){
      platform.w=140;platform.x=Rules.clamp(lastPlatformX-platform.w/2,12,W-platform.w-12);
    }
    lastPlatformX=platform.x+platform.w/2;platforms.push(platform);addStar(platform);addBonusRoute(platform,previous,height);
  }
}
function reset(){clearInput();accumulator=0;cameraY=0;highest=0;score=0;bonusScore=0;starCount=0;particles=[];stars=[];platforms=[];const starter=makePlatform(650,'normal',W/2,true);starter.x=145;starter.w=190;platforms.push(starter);let y=568,anchor=240;for(let i=0;i<9;i++){const p=makePlatform(y,'normal',anchor,true);platforms.push(p);addStar(p);anchor=p.x+p.w*.5;y-=84+Math.random()*23}lastPlatformX=anchor;nextPlatformY=platforms[platforms.length-1].y;player={x:W/2-22,y:590,w:44,h:48,vx:0,vy:-650};generatePlatforms();state='playing';paused=false;ui.pause.textContent='PAUSE';hideOverlay();updateHud();last=performance.now();draw();requestFrame()}
function start(){reset()}
function resumeOrStart(){if(state!=='playing')start();else if(paused)togglePause()}
function showOverlay(title,detail,button){ui.message.textContent=title;ui.detail.textContent=detail;ui.start.textContent=button;ui.overlay.classList.remove('hidden')}
function hideOverlay(){ui.overlay.classList.add('hidden')}
function togglePause(){
  if(state!=='playing')return;clearInput();accumulator=0;paused=!paused;ui.pause.textContent=paused?'RESUME':'PAUSE';
  if(paused){stopLoop();showOverlay('PAUSED','THE SKY IS WAITING FOR YOU','RESUME')}
  else{hideOverlay();last=performance.now();requestFrame()}draw();
}
function gameOver(){if(state!=='playing')return;clearInput();stopLoop();state='over';paused=false;if(score>best){best=score;localStorage.setItem('doodleHopBest',String(best))}if(starCount>bestStars){bestStars=starCount;localStorage.setItem('doodleHopBestStars',String(bestStars))}updateHud();showOverlay('WHOOPS!','HEIGHT '+Math.floor(highest/10)+'m · '+starCount+' STARS FOUND','TRY AGAIN')}
function landOnPlatform(platform,previousBottom){if(player.vy<=0||platform.broken||platform.alpha<=.15)return false;const worldBottom=player.y+player.h+cameraY;if(previousBottom>platform.y+3||worldBottom<platform.y||player.x+player.w<platform.x||player.x>platform.x+platform.w)return false;player.y=platform.y-cameraY-player.h;player.vy=platform.type==='spring'?-900:-670;const firstLanding=!platform.touched;platform.touched=true;platform.pulse=1;player.bounce=1;player.springBounce=platform.type==='spring';if(platform.type==='breaking')platform.breakTimer=.12;if(platform.type==='fading')platform.alpha=.38;const gain=platform.type==='spring'?45:10;if(firstLanding){bonusScore+=gain;score=Math.floor(highest/5)+bonusScore;}burst(player.x+player.w/2,platform.y,platform.type==='spring'?palette().yellow:palette().mint,platform.type==='spring'?14:6);return true}
function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:-60-Math.random()*140,life:.28+Math.random()*.38,size:2+Math.random()*3,color})}
function collectStars(){const worldTop=player.y+cameraY,worldBottom=worldTop+player.h;for(const star of stars){if(star.collected)continue;if(player.x+player.w>star.x-star.r&&player.x<star.x+star.r&&worldBottom>star.y-star.r&&worldTop<star.y+star.r){star.collected=true;starCount++;bonusScore+=star.value||25;score=Math.floor(highest/5)+bonusScore;burst(star.x,star.y,palette().yellow,10)}}}
function update(dt){if(state!=='playing'||paused)return;player.bounce=Math.max(0,(player.bounce||0)-dt*5);const previousBottom=player.y+player.h+cameraY,dir=(input.right?1:0)-(input.left?1:0);player.vx=Rules.horizontalVelocity(player.vx,dir,dt);player.x+=player.vx*dt;if(player.x+player.w<0)player.x=W;else if(player.x>W)player.x=-player.w;player.vy+=GRAVITY*dt;player.y+=player.vy*dt;
platforms.forEach(p=>{p.pulse=Math.max(0,(p.pulse||0)-dt*5);if(p.type==='moving'){p.x+=p.vx*dt;if(p.x<4){p.x=4;p.vx=Math.abs(p.vx)}if(p.x+p.w>W-4){p.x=W-4-p.w;p.vx=-Math.abs(p.vx)}}if(p.breakTimer){p.breakTimer-=dt;if(p.breakTimer<=0)p.broken=true}if(p.broken){p.y+=260*dt;p.alpha-=1.8*dt}else if(p.type==='fading'&&p.touched)p.alpha-=.28*dt});
for(const p of platforms)if(landOnPlatform(p,previousBottom))break;collectStars();
if(player.y<250){const shift=250-player.y;player.y=250;cameraY-=shift;highest=Math.max(highest,-cameraY);score=Math.floor(highest/5)+bonusScore;generatePlatforms()}
particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=360*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);platforms=platforms.filter(p=>p.y-cameraY<H+170&&p.alpha>0);stars=stars.filter(s=>!s.collected&&s.y-cameraY<H+130);updateHud();if(player.y>H+90)gameOver()}
function writeStat(node,value){if(node.textContent!==value)node.textContent=value}
function updateHud(){writeStat(ui.score,String(score).padStart(6,'0'));writeStat(ui.stars,String(starCount).padStart(2,'0'));writeStat(ui.best,String(best).padStart(6,'0'));writeStat(ui.height,String(Math.floor(highest/10)).padStart(4,'0')+'m')}
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
function drawGrid(p){ctx.fillStyle=p.paper;ctx.fillRect(0,0,W,H);ctx.strokeStyle=p.grid;ctx.globalAlpha=.46;ctx.lineWidth=1;const offset=((cameraY*.18)%32+32)%32;for(let x=0;x<=W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=-32+offset;y<=H+32;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.globalAlpha=1}
function drawCloud(x,y,s,p){ctx.save();ctx.translate(x,y);ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.fillStyle=p.panel||p.paper;ctx.beginPath();ctx.moveTo(-34*s,8*s);ctx.bezierCurveTo(-39*s,-3*s,-29*s,-13*s,-18*s,-11*s);ctx.bezierCurveTo(-15*s,-28*s,7*s,-31*s,14*s,-13*s);ctx.bezierCurveTo(30*s,-19*s,42*s,-5*s,35*s,9*s);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=p.blue;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-24*s,12*s);ctx.lineTo(-15*s,8*s);ctx.moveTo(-5*s,14*s);ctx.lineTo(5*s,10*s);ctx.moveTo(16*s,13*s);ctx.lineTo(26*s,8*s);ctx.stroke();ctx.restore()}
function drawSun(x,y,r,p){ctx.save();ctx.translate(x,y);ctx.strokeStyle=p.ink;ctx.lineWidth=3;ctx.lineCap='round';for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.beginPath();ctx.moveTo(Math.cos(a)*(r+7),Math.sin(a)*(r+7));ctx.lineTo(Math.cos(a)*(r+15),Math.sin(a)*(r+15));ctx.stroke()}ctx.fillStyle=p.yellow;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.ink;ctx.beginPath();ctx.arc(-r*.28,-r*.08,2.5,0,Math.PI*2);ctx.arc(r*.28,-r*.08,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,r*.12,r*.28,0,Math.PI);ctx.stroke();ctx.restore()}
function drawBackground(p){const cloudY=((180-cameraY*.12)%760+760)%760-40;drawCloud(78,cloudY,.72,p);drawCloud(396,((470-cameraY*.1)%790+790)%790-50,.54,p);drawSun(386,106-cameraY*.07%420,34,p);ctx.save();ctx.globalAlpha=.45;ctx.strokeStyle=p.coral;ctx.lineWidth=2;ctx.lineCap='round';for(let i=0;i<7;i++){const x=28+i*71,y=((i*127-cameraY*.06)%H+H)%H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+7,y-7);ctx.lineTo(x+14,y);ctx.stroke()}ctx.restore()}
function drawStar(star,p){const y=star.y-cameraY;if(y<-30||y>H+30)return;ctx.save();ctx.translate(star.x,y);ctx.rotate(Math.sin(clock*.004+star.phase)*.16);ctx.fillStyle=p.yellow;ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?star.r*.42:star.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
function drawPlatform(platform,p){const y=platform.y-cameraY+Math.sin((platform.pulse||0)*Math.PI)*3;if(y<-36||y>H+40)return;ctx.save();ctx.globalAlpha=Math.max(0,platform.alpha);const colors={normal:p.mint,moving:p.blue,breaking:p.coral,spring:p.yellow,fading:p.purple},color=colors[platform.type];ctx.fillStyle=color;ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(platform.x,y+4);ctx.quadraticCurveTo(platform.x+platform.w*.18,y-4,platform.x+platform.w*.34,y+2);ctx.quadraticCurveTo(platform.x+platform.w*.54,y-6,platform.x+platform.w*.68,y+2);ctx.quadraticCurveTo(platform.x+platform.w*.86,y-5,platform.x+platform.w,y+4);ctx.lineTo(platform.x+platform.w-5,y+18);ctx.quadraticCurveTo(platform.x+platform.w*.82,y+24,platform.x+platform.w*.66,y+18);ctx.quadraticCurveTo(platform.x+platform.w*.5,y+29,platform.x+platform.w*.34,y+18);ctx.quadraticCurveTo(platform.x+platform.w*.16,y+25,platform.x+5,y+17);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=p.ink;ctx.globalAlpha*=.35;ctx.lineWidth=1.5;for(let i=0;i<4;i++){const sx=platform.x+12+i*platform.w/5;ctx.beginPath();ctx.moveTo(sx,y+11);ctx.lineTo(sx+5,y+16);ctx.stroke()}ctx.globalAlpha=Math.max(0,platform.alpha);if(platform.type==='breaking'){ctx.strokeStyle=p.ink;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(platform.x+platform.w*.42,y+3);ctx.lineTo(platform.x+platform.w*.35,y+18);ctx.moveTo(platform.x+platform.w*.66,y+3);ctx.lineTo(platform.x+platform.w*.74,y+18);ctx.stroke()}if(platform.type==='spring'){ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(platform.x+platform.w/2-8,y-1);ctx.lineTo(platform.x+platform.w/2-4,y-9);ctx.lineTo(platform.x+platform.w/2+1,y-1);ctx.lineTo(platform.x+platform.w/2+6,y-9);ctx.lineTo(platform.x+platform.w/2+10,y-1);ctx.stroke()}drawPlatformCue(platform,y,p);ctx.restore()}
function drawPlatformCue(platform,y,p){
  const x=platform.x+platform.w/2;ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.globalAlpha=Math.max(0,platform.alpha);
  if(platform.type==='moving'){
    const sign=Math.sign(platform.vx)||1;ctx.beginPath();ctx.moveTo(x-sign*10,y+11);ctx.lineTo(x+sign*10,y+11);ctx.lineTo(x+sign*4,y+6);ctx.moveTo(x+sign*10,y+11);ctx.lineTo(x+sign*4,y+16);ctx.stroke();
  }
  if(platform.type==='fading'){
    ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(platform.x+7,y+2);ctx.lineTo(platform.x+platform.w-7,y+2);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(x,y+12,5,0,Math.PI*2);ctx.moveTo(x,y+8);ctx.lineTo(x,y+12);ctx.lineTo(x+3,y+13);ctx.stroke();
  }
  if(platform.touched&&(platform.type==='breaking'||platform.type==='fading')){
    const remaining=platform.type==='breaking'?Math.max(0,(platform.breakTimer||0)/.12):Math.max(0,platform.alpha);
    ctx.fillStyle=p.ink;ctx.globalAlpha=.65;ctx.fillRect(platform.x+7,y+26,(platform.w-14)*remaining,2);
  }
}
function drawPlayer(p){if(!player)return;ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2+(player.bounce||0)*2);ctx.scale(1+(player.bounce||0)*.07,1-(player.bounce||0)*.1);ctx.rotate(Math.sin(clock*.006)*.035);ctx.strokeStyle=p.ink;ctx.fillStyle=p.mint;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(-18,-5);ctx.quadraticCurveTo(-17,-24,0,-25);ctx.quadraticCurveTo(18,-24,19,-4);ctx.quadraticCurveTo(22,16,8,23);ctx.quadraticCurveTo(0,28,-10,23);ctx.quadraticCurveTo(-23,16,-18,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=p.mint;ctx.beginPath();ctx.ellipse(-23,-3,7,12,-.55,0,Math.PI*2);ctx.ellipse(23,-3,7,12,.55,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.ink;ctx.beginPath();ctx.ellipse(-7,-6,3,5,0,0,Math.PI*2);ctx.ellipse(7,-6,3,5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,1,7,.15*Math.PI,.85*Math.PI);ctx.stroke();ctx.fillStyle=p.coral;ctx.beginPath();ctx.arc(-12,2,3.8,0,Math.PI*2);ctx.arc(12,2,3.8,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.yellow;ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,-24,13,Math.PI,Math.PI*2);ctx.lineTo(13,-23);ctx.quadraticCurveTo(2,-17,-13,-21);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=p.coral;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-18,11);ctx.quadraticCurveTo(0,16,18,10);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(14,12);ctx.lineTo(27,17);ctx.lineTo(18,21);ctx.stroke();ctx.fillStyle=p.ink;ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,22);ctx.lineTo(-7,28);ctx.moveTo(10,22);ctx.lineTo(7,28);ctx.stroke();ctx.restore()}
function draw(){const p=palette();drawGrid(p);drawBackground(p);platforms.forEach(platform=>drawPlatform(platform,p));stars.forEach(star=>drawStar(star,p));particles.forEach(part=>{ctx.save();ctx.globalAlpha=Math.max(0,part.life*2.4);ctx.fillStyle=part.color;ctx.strokeStyle=p.ink;ctx.lineWidth=1;ctx.beginPath();ctx.arc(part.x,part.y-cameraY,part.size,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()});drawPlayer(p);if(paused){ctx.fillStyle=p.paper+'cc';ctx.fillRect(0,0,W,H)}}
function stopLoop(){if(rafId)cancelAnimationFrame(rafId);rafId=0;accumulator=0}
function requestFrame(){if(!rafId&&state==='playing'&&!paused&&!document.hidden)rafId=requestAnimationFrame(loop)}
function loop(time){
  rafId=0;if(state!=='playing'||paused||document.hidden)return;
  const dt=Math.min(.1,Math.max(0,(time-last)/1000));last=time;clock=time;accumulator+=dt;
  while(accumulator+1e-9>=Rules.PHYSICS.step&&state==='playing'&&!paused){update(Rules.PHYSICS.step);accumulator-=Rules.PHYSICS.step}
  draw();requestFrame();
}
const pointers=new Map(),keys=new Set();
function syncPointers(){input.left=[...pointers.values()].includes('left')||keys.has('arrowleft')||keys.has('a');input.right=[...pointers.values()].includes('right')||keys.has('arrowright')||keys.has('d');$('leftButton').classList.toggle('active',input.left);$('rightButton').classList.toggle('active',input.right)}
function holdPointer(target,event,key){event.preventDefault();if(state!=='playing')start();if(paused)return;pointers.set(event.pointerId,key);syncPointers();try{target.setPointerCapture?.(event.pointerId)}catch{}}
function clearInput(){pointers.clear();keys.clear();syncPointers()}
function releasePointer(event){pointers.delete(event.pointerId);syncPointers()}
function bindHold(id,key){const button=$(id);button.addEventListener('pointerdown',e=>holdPointer(button,e,key));for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,releasePointer);button.addEventListener('pointerleave',e=>{if(!button.hasPointerCapture?.(e.pointerId))releasePointer(e)});for(const type of ['selectstart','contextmenu'])button.addEventListener(type,e=>e.preventDefault())}
bindHold('leftButton','left');bindHold('rightButton','right');
canvas.addEventListener('pointerdown',event=>{const rect=canvas.getBoundingClientRect();holdPointer(canvas,event,event.clientX-rect.left<rect.width/2?'left':'right')});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,releasePointer);
canvas.addEventListener('pointerleave',e=>{if(!canvas.hasPointerCapture?.(e.pointerId))releasePointer(e)});
addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowleft','a','arrowright','d'].includes(key)){event.preventDefault();if(state!=='playing'){if(event.repeat)return;start()}if(paused)return;keys.add(key);syncPointers()}if(key==='p'&&!event.repeat)togglePause()});
addEventListener('keyup',event=>{keys.delete(event.key.toLowerCase());syncPointers()});
addEventListener('blur',()=>{clearInput();if(state==='playing'&&!paused)togglePause()});
ui.start.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause()});document.addEventListener('themechange',()=>{paletteCache=null;draw()});
player={x:W/2-22,y:590,w:44,h:48,vx:0,vy:0};platforms=[];showOverlay('DOODLE HOP!','BOUNCE UP · COLLECT LITTLE STARS','START JUMPING');updateHud();draw()})();
