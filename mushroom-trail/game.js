(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const GRAVITY=1760,PLAYER_SPEED=285,RUN_SPEED=410,JUMP_SPEED=690;
const $=id=>document.getElementById(id);
const ui={world:$('world'),coins:$('coins'),lives:$('lives'),score:$('score'),overlay:$('overlay'),message:$('message'),detail:$('detail'),start:$('startButton'),pause:$('pauseButton'),run:$('runButton')};
const input={left:false,right:false,jump:false,run:false};
let runLatched=false;
let state='title',paused=false,levelIndex=0,current=null,player=null,particles=[],powerups=[],cameraX=0,clock=0,last=0;
const STEP=1/120,MAX_FRAME=.1;
let rafId=null,dirty=true,cachedPalette=null,accumulator=0,clearing=false;
let lives=3,score=0,coins=0,best=readBest(),checkpointReached=false;

function readBest(){try{const value=Number(localStorage.getItem('mushroomTrailBest'));return Number.isSafeInteger(value)&&value>=0?value:0;}catch(_){return 0;}}
function saveBest(){if(clearing)return;try{localStorage.setItem('mushroomTrailBest',String(best));}catch(_){} }
const p=(x,y,w,h=22,type='grass',extra={})=>({x,y,w,h,type,...extra});
const ground=(x,w)=>p(x,460,w,80,'ground');
const coinLine=(x,y,count,step=30)=>Array.from({length:count},(_,i)=>({x:x+i*step,y,got:false}));
const enemy=(x,type='walker',minX=x-80,maxX=x+130)=>({x,y:426,w:34,h:34,type,vx:type==='hopper'?70:58,minX,maxX,vy:0,onGround:false,dead:false,phase:Math.random()*4});
const moving=(x,y,w,range,speed)=>p(x,y,w,18,'moving',{baseX:x,range,speed,phase:0});
const pipe=(x,y=400,w=62,h=60)=>p(x,y,w,h,'pipe');

const LEVELS=[
  {
    id:'1-1',name:'SUNNY MEADOW',hint:'COIN BOX · LEAF SEED · SAFE FIRST GAP',width:3600,sky:['#9edcf0','#fff2bf'],start:{x:70,y:418},checkpoint:{x:1840,y:420},goal:{x:3400,y:360},
    platforms:[
      ground(0,900),ground(1040,640),ground(1800,730),ground(2660,940),
      p(260,360,180),p(520,290,120,22,'brick'),p(770,350,150),p(1120,350,180),p(1390,285,150,22,'brick'),p(1630,340,120),
      p(1920,330,170),p(2160,265,125,22,'brick'),p(2380,350,150),p(2740,350,180),p(3000,285,140,22,'brick'),p(3200,365,120),
      moving(905,380,116,55,1.35),moving(2540,360,105,62,1.1),pipe(200,390,76,70),pipe(470),pipe(760,390,76,70),pipe(2320),
      p(130,342,40,40,'question',{contents:'coin'}),p(320,266,40,40,'question',{contents:'spark'}),p(540,190,40,40,'question',{contents:'coin'}),p(1450,185,40,40,'question',{contents:'spark'}),p(2220,165,40,40,'question',{contents:'coin'}),p(3060,185,40,40,'question',{contents:'spark'})
    ],
    coins:[...coinLine(300,320,4),...coinLine(1080,310,5),...coinLine(1910,290,5),...coinLine(2750,310,5),...coinLine(3260,325,4)],
    enemies:[enemy(610,'walker',540,820),enemy(1230,'walker',1110,1450),enemy(1990,'hopper',1880,2110),enemy(2860,'walker',2740,3100),enemy(3260,'hopper',3150,3350)],
    decor:[{x:180,type:'tree'},{x:720,type:'tree'},{x:1180,type:'bush'},{x:2020,type:'tree'},{x:2860,type:'bush'},{x:3180,type:'tree'}]
  },
  {
    id:'1-2',name:'TWILIGHT CANYON',hint:'MOVING STONES · WATCH THE GAPS',width:4300,sky:['#f29b83','#5f76a9'],start:{x:70,y:418},checkpoint:{x:2010,y:420},goal:{x:4080,y:335},
    platforms:[
      ground(0,680),ground(820,530),ground(1500,580),ground(2240,520),ground(2920,580),ground(3650,650),
      p(180,350,140),p(410,280,115,22,'brick'),p(700,360,120),p(920,330,150),p(1170,255,125,22,'brick'),p(1400,350,130),
      p(1640,300,140),p(1870,240,125,22,'brick'),p(2150,335,120),p(2380,270,145),p(2630,345,135),
      p(3010,320,150),p(3260,250,120,22,'brick'),p(3470,350,130),p(3740,285,155),p(3970,340,110),
      moving(690,372,105,70,1.45),moving(1335,345,110,75,1.25),moving(2100,365,100,85,1.5),moving(2790,365,110,80,1.4),moving(3510,335,105,65,1.3),pipe(520),pipe(2700),
      p(440,180,40,40,'question',{contents:'coin'}),p(1210,155,40,40,'question',{contents:'spark'}),p(1900,140,40,40,'question',{contents:'coin'}),p(3300,150,40,40,'question',{contents:'spark'})
    ],
    coins:[...coinLine(190,310,4),...coinLine(850,295,4),...coinLine(1530,310,4),...coinLine(2280,300,4),...coinLine(2990,285,5),...coinLine(3730,255,5)],
    enemies:[enemy(330,'walker',230,590),enemy(900,'hopper',850,1110),enemy(1550,'walker',1510,1830),enemy(2320,'walker',2260,2560),enemy(3090,'hopper',2970,3200),enemy(3780,'walker',3670,3990)],
    decor:[{x:140,type:'cactus'},{x:600,type:'cactus'},{x:1010,type:'rock'},{x:1760,type:'cactus'},{x:2460,type:'rock'},{x:3160,type:'cactus'},{x:3880,type:'rock'}]
  },
  {
    id:'1-3',name:'MOONLIT FORT',hint:'FINAL RUN · STOMP THE GUARDIANS',width:5200,sky:['#26385f','#161b38'],start:{x:70,y:418},checkpoint:{x:2520,y:420},goal:{x:4950,y:325},
    platforms:[
      ground(0,760),ground(900,560),ground(1600,620),ground(2360,540),ground(3040,640),ground(3830,620),ground(4590,610),
      p(220,350,160),p(470,270,130,22,'brick'),p(680,350,130),p(960,330,145),p(1220,245,130,22,'brick'),p(1430,350,110),
      p(1660,315,150),p(1910,240,120,22,'brick'),p(2160,345,130),p(2420,290,140),p(2680,215,120,22,'brick'),p(2860,350,120),
      p(3090,310,150),p(3340,235,125,22,'brick'),p(3550,340,120),p(3890,285,150),p(4140,205,130,22,'brick'),p(4360,340,120),p(4660,280,145),p(4890,340,100),
      moving(770,370,110,80,1.55),moving(1470,355,105,75,1.5),moving(2240,360,100,80,1.65),moving(2960,365,105,90,1.55),moving(3750,350,105,80,1.7),moving(4480,350,100,85,1.65),pipe(520),pipe(2820),pipe(4520),
      p(500,170,40,40,'question',{contents:'coin'}),p(1260,145,40,40,'question',{contents:'spark'}),p(1960,140,40,40,'question',{contents:'coin'}),p(2720,115,40,40,'question',{contents:'spark'}),p(4180,105,40,40,'question',{contents:'spark'})
    ],
    coins:[...coinLine(230,310,5),...coinLine(940,295,4),...coinLine(1630,280,5),...coinLine(2390,250,4),...coinLine(3110,265,5),...coinLine(3910,240,5),...coinLine(4680,235,5)],
    enemies:[enemy(360,'walker',230,650),enemy(1000,'hopper',920,1120),enemy(1710,'walker',1640,1940),enemy(2190,'hopper',2060,2300),enemy(2480,'walker',2380,2630),enemy(3160,'hopper',3060,3310),enemy(3970,'walker',3860,4100),enemy(4380,'hopper',4270,4540),enemy(4750,'walker',4630,4900)],
    decor:[{x:120,type:'moonrock'},{x:580,type:'moonrock'},{x:1120,type:'crystal'},{x:1740,type:'moonrock'},{x:2320,type:'crystal'},{x:3190,type:'moonrock'},{x:4010,type:'crystal'},{x:4720,type:'moonrock'}]
  }
];

function palette(){
  if(cachedPalette)return cachedPalette;
  const style=getComputedStyle(document.documentElement);
  const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;
  return cachedPalette={paper:read('--paper','#fff7e7'),panel:read('--panel','#fffdf7'),ink:read('--ink','#3c302a'),muted:read('--muted','#8d7868'),line:read('--line','#dfcbb4'),mint:read('--mint','#8fcfa9'),blue:read('--blue','#8dc9df'),yellow:read('--yellow','#f7cd5c'),coral:read('--coral','#e9785e'),purple:read('--purple','#ad9bdf'),shadow:read('--shadow','#d7bfa5')};
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function burst(x,y,color,count=8){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*170,vy:-60-Math.random()*170,life:.3+Math.random()*.45,size:2+Math.random()*3,color});}
function showOverlay(title,detail,button){ui.message.textContent=title;ui.detail.textContent=detail;ui.start.textContent=button;ui.overlay.classList.remove('hidden');requestDraw();}
function hideOverlay(){ui.overlay.classList.add('hidden');updateRunButton();requestDraw();}
function updateRunButton(){const active=input.run;ui.run.classList.toggle('active',active);const pressed=String(active);if(ui.run.getAttribute('aria-pressed')!==pressed)ui.run.setAttribute('aria-pressed',pressed);const text=active?'RUN ON':'RUN';if(ui.run.textContent!==text)ui.run.textContent=text;const disabled=paused||state==='clear'||clearing;if(ui.run.disabled!==disabled)ui.run.disabled=disabled;}
function updateHud(){updateRunButton();const values={world:current?current.id:'1-1',coins:String(coins).padStart(2,'0'),lives:'♥'.repeat(Math.max(0,lives))+'♡'.repeat(Math.max(0,3-lives)),score:String(score).padStart(6,'0')};for(const [key,value]of Object.entries(values))if(ui[key].textContent!==value)ui[key].textContent=value;}
function setPlayerSpawn(){
  resetInput();
  const spawnX=checkpointReached?current.checkpoint.x+18:current.start.x;
  player={x:spawnX,y:current.start.y,w:30,h:42,vx:0,vy:0,grounded:false,supportId:null,coyote:0,jumpBuffer:0,powered:false,inv:0,face:1,anim:0};
  cameraX=clamp(player.x-W*.34,0,current.width-W);
}
function loadLevel(index){
  levelIndex=index;current=clone(LEVELS[index]);
  current.platforms.forEach((platform,i)=>{platform.id=`${current.id}-p${i}`;if(platform.type==='moving'){platform.x=platform.baseX;platform.phase=0;}if(platform.type==='question')platform.hit=false;});
  current.enemies.forEach(enemyState=>{enemyState.y=426;enemyState.vy=0;enemyState.onGround=false;enemyState.dead=false;});
  checkpointReached=false;powerups=[];particles=[];cameraX=0;setPlayerSpawn();updateHud();
}
function startGame(){if(clearing||document.hidden)return;lives=3;score=0;coins=0;loadLevel(0);state='playing';paused=false;ui.pause.textContent='PAUSE';hideOverlay();resetTiming();}
function nextLevel(){if(clearing||document.hidden)return;if(levelIndex<LEVELS.length-1){lives=Math.max(1,lives);loadLevel(levelIndex+1);state='playing';paused=false;hideOverlay();resetTiming();}else{startGame();}}
function togglePause(){if(clearing||document.hidden)return;if(state!=='playing')return;paused=!paused;resetInput();ui.pause.textContent=paused?'RESUME':'PAUSE';if(paused)showOverlay('PAUSED','THE TRAIL WILL WAIT · TAKE A BREATH','RESUME');else{hideOverlay();resetTiming();}}
function gameOver(){if(state==='over')return;state='over';paused=false;resetInput();best=Math.max(best,score);saveBest();updateHud();showOverlay('TRAIL ENDED',`SCORE ${score} · COINS ${coins} · BEST ${best}`,'TRY AGAIN');}
function levelClear(){if(clearing)return;if(state!=='playing')return;state='clear';paused=false;resetInput();score+=500*(levelIndex+1);best=Math.max(best,score);saveBest();updateHud();const lastLevel=levelIndex===LEVELS.length-1;showOverlay(lastLevel?'TRAIL COMPLETE':'GOAL REACHED',lastLevel?`ALL ${LEVELS.length} WORLDS CLEAR · SCORE ${score}`:`${current.name} CLEAR · +${500*(levelIndex+1)} BONUS`,lastLevel?'PLAY AGAIN':'NEXT WORLD');}
function reachCheckpoint(){if(!checkpointReached&&player.x>current.checkpoint.x){checkpointReached=true;score+=150;burst(current.checkpoint.x,current.checkpoint.y-35,palette().yellow,16);}}
function spawnPowerup(block){powerups.push({x:block.x+8,y:block.y-34,w:24,h:24,vx:65,vy:-120,type:'spark',born:0});}
function bumpBlock(block){if(block.broken||block.bump>0)return;block.bump=.16;if(block.type==='question'&&!block.hit){block.hit=true;if(block.contents==='coin'){coins++;score+=50;particles.push({kind:'coin',x:block.x+20,y:block.y-12,vx:0,vy:-280,life:.5,size:3,color:palette().yellow});burst(block.x+20,block.y-8,palette().yellow,6);}else{spawnPowerup(block);}}else if(block.type==='brick'&&player.powered){block.broken=true;score+=30;burst(block.x+20,block.y+20,palette().coral,14);}}
function pressJump(){if(clearing||paused||document.hidden)return;if(state!=='playing'){if(state==='title'||state==='over')startGame();return;}input.jump=true;player.jumpBuffer=.14;}
function releaseJump(){input.jump=false;if(player&&player.vy<0)player.vy*=.52;}
function resolvePlayer(dt){
  if(player.supportId){const support=current.platforms.find(block=>block.id===player.supportId);if(support&&support.type==='moving')player.x+=support._dx||0;}
  const previous={x:player.x,y:player.y,bottom:player.y+player.h};
  const dir=(input.right?1:0)-(input.left?1:0);
  const speed=input.run?RUN_SPEED:PLAYER_SPEED;
  if(dir){player.vx+=(dir*speed-player.vx)*Math.min(1,dt*11);player.face=dir;}
  else player.vx*=Math.pow(.72,dt*32);
  // Releasing Run brakes down smoothly, rather than clipping momentum instantly.
  if(!input.run&&Math.abs(player.vx)>PLAYER_SPEED)player.vx+=(Math.sign(player.vx)*PLAYER_SPEED-player.vx)*Math.min(1,dt*10);
  player.vx=clamp(player.vx,-RUN_SPEED,RUN_SPEED);
  if(player.grounded)player.coyote=.11;else player.coyote=Math.max(0,player.coyote-dt);
  player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);
  if(player.jumpBuffer>0&&player.coyote>0){player.vy=-JUMP_SPEED;player.grounded=false;player.supportId=null;player.jumpBuffer=0;player.coyote=0;burst(player.x+15,player.y+player.h,palette().yellow,5);}
  const oldX=player.x;player.x+=player.vx*dt;
  for(const block of current.platforms){if(block.broken)continue;const vertical=previous.y+player.h>block.y+3&&previous.y<block.y+block.h-3;if(!vertical)continue;if(player.vx>0&&oldX+player.w<=block.x+2&&player.x+player.w>block.x){player.x=block.x-player.w;player.vx=0;}else if(player.vx<0&&oldX>=block.x+block.w-2&&player.x<block.x+block.w){player.x=block.x+block.w;player.vx=0;}}
  player.x=clamp(player.x,0,current.width-player.w);
  player.vy=Math.min(980,player.vy+GRAVITY*dt);const oldBottom=previous.bottom;player.y+=player.vy*dt;player.grounded=false;player.supportId=null;
  for(const block of current.platforms){if(block.broken||!rectsOverlap({x:player.x,y:player.y,w:player.w,h:player.h},block)&&!(player.x+player.w>block.x&&player.x<block.x+block.w))continue;const horizontal=player.x+player.w>block.x+3&&player.x<block.x+block.w-3;
    if(player.vy>=0&&oldBottom<=block.y+8&&player.y+player.h>=block.y&&horizontal){player.y=block.y-player.h;player.vy=0;player.grounded=true;player.supportId=block.id;}
    else if(player.vy<0&&previous.y>=block.y+block.h-6&&player.y<=block.y+block.h&&horizontal){player.y=block.y+block.h;player.vy=35;if(block.type==='question'||block.type==='brick')bumpBlock(block);}
  }
  if(player.y>H+170){hurtPlayer(true);return;}
  if(player.inv>0)player.inv=Math.max(0,player.inv-dt);
  player.anim+=dt*(Math.abs(player.vx)*.035+2);
}
function updatePlatforms(dt){for(const block of current.platforms){block.bump=Math.max(0,(block.bump||0)-dt);if(block.type==='moving'){const before=block.x;block.phase+=dt*block.speed;block.x=block.baseX+Math.sin(block.phase)*block.range;block._dx=block.x-before;}else block._dx=0;}}
function updateEnemies(dt){for(const enemyState of current.enemies){if(enemyState.dead)continue;const oldBottom=enemyState.y+enemyState.h;enemyState.phase+=dt;enemyState.vy=Math.min(900,enemyState.vy+GRAVITY*dt);enemyState.y+=enemyState.vy*dt;enemyState.x+=enemyState.vx*dt;if(enemyState.x<enemyState.minX){enemyState.x=enemyState.minX;enemyState.vx=Math.abs(enemyState.vx);}if(enemyState.x>enemyState.maxX){enemyState.x=enemyState.maxX;enemyState.vx=-Math.abs(enemyState.vx);}enemyState.onGround=false;for(const block of current.platforms){if(block.broken)continue;const horizontal=enemyState.x+enemyState.w>block.x+3&&enemyState.x<block.x+block.w-3;if(enemyState.vy>=0&&oldBottom<=block.y+.01&&enemyState.y+enemyState.h>=block.y&&horizontal){enemyState.y=block.y-enemyState.h;enemyState.vy=0;enemyState.onGround=true;}}if(enemyState.type==='hopper'&&enemyState.onGround&&Math.sin(enemyState.phase*2.6)>0.98)enemyState.vy=-570;}}
function stompOrHurt(){for(const enemyState of current.enemies){if(enemyState.dead)continue;if(!rectsOverlap(player,enemyState))continue;const falling=player.vy>80&&player.y+player.h-enemyState.y<18;if(falling){enemyState.dead=true;player.y=enemyState.y-player.h;player.vy=input.jump?-640:-470;player.grounded=false;player.supportId=null;player.coyote=0;player.jumpBuffer=0;score+=100;burst(enemyState.x+enemyState.w/2,enemyState.y,palette().coral,12);}else hurtPlayer();break;}}
function hurtPlayer(fell=false){if(state!=='playing'||(!fell&&player.inv>0))return;if(player.powered&&!fell){player.powered=false;player.inv=1.3;player.vy=-390;burst(player.x+15,player.y+20,palette().yellow,16);return;}lives--;setPlayerSpawn();player.inv=1.4;updateHud();if(lives<=0){gameOver();return;}}
function updateCoins(){for(const coin of current.coins){if(coin.got)continue;const dx=player.x+player.w/2-coin.x,dy=player.y+player.h/2-coin.y;if(dx*dx+dy*dy<34*34){coin.got=true;coins++;score+=25;burst(coin.x,coin.y,palette().yellow,8);}}}
function updatePowerups(dt){
  for(const item of powerups){
    const oldBottom=item.y+item.h,oldX=item.x;item.born+=dt;
    if(item.born>.2){item.vx??=65;item.x+=item.vx*dt;}
    for(const block of current.platforms){if(block.broken||item.y+item.h<=block.y||item.y>=block.y+block.h)continue;
      if(item.vx>0&&oldX+item.w<=block.x+.01&&item.x+item.w>block.x){item.x=block.x-item.w;item.vx=-Math.abs(item.vx);}
      else if(item.vx<0&&oldX>=block.x+block.w-.01&&item.x<block.x+block.w){item.x=block.x+block.w;item.vx=Math.abs(item.vx);}
    }
    if(item.x<0){item.x=0;item.vx=Math.abs(item.vx||65);}else if(item.x+item.w>current.width){item.x=current.width-item.w;item.vx=-Math.abs(item.vx||65);}
    item.vy=Math.min(500,item.vy+760*dt);item.y+=item.vy*dt;
    const block=current.platforms.find(candidate=>item.vy>=0&&!candidate.broken&&oldBottom<=candidate.y+.01&&item.x+item.w>candidate.x&&item.x<candidate.x+candidate.w&&item.y+item.h>=candidate.y);
    if(block){item.y=block.y-item.h;item.vy=0;}
    if(rectsOverlap(player,item)){item.collected=true;player.powered=true;score+=200;burst(item.x+12,item.y+12,palette().mint,18);}
  }
  powerups=powerups.filter(item=>!item.collected&&item.y<H+120);
}
function update(dt){if(state!=='playing'||paused)return;updatePlatforms(dt);resolvePlayer(dt);if(state!=='playing')return;updateEnemies(dt);stompOrHurt();if(state!=='playing')return;updateCoins();updatePowerups(dt);reachCheckpoint();if(player.x+player.w>current.goal.x&&player.y+player.h>current.goal.y-100){levelClear();return;}cameraX=clamp(player.x-W*.34,0,current.width-W);particles.forEach(part=>{part.x+=part.vx*dt;part.y+=part.vy*dt;part.vy+=420*dt;part.life-=dt;});particles=particles.filter(part=>part.life>0);updateHud();}

const pixelRenderer=window.MushroomPixel.create(ctx);
function draw(){pixelRenderer.draw({world:current,player,cameraX,clock,levelIndex,powerups,particles,checkpointReached,dark:document.documentElement.dataset.theme==='dark'});}
function resetTiming(){last=performance.now();accumulator=0;}
function schedule(){if(rafId===null&&!document.hidden&&(dirty||(state==='playing'&&!paused)))rafId=requestAnimationFrame(loop);}
function requestDraw(){dirty=true;schedule();}
function loop(time){
  rafId=null;if(document.hidden)return;
  if(state==='playing'&&!paused){
    accumulator+=Math.min(MAX_FRAME,Math.max(0,(time-last)/1000));last=time;
    while(accumulator+1e-9>=STEP&&state==='playing'&&!paused){accumulator=Math.max(0,accumulator-STEP);clock+=STEP*1000;update(STEP);}
    if(state!=='playing'||paused)accumulator=0;
  }
  if(dirty||(state==='playing'&&!paused)){draw();dirty=false;}
  schedule();
}
const heldKeys=new Set(),pointers=new Map();
function resetInput(){
  heldKeys.clear();runLatched=false;const owners=[...pointers.entries()];pointers.clear();
  for(const [id,owner]of owners)try{owner.button.releasePointerCapture(id);}catch(_){}
  for(const action of ['left','right','jump','run']){input[action]=false;$(action+'Button').classList.remove('active');}
  if(player)player.jumpBuffer=0;updateRunButton();
}
const keyAction=key=>({arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'jump',w:'jump',' ':'jump',shift:'run',shiftleft:'run',shiftright:'run'}[key]);
function keyOwner(event){const key=event.key.toLowerCase();return key==='shift'&&event.code?event.code.toLowerCase():key;}
function syncInput(){
  const previousJump=input.jump;
  for(const action of ['left','right','jump','run'])input[action]=[...heldKeys].some(key=>keyAction(key)===action)||[...pointers.values()].some(p=>p.action===action)||(action==='run'&&runLatched);
  for(const action of ['left','right','jump','run'])$(action+'Button').classList.toggle('active',input[action]);
  updateRunButton();if(input.jump&&!previousJump)pressJump();else if(!input.jump&&previousJump)releaseJump();
}
function bindControl(id,action){
  const button=$(id);
  button.addEventListener('pointerdown',event=>{
    if(clearing||document.hidden||event.button!==0||pointers.has(event.pointerId))return;
    event.preventDefault();if(state==='title'||state==='over')startGame();
    if(state!=='playing'||paused)return;
    pointers.set(event.pointerId,{action,button});try{button.setPointerCapture(event.pointerId);}catch(_){}syncInput();
  });
  const off=event=>{const owner=pointers.get(event.pointerId);if(!owner||owner.button!==button)return;event.preventDefault();pointers.delete(event.pointerId);try{button.releasePointerCapture(event.pointerId);}catch(_){}syncInput();};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,off);
  for(const type of ['contextmenu','selectstart','dragstart'])button.addEventListener(type,event=>event.preventDefault());
}
function bindHold(id,action){bindControl(id,action);}
function bindJump(id){bindControl(id,'jump');}
bindHold('leftButton','left');bindHold('rightButton','right');bindJump('jumpButton');
addEventListener('keydown',event=>{
  const key=event.key.toLowerCase(),action=keyAction(key);
  if(clearing||document.hidden||event.ctrlKey||event.metaKey||event.altKey||event.target?.isContentEditable||event.target?.closest('input,textarea,select'))return;
  if((key===' '||key==='enter')&&event.target?.closest('button,a'))return;
  if(key==='p'||key==='escape'){event.preventDefault();if(!event.repeat)togglePause();return;}
  if(!action)return;event.preventDefault();if(event.repeat)return;
  if(state==='title'||state==='over')startGame();if(state!=='playing'||paused)return;
  heldKeys.add(keyOwner(event));syncInput();
});
addEventListener('keyup',event=>{heldKeys.delete(keyOwner(event));syncInput();});
ui.run.addEventListener('click',()=>{if(clearing||document.hidden||paused||state==='clear')return;if(state==='title'||state==='over')startGame();runLatched=!runLatched;syncInput();ui.run.blur?.();});
ui.start.addEventListener('click',()=>{if(state==='clear')nextLevel();else if(paused)togglePause();else startGame();ui.start.blur?.();});
ui.pause.addEventListener('click',togglePause);
function suspend(){resetInput();if(state==='playing'&&!paused){paused=true;resetTiming();ui.pause.textContent='RESUME';showOverlay('PAUSED','THE TRAIL WILL WAIT · TAKE A BREATH','RESUME');}}
addEventListener('blur',suspend);
addEventListener('pagehide',suspend);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else requestDraw();});
addEventListener('game-data-clearing',()=>{clearing=true;best=0;suspend();if(rafId!==null)cancelAnimationFrame(rafId);rafId=null;});
document.addEventListener('themechange',()=>{cachedPalette=null;requestDraw();});
addEventListener('resize',requestDraw);
function dockUtilities(){const dock=$('utilityDock');if(!dock)return;for(const selector of ['.theme-toggle','.clear-data-toggle']){const button=document.querySelector(selector);if(button)dock.appendChild(button);}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dockUtilities,{once:true});else dockUtilities();
window.MushroomTrail=Object.freeze({getSnapshot:()=>clone({state:paused?'paused':state,levelIndex,world:current,player,input,score,coins,lives,best,checkpointReached,cameraX,clock,step:STEP,clearing})});
loadLevel(0);showOverlay('MUSHROOM TRAIL','RUN · JUMP · STOMP · REACH THE GOAL FLAG','START ADVENTURE');updateHud();requestDraw();
})();
