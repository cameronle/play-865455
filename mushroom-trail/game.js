(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const W=canvas.width,H=canvas.height;
const GRAVITY=1760,PLAYER_SPEED=285,JUMP_SPEED=690;
const $=id=>document.getElementById(id);
const ui={world:$('world'),coins:$('coins'),lives:$('lives'),score:$('score'),overlay:$('overlay'),message:$('message'),detail:$('detail'),start:$('startButton'),pause:$('pauseButton')};
const input={left:false,right:false,jump:false};
let state='title',paused=false,levelIndex=0,current=null,player=null,particles=[],powerups=[],cameraX=0,clock=0,last=0;
let lives=3,score=0,coins=0,best=Number(localStorage.getItem('mushroomTrailBest')||0),checkpointReached=false;

const p=(x,y,w,h=22,type='grass',extra={})=>({x,y,w,h,type,...extra});
const ground=(x,w)=>p(x,460,w,80,'ground');
const coinLine=(x,y,count,step=30)=>Array.from({length:count},(_,i)=>({x:x+i*step,y,got:false}));
const enemy=(x,type='walker',minX=x-80,maxX=x+130)=>({x,y:426,w:34,h:34,type,vx:type==='hopper'?70:58,minX,maxX,vy:0,onGround:false,dead:false,phase:Math.random()*4});
const moving=(x,y,w,range,speed)=>p(x,y,w,18,'moving',{baseX:x,range,speed,phase:0});
const pipe=(x,y=400,w=62,h=60)=>p(x,y,w,h,'pipe');

const LEVELS=[
  {
    id:'1-1',name:'SUNNY MEADOW',hint:'LEARN THE TRAIL · FIND THE FIRST BEACON',width:3600,sky:['#9edcf0','#fff2bf'],start:{x:70,y:418},checkpoint:{x:1710,y:420},goal:{x:3400,y:360},
    platforms:[
      ground(0,900),ground(1040,640),ground(1800,730),ground(2660,940),
      p(260,360,180),p(520,290,120,'brick'),p(770,350,150),p(1120,350,180),p(1390,285,150,'brick'),p(1630,340,120),
      p(1920,330,170),p(2160,265,125,'brick'),p(2380,350,150),p(2740,350,180),p(3000,285,140,'brick'),p(3200,365,120),
      moving(905,380,116,55,1.35),moving(2540,360,105,62,1.1),pipe(470),pipe(2320),
      p(540,236,40,40,'question',{contents:'coin'}),p(1450,226,40,40,'question',{contents:'spark'}),p(2220,205,40,40,'question',{contents:'coin'}),p(3060,225,40,40,'question',{contents:'spark'})
    ],
    coins:[...coinLine(300,320,4),...coinLine(1080,310,5),...coinLine(1910,290,5),...coinLine(2750,310,5),...coinLine(3260,325,4)],
    enemies:[enemy(610,'walker',540,820),enemy(1230,'walker',1110,1450),enemy(1990,'hopper',1880,2110),enemy(2860,'walker',2740,3100),enemy(3260,'hopper',3150,3350)],
    decor:[{x:180,type:'tree'},{x:720,type:'tree'},{x:1180,type:'bush'},{x:2020,type:'tree'},{x:2860,type:'bush'},{x:3180,type:'tree'}]
  },
  {
    id:'1-2',name:'TWILIGHT CANYON',hint:'MOVING STONES · WATCH THE GAPS',width:4300,sky:['#f29b83','#5f76a9'],start:{x:70,y:418},checkpoint:{x:2050,y:420},goal:{x:4080,y:335},
    platforms:[
      ground(0,680),ground(820,530),ground(1500,580),ground(2240,520),ground(2920,580),ground(3650,650),
      p(180,350,140),p(410,280,115,'brick'),p(700,360,120),p(920,330,150),p(1170,255,125,'brick'),p(1400,350,130),
      p(1640,300,140),p(1870,240,125,'brick'),p(2150,335,120),p(2380,270,145),p(2630,345,135),
      p(3010,320,150),p(3260,250,120,'brick'),p(3470,350,130),p(3740,285,155),p(3970,340,110),
      moving(690,372,105,70,1.45),moving(1335,345,110,75,1.25),moving(2100,365,100,85,1.5),moving(2790,365,110,80,1.4),moving(3510,335,105,65,1.3),pipe(520),pipe(2700),
      p(440,226,40,40,'question',{contents:'coin'}),p(1210,195,40,40,'question',{contents:'spark'}),p(1900,180,40,40,'question',{contents:'coin'}),p(3300,190,40,40,'question',{contents:'spark'})
    ],
    coins:[...coinLine(190,310,4),...coinLine(850,295,4),...coinLine(1530,310,4),...coinLine(2280,300,4),...coinLine(2990,285,5),...coinLine(3730,255,5)],
    enemies:[enemy(330,'walker',230,590),enemy(900,'hopper',850,1110),enemy(1550,'walker',1510,1830),enemy(2320,'walker',2260,2560),enemy(3090,'hopper',2970,3200),enemy(3780,'walker',3670,3990)],
    decor:[{x:140,type:'cactus'},{x:600,type:'cactus'},{x:1010,type:'rock'},{x:1760,type:'cactus'},{x:2460,type:'rock'},{x:3160,type:'cactus'},{x:3880,type:'rock'}]
  },
  {
    id:'1-3',name:'MOONLIT FORT',hint:'FINAL RUN · STOMP THE GUARDIANS',width:5200,sky:['#26385f','#161b38'],start:{x:70,y:418},checkpoint:{x:2520,y:420},goal:{x:4950,y:325},
    platforms:[
      ground(0,760),ground(900,560),ground(1600,620),ground(2360,540),ground(3040,640),ground(3830,620),ground(4590,610),
      p(220,350,160),p(470,270,130,'brick'),p(680,350,130),p(960,330,145),p(1220,245,130,'brick'),p(1430,350,110),
      p(1660,315,150),p(1910,240,120,'brick'),p(2160,345,130),p(2420,290,140),p(2680,215,120,'brick'),p(2860,350,120),
      p(3090,310,150),p(3340,235,125,'brick'),p(3550,340,120),p(3890,285,150),p(4140,205,130,'brick'),p(4360,340,120),p(4660,280,145),p(4890,340,100),
      moving(770,370,110,80,1.55),moving(1470,355,105,75,1.5),moving(2240,360,100,80,1.65),moving(2960,365,105,90,1.55),moving(3750,350,105,80,1.7),moving(4480,350,100,85,1.65),pipe(520),pipe(2820),pipe(4520),
      p(500,215,40,40,'question',{contents:'coin'}),p(1260,185,40,40,'question',{contents:'spark'}),p(1960,180,40,40,'question',{contents:'coin'}),p(2720,155,40,40,'question',{contents:'spark'}),p(4180,145,40,40,'question',{contents:'spark'})
    ],
    coins:[...coinLine(230,310,5),...coinLine(940,295,4),...coinLine(1630,280,5),...coinLine(2390,250,4),...coinLine(3110,265,5),...coinLine(3910,240,5),...coinLine(4680,235,5)],
    enemies:[enemy(360,'walker',230,650),enemy(1000,'hopper',920,1120),enemy(1710,'walker',1640,1940),enemy(2190,'hopper',2060,2300),enemy(2480,'walker',2380,2630),enemy(3160,'hopper',3060,3310),enemy(3970,'walker',3860,4100),enemy(4380,'hopper',4270,4540),enemy(4750,'walker',4630,4900)],
    decor:[{x:120,type:'moonrock'},{x:580,type:'moonrock'},{x:1120,type:'crystal'},{x:1740,type:'moonrock'},{x:2320,type:'crystal'},{x:3190,type:'moonrock'},{x:4010,type:'crystal'},{x:4720,type:'moonrock'}]
  }
];

function palette(){
  const style=getComputedStyle(document.documentElement);
  const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;
  return {paper:read('--paper','#fff7e7'),panel:read('--panel','#fffdf7'),ink:read('--ink','#3c302a'),muted:read('--muted','#8d7868'),line:read('--line','#dfcbb4'),mint:read('--mint','#8fcfa9'),blue:read('--blue','#8dc9df'),yellow:read('--yellow','#f7cd5c'),coral:read('--coral','#e9785e'),purple:read('--purple','#ad9bdf'),shadow:read('--shadow','#d7bfa5')};
}
function clone(value){return JSON.parse(JSON.stringify(value));}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function visible(x,w=0){return x+w>cameraX-80&&x<cameraX+W+80;}
function burst(x,y,color,count=8){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*170,vy:-60-Math.random()*170,life:.3+Math.random()*.45,size:2+Math.random()*3,color});}
function showOverlay(title,detail,button){ui.message.textContent=title;ui.detail.textContent=detail;ui.start.textContent=button;ui.overlay.classList.remove('hidden');}
function hideOverlay(){ui.overlay.classList.add('hidden');}
function updateHud(){ui.world.textContent=current?current.id:'1-1';ui.coins.textContent=String(coins).padStart(2,'0');ui.lives.textContent='♥'.repeat(Math.max(0,lives))+'♡'.repeat(Math.max(0,3-lives));ui.score.textContent=String(score).padStart(6,'0');}
function setPlayerSpawn(){
  const spawnX=checkpointReached?current.checkpoint.x+18:current.start.x;
  player={x:spawnX,y:current.start.y,w:30,h:42,vx:0,vy:0,grounded:false,supportId:null,coyote:0,jumpBuffer:0,powered:false,inv:0,face:1,anim:0};
}
function loadLevel(index){
  levelIndex=index;current=clone(LEVELS[index]);
  current.platforms.forEach((platform,i)=>{platform.id=`${current.id}-p${i}`;if(platform.type==='moving'){platform.x=platform.baseX;platform.phase=0;}if(platform.type==='question')platform.hit=false;});
  current.enemies.forEach(enemyState=>{enemyState.y=426;enemyState.vy=0;enemyState.onGround=false;enemyState.dead=false;});
  checkpointReached=false;powerups=[];particles=[];cameraX=0;setPlayerSpawn();updateHud();
}
function startGame(){lives=3;score=0;coins=0;loadLevel(0);state='playing';paused=false;ui.pause.textContent='PAUSE';hideOverlay();last=performance.now();}
function nextLevel(){if(levelIndex<LEVELS.length-1){lives=Math.max(1,lives);loadLevel(levelIndex+1);state='playing';paused=false;hideOverlay();last=performance.now();}else{startGame();}}
function togglePause(){if(state!=='playing')return;paused=!paused;ui.pause.textContent=paused?'RESUME':'PAUSE';if(paused)showOverlay('PAUSED','THE TRAIL WILL WAIT · TAKE A BREATH','RESUME');else{hideOverlay();last=performance.now();}}
function gameOver(){if(state==='over')return;state='over';paused=false;best=Math.max(best,score);localStorage.setItem('mushroomTrailBest',String(best));updateHud();showOverlay('TRAIL ENDED',`SCORE ${score} · COINS ${coins} · BEST ${best}`,'TRY AGAIN');}
function levelClear(){if(state!=='playing')return;state='clear';paused=false;score+=500*(levelIndex+1);best=Math.max(best,score);localStorage.setItem('mushroomTrailBest',String(best));updateHud();const lastLevel=levelIndex===LEVELS.length-1;showOverlay(lastLevel?'TRAIL COMPLETE':'BEACON REACHED',lastLevel?`ALL ${LEVELS.length} WORLDS CLEAR · SCORE ${score}`:`${current.name} CLEAR · +${500*(levelIndex+1)} BONUS`,lastLevel?'PLAY AGAIN':'NEXT WORLD');}
function reachCheckpoint(){if(!checkpointReached&&player.x>current.checkpoint.x){checkpointReached=true;score+=150;burst(current.checkpoint.x,current.checkpoint.y-35,palette().yellow,16);}}
function spawnPowerup(block){powerups.push({x:block.x+8,y:block.y-34,w:24,h:24,vy:-120,type:'spark',born:0});}
function bumpBlock(block){if(block.bump>0)return;block.bump=.16;if(block.type==='question'&&!block.hit){block.hit=true;if(block.contents==='coin'){coins++;score+=50;burst(block.x+20,block.y-8,palette().yellow,10);}else{spawnPowerup(block);}}else if(block.type==='brick'&&player.powered){block.broken=true;score+=30;burst(block.x+20,block.y+20,palette().coral,14);}}
function pressJump(){if(state!=='playing'){if(state==='title'||state==='over')startGame();return;}input.jump=true;player.jumpBuffer=.14;}
function releaseJump(){input.jump=false;if(player&&player.vy<0)player.vy*=.52;}
function resolvePlayer(dt){
  if(player.supportId){const support=current.platforms.find(block=>block.id===player.supportId);if(support&&support.type==='moving')player.x+=support._dx||0;}
  const previous={x:player.x,y:player.y,bottom:player.y+player.h};
  const dir=(input.right?1:0)-(input.left?1:0);
  if(dir){player.vx+=(dir*PLAYER_SPEED-player.vx)*Math.min(1,dt*11);player.face=dir;}
  else player.vx*=Math.pow(.72,dt*8);
  player.vx=clamp(player.vx,-PLAYER_SPEED,PLAYER_SPEED);
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
  if(player.grounded&&player.supportId){const support=current.platforms.find(block=>block.id===player.supportId);if(support&&support.type==='moving')player.x+=support._dx||0;}
  if(player.y>H+170){hurtPlayer();return;}
  if(player.inv>0)player.inv=Math.max(0,player.inv-dt);
  player.anim+=dt*(Math.abs(player.vx)*.035+2);
}
function updatePlatforms(dt){for(const block of current.platforms){block.bump=Math.max(0,(block.bump||0)-dt);if(block.type==='moving'){const before=block.x;block.phase+=dt*block.speed;block.x=block.baseX+Math.sin(block.phase)*block.range;block._dx=block.x-before;}else block._dx=0;}}
function updateEnemies(dt){for(const enemyState of current.enemies){if(enemyState.dead)continue;enemyState.phase+=dt;enemyState.vy=Math.min(900,enemyState.vy+GRAVITY*dt);enemyState.y+=enemyState.vy*dt;enemyState.x+=enemyState.vx*dt;if(enemyState.x<enemyState.minX){enemyState.x=enemyState.minX;enemyState.vx=Math.abs(enemyState.vx);}if(enemyState.x>enemyState.maxX){enemyState.x=enemyState.maxX;enemyState.vx=-Math.abs(enemyState.vx);}enemyState.onGround=false;for(const block of current.platforms){if(block.broken)continue;const horizontal=enemyState.x+enemyState.w>block.x+3&&enemyState.x<block.x+block.w-3;if(enemyState.vy>=0&&enemyState.y+enemyState.h>=block.y&&enemyState.y+enemyState.h<block.y+28&&horizontal){enemyState.y=block.y-enemyState.h;enemyState.vy=0;enemyState.onGround=true;}}if(enemyState.type==='hopper'&&enemyState.onGround&&Math.sin(enemyState.phase*2.6)>0.98)enemyState.vy=-570;}}
function stompOrHurt(){for(const enemyState of current.enemies){if(enemyState.dead)continue;if(!rectsOverlap(player,enemyState))continue;const falling=player.vy>80&&player.y+player.h-enemyState.y<18;if(falling){enemyState.dead=true;player.y=enemyState.y-player.h;player.vy=-470;score+=100;burst(enemyState.x+enemyState.w/2,enemyState.y,palette().coral,12);}else hurtPlayer();break;}}
function hurtPlayer(){if(state!=='playing'||player.inv>0)return;if(player.powered){player.powered=false;player.inv=1.3;player.vy=-390;burst(player.x+15,player.y+20,palette().yellow,16);return;}lives--;updateHud();if(lives<=0){gameOver();return;}setPlayerSpawn();player.inv=1.4;}
function updateCoins(){for(const coin of current.coins){if(coin.got)continue;const dx=player.x+player.w/2-coin.x,dy=player.y+player.h/2-coin.y;if(dx*dx+dy*dy<34*34){coin.got=true;coins++;score+=25;burst(coin.x,coin.y,palette().yellow,8);}}}
function updatePowerups(dt){for(const item of powerups){item.born+=dt;item.vy=Math.min(250,item.vy+760*dt);item.y+=item.vy*dt;const block=current.platforms.find(candidate=>candidate.type!=='moving'&&!candidate.broken&&item.x+item.w>candidate.x&&item.x<candidate.x+candidate.w&&item.y+item.h>candidate.y&&item.y+item.h<candidate.y+28);if(block){item.y=block.y-item.h;item.vy=0;}if(rectsOverlap(player,item)){item.collected=true;player.powered=true;score+=200;burst(item.x+12,item.y+12,palette().mint,18);}}powerups=powerups.filter(item=>!item.collected&&item.y<H+120);}
function update(dt){if(state!=='playing'||paused)return;updatePlatforms(dt);resolvePlayer(dt);updateEnemies(dt);stompOrHurt();updateCoins();updatePowerups(dt);reachCheckpoint();if(player.x+player.w>current.goal.x&&player.y+player.h>current.goal.y-100){levelClear();return;}cameraX=clamp(player.x-W*.34,0,current.width-W);particles.forEach(part=>{part.x+=part.vx*dt;part.y+=part.vy*dt;part.vy+=420*dt;part.life-=dt;});particles=particles.filter(part=>part.life>0);updateHud();}

function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function drawBackground(p){const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,current.sky[0]);gradient.addColorStop(1,current.sky[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);const night=levelIndex===2;ctx.save();ctx.globalAlpha=night?.75:.5;ctx.fillStyle=night?'#fff1b8':'#fffdf0';ctx.beginPath();ctx.arc(night?790:780,night?92:80,night?34:42,0,Math.PI*2);ctx.fill();ctx.strokeStyle=night?'#ffe8a0':p.yellow;ctx.lineWidth=4;ctx.stroke();if(night){ctx.fillStyle='#fff6c4';for(let i=0;i<22;i++){const x=(i*137+34)%W,y=20+(i*67)%220;ctx.fillRect(x,y,2,2);}}ctx.restore();for(let i=0;i<6;i++){const x=((i*210-cameraX*.12)%1100+1100)%1100-70,y=70+(i%3)*70;drawCloud(x,y,.7+(i%2)*.2,p);}ctx.save();ctx.translate(-cameraX*.15,0);ctx.fillStyle=night?'#1f3155':'#80b8a3';ctx.beginPath();ctx.moveTo(-200,H);for(let x=-200;x<1500;x+=180)ctx.quadraticCurveTo(x+80,280+(x%3)*25,x+180,H);ctx.lineTo(1500,H);ctx.closePath();ctx.fill();ctx.restore();}
function drawCloud(x,y,s,p){ctx.save();ctx.translate(x,y);ctx.fillStyle=p.paper+'d9';ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-42*s,12*s);ctx.bezierCurveTo(-50*s,-4*s,-35*s,-18*s,-19*s,-14*s);ctx.bezierCurveTo(-12*s,-36*s,18*s,-36*s,22*s,-13*s);ctx.bezierCurveTo(40*s,-20*s,54*s,-4*s,43*s,13*s);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
function drawDecor(item,p){if(!visible(item.x,70))return;const x=item.x-cameraX,y=436;ctx.save();ctx.translate(x,y);ctx.strokeStyle=p.ink;ctx.lineWidth=3;ctx.lineCap='round';if(item.type==='tree'){ctx.fillStyle=p.mint;ctx.beginPath();ctx.arc(0,-35,25,0,Math.PI*2);ctx.arc(23,-20,21,0,Math.PI*2);ctx.arc(-23,-18,20,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#9a6d4e';ctx.fillRect(-7,-11,14,28);ctx.strokeRect(-7,-11,14,28);}else if(item.type==='bush'){ctx.fillStyle=p.mint;ctx.beginPath();ctx.arc(-18,0,18,Math.PI,Math.PI*2);ctx.arc(0,-9,22,Math.PI,Math.PI*2);ctx.arc(22,0,18,Math.PI,Math.PI*2);ctx.lineTo(40,10);ctx.lineTo(-40,10);ctx.closePath();ctx.fill();ctx.stroke();}else if(item.type==='cactus'){ctx.fillStyle=p.mint;roundedRect(-10,-40,20,48,8);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-10,-17);ctx.lineTo(-28,-17);ctx.lineTo(-28,-30);ctx.moveTo(10,-5);ctx.lineTo(27,-5);ctx.lineTo(27,-20);ctx.stroke();}else if(item.type==='rock'||item.type==='moonrock'){ctx.fillStyle=item.type==='moonrock'?'#7f8ca7':'#ae8179';ctx.beginPath();ctx.moveTo(-31,8);ctx.lineTo(-22,-17);ctx.lineTo(-2,-29);ctx.lineTo(26,-15);ctx.lineTo(34,8);ctx.closePath();ctx.fill();ctx.stroke();}else{ctx.fillStyle='#a8b9e7';ctx.beginPath();ctx.moveTo(-18,9);ctx.lineTo(-9,-31);ctx.lineTo(4,5);ctx.lineTo(14,-23);ctx.lineTo(23,9);ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();}
function drawPlatform(block,p){if(block.broken||!visible(block.x,block.w))return;const x=block.x-cameraX,y=block.y+(block.bump?Math.sin(block.bump*19)*-7:0);ctx.save();ctx.lineWidth=2.5;ctx.strokeStyle=p.ink;ctx.lineJoin='round';if(block.type==='ground'){ctx.fillStyle='#aa7552';ctx.fillRect(x,y,block.w,block.h);ctx.fillStyle=p.mint;ctx.fillRect(x,y,block.w,12);ctx.strokeRect(x,y,block.w,block.h);ctx.strokeStyle='#80583f';ctx.lineWidth=1.5;for(let brick=x+20;brick<x+block.w;brick+=44){ctx.beginPath();ctx.moveTo(brick,y+15);ctx.lineTo(brick,y+block.h);ctx.stroke();}for(let row=y+32;row<y+block.h;row+=26){ctx.beginPath();ctx.moveTo(x,row);ctx.lineTo(x+block.w,row);ctx.stroke();}}else if(block.type==='brick'){ctx.fillStyle='#dc8a60';ctx.fillRect(x,y,block.w,block.h);ctx.strokeRect(x,y,block.w,block.h);ctx.strokeStyle='#b5664d';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+block.w/2,y);ctx.lineTo(x+block.w/2,y+block.h);ctx.moveTo(x,y+block.h/2);ctx.lineTo(x+block.w,y+block.h/2);ctx.stroke();}else if(block.type==='question'){ctx.fillStyle=block.hit?'#bba77e':p.yellow;roundedRect(x,y,block.w,block.h,5);ctx.fill();ctx.stroke();ctx.fillStyle=block.hit?'#8a7b68':p.ink;ctx.font='900 25px ui-rounded, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(block.hit?'·':'?',x+block.w/2,y+block.h/2+1);}else if(block.type==='pipe'){ctx.fillStyle='#4ca85b';ctx.fillRect(x+8,y+17,block.w-16,block.h-17);ctx.strokeRect(x+8,y+17,block.w-16,block.h-17);ctx.fillStyle='#72cc6a';roundedRect(x,y,block.w,24,5);ctx.fill();ctx.stroke();ctx.strokeStyle='#2f7442';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+block.w*.5,y+5);ctx.lineTo(x+block.w*.5,y+19);ctx.stroke();}else{ctx.fillStyle=p.blue;roundedRect(x,y,block.w,block.h,7);ctx.fill();ctx.stroke();ctx.strokeStyle=p.ink;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(x+10,y+7);ctx.lineTo(x+block.w-10,y+7);ctx.stroke();}ctx.restore();}
function drawCoin(coin,p){if(coin.got||!visible(coin.x,20))return;const y=coin.y+Math.sin(clock*.006+coin.x)*5;ctx.save();ctx.translate(coin.x-cameraX,y);ctx.fillStyle=p.yellow;ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,9,12,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fff3a3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.stroke();ctx.restore();}
function drawPowerup(item,p){if(!visible(item.x,item.w))return;ctx.save();ctx.translate(item.x+12-cameraX,item.y+12);ctx.rotate(clock*.002);ctx.fillStyle=p.mint;ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?8:14;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
function drawEnemy(enemyState,p){if(enemyState.dead||!visible(enemyState.x,enemyState.w))return;const x=enemyState.x-cameraX,y=enemyState.y+Math.sin(enemyState.phase*4)*1.5;ctx.save();ctx.translate(x+17,y+17);ctx.scale(enemyState.vx<0?-1:1,1);ctx.fillStyle=enemyState.type==='hopper'?p.purple:p.coral;ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,-2,17,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.paper;ctx.beginPath();ctx.arc(-6,-5,4,0,Math.PI*2);ctx.arc(6,-5,4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.ink;ctx.beginPath();ctx.arc(-6,-5,1.8,0,Math.PI*2);ctx.arc(6,-5,1.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-11,14);ctx.lineTo(-16,19);ctx.moveTo(11,14);ctx.lineTo(16,19);ctx.stroke();ctx.restore();}
function drawCheckpoint(p){const x=current.checkpoint.x-cameraX,y=current.checkpoint.y;ctx.save();ctx.strokeStyle=p.ink;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,y+35);ctx.lineTo(x,y-62);ctx.stroke();ctx.fillStyle=checkpointReached?p.mint:p.yellow;ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+2,y-60);ctx.lineTo(x+44,y-48);ctx.lineTo(x+2,y-35);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=p.ink;ctx.font='900 8px monospace';ctx.fillText('CHECK',x-16,y+49);ctx.restore();}
function drawGoal(p){const x=current.goal.x-cameraX,y=current.goal.y;ctx.save();ctx.strokeStyle=p.ink;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+90);ctx.lineTo(x,y-50);ctx.stroke();ctx.fillStyle=p.yellow;ctx.strokeStyle=p.ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,y-47);ctx.lineTo(x+50,y-33);ctx.lineTo(x+3,y-16);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=p.coral;ctx.beginPath();ctx.arc(x,y+94,9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.ink;ctx.font='900 8px monospace';ctx.fillText('GOAL',x-11,y+111);ctx.restore();}
function drawPlayer(p){if(!player||player.inv>0&&Math.floor(player.inv*14)%2===0)return;const x=player.x+15-cameraX,y=player.y+21;ctx.save();ctx.translate(x,y);ctx.scale(player.face<0?-1:1,1);ctx.rotate(Math.sin(player.anim)*.035);ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';
  // Original mascot silhouette: cap, warm face, blue overalls, gloves, boots, and a leaf badge.
  ctx.fillStyle=player.powered?p.mint:p.coral;ctx.beginPath();ctx.moveTo(-20,-10);ctx.quadraticCurveTo(-18,-29,0,-32);ctx.quadraticCurveTo(18,-29,20,-10);ctx.quadraticCurveTo(8,-5,-7,-7);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=p.yellow;ctx.beginPath();ctx.arc(-1,-22,5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=p.ink;ctx.beginPath();ctx.moveTo(-1,-26);ctx.lineTo(4,-22);ctx.lineTo(-2,-18);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f0b27d';ctx.beginPath();ctx.ellipse(0,-5,15,16,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#694638';ctx.beginPath();ctx.arc(-13,-9,5,0,Math.PI*2);ctx.arc(13,-9,5,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle=p.ink;ctx.beginPath();ctx.ellipse(-5,-7,2.3,3.2,0,0,Math.PI*2);ctx.ellipse(5,-7,2.3,3.2,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(2,-1,3,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#a9574a';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,3,5,.12*Math.PI,.88*Math.PI);ctx.stroke();
  ctx.fillStyle=player.powered?p.mint:p.blue;roundedRect(-14,6,28,22,6);ctx.fill();ctx.stroke();ctx.strokeStyle=p.paper;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,7);ctx.lineTo(-6,18);ctx.moveTo(10,7);ctx.lineTo(6,18);ctx.stroke();ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-4,20);ctx.moveTo(4,7);ctx.lineTo(4,20);ctx.stroke();
  ctx.fillStyle='#f7f0dc';ctx.beginPath();ctx.ellipse(-20,12,7,6,-.25,0,Math.PI*2);ctx.ellipse(20,12,7,6,.25,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=player.powered?p.mint:p.coral;ctx.beginPath();ctx.moveTo(-15,3);ctx.quadraticCurveTo(-23,1,-26,7);ctx.lineTo(-20,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(15,3);ctx.quadraticCurveTo(23,1,26,7);ctx.lineTo(20,10);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#704a3c';roundedRect(-15,23,12,7,3);ctx.fill();ctx.stroke();roundedRect(3,23,12,7,3);ctx.fill();ctx.stroke();ctx.restore();}
function draw(){const p=palette();drawBackground(p);current.decor.forEach(item=>drawDecor(item,p));current.platforms.forEach(block=>drawPlatform(block,p));current.coins.forEach(coin=>drawCoin(coin,p));powerups.forEach(item=>drawPowerup(item,p));current.enemies.forEach(enemyState=>drawEnemy(enemyState,p));drawCheckpoint(p);drawGoal(p);particles.forEach(part=>{ctx.save();ctx.globalAlpha=Math.max(0,part.life*2.2);ctx.fillStyle=part.color;ctx.strokeStyle=p.ink;ctx.lineWidth=1;ctx.beginPath();ctx.arc(part.x-cameraX,part.y,part.size,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();});drawPlayer(p);if(paused){ctx.fillStyle=p.paper+'b8';ctx.fillRect(0,0,W,H);}}
function loop(time){const dt=Math.min(.033,(time-last)/1000||0);last=time;clock=time;update(dt);draw();requestAnimationFrame(loop);}
function bindHold(id,key){const button=$(id);const on=event=>{event.preventDefault();if(state==='title'||state==='over')startGame();if(state!=='playing')return;input[key]=true;button.classList.add('active');try{button.setPointerCapture(event.pointerId);}catch(_){}};const off=()=>{input[key]=false;button.classList.remove('active');};button.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(type=>button.addEventListener(type,off));button.addEventListener('contextmenu',event=>event.preventDefault());}
function bindJump(id){const button=$(id);const on=event=>{event.preventDefault();button.classList.add('active');pressJump();try{button.setPointerCapture(event.pointerId);}catch(_){}};const off=()=>{button.classList.remove('active');releaseJump();};button.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(type=>button.addEventListener(type,off));button.addEventListener('contextmenu',event=>event.preventDefault());}
bindHold('leftButton','left');bindHold('rightButton','right');bindJump('jumpButton');
addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowleft','a'].includes(key)){event.preventDefault();input.left=true;if(state==='title'||state==='over')startGame();}if(['arrowright','d'].includes(key)){event.preventDefault();input.right=true;if(state==='title'||state==='over')startGame();}if(['arrowup','w',' '].includes(key)){event.preventDefault();if(!event.repeat)pressJump();}if(key==='p')togglePause();});
addEventListener('keyup',event=>{const key=event.key.toLowerCase();if(['arrowleft','a'].includes(key))input.left=false;if(['arrowright','d'].includes(key))input.right=false;if(['arrowup','w',' '].includes(key))releaseJump();});
ui.start.addEventListener('click',()=>{if(state==='clear')nextLevel();else if(paused)togglePause();else startGame();});
ui.pause.addEventListener('click',togglePause);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)togglePause();});
document.addEventListener('themechange',()=>draw());
loadLevel(0);showOverlay('MUSHROOM TRAIL','RUN · JUMP · STOMP · FIND THE BEACON','START ADVENTURE');updateHud();requestAnimationFrame(loop);
})();
