(()=>{
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height,$=id=>document.getElementById(id);
const RULES=MelonLabRules;
const FRUITS=RULES.FRUITS;
const BIN={x:70,y:72,w:580,h:590},GRAVITY=1180,STIR_DURATION=1.35,TOP_CLEAR_DURATION=1.2,STEP=1/120;
let accumulator=0,rafId=0,dirty=true,paletteCache=null,clearing=false,pointerOwner=null,framesRendered=0,canvasLabelPx=11;
const heldKeys=new Map(),actionPointers=new Map(),actionClicks=new Set();
const ui={current:$('currentFruit'),currentDot:$('currentDot'),score:$('score'),best:$('best'),energy:$('energy'),fruitCount:$('fruitCount'),next:$('nextFruit'),nextDot:$('nextDot'),overlay:$('overlay'),message:$('message'),detail:$('detail'),start:$('startButton'),pause:$('pauseButton'),stir:$('stirButton'),mobileStir:$('mobileStirButton'),drop:$('dropButton'),mode:$('modeButton'),route:$('route'),unlockToast:$('unlockToast'),profile:$('profileStatus'),routeSummary:$('routeSummary')};
function readBest(){try{const value=Number(localStorage.getItem('melonLabBest'));return Number.isSafeInteger(value)&&value>=0?value:0}catch(_){return 0}}
function saveBest(){if(clearing)return;try{localStorage.setItem('melonLabBest',String(best))}catch(_){}}
let state='title',paused=false,fruits=[],particles=[],merges=[],mergeFeedback=[],chainCount=0,chainWindow=0,aimX=BIN.x+BIN.w/2,nextLevel=0,queuedLevel=0,dropCount=0,watermelonClears=0,currentProfileIndex=0,unlockTimer=0,dropCooldown=0,energy=100,score=0,best=readBest(),dangerTimer=0,fluidPulse=0,clearPulse=0,clearBonus=0,clearX=BIN.x+BIN.w/2,clearY=BIN.y+BIN.h/2,clock=0,last=0,mode='semi-fluid';
function currentProfile(){return RULES.PROFILES[currentProfileIndex]}
const DANGER_Y=()=>RULES.dangerLineY(dropCount,currentProfile());
function palette(){if(paletteCache)return paletteCache;const s=getComputedStyle(document.documentElement),read=(n,f)=>s.getPropertyValue(n).trim()||f;return paletteCache={paper:read('--paper','#fffaf1'),panel:read('--panel','#fffdf8'),ink:read('--ink','#3b302b'),muted:read('--muted','#8e7c70'),line:read('--line','#dfcfbc'),accent:read('--accent','#e97883'),mint:read('--mint','#a7d7b2'),blue:read('--blue','#a8cde3'),yellow:read('--yellow','#f8cb63'),coral:read('--coral','#ed7e78'),purple:read('--purple','#aa9bd8'),shadow:read('--shadow','#d8c5b3')}}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function aimBounds(level=nextLevel){const type=FRUITS[level],boundaryR=RULES.boundaryRadius(type);return{left:BIN.x+boundaryR+5,right:BIN.x+BIN.w-boundaryR-5}}function clampAimX(value,level=nextLevel){const bounds=aimBounds(level);return clamp(value,bounds.left,bounds.right)}function randomNext(resetQueue=false){nextLevel=resetQueue?RULES.chooseDropLevel(Math.random(),currentProfile()):queuedLevel;queuedLevel=RULES.chooseDropLevel(Math.random(),currentProfile());aimX=clampAimX(aimX);updateNext();}
function updateNext(){setText(ui.current,FRUITS[nextLevel].label);ui.currentDot.dataset.shape=FRUITS[nextLevel].shape;setText(ui.next,FRUITS[queuedLevel].label);ui.nextDot.dataset.shape=FRUITS[queuedLevel].shape;}
function updateRoute(){
 const levels=currentProfile().activeLevels,active=new Set(levels);
 [...ui.route.children].forEach((el,index)=>{const unlocked=active.has(index);el.classList.toggle('locked',!unlocked);el.dataset.locked=String(!unlocked);el.dataset.last=String(index===levels.at(-1));el.style.order=String(unlocked?levels.indexOf(index):FRUITS.length+index);el.setAttribute('aria-label',`${FRUITS[index].label}${unlocked?'':' locked'}`)});
 setText(ui.routeSummary,levels.map(level=>FRUITS[level].label).join(' → '));
}
function updateProgress(){
 const profile=currentProfile(),next=RULES.PROFILES[currentProfileIndex+1];
 let text=next?`${profile.label} · ${Math.min(score,next.unlockScore)}/${next.unlockScore} PTS · ${Math.min(watermelonClears,next.minWatermelonClears)}/${next.minWatermelonClears} CLEARS`:`${profile.label} · ALL SAMPLES ACTIVE`;
 if(dangerTimer>0)text=`DANGER · ${Math.max(0,profile.dangerGracePeriod-dangerTimer).toFixed(1)}s · ${profile.label}`;
 setText(ui.profile,text);setAttr(ui.profile,'data-warning',dangerTimer>0);
 setAttr(ui.profile,'aria-label',next?`${profile.label}. Unlock ${next.label}: score ${score} of ${next.unlockScore}, drops ${dropCount} of ${next.minDrops}, watermelon clears ${watermelonClears} of ${next.minWatermelonClears}.`:`${profile.label}. All eleven samples are active.`);
}

function showUnlockToast(profile){const names=profile.newIds.map(id=>FRUITS.find(fruit=>fruit.id===id)?.label).filter(Boolean).join(' · ');if(!names)return;ui.unlockToast.textContent=`NEW SAMPLES · ${names}`;ui.unlockToast.classList.add('visible');unlockTimer=2.2}
function maybeAdvanceProfile(){const next=RULES.PROFILES[currentProfileIndex+1];if(!next||score<next.unlockScore||dropCount<next.minDrops||watermelonClears<next.minWatermelonClears)return;currentProfileIndex+=1;updateRoute();updateNext();showUnlockToast(next)}
function setText(node,value){const text=String(value);if(node.textContent!==text)node.textContent=text}
function setAttr(node,name,value){const text=String(value);if(node.getAttribute(name)!==text)node.setAttribute(name,text)}
function setDisabled(node,value){if(node.disabled!==value)node.disabled=value}
function updateHud(){if(clearing)return;if(score>best){best=score;saveBest()}setText(ui.score,String(score).padStart(6,'0'));setText(ui.best,String(best).padStart(6,'0'));setText(ui.energy,`${Math.floor(energy)}/100`);setText(ui.fruitCount,String(fruits.filter(f=>!f.dead).length).padStart(2,'0'));updateProgress();}
function showOverlay(title,detail,button){ui.message.textContent=title;ui.detail.textContent=detail;ui.start.textContent=button;ui.overlay.classList.remove('hidden')}
function hideOverlay(){ui.overlay.classList.add('hidden')}
function reset(){if(clearing||document.hidden)return;clearInput();fruits=[];particles=[];merges=[];mergeFeedback=[];chainCount=0;chainWindow=0;dropCount=0;watermelonClears=0;currentProfileIndex=0;unlockTimer=0;energy=100;score=0;dangerTimer=0;fluidPulse=0;clearPulse=0;clearBonus=0;stirDirection=-1;aimX=BIN.x+BIN.w/2;dropCooldown=0;ui.unlockToast.classList.remove('visible');randomNext(true);updateRoute();state='playing';paused=false;ui.pause.textContent='PAUSE';hideOverlay();updateHud();clock=0;updateControls();resetTiming();invalidate()}
function start(){reset()}
function gameOver(){if(clearing||state==='over')return;clearInput();state='over';paused=false;best=Math.max(best,score);saveBest();updateHud();updateControls();showOverlay('LAB OVERLOAD',`SCORE ${score} · BEST ${best}`,'TRY AGAIN')}
function togglePause(){if(clearing||document.hidden||state!=='playing')return;clearInput();paused=!paused;ui.pause.textContent=paused?'RESUME':'PAUSE';if(paused)showOverlay('PAUSED','THE FRUIT WILL WAIT IN SUSPENSION','RESUME');else hideOverlay();updateControls();resetTiming();invalidate()}
function spawnFruit(x=aimX,level=nextLevel){if(clearing||document.hidden||state!=='playing'||paused||dropCooldown>0)return;const type=FRUITS[level],safeX=clampAimX(x,level),collisionR=RULES.collisionRadius(type),boundaryR=RULES.boundaryRadius(type);aimX=safeX;const fruit={x:safeX,y:BIN.y+boundaryR+8,vx:0,vy:70,r:type.r,collisionR,boundaryR,level,rot:Math.random()*6,age:0,settled:false,dead:false};fruits.push(fruit);dropCount+=1;dropCooldown=.48;randomNext();burst(fruit.x,fruit.y,type.light,5);updateHud();updateControls();}
function mergeFruits(a,b){if(a.dead||b.dead||a.level!==b.level)return false;const profile=currentProfile(),type=FRUITS[a.level],x=(a.x+b.x)/2,y=(a.y+b.y)/2;if(a.level===FRUITS.length-1){a.dead=true;b.dead=true;watermelonClears+=1;clearX=x;clearY=y;clearPulse=TOP_CLEAR_DURATION;clearBonus=RULES.topTierClearBonus(profile);score+=clearBonus;burst(x,y,type.light,48);return true}const nextLevel=RULES.nextMergeLevel(a.level,profile);if(nextLevel===null)return false;const next=FRUITS[nextLevel],collisionR=RULES.collisionRadius(next),boundaryR=RULES.boundaryRadius(next);a.dead=true;b.dead=true;const fused={x,y,vx:(a.vx+b.vx)/2,vy:clamp((a.vy+b.vy)*.25,-90,90)-45,r:next.r,collisionR,boundaryR,level:nextLevel,rot:0,age:0,settled:false,dead:false,strainX:-.07,strainY:0,strainVX:1.1,strainVY:0};cacheShape(fused);fruits.push(fused);const points=RULES.scoreForLevel(nextLevel,profile);score+=points;chainCount=chainWindow>0?Math.min(9,chainCount+1):1;chainWindow=.85;mergeFeedback.push({x,y,r:next.r,life:.45,points,chain:chainCount,color:next.light});if(mergeFeedback.length>24)mergeFeedback.shift();burst(x,y,type.light,12);return true}
// Alternate the whole pool's direction; never randomize individual bodies.
let stirDirection=-1;
function stirPool(){if(clearing||document.hidden||state!=='playing'||paused||energy<30)return;energy-=30;fluidPulse=STIR_DURATION;stirDirection=-stirDirection;for(const f of fruits)if(!f.dead){f.stirTime=STIR_DURATION;f.stirDirection=stirDirection;f.settled=false;f.warning=0}burst(BIN.x+BIN.w/2,BIN.y+BIN.h*.62,palette().accent,12);updateHud();updateControls()}
// Bounded affine elasticity: renderer and collision/support/boundary envelopes share
// the same world-space matrix. Its determinant is one (no draw-only squash).
function radiusAlong(f,nx,ny,base=RULES.collisionRadius(f)){const a=f.shapeA??1,b=f.shapeB??0,c=f.shapeC??1;return base*Math.hypot(a*nx+b*ny,b*nx+c*ny)}
function advanceShape(f,dt){
 let x=f.strainX||0,y=f.strainY||0,vx=f.strainVX||0,vy=f.strainVY||0;
 vx+=((f.targetX||0)-x)*220*dt-20*vx*dt;vy+=((f.targetY||0)-y)*220*dt-20*vy*dt;x+=vx*dt;y+=vy*dt;
 const length=Math.hypot(x,y);if(length>.105){x*=.105/length;y*=.105/length;vx*=.5;vy*=.5}
 f.strainX=x;f.strainY=y;f.strainVX=vx;f.strainVY=vy;f.targetX=0;f.targetY=0;f.pressure=0;cacheShape(f);
}
function cacheShape(f){const amount=Math.hypot(f.strainX||0,f.strainY||0),angle=Math.atan2(f.strainY||0,f.strainX||0)/2,co=Math.cos(angle),si=Math.sin(angle),long=Math.exp(amount),short=Math.exp(-amount);f.shapeA=co*co*long+si*si*short;f.shapeB=co*si*(long-short);f.shapeC=si*si*long+co*co*short}
function contactShape(f,nx,ny,speed=0,overlap=0,load=1){const pressure=clamp((.018*load+Math.max(0,speed)*.00012+overlap*.001)*(mode==='semi-fluid'?1:.55),.004,.095);if(pressure>(f.pressure||0)){f.pressure=pressure;f.targetX=pressure*(ny*ny-nx*nx);f.targetY=-2*pressure*nx*ny}}
function hitBoundaries(f){
 const boundaryR=RULES.boundaryRadius(f),rx=radiusAlong(f,1,0,boundaryR),ry=radiusAlong(f,0,1,boundaryR),left=BIN.x+rx+5,right=BIN.x+BIN.w-rx-5,floor=BIN.y+BIN.h-ry-5;
 if(f.x<=left+.6)contactShape(f,1,0,-f.vx);if(f.x>=right-.6)contactShape(f,1,0,f.vx);if(f.y>=floor-.6)contactShape(f,0,1,f.vy);
 if(f.x<left){f.x=left;if(f.vx<0)f.vx=-f.vx*.3}if(f.x>right){f.x=right;if(f.vx>0)f.vx=-f.vx*.3}
 if(f.y>=floor){f.y=floor;if(f.vy>0)f.vy=f.vy<45?0:-f.vy*.12;if(Math.abs(f.vy)<20)f.settled=true}
}
function physics(dt){
 for(const f of fruits){
  if(f.dead)continue;advanceShape(f,dt);f.age+=dt;f.previousX=f.x;f.previousY=f.y;
  if(f.stirTime>0){f.stirTime=Math.max(0,f.stirTime-dt);const cx=BIN.x+BIN.w/2,cy=BIN.y+BIN.h*.62,dx=f.x-cx,dy=f.y-cy,dist=Math.hypot(dx,dy)||1,direction=f.stirDirection||1,progress=1-f.stirTime/STIR_DURATION,envelope=Math.pow(Math.sin(progress*Math.PI),2),response=clamp(Math.sqrt(22/RULES.collisionRadius(f)),.48,1),radial=.25+.75*Math.min(1,dist/180),force=1000*envelope*response*radial;f.vx+=(-dy/dist)*direction*force*dt;f.vy+=((dx/dist)*direction*force-150*envelope*response)*dt;f.rot+=direction*envelope*dt*5}
  f.vy=Math.min(950,f.vy+GRAVITY*dt);f.vx*=mode==='semi-fluid'?Math.pow(.992,dt*60):Math.pow(.96,dt*60);f.x+=f.vx*dt;f.y+=f.vy*dt;f.rot+=f.vx*dt*.006;f.settled=false;hitBoundaries(f);
 }
 const reserved=new Set();
 for(let pass=0;pass<10;pass++){
  for(let i=0;i<fruits.length;i++){
   const a=fruits[i];if(a.dead||reserved.has(a))continue;
   for(let j=i+1;j<fruits.length;j++){
    const b=fruits[j];if(b.dead||reserved.has(b))continue;
    const dx=b.x-a.x,dy=b.y-a.y,broad=(RULES.collisionRadius(a)+RULES.collisionRadius(b))*1.12+.35;if(Math.abs(dx)>broad||Math.abs(dy)>broad)continue;const dist=Math.hypot(dx,dy),nx=dist>1e-7?dx/dist:1,ny=dist>1e-7?dy/dist:0,min=radiusAlong(a,nx,ny)+radiusAlong(b,nx,ny);if(dist>min+.35)continue;
    if(a.level===b.level&&a.age>.08&&b.age>.08&&(a.level===FRUITS.length-1||RULES.nextMergeLevel(a.level,currentProfile())!==null)){merges.push([a,b]);reserved.add(a);reserved.add(b);break}
    const overlap=Math.max(0,min-dist),ia=1/Math.pow(RULES.collisionRadius(a),2),ib=1/Math.pow(RULES.collisionRadius(b),2),total=ia+ib;
    a.x-=nx*overlap*ia/total;a.y-=ny*overlap*ia/total;b.x+=nx*overlap*ib/total;b.y+=ny*overlap*ib/total;
    const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;contactShape(a,nx,ny,-relative,overlap,2*ia/total);contactShape(b,nx,ny,-relative,overlap,2*ib/total);if(relative<0){const impulse=-relative/total;a.vx-=impulse*ia*nx;a.vy-=impulse*ia*ny;b.vx+=impulse*ib*nx;b.vy+=impulse*ib*ny}
   }
  }
  for(const f of fruits)if(!f.dead)hitBoundaries(f);
 }
 for(const [a,b] of merges.splice(0))mergeFruits(a,b);
 fruits=fruits.filter(f=>!f.dead);
 dangerTimer=0;
 for(const f of fruits){
  hitBoundaries(f);const boundaryR=radiusAlong(f,0,1,RULES.boundaryRadius(f)),floor=BIN.y+BIN.h-boundaryR-5;
  const supported=f.y>=floor-.6||fruits.some(g=>{if(g===f||g.dead||g.y<=f.y+2)return false;const dx=g.x-f.x,dy=g.y-f.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;return d<=radiusAlong(f,nx,ny)+radiusAlong(g,nx,ny)+.7});
  f.settled=f.age>.2&&supported&&Math.abs(f.vy)<70;
  if(f.y>=floor-.6)f.vx*=Math.pow(.86,dt*60);
  f.warning=f.settled&&f.y-boundaryR<DANGER_Y()?(f.warning||0)+dt:0;dangerTimer=Math.max(dangerTimer,f.warning);
 }
 if(dangerTimer>=currentProfile().dangerGracePeriod)gameOver();
}
function update(dt){if(clearing||document.hidden||state!=='playing'||paused)return;const actions=new Set(heldKeys.values()),direction=pointerOwner===null?Number(actions.has('right'))-Number(actions.has('left')):0;aimX=clampAimX(aimX+direction*300*dt);dropCooldown=Math.max(0,dropCooldown-dt);energy=Math.min(100,energy+dt*4.2);chainWindow=Math.max(0,chainWindow-dt);mergeFeedback=mergeFeedback.filter(e=>(e.life-=dt)>0);fluidPulse=Math.max(0,fluidPulse-dt);clearPulse=Math.max(0,clearPulse-dt);unlockTimer=Math.max(0,unlockTimer-dt);if(unlockTimer<=0)ui.unlockToast.classList.remove('visible');physics(dt);if(state==='playing')maybeAdvanceProfile();particles.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=300*dt;q.life-=dt});particles=particles.filter(q=>q.life>0);updateHud();updateControls()}
function burst(x,y,color,count=8){for(let i=0;i<count&&particles.length<400;i++)particles.push({x,y,vx:(Math.random()-.5)*180,vy:-50-Math.random()*180,life:.35+Math.random()*.5,r:2+Math.random()*3,color})}
function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
function drawBackdrop(p){ctx.fillStyle=p.paper;ctx.fillRect(0,0,W,H);ctx.strokeStyle=p.line;ctx.globalAlpha=.55;ctx.lineWidth=1;for(let x=0;x<W;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle=p.mint+'55';ctx.beginPath();ctx.arc(110,100,90,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.blue+'55';ctx.beginPath();ctx.arc(620,120,110,0,Math.PI*2);ctx.fill()}
function drawBin(p){const dangerY=DANGER_Y();ctx.save();const grad=ctx.createLinearGradient(0,BIN.y,0,BIN.y+BIN.h);grad.addColorStop(0,p.paper);grad.addColorStop(1,p.blue+'36');ctx.fillStyle=grad;roundedRect(BIN.x,BIN.y,BIN.w,BIN.h,24);ctx.fill();ctx.strokeStyle=p.ink;ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=p.mint+'35';ctx.beginPath();ctx.moveTo(BIN.x+5,BIN.y+BIN.h-65);for(let x=BIN.x+5;x<=BIN.x+BIN.w-5;x+=30)ctx.quadraticCurveTo(x+15,BIN.y+BIN.h-75,x+30,BIN.y+BIN.h-65);ctx.lineTo(BIN.x+BIN.w-5,BIN.y+BIN.h);ctx.lineTo(BIN.x+5,BIN.y+BIN.h);ctx.closePath();ctx.fill();ctx.strokeStyle=p.accent;ctx.setLineDash([11,9]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(BIN.x+8,dangerY);ctx.lineTo(BIN.x+BIN.w-8,dangerY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=p.accent;ctx.font='900 '+canvasLabelPx+'px ui-monospace, monospace';ctx.fillText('DANGER / '+Math.round(dangerY),BIN.x+16,dangerY-10);ctx.restore()}
function drawFruit(f,p){const t=FRUITS[f.level],r=f.r;ctx.save();ctx.translate(f.x,f.y);ctx.transform(f.shapeA??1,f.shapeB??0,f.shapeB??0,f.shapeC??1,0,0);ctx.rotate(f.rot);ctx.strokeStyle=p.ink;ctx.lineWidth=2.5;ctx.lineJoin='round';if(t.id==='kiwi'){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.arc(0,0,r*.58,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.dark;for(let i=0;i<10;i++){const a=i*.63;ctx.beginPath();ctx.arc(Math.cos(a)*r*.38,Math.sin(a)*r*.38,2,0,Math.PI*2);ctx.fill();}}else if(t.id==='lemon'){ctx.fillStyle=t.color;ctx.beginPath();ctx.ellipse(0,0,r*1.15,r*.8,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=t.light;ctx.beginPath();ctx.moveTo(-r*.55,-r*.15);ctx.lineTo(r*.55,r*.15);ctx.stroke();}else if(t.id==='cherry'){ctx.strokeStyle='#47794e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-5,-r*.45);ctx.quadraticCurveTo(-12,-r-10,-4,-r-12);ctx.moveTo(5,-r*.45);ctx.quadraticCurveTo(10,-r-10,4,-r-12);ctx.stroke();ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(-r*.36,3,r*.62,0,Math.PI*2);ctx.arc(r*.36,3,r*.62,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.arc(-r*.55,-2,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(r*.18,-2,4,0,Math.PI*2);ctx.fill();}else if(t.id==='peach'){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,2,r*.92,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=t.dark;ctx.beginPath();ctx.arc(0,2,r*.65,-.8,.8);ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.arc(-r*.35,-r*.35,r*.2,0,Math.PI*2);ctx.fill();}else if(t.id==='orange'){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,0,r*.93,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=t.light;for(let i=0;i<9;i++){const a=i*Math.PI/4.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.72,Math.sin(a)*r*.72);ctx.stroke();}ctx.fillStyle=t.dark;ctx.beginPath();ctx.arc(0,-r*.82,4,0,Math.PI*2);ctx.fill();}else if(t.id==='pear'){ctx.fillStyle=t.color;ctx.beginPath();ctx.moveTo(0,-r*.82);ctx.bezierCurveTo(-r*.2,-r*.92,-r*.36,-r*.42,-r*.62,r*.05);ctx.bezierCurveTo(-r*.88,r*.55,-r*.42,r*.92,0,r*.88);ctx.bezierCurveTo(r*.42,r*.92,r*.88,r*.55,r*.62,r*.05);ctx.bezierCurveTo(r*.36,-r*.42,r*.2,-r*.92,0,-r*.82);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=t.dark;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*.78);ctx.lineTo(r*.04,-r*.98);ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.ellipse(-r*.28,-r*.22,r*.16,r*.25,-.5,0,Math.PI*2);ctx.fill();}else if(t.id==='pineapple'){ctx.fillStyle=t.dark;ctx.beginPath();ctx.moveTo(-r*.5,-r*.5);ctx.lineTo(-r*.8,-r*1.05);ctx.lineTo(-r*.18,-r*.72);ctx.lineTo(0,-r*1.12);ctx.lineTo(r*.18,-r*.72);ctx.lineTo(r*.8,-r*1.05);ctx.lineTo(r*.5,-r*.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=t.color;ctx.beginPath();ctx.ellipse(0,r*.1,r*.68,r*.82,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=t.dark;ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*r*.22,-r*.52);ctx.lineTo(i*r*.22,r*.68);ctx.stroke();}for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-r*.56,i*r*.22);ctx.lineTo(r*.56,i*r*.22);ctx.stroke();}}else if(t.id==='melon'){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,0,r*.95,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=t.dark;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r*.68,-.8,.8);ctx.stroke();ctx.strokeStyle=t.light;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.48,2.3,4.0);ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.arc(-r*.35,-r*.38,5,0,Math.PI*2);ctx.fill();}else if(t.id==='dragonfruit'){ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,0,r*.94,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=t.dark;for(let i=0;i<8;i++){const a=i*Math.PI/4;const x=Math.cos(a)*r*.72,y=Math.sin(a)*r*.72;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(a+.55)*r*.3,y-Math.sin(a+.55)*r*.3);ctx.lineTo(x-Math.cos(a-.55)*r*.3,y-Math.sin(a-.55)*r*.3);ctx.closePath();ctx.fill();}ctx.fillStyle=t.light;ctx.beginPath();ctx.arc(-r*.28,-r*.3,4,0,Math.PI*2);ctx.fill();}else if(t.id==='papaya'){ctx.fillStyle=t.color;ctx.beginPath();ctx.ellipse(0,0,r*.72,r,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.ellipse(0,0,r*.46,r*.72,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.dark;for(let i=0;i<9;i++){const a=i*.7;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.2,Math.sin(a)*r*.36,2.2,3.5,a,0,Math.PI*2);ctx.fill();}}else{ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(0,0,r*.95,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle=t.dark;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,r*.68,-.8,.8);ctx.stroke();ctx.strokeStyle=t.light;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.48,2.3,4.0);ctx.stroke();ctx.fillStyle=t.light;ctx.beginPath();ctx.arc(-r*.35,-r*.38,5,0,Math.PI*2);ctx.fill();}ctx.restore()}
function drawStirEffect(p){if(fluidPulse<=0)return;const progress=clamp(1-fluidPulse/STIR_DURATION,0,1),fade=Math.sin(progress*Math.PI),cx=BIN.x+BIN.w/2,cy=BIN.y+BIN.h*.62,spin=clock*.004;ctx.save();ctx.globalAlpha=(.18+.32*fade);for(let i=0;i<4;i++){const radius=78+i*48+progress*18,direction=stirDirection,start=spin*direction+i*.82;ctx.strokeStyle=i%2?p.blue:p.accent;ctx.lineWidth=3-i*.35;ctx.setLineDash([18,13]);ctx.lineDashOffset=-spin*direction*38;ctx.beginPath();ctx.arc(cx,cy,radius,start,start+Math.PI*1.35);ctx.stroke();ctx.setLineDash([]);for(let j=0;j<2;j++){const angle=start+j*2.1,ballX=cx+Math.cos(angle)*radius,ballY=cy+Math.sin(angle)*radius;ctx.fillStyle=j%2?p.yellow:p.accent;ctx.beginPath();ctx.arc(ballX,ballY,5-i*.45,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.ink;ctx.lineWidth=1;ctx.stroke();}}ctx.globalAlpha=.22+.2*fade;ctx.strokeStyle=p.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,34+progress*92,spin*stirDirection,spin*stirDirection+Math.PI*1.8);ctx.stroke();ctx.restore()}
function drawClearEffect(p){if(clearPulse<=0)return;const progress=clamp(1-clearPulse/TOP_CLEAR_DURATION,0,1),pulse=Math.sin(progress*Math.PI),cx=clearX,cy=clearY;ctx.save();ctx.globalAlpha=.18+.62*pulse;ctx.strokeStyle=p.yellow;ctx.lineWidth=5;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(cx,cy,28+progress*(72+i*34),0,Math.PI*2);ctx.stroke();}ctx.strokeStyle=p.accent;ctx.lineWidth=3;for(let i=0;i<12;i++){const angle=i*Math.PI/6,r1=34+progress*30,r2=r1+24+progress*26;ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*r1,cy+Math.sin(angle)*r1);ctx.lineTo(cx+Math.cos(angle)*r2,cy+Math.sin(angle)*r2);ctx.stroke();}ctx.globalAlpha=pulse;ctx.fillStyle=p.accent;ctx.font='950 20px ui-rounded, system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('+'+clearBonus,cx,cy-82-progress*22);ctx.textAlign='left';ctx.restore()}
// A straight-path guide, not a prediction of subsequent bounces or merges.
function landingPreview(){const t=FRUITS[nextLevel],start=BIN.y+RULES.boundaryRadius(t)+8;let y=BIN.y+BIN.h-RULES.boundaryRadius(t)-5;for(const f of fruits){if(f.dead)continue;const rx=RULES.collisionRadius(t)+radiusAlong(f,1,0),ry=RULES.collisionRadius(t)+radiusAlong(f,0,1),dx=Math.abs(aimX-f.x);if(dx<rx){const contact=f.y-ry*Math.sqrt(1-(dx/rx)**2);if(contact>=start)y=Math.min(y,contact);else if(f.y+ry>=start)y=start}}return Math.max(start,y)}
function drawMergeFeedback(p){for(const e of mergeFeedback){const progress=1-e.life/.45;ctx.save();ctx.globalAlpha=Math.sin(progress*Math.PI)*.65;ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(.8+progress*.55),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=Math.min(1,e.life*5);ctx.fillStyle=p.ink;ctx.textAlign='center';ctx.font='900 '+canvasLabelPx+'px ui-monospace,monospace';const label=(e.chain>1?'CHAIN '+e.chain+' · ':'')+'+'+e.points;ctx.fillText(label,clamp(e.x,BIN.x+100,BIN.x+BIN.w-100),Math.max(BIN.y+30,e.y-e.r-10-progress*24));ctx.restore()}}
function drawAim(p){if(state!=='playing')return;const t=FRUITS[nextLevel],y=BIN.y+RULES.boundaryRadius(t)+8,landingY=landingPreview();ctx.save();ctx.globalAlpha=dropCooldown>0?.18:.5;ctx.strokeStyle=p.accent;ctx.setLineDash([7,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(aimX,y+t.r+5);ctx.lineTo(aimX,landingY);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=.12;drawFruit({x:aimX,y:landingY,r:t.r,level:nextLevel,rot:0},p);ctx.globalAlpha=dropCooldown>0?.3:pointerOwner!==null?1:.72;drawFruit({x:aimX,y,r:t.r,level:nextLevel,rot:0},p);ctx.restore()}
function draw(){framesRendered++;const p=palette();drawBackdrop(p);drawBin(p);drawStirEffect(p);drawClearEffect(p);drawAim(p);fruits.forEach(f=>drawFruit(f,p));drawMergeFeedback(p);particles.forEach(q=>{ctx.save();ctx.globalAlpha=Math.max(0,q.life*2);ctx.fillStyle=q.color;ctx.strokeStyle=p.ink;ctx.lineWidth=1;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore()});if(paused){ctx.fillStyle=p.paper+'bb';ctx.fillRect(0,0,W,H)}}
function schedule(){if(!clearing&&!rafId)rafId=requestAnimationFrame(loop)}
function invalidate(){dirty=true;schedule()}
function resetTiming(){accumulator=0;last=performance.now()}
function loop(time){
 rafId=0;const dt=Math.max(0,Math.min(.1,(time-last)/1000||0));
 if(state==='playing'&&!paused&&!document.hidden){last=time;accumulator+=dt;while(accumulator+1e-9>=STEP){accumulator-=STEP;clock+=STEP*1000;update(STEP);if(state!=='playing'||paused){accumulator=0;break}}dirty=true}
 if(dirty){draw();dirty=false}
 if(state==='playing'&&!paused&&!document.hidden)schedule();else accumulator=0;
}
function pointFromEvent(event){const r=canvas.getBoundingClientRect();return clampAimX((event.clientX-r.left)/r.width*W)}
function clearSelection(){try{getSelection()?.removeAllRanges()}catch(_){}}
function clearInput(){heldKeys.clear();releaseOwnedPointer();for(const node of [...actionPointers.keys()]){actionClicks.add(node);releaseActionPointer(node)}}
function releaseOwnedPointer(){const id=pointerOwner;pointerOwner=null;if(id!==null)try{if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id)}catch(_){}}
function updateControls(){
 const active=state==='playing'&&!paused&&!clearing&&!document.hidden;
 setDisabled(ui.drop,clearing||paused||document.hidden||(state==='playing'&&dropCooldown>0));
 for(const node of [ui.stir,ui.mobileStir]){setDisabled(node,!active||energy<30);setAttr(node,'aria-label',`Stir pool ${stirDirection<0?'clockwise':'counter-clockwise'}. Costs 30 energy.`)}
 setDisabled(ui.pause,clearing||state!=='playing');setAttr(ui.pause,'aria-pressed',paused);
 setDisabled(ui.mode,clearing||paused||document.hidden);setAttr(ui.mode,'aria-pressed',mode==='semi-fluid');
}
function performDrop(x){
 if(clearing||paused||document.hidden)return;if(state==='playing'&&dropCooldown>0)return;releaseOwnedPointer();if(state==='title'||state==='over')start();
 if(state!=='playing')return;clearSelection();if(Number.isFinite(x))aimX=clampAimX(x);spawnFruit(aimX);
}
canvas.addEventListener('pointerdown',event=>{
 event.preventDefault();if(clearing||document.hidden||paused||event.isPrimary===false||event.button!==0||pointerOwner!==null)return;
 if(state==='title'||state==='over')start();if(state!=='playing'||dropCooldown>0)return;
 aimX=pointFromEvent(event);pointerOwner=event.pointerId;clearSelection();try{canvas.setPointerCapture(pointerOwner)}catch(_){};invalidate();
});
canvas.addEventListener('pointermove',event=>{
 event.preventDefault();if(clearing||document.hidden||state!=='playing'||paused)return;
 if(pointerOwner!==null&&event.pointerId!==pointerOwner)return;if(pointerOwner===null&&event.pointerType!=='mouse')return;
 aimX=pointFromEvent(event);
});
function releasePointer(event){event.preventDefault();if(event.pointerId!==pointerOwner)return;releaseOwnedPointer();invalidate()}
canvas.addEventListener('pointerup',event=>{
 event.preventDefault();if(event.pointerId!==pointerOwner)return;const r=canvas.getBoundingClientRect(),inside=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom,x=pointFromEvent(event);releaseOwnedPointer();if(inside)performDrop(x);invalidate();
});
canvas.addEventListener('pointercancel',releasePointer);
canvas.addEventListener('lostpointercapture',event=>{if(event.pointerId===pointerOwner)pointerOwner=null});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
const gamePage=document.querySelector('.page');
for(const type of ['contextmenu','selectstart','dragstart'])gamePage.addEventListener(type,event=>event.preventDefault(),{capture:true});
gamePage.addEventListener('touchstart',()=>clearSelection(),{passive:true});
gamePage.addEventListener('touchmove',event=>{if(pointerOwner!==null)event.preventDefault()},{passive:false});
// Secondary touch pointers do not produce a browser click. Give each action
// its own pointer owner and suppress the following compatibility click.
function releaseActionPointer(node){const id=actionPointers.get(node);actionPointers.delete(node);if(id!==undefined)try{if(node.hasPointerCapture(id))node.releasePointerCapture(id)}catch(_){}}
function bindAction(node,action){
 node.addEventListener('pointerdown',e=>{if(node.disabled||e.button!==0||actionPointers.has(node))return;actionClicks.delete(node);actionPointers.set(node,e.pointerId);try{node.setPointerCapture(e.pointerId)}catch(_){}});
 node.addEventListener('pointerup',e=>{if(actionPointers.get(node)!==e.pointerId)return;e.preventDefault();const r=node.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;releaseActionPointer(node);if(inside&&!node.disabled)action();actionClicks.add(node)});
 for(const type of ['pointercancel','lostpointercapture'])node.addEventListener(type,e=>{if(actionPointers.get(node)===e.pointerId){actionClicks.add(node);releaseActionPointer(node)}});
 node.addEventListener('click',e=>{if(node.disabled)return;if(e.detail>0&&actionClicks.delete(node))return;action()});
}
for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{for(const [node,id] of actionPointers)if(id===e.pointerId){actionClicks.add(node);releaseActionPointer(node)}if(e.pointerId===pointerOwner&&e.target!==canvas)releasePointer(e)});
bindAction(ui.drop,()=>performDrop());bindAction(ui.mobileStir,stirPool);bindAction(ui.stir,stirPool);
ui.mode.addEventListener('click',()=>{if(clearing||paused||document.hidden)return;mode=mode==='semi-fluid'?'calm':'semi-fluid';ui.mode.innerHTML=mode==='semi-fluid'?'SEMI-FLUID <span>ON</span>':'CALM FLOW <span>ON</span>';updateControls();invalidate()});
addEventListener('keydown',event=>{
 if(clearing||document.hidden||event.ctrlKey||event.metaKey||event.altKey||event.target?.isContentEditable||event.target?.closest?.('button,a,input,textarea,select,[contenteditable]'))return;
 const key=event.key.toLowerCase(),action={arrowleft:'left',a:'left',arrowright:'right',d:'right'}[key];
 if(action){event.preventDefault();if(state==='playing'&&!paused)heldKeys.set(event.code||key,action);return}
 if([' ','enter','p'].includes(key)){event.preventDefault();if(event.repeat)return;if(key==='p')togglePause();else performDrop()}
});
addEventListener('keyup',event=>heldKeys.delete(event.code||event.key.toLowerCase()));
function suspend(){clearInput();if(state==='playing'&&!paused){paused=true;ui.pause.textContent='RESUME';showOverlay('PAUSED','THE FRUIT WILL WAIT IN SUSPENSION','RESUME');updateControls();resetTiming();invalidate()}}
ui.start.addEventListener('click',()=>{if(paused)togglePause();else start()});ui.pause.addEventListener('click',togglePause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else updateControls()});addEventListener('blur',suspend);addEventListener('pagehide',suspend);
document.addEventListener('themechange',()=>{paletteCache=null;invalidate()});addEventListener('resize',()=>{syncCanvasMetrics();invalidate()});
addEventListener('game-data-clearing',()=>{clearInput();clearing=true;state='clearing';paused=false;accumulator=0;if(rafId)cancelAnimationFrame(rafId);rafId=0;for(const button of [ui.start,ui.pause,ui.drop,ui.stir,ui.mobileStir,ui.mode])button.disabled=true});
function syncCanvasMetrics(){const width=canvas.getBoundingClientRect().width||W;canvasLabelPx=clamp(10*W/width,11,38)}
function mountUtilities(){const dock=$('utilityDock');for(const selector of ['.theme-toggle','.clear-data-toggle']){const button=document.querySelector(selector);if(button)dock.appendChild(button)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountUtilities,{once:true});else mountUtilities();
window.MelonLab=Object.freeze({getSnapshot:()=>({state:paused?'paused':state,paused,clearing,mode,score,best,energy,dropCount,watermelonClears,currentProfileIndex,profile:currentProfile().id,activeLevels:[...currentProfile().activeLevels],nextLevel,queuedLevel,aiming:pointerOwner!==null,aimX,landingY:landingPreview(),dropCooldown,dangerY:DANGER_Y(),dangerTimer,fluidPulse,stirDirection,clearPulse,mergeFeedback:mergeFeedback.map(e=>({...e})),elapsedMs:clock,framesRendered,fruits:fruits.filter(f=>!f.dead).map(f=>({level:f.level,id:FRUITS[f.level].id,x:f.x,y:f.y,vx:f.vx,vy:f.vy,r:f.r,collisionR:RULES.collisionRadius(f),boundaryR:RULES.boundaryRadius(f),boundaryX:radiusAlong(f,1,0,RULES.boundaryRadius(f)),boundaryY:radiusAlong(f,0,1,RULES.boundaryRadius(f)),deformation:{xx:f.strainX||0,xy:f.strainY||0,a:f.shapeA??1,b:f.shapeB??0,c:f.shapeC??1},rot:f.rot,age:f.age,settled:f.settled,warning:f.warning||0}))})});
for(const item of FRUITS){const el=document.createElement('div');el.className='route-item';el.innerHTML=`<i class="route-fruit" data-shape="${item.shape}" aria-hidden="true"></i><span>${item.label}</span>`;ui.route.appendChild(el)}
updateRoute();updateNext();loadTitle();function loadTitle(){state='title';showOverlay('MELON LAB','DROP · COLLIDE · MERGE · DISCOVER','START EXPERIMENT');updateHud();updateControls()}syncCanvasMetrics();resetTiming();schedule();
})();
