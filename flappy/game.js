(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, GROUND_Y = H - 32;
  const R = window.FlappyRules;
  const STORAGE_KEY = 'flappy-best-v1';
  const $ = id => document.getElementById(id);
  const ui = {scoreStat:$('scoreStat'),bestStat:$('bestStat'),overlay:$('overlay'),title:$('overlayTitle'),text:$('overlayText'),start:$('startButton'),pause:$('pauseButton')};
  let state='title',score=0,best=loadBest(),bird=null,pipes=[],particles=[],lastTime=0,clock=0,simulationTime=0,crashedBird=null,raf=null,accumulator=0,dirty=true,clearing=false;

  function loadBest(){try{const n=Number(localStorage.getItem(STORAGE_KEY)||0);return Number.isSafeInteger(n)&&n>=0?n:0}catch(_){return 0}}
  function saveBest(){if(clearing)return;try{localStorage.setItem(STORAGE_KEY,String(best))}catch(_){}}
  function css(name,fallback){const value=getComputedStyle(document.documentElement).getPropertyValue(name).trim();return value||fallback}
  function palette(){return{
    sky:css('--scene-sky','#eef5f7'),grid:css('--scene-grid','#b5cdd6'),cloud:css('--scene-cloud','#f9fcfd'),cloudLine:css('--scene-cloud-line','#a4bec8'),
    pipe:css('--scene-pipe','#8cafbd'),pipeLine:css('--scene-pipe-line','#476d80'),ground:css('--scene-ground','#c4dade'),groundLine:css('--scene-ground-line','#668895'),groundDetail:css('--scene-ground-detail','#8aabb6'),waypoint:css('--scene-waypoint','#8ca5b1'),
    bird:css('--scene-bird','#f2c568'),wing:css('--scene-wing','#dca04c'),beak:css('--scene-beak','#dc9160'),birdLine:css('--scene-bird-line','#42433c'),eye:css('--scene-eye','#fffaf0'),cap:css('--scene-cap','#d58269')
  }}
  function resetGame(){stopLoop(true);const world=R.createWorld();score=world.score;bird=world.bird;pipes=world.pipes;particles=[];simulationTime=0;clock=0;crashedBird=null;updateHud()}
  function fitArena(){
    const page=$('gamePage'),frame=$('gameFrame');if(!page||!frame||!Number.isFinite(page.clientWidth))return;
    const ps=getComputedStyle(page),fs=getComputedStyle(frame),num=value=>parseFloat(value)||0;
    const horizontal=num(fs.paddingLeft)+num(fs.paddingRight)+num(fs.borderLeftWidth)+num(fs.borderRightWidth);
    const vertical=num(fs.paddingTop)+num(fs.paddingBottom)+num(fs.borderTopWidth)+num(fs.borderBottomWidth);
    const availableWidth=page.clientWidth-num(ps.paddingLeft)-num(ps.paddingRight);
    const landscape=window.innerWidth>window.innerHeight&&window.innerHeight<=540;
    const chrome=landscape?num(ps.paddingTop)+num(ps.paddingBottom):page.offsetHeight-frame.offsetHeight;
    const availableHeight=window.innerHeight-chrome-12;
    const width=Math.max(100,Math.min(400,availableWidth,(availableHeight-vertical)*W/H+horizontal));
    frame.style.setProperty('--arena-width',width+'px');
  }
  function updateHud(){ui.scoreStat.textContent=String(score);ui.bestStat.textContent=String(best);fitArena()}
  function flap(){if(clearing||document.hidden)return;if(state==='paused'){togglePause();return}if(state==='title'||state==='over'){resetGame();state='playing';ui.overlay.classList.add('hide');ui.pause.textContent='PAUSE';bird=R.flap(bird,R.CONSTANTS.FLAP_VELOCITY);lastTime=performance.now();ui.pause.disabled=false;canvas.focus({preventScroll:true});invalidate();return}if(state!=='playing'||!bird)return;bird=R.flap(bird,R.CONSTANTS.FLAP_VELOCITY);vibrate(10);invalidate()}
  function togglePause(){if(clearing)return;if(state==='playing'){state='paused';stopLoop();invalidate();ui.title.textContent='PAUSED';ui.text.textContent=`CURRENT SCORE: ${score}`;ui.start.textContent='RESUME';ui.overlay.classList.remove('hide');ui.pause.textContent='RESUME'}else if(state==='paused'){state='playing';ui.overlay.classList.add('hide');ui.pause.textContent='PAUSE';accumulator=0;lastTime=performance.now();canvas.focus({preventScroll:true});invalidate()}}
  function triggerExplosion(x,y){const p=palette();for(let i=0;i<25;i++){const angle=Math.random()*Math.PI*2,speed=50+Math.random()*180;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.7+Math.random()*.4,color:i%2?p.bird:p.cap})}}
  function gameOver(){if(state!=='playing')return;state='over';stopLoop();ui.pause.disabled=true;invalidate();if(score>best){best=score;saveBest()}updateHud();if(bird){crashedBird={...bird};triggerExplosion(bird.x,bird.y)}bird=null;ui.title.textContent='MAIL DELAYED';ui.text.textContent=`SCORE ${score} · BEST ${best}`;ui.start.textContent='FLY AGAIN';ui.overlay.classList.remove('hide');vibrate([60,40,80])}
  function update(dt){
    if(state!=='playing'||!bird)return;
    const previousScore=score;
    const world=R.advanceWorld({bird,pipes,score,dead:false,time:simulationTime},dt);
    bird=world.bird;pipes=world.pipes;score=world.score;simulationTime=world.time;clock=simulationTime*1000;
    if(world.dead){gameOver();return}
    if(score!==previousScore){if(score>best){best=score;saveBest()}updateHud();vibrate(20)}
  }
  function vibrate(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern)}catch(_){}}
  function updateParticles(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt}particles=particles.filter(p=>p.life>0)}
  function drawGrid(p){ctx.fillStyle=p.sky;ctx.fillRect(0,0,W,H);ctx.strokeStyle=p.grid;ctx.globalAlpha=.28;ctx.lineWidth=1;const offset=(clock*.012)%28;for(let x=0;x<=W;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=-28+offset;y<H+28;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.globalAlpha=1}
  function drawCloud(x,y,s,p,fill=p.cloud,line=p.cloudLine){ctx.save();ctx.translate(x,y);ctx.strokeStyle=line;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(-30*s,8*s);ctx.bezierCurveTo(-38*s,-4*s,-28*s,-16*s,-16*s,-12*s);ctx.bezierCurveTo(-12*s,-29*s,8*s,-29*s,14*s,-13*s);ctx.bezierCurveTo(29*s,-19*s,40*s,-5*s,31*s,9*s);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  function drawBackground(p){drawGrid(p);drawCloud(64,93,.75,p);drawCloud(342,190,.5,p);drawCloud(270,450,.6,p);ctx.save();ctx.strokeStyle=p.waypoint;ctx.lineWidth=2;ctx.lineCap='round';for(let i=0;i<6;i++){const x=24+i*72,y=((i*97+clock*.018)%GROUND_Y);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+6,y-7);ctx.lineTo(x+13,y);ctx.stroke()}ctx.restore();ctx.fillStyle=p.ground;ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);ctx.strokeStyle=p.groundLine;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,GROUND_Y);ctx.lineTo(W,GROUND_Y);ctx.stroke();for(let x=10;x<W;x+=26){ctx.strokeStyle=p.groundDetail;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,GROUND_Y+8);ctx.lineTo(x+5,GROUND_Y+2);ctx.lineTo(x+10,GROUND_Y+8);ctx.stroke()}}
  function cloudPillar(x,y,width,h,p,top){ctx.save();ctx.fillStyle=p.pipe;ctx.strokeStyle=p.pipeLine;ctx.lineWidth=2.5;ctx.fillRect(x,y,width,h);ctx.strokeRect(x,y,width,h);const capY=top?y+h-8:y;drawCloud(x+width/2,capY,0.52,p,p.pipe,p.pipeLine);ctx.restore()}
  function drawPipes(p){for(const pipe of pipes){cloudPillar(pipe.x,0,pipe.width,pipe.topY,p,true);cloudPillar(pipe.x,pipe.bottomY,pipe.width,GROUND_Y-pipe.bottomY,p,false);ctx.save();ctx.strokeStyle=p.waypoint;ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(pipe.x+26,pipe.topY+22);ctx.lineTo(pipe.x+26,pipe.bottomY-22);ctx.stroke();ctx.setLineDash([]);ctx.restore()}}
  function drawBird(p){const visibleBird=bird||crashedBird;if(!visibleBird)return;ctx.save();ctx.translate(visibleBird.x,visibleBird.y);ctx.rotate(visibleBird.angle);ctx.strokeStyle=p.birdLine;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.fillStyle=p.bird;ctx.beginPath();ctx.ellipse(0,0,16,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.wing;ctx.beginPath();ctx.ellipse(-5,5,10,6,.2,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.beak;ctx.strokeStyle=p.birdLine;ctx.beginPath();ctx.moveTo(10,-1);ctx.lineTo(20,3);ctx.lineTo(10,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=p.eye;ctx.beginPath();ctx.arc(5,-6,5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.birdLine;ctx.beginPath();ctx.arc(6,-6,2,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.cap;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-14,-10);ctx.quadraticCurveTo(0,-22,14,-10);ctx.stroke();ctx.strokeStyle=p.birdLine;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-14);ctx.lineTo(-1,-22);ctx.lineTo(5,-19);ctx.stroke();ctx.restore()}
  function draw(){const p=palette();drawBackground(p);drawPipes(p);for(const part of particles){ctx.save();ctx.globalAlpha=Math.max(0,part.life);ctx.fillStyle=part.color;ctx.beginPath();ctx.arc(part.x,part.y,3,0,Math.PI*2);ctx.fill();ctx.restore()}drawBird(p);}
  function scheduleFrame(){if(raf===null&&!document.hidden)raf=requestAnimationFrame(loop)}
  function invalidate(){dirty=true;scheduleFrame()}
  function stopLoop(keepPointer=false){if(raf!==null)cancelAnimationFrame(raf);raf=null;accumulator=0;lastTime=performance.now();if(!keepPointer)releasePointer()}
  function loop(time){
    raf=null;if(document.hidden)return;
    const dt=Math.max(0,Math.min(.25,(time-lastTime)/1000));lastTime=time;
    if(state==='playing'){accumulator+=dt;while(accumulator+1e-10>=R.CONSTANTS.STEP&&state==='playing'){update(R.CONSTANTS.STEP);accumulator=Math.max(0,accumulator-R.CONSTANTS.STEP)}}
    const hadParticles=particles.length>0;
    if(state==='over'&&hadParticles)updateParticles(dt);
    if(dirty||state==='playing'||hadParticles){draw();dirty=false}
    if(state==='playing'||particles.length)scheduleFrame();
  }
  let pointerOwner=null;
  function releasePointer(event){if(pointerOwner===null||(event&&event.pointerId!==pointerOwner))return;const id=pointerOwner;pointerOwner=null;try{canvas.releasePointerCapture(id)}catch(_){}}
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0||event.isPrimary===false||pointerOwner!==null)return;pointerOwner=event.pointerId;event.preventDefault();try{canvas.setPointerCapture(event.pointerId)}catch(_){}flap()});
  for(const type of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(type,event=>event.preventDefault());
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,releasePointer);
  window.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target?.isContentEditable||event.target?.closest('input,select,textarea'))return;if(['Space','ArrowUp','KeyW'].includes(event.code)){if(event.target?.closest('button,a'))return;event.preventDefault();flap()}else if(['KeyP','Escape'].includes(event.code)){event.preventDefault();togglePause()}});ui.overlay.addEventListener('pointerdown',event=>{if(event.button!==0||event.isPrimary===false||event.target?.closest('button,a,input,select,textarea'))return;event.preventDefault();flap()});ui.start.addEventListener('click',flap);ui.pause.addEventListener('click',togglePause);document.addEventListener('themechange',invalidate);
  function suspend(){if(state==='playing')togglePause();else stopLoop()}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else invalidate()});
  window.addEventListener('blur',suspend);window.addEventListener('pagehide',suspend);window.addEventListener('resize',()=>{fitArena();invalidate()});
  window.addEventListener('game-data-clearing',()=>{clearing=true;state='paused';particles=[];stopLoop();ui.start.disabled=true;ui.pause.disabled=true});
  resetGame();updateHud();ui.pause.disabled=true;invalidate();
  window.FlappyGame={flap,getSnapshot:()=>({state,score,best,hasBird:Boolean(bird),bird:bird?{...bird}:null,pipes:pipes.map(pipe=>({...pipe})),time:simulationTime})};
})();
