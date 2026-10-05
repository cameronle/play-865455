(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,$=id=>document.getElementById(id),GRAVITY=1500;
const ui={score:$('score'),stars:$('stars'),best:$('best'),height:$('height'),overlay:$('overlay'),message:$('message'),detail:$('detail'),start:$('startButton'),pause:$('pauseButton')};
const input={left:false,right:false},Rules=DoodleHopRules,Progression=SkyHopperProgression;
let platformId=0,route={},lastLandingId=0,combo=0,maxCombo=0,preciseStreak=0,maxPrecise=0,bestLandingY=Infinity,jumpQualified=false,feedback=null,goal=null;
// Legacy doodleHopBest / doodleHopBestStars / skyHopperBest remain untouched.
function loadRecords(){
  const empty={schemaVersion:2,bestScore:0,bestHeight:0,bestCombo:0};
  try{const value=JSON.parse(localStorage.getItem('skyHopperRecordsV2'));if(!value||value.schemaVersion!==2)return empty;
    for(const key of ['bestScore','bestHeight','bestCombo'])if(Number.isSafeInteger(value[key])&&value[key]>=0)empty[key]=value[key];
  }catch{}
  return empty;
}
let records=loadRecords();
let state='title',paused=false,player,platforms=[],stars=[],particles=[],cameraY=0,highest=0,score=0,bonusScore=0,starCount=0,best=records.bestScore,last=0,clock=0,accumulator=0,rafId=0,paletteCache=null,nextPlatformY=0,lastPlatformX=W/2;

function palette(){if(paletteCache)return paletteCache;const style=getComputedStyle(document.documentElement);const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;return paletteCache={paper:read('--paper','#f8fafb'),ink:read('--ink','#1e293b'),mint:read('--mint','#8bc5b0'),heroBody:read('--hero-body','#0f766e'),heroMark:read('--hero-mark','#ffffff'),cue:read('--cue','#20323b'),blue:read('--blue','#79aee1'),yellow:read('--yellow','#e2b74c'),coral:read('--coral','#d59182'),purple:read('--purple','#b2a6d8')}}
const words={
  zh:{title:'向上弹跳',back:'← 游戏',score:'分数',stars:'星星',height:'高度',best:'最高分',pause:'暂停',resume:'继续',paused:'已暂停',pauseDetail:'进度已保留，继续向上',over:'本局结束',start:'开始',retry:'再来一局',ready:'自动弹跳 · 左右移动 · 收集星星',left:'← 向左',right:'向右 →',safe:'普通平台：稳定落脚',types:'↔ 移动 · ╱ 易碎 · ◌ 消失',spring:'↑ 弹簧：更高弹跳',bonus:'中心落点攒连段 · ★ 支线高奖励',help:'方向键 / A D 移动 · 按住画面两侧 · P 暂停',field:'向上弹跳游戏区域',status:'游戏状态',controls:'左右移动控制',tips:'玩法说明',clear:'清除数据',clearHelp:'清除本游戏记录',clearConfirm:'清除本游戏保存的记录并重新加载？',stages:['暖身','变向','挑战','混合'],combo:'连段',goal:'目标',goals:{height:'高度',precise:'连续精准',stars:'收集星星'},precise:'精准落点',risk:'奖励路线',goalDone:'目标完成',noGoal:'开始后领取本局目标'},
  en:{title:'SKY HOP',back:'← PLAY',score:'SCORE',stars:'STARS',height:'HEIGHT',best:'BEST',pause:'PAUSE',resume:'RESUME',paused:'PAUSED',pauseDetail:'YOUR PROGRESS IS KEPT',over:'GAME OVER',start:'START',retry:'PLAY AGAIN',ready:'AUTO BOUNCE · MOVE LEFT / RIGHT · COLLECT STARS',left:'← LEFT',right:'RIGHT →',safe:'PLAIN = STABLE FOOTING',types:'↔ MOVING · ╱ FRAGILE · ◌ FADING',spring:'↑ SPRING BOOST',bonus:'CENTER = COMBO · ★ HIGH REWARD',help:'ARROWS / A D MOVE · HOLD EITHER SIDE · P PAUSE',field:'Sky Hop playfield',status:'Game status',controls:'Movement controls',tips:'How to play',clear:'CLEAR',clearHelp:'Clear saved data for this game',clearConfirm:'Clear saved data for this game and reload?',stages:['WARMUP','FLOW','FOCUS','MIX'],combo:'COMBO',goal:'GOAL',goals:{height:'HEIGHT',precise:'PRECISE STREAK',stars:'STARS'},precise:'PRECISE',risk:'BONUS ROUTE',goalDone:'GOAL COMPLETE',noGoal:'START FOR A RUN GOAL'}
};
let language='zh';try{if(localStorage.getItem('play-lang')==='en')language='en'}catch{}
function utilities(){const button=document.querySelector?.('.clear-data-toggle');if(button){const w=words[language];button.textContent=w.clear;button.dataset.confirm=w.clearConfirm;button.setAttribute('aria-label',w.clearHelp);button.setAttribute('title',w.clearHelp)}}
function translate(){
  const w=words[language];document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=w.title+' · PLAY';
  const labels={gameTitle:w.title,backLink:w.back,labelScore:w.score,labelStars:w.stars,labelHeight:w.height,labelBest:w.best,leftButton:w.left,rightButton:w.right,tipSafe:w.safe,tipTypes:w.types,tipSpring:w.spring,tipBonus:w.bonus,keyboardHelp:w.help,recordNote:language==='zh'?'新版独立计分 · 旧记录保留':'V2 RECORDS · OLD RECORDS KEPT'};
  for(const [id,value]of Object.entries(labels))writeStat($(id),value);
  const labelsAria={game:w.field,backLink:language==='zh'?'返回游戏合集':'Back to games',gameStatus:w.status,movementControls:w.controls,gameTips:w.tips};
  for(const [id,value]of Object.entries(labelsAria))$(id).setAttribute('aria-label',value);
  $('languageButton').textContent=language==='zh'?'EN':'中';$('languageButton').setAttribute('aria-label',language==='zh'?'Switch to English':'切换为中文');ui.pause.textContent=paused?w.resume:w.pause;
  if(state!=='playing'||paused)showOverlay();utilities();updateHud();
}
function platformType(){return ['moving','breaking','fading','spring'][Math.floor(Math.random()*4)]}
function makePlatform(y,forced,anchorX,safe=false){
  const config=Progression.stage(Math.max(0,300-y)),type=forced||platformType();
  const w=safe?config.widthMin+Math.random()*(config.widthMax-config.widthMin):(type==='breaking'?74:88+Math.random()*16);
  const center=(anchorX??W/2)+(Math.random()-.5)*(safe?10:40),x=Rules.clamp(center-w/2,12,W-w-12);
  return{id:++platformId,x,y,w,h:12,type,safe,routeRole:safe?'main':'bonus',stage:config.id,segment:route.kind||'start',segmentId:route.id||0,vx:type==='moving'?(Math.random()<.5?-1:1)*(42+Math.random()*22):0,broken:false,touched:false,alpha:1,seed:Math.random()*10};
}
function addStar(platform,bonus=false){
  if(!bonus&&platform.id%3!==0)return;
  const count=bonus?2:1;
  for(let n=0;n<count;n++){
    const offsetX=platform.w/2+(bonus?(n?12:-12):0),offsetY=-31-n*29;
    stars.push({x:platform.x+offsetX,y:platform.y+offsetY,platformId:platform.id,offsetX,offsetY,r:bonus?10:9,value:bonus?50:25,bonus,phase:0,collected:false});
  }
}
function addBonusRoute(main,previous,height){
  if(!previous||height<1000||![1,2].includes(route.step)||!['moving','fragile','spring'].includes(route.kind))return;
  const type=route.kind==='fragile'?(route.step===1?'breaking':'fading'):route.kind;
  const fromCenter=previous.x+previous.w/2,toCenter=main.x+main.w/2,side=toCenter>=fromCenter?-1:1;
  const bonus=makePlatform(main.y+36,type,fromCenter+side*90);
  bonus.entryId=previous.id;bonus.exitId=main.id;bonus.minX=Math.max(12,bonus.x-18);bonus.maxX=Math.min(W-bonus.w-12,bonus.x+18);
  if(bonus.x<main.x+main.w+8&&bonus.x+bonus.w>main.x-8)return;
  const speed=type==='spring'?Rules.PHYSICS.spring:Rules.PHYSICS.jump;
  const poses=type==='moving'?[bonus.minX,bonus.x,bonus.maxX]:[bonus.x];
  if(!poses.every(x=>Rules.canReach(previous,{...bonus,x})&&[-330,0,330].every(vx=>Rules.canReach({...bonus,x},main,{speed,vx}))))return;
  platforms.push(bonus);addStar(bonus,true);
}
function generatePlatforms(){
  while(nextPlatformY>cameraY-940){
    const height=Math.max(highest,300-nextPlatformY),config=Progression.stage(height);
    if(!route.kind||route.step>=route.length)route=Progression.segment(height,route,Math.random);
    const previous=platforms.findLast(p=>p.safe),recovery=route.kind==='recovery';
    const gap=route.kind==='span'?config.gapMax:config.gapMin+Math.random()*(config.gapMax-config.gapMin);
    nextPlatformY-=gap;
    let direction=route.kind==='switchback'?(route.step%2?-route.direction:route.direction):route.direction;
    if((lastPlatformX<110&&direction<0)||(lastPlatformX>W-110&&direction>0)){route.direction=-route.direction;direction=-direction;}
    const shift=recovery?45:route.kind==='span'?config.shift*.7:config.shift;
    let platform;
    for(let attempt=0;attempt<8;attempt++){
      platform=makePlatform(nextPlatformY,'normal',lastPlatformX+direction*shift*(1-attempt*.1),true);
      if(recovery)platform.w=config.widthMax;
      platform.x=Rules.clamp(platform.x,12,W-platform.w-12);
      if(!previous||Rules.hasSafeApproach(previous,platform))break;
    }
    if(previous&&!Rules.hasSafeApproach(previous,platform)){
      platform.w=config.widthMax;platform.x=Rules.clamp(lastPlatformX-platform.w/2,12,W-platform.w-12);platform.fallback=true;
    }
    lastPlatformX=platform.x+platform.w/2;platforms.push(platform);addStar(platform);addBonusRoute(platform,previous,height);route.step++;
  }
}
function reset(){clearInput();accumulator=0;platformId=0;route={};lastLandingId=0;combo=0;maxCombo=0;preciseStreak=0;maxPrecise=0;bestLandingY=Infinity;jumpQualified=false;feedback=null;goal=Progression.createGoal(Math.random);cameraY=0;highest=0;score=0;bonusScore=0;starCount=0;particles=[];stars=[];platforms=[];const starter=makePlatform(650,'normal',W/2,true);starter.x=145;starter.w=190;platforms.push(starter);let y=568,anchor=240;for(let i=0;i<9;i++){const p=makePlatform(y,'normal',anchor+(i%2?45:-45),true);platforms.push(p);addStar(p);anchor=p.x+p.w*.5;y-=84+Math.random()*23}lastPlatformX=anchor;nextPlatformY=platforms[platforms.length-1].y;player={x:W/2-22,y:590,w:44,h:48,vx:0,vy:-650};generatePlatforms();state='playing';paused=false;ui.pause.textContent=words[language].pause;hideOverlay();updateHud();last=performance.now();draw();requestFrame()}
function start(){if(state!=='clearing')reset()}
function resumeOrStart(){if(state!=='playing')start();else if(paused)togglePause()}
function showOverlay(){ui.overlay.dataset.state=paused?'paused':state;const w=words[language];ui.message.textContent=paused?w.paused:state==='over'?w.over:w.title;ui.detail.textContent=paused?w.pauseDetail:state==='over'?(language==='zh'?'高度 '+Math.floor(highest/10)+'米 · '+starCount+'颗星星':'HEIGHT '+Math.floor(highest/10)+'m · '+starCount+' STARS'):w.ready;if(state==='over')ui.detail.textContent+=(language==='zh'?'\n最高连段 '+maxCombo+' · '+(goal?.done?'目标完成':'目标未完成'):'\nMAX COMBO '+maxCombo+' · '+(goal?.done?'GOAL COMPLETE':'GOAL INCOMPLETE'));ui.start.textContent=paused?w.resume:state==='over'?w.retry:w.start;ui.overlay.classList.remove('hidden')}
function hideOverlay(){ui.overlay.classList.add('hidden')}
function togglePause(){
  if(state!=='playing')return;clearInput();accumulator=0;paused=!paused;ui.pause.textContent=paused?words[language].resume:words[language].pause;
  if(paused){stopLoop();showOverlay()}
  else{hideOverlay();last=performance.now();requestFrame()}draw();
}
function gameOver(){
  if(state!=='playing')return;clearInput();stopLoop();state='over';paused=false;
  records={schemaVersion:2,bestScore:Math.max(records.bestScore,score),bestHeight:Math.max(records.bestHeight,Math.floor(highest/10)),bestCombo:Math.max(records.bestCombo,maxCombo)};
  best=records.bestScore;try{localStorage.setItem('skyHopperRecordsV2',JSON.stringify(records));}catch{}
  updateHud();showOverlay();
}
function checkGoal(){
  if(!goal||goal.done)return;
  goal.progress=goal.kind==='height'?Math.floor(highest/10):goal.kind==='precise'?maxPrecise:starCount;
  if(goal.progress>=goal.target){goal.done=true;bonusScore+=100;score=Math.floor(highest/5)+bonusScore;feedback={kind:'goal',life:1.1};}
}
function qualifyJump(){if(!jumpQualified){combo++;maxCombo=Math.max(maxCombo,combo);jumpQualified=true;}}
function landOnPlatform(platform,previousBottom){
  if(player.vy<=0||platform.broken||platform.alpha<=.15)return false;
  const worldBottom=player.y+player.h+cameraY;
  if(previousBottom>platform.y+3||worldBottom<platform.y||player.x+player.w<platform.x||player.x>platform.x+platform.w)return false;
  const firstLanding=!platform.touched,advancing=firstLanding&&platform.y<bestLandingY-1;
  const precise=Math.abs(player.x+player.w/2-platform.x-platform.w/2)<=platform.w*.17;
  player.y=platform.y-cameraY-player.h;player.vy=platform.type==='spring'?-900:-670;
  lastLandingId=platform.id;platform.touched=true;platform.pulse=1;player.bounce=1;player.springBounce=platform.type==='spring';
  if(platform.type==='breaking'&&firstLanding)platform.breakTimer=.18;
  if(platform.type==='fading'&&firstLanding)platform.fadeTimer=.85;
  if(advancing){
    bestLandingY=platform.y;preciseStreak=precise?preciseStreak+1:0;maxPrecise=Math.max(maxPrecise,preciseStreak);
    if(precise||platform.routeRole==='bonus')qualifyJump();else combo=0;
    const gain=(platform.type==='spring'?45:platform.routeRole==='bonus'?35:10)+(precise?10:0);
    bonusScore+=Math.round(gain*Progression.multiplier(combo));score=Math.floor(highest/5)+bonusScore;
    feedback={kind:precise?'precise':platform.routeRole==='bonus'?'risk':'',life:.7};
  }
  jumpQualified=false;
  burst(player.x+player.w/2,platform.y,platform.type==='spring'?palette().yellow:palette().mint,platform.type==='spring'?8:4);
  return true;
}
function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:-60-Math.random()*140,life:.28+Math.random()*.38,size:2+Math.random()*3,color})}
function collectStars(){const worldTop=player.y+cameraY,worldBottom=worldTop+player.h;for(const star of stars){if(star.collected)continue;if(player.x+player.w>star.x-star.r&&player.x<star.x+star.r&&worldBottom>star.y-star.r&&worldTop<star.y+star.r){star.collected=true;starCount++;if(star.bonus)qualifyJump();bonusScore+=Math.round((star.value||25)*(star.bonus?Progression.multiplier(combo):1));score=Math.floor(highest/5)+bonusScore;burst(star.x,star.y,palette().yellow,10)}}}
function update(dt){if(state!=='playing'||paused)return;if(feedback){feedback.life-=dt;if(feedback.life<=0)feedback=null;}player.bounce=Math.max(0,(player.bounce||0)-dt*5);const previousBottom=player.y+player.h+cameraY,dir=(input.right?1:0)-(input.left?1:0);player.vx=Rules.horizontalVelocity(player.vx,dir,dt);player.x+=player.vx*dt;if(player.x+player.w<0)player.x=W;else if(player.x>W)player.x=-player.w;player.vy+=GRAVITY*dt;player.y+=player.vy*dt;
platforms.forEach(p=>{p.pulse=Math.max(0,(p.pulse||0)-dt*5);if(p.type==='moving'){const min=p.minX??4,max=p.maxX??W-4-p.w;p.x+=p.vx*dt;if(p.x<min){p.x=min;p.vx=Math.abs(p.vx)}if(p.x>max){p.x=max;p.vx=-Math.abs(p.vx)}}if(p.breakTimer){p.breakTimer-=dt;if(p.breakTimer<=0)p.broken=true}if(p.broken){p.y+=260*dt;p.alpha-=1.8*dt}else if(p.type==='fading'&&p.touched){p.fadeTimer=Math.max(0,(p.fadeTimer||0)-dt);p.alpha=p.fadeTimer/.85;}});
for(const star of stars){const p=platforms.find(q=>q.id===star.platformId);if(p){star.x=p.x+star.offsetX;star.y=p.y+star.offsetY;}}
for(const p of platforms)if(landOnPlatform(p,previousBottom))break;collectStars();
if(player.y<250){const shift=250-player.y;player.y=250;cameraY-=shift;highest=Math.max(highest,-cameraY);score=Math.floor(highest/5)+bonusScore;generatePlatforms()}
particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=360*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);platforms=platforms.filter(p=>p.y-cameraY<H+170&&p.alpha>0);stars=stars.filter(s=>!s.collected&&s.y-cameraY<H+130);checkGoal();updateHud();if(player.y>H+90)gameOver()}
function writeStat(node,value){if(node.textContent!==value)node.textContent=value}
function updateHud(){
  writeStat(ui.score,String(score).padStart(6,'0'));writeStat(ui.stars,String(starCount).padStart(2,'0'));writeStat(ui.best,String(best).padStart(6,'0'));writeStat(ui.height,String(Math.floor(highest/10)).padStart(4,'0')+'m');
  const w=words[language];writeStat($('stageText'),w.stages[Progression.stage(highest).id]);
  writeStat($('comboText'),w.combo+' '+combo+' · ×'+Progression.multiplier(combo));
  writeStat($('goalText'),goal?(goal.done?'✓ ':'')+w.goal+' · '+w.goals[goal.kind]+' '+Math.min(goal.progress,goal.target)+'/'+goal.target+(goal.kind==='height'?'m':''):w.noGoal);
  writeStat($('feedbackText'),feedback?.kind?w[feedback.kind==='goal'?'goalDone':feedback.kind]:'');
}
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
function drawBackground(p){ctx.fillStyle=p.paper;ctx.fillRect(0,0,W,H)}
function drawStar(star,p){
  const y=star.y-cameraY;if(y<-30||y>H+30)return;
  ctx.save();ctx.translate(star.x,y);ctx.fillStyle=p.yellow;ctx.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?star.r*.46:star.r;if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
  ctx.closePath();ctx.fill();ctx.restore();
}
function drawPlatform(platform,p){
  const y=platform.y-cameraY;if(y<-36||y>H+40)return;
  ctx.save();ctx.globalAlpha=Math.max(0,platform.alpha);
  const colors={normal:p.mint,moving:p.blue,breaking:p.coral,spring:p.yellow,fading:p.purple};
  ctx.fillStyle=colors[platform.type];roundedRect(platform.x,y,platform.w,platform.h||12,3);ctx.fill();
  drawPlatformCue(platform,y,p);ctx.restore();
}
function drawPlatformCue(platform,y,p){
  const x=platform.x+platform.w/2;ctx.strokeStyle=p.cue;ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';
  if(platform.type==='moving'){
    ctx.beginPath();ctx.moveTo(x-10,y+6);ctx.lineTo(x+10,y+6);ctx.moveTo(x-6,y+3);ctx.lineTo(x-10,y+6);ctx.lineTo(x-6,y+9);ctx.moveTo(x+6,y+3);ctx.lineTo(x+10,y+6);ctx.lineTo(x+6,y+9);ctx.stroke();
  }else if(platform.type==='breaking'){
    ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+2,y+4);ctx.lineTo(x-2,y+8);ctx.lineTo(x+3,y+12);ctx.stroke();
  }else if(platform.type==='spring'){
    ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x-6,y-7);ctx.lineTo(x-2,y);ctx.lineTo(x+2,y-7);ctx.lineTo(x+6,y);ctx.lineTo(x+9,y-7);ctx.stroke();
  }else if(platform.type==='fading'){
    ctx.strokeStyle=p.purple;ctx.setLineDash([4,4]);roundedRect(platform.x-2,y-2,platform.w+4,16,4);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle=p.cue;ctx.beginPath();ctx.arc(x,y+6,4,0,Math.PI*2);ctx.moveTo(x,y+3);ctx.lineTo(x,y+6);ctx.lineTo(x+2,y+7);ctx.stroke();
  }
  if(platform.touched&&(platform.type==='breaking'||platform.type==='fading')){
    const remaining=platform.type==='breaking'?Math.max(0,(platform.breakTimer||0)/.18):Math.max(0,platform.alpha);
    ctx.fillStyle=p.cue;ctx.fillRect(platform.x+3,y+16,(platform.w-6)*remaining,2);
  }
}
function drawPlayer(p){
  if(!player)return;ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h/2);
  const bounce=player.bounce||0;ctx.scale(1+bounce*.07,1-bounce*.1);
  // A flat rabbit silhouette fits the same 44 × 48 body: no costume or doodles.
  ctx.fillStyle=p.heroBody;
  for(const x of [-13,4]){roundedRect(x,-24,9,24,4.5);ctx.fill()}
  ctx.beginPath();ctx.ellipse(0,5,21,17,0,0,Math.PI*2);ctx.fill();
  for(const x of [-9,9]){ctx.beginPath();ctx.ellipse(x,20,8,4,0,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle=p.heroMark;ctx.globalAlpha=.32;
  for(const x of [-10,7]){roundedRect(x,-20,3,13,1.5);ctx.fill()}
  ctx.globalAlpha=1;
  for(const x of [-7,7]){ctx.beginPath();ctx.ellipse(x,2,2.2,3,0,0,Math.PI*2);ctx.fill()}
  ctx.beginPath();ctx.moveTo(-2,7);ctx.lineTo(2,7);ctx.lineTo(0,10);ctx.closePath();ctx.fill();
  ctx.strokeStyle=p.heroMark;ctx.lineWidth=1.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(0,10);ctx.lineTo(0,12);ctx.moveTo(-3,13);ctx.quadraticCurveTo(0,15,3,13);ctx.stroke();ctx.restore();
}
function draw(){
  const p=palette();drawBackground(p);platforms.forEach(platform=>drawPlatform(platform,p));stars.forEach(star=>drawStar(star,p));
  particles.forEach(part=>{ctx.save();ctx.globalAlpha=Math.max(0,part.life*2.4);ctx.fillStyle=part.color;ctx.beginPath();ctx.arc(part.x,part.y-cameraY,part.size,0,Math.PI*2);ctx.fill();ctx.restore()});drawPlayer(p);
}
function stopLoop(){if(rafId)cancelAnimationFrame(rafId);rafId=0;accumulator=0}
function requestFrame(){if(!rafId&&state==='playing'&&!paused&&!document.hidden)rafId=requestAnimationFrame(loop)}
function loop(time){
  rafId=0;if(state!=='playing'||paused||document.hidden)return;
  const dt=Math.min(.1,Math.max(0,(time-last)/1000));last=time;clock=time;accumulator+=dt;
  while(accumulator+1e-9>=Rules.PHYSICS.step&&state==='playing'&&!paused){update(Rules.PHYSICS.step);accumulator-=Rules.PHYSICS.step}
  draw();requestFrame();
}
const pointers=new Map(),keys=new Set();
function clearSelection(){const selection=window.getSelection?.();if(selection&&!selection.isCollapsed)selection.removeAllRanges()}
// Protect control gaps and surrounding instructions, not only button targets.
for(const type of ['selectstart','contextmenu','dragstart'])$('gameShell').addEventListener(type,event=>event.preventDefault(),true);
$('gameShell').addEventListener('pointerdown',clearSelection,true);
function syncPointers(){input.left=[...pointers.values()].includes('left')||keys.has('arrowleft')||keys.has('a');input.right=[...pointers.values()].includes('right')||keys.has('arrowright')||keys.has('d');$('leftButton').classList.toggle('active',input.left);$('rightButton').classList.toggle('active',input.right)}
function holdPointer(target,event,key){event.preventDefault();clearSelection();if(state!=='playing')start();if(paused)return;pointers.set(event.pointerId,key);syncPointers();try{target.setPointerCapture?.(event.pointerId)}catch{}}
function clearInput(){pointers.clear();keys.clear();syncPointers()}
function releasePointer(event){pointers.delete(event.pointerId);syncPointers()}
function bindHold(id,key){const button=$(id);button.addEventListener('pointerdown',e=>holdPointer(button,e,key));for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,releasePointer);button.addEventListener('pointerleave',e=>{if(!button.hasPointerCapture?.(e.pointerId))releasePointer(e)});for(const type of ['selectstart','contextmenu'])button.addEventListener(type,e=>e.preventDefault())}
bindHold('leftButton','left');bindHold('rightButton','right');
canvas.addEventListener('pointerdown',event=>{const rect=canvas.getBoundingClientRect();holdPointer(canvas,event,event.clientX-rect.left<rect.width/2?'left':'right')});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,releasePointer);
canvas.addEventListener('pointerleave',e=>{if(!canvas.hasPointerCapture?.(e.pointerId))releasePointer(e)});
addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowleft','a','arrowright','d'].includes(key)){event.preventDefault();clearSelection();if(state!=='playing'){if(event.repeat)return;start()}if(paused)return;keys.add(key);syncPointers()}if(key==='p'&&!event.repeat)togglePause()});
addEventListener('keyup',event=>{keys.delete(event.key.toLowerCase());syncPointers()});
addEventListener('blur',()=>{clearInput();if(state==='playing'&&!paused)togglePause()});
ui.start.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause()});document.addEventListener('themechange',()=>{paletteCache=null;utilities();draw()});
$('languageButton').addEventListener('click',()=>{language=language==='zh'?'en':'zh';try{localStorage.setItem('play-lang',language)}catch{}translate()});addEventListener('load',utilities);addEventListener('game-data-clearing',()=>{clearInput();stopLoop();state='clearing';paused=true;});
player={x:W/2-22,y:590,w:44,h:48,vx:0,vy:0};platforms=[];translate();updateHud();draw()})();
