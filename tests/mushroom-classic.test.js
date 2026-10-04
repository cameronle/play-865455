const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/mushroom-runtime');
function flat(){const b=boot();b.test.startGame();const s=b.test.get();s.current.width=5000;s.current.platforms=[{id:'floor',x:0,y:460,w:5000,h:80,type:'ground'}];s.current.enemies=[];s.current.coins=[];s.current.checkpoint.x=4500;s.current.goal.x=4900;Object.assign(s.player,{x:600,y:418,grounded:true,vy:0,vx:0});return b;}
function steps(b,count){for(let i=0;i<count;i++)b.test.update(1/120);}
test('Shift accelerates into a separate run speed without teleporting velocity',()=>{
 const walk=flat(),run=flat();walk.key('ArrowRight');run.key('Shift');run.key('ArrowRight');steps(run,1);assert.ok(run.test.get().player.vx>0&&run.test.get().player.vx<100);steps(run,119);steps(walk,120);
 assert.equal(run.test.get().input.run,true);assert.ok(run.test.get().player.vx>walk.test.get().player.vx+80);assert.ok(run.test.get().player.x>walk.test.get().player.x+75);
 run.emit('window','keyup',{key:'Shift'});steps(run,120);assert.equal(run.test.get().input.run,false);assert.ok(run.test.get().player.vx<=286);
});
test('both physical Shift keys retain ownership until both are released',()=>{
 const b=flat();b.key('Shift',{code:'ShiftLeft'});b.key('Shift',{code:'ShiftRight'});b.emit('window','keyup',{key:'Shift',code:'ShiftLeft'});assert.equal(b.test.get().input.run,true);b.emit('window','keyup',{key:'Shift',code:'ShiftRight'});assert.equal(b.test.get().input.run,false);
});
test('unchanged run status does not mutate its ARIA attribute every physics step',()=>{
 const b=flat(),button=b.nodes.runButton,set=button.setAttribute;let writes=0;button.setAttribute=(...a)=>{writes++;set(...a)};steps(b,120);assert.equal(writes,0);
});
test('mobile run toggle is independent of held movement and keyboard Shift',()=>{
 const b=flat();assert.ok(b.nodes.runButton);b.nodes.runButton.click();assert.equal(b.test.get().input.run,true);assert.equal(b.nodes.runButton.getAttribute('aria-pressed'),'true');
 b.nodes.rightButton.dispatch('pointerdown',{pointerId:4});b.nodes.jumpButton.dispatch('pointerdown',{pointerId:5});assert.ok(b.test.get().input.right&&b.test.get().input.jump&&b.test.get().input.run);
 b.nodes.jumpButton.dispatch('pointerup',{pointerId:5});assert.ok(b.test.get().input.right&&b.test.get().input.run);b.nodes.rightButton.dispatch('pointerup',{pointerId:4});assert.equal(b.test.get().input.right,false);
 b.key('Shift');b.nodes.runButton.click();assert.equal(b.test.get().input.run,true);b.emit('window','keyup',{key:'Shift'});assert.equal(b.test.get().input.run,false);
});
test('pause, hidden tab, death and new game clear the run latch and every owner',()=>{
 for(const transition of ['pause','hidden','death','restart']){
  const b=flat();b.nodes.runButton.click();b.key('Shift');b.nodes.rightButton.dispatch('pointerdown',{pointerId:9});
  if(transition==='pause')b.test.togglePause();else if(transition==='hidden'){b.document.hidden=true;b.emit('document','visibilitychange');}else if(transition==='death')b.test.hurtPlayer();else b.test.startGame();
  assert.ok(Object.values(b.test.get().input).every(v=>!v),transition);assert.equal(b.nodes.runButton.getAttribute('aria-pressed'),'false');assert.equal(b.nodes.rightButton.hasPointerCapture(9),false);
 }
});
test('short jump is lower than held jump, buffered landing jump is consumed once',()=>{
 const short=flat(),held=flat();for(const b of [short,held]){b.key(' ');steps(b,6);}short.emit('window','keyup',{key:' '});let low=418,high=418;
 for(let i=0;i<100;i++){steps(short,1);steps(held,1);low=Math.min(low,short.test.get().player.y);high=Math.min(high,held.test.get().player.y);}assert.ok(low>high+40);
 const b=flat(),p=b.test.get().player;Object.assign(p,{y:400,vy:180,grounded:false,coyote:0});b.key(' ');steps(b,24);assert.ok(p.vy<0);assert.equal(p.jumpBuffer,0);steps(b,150);assert.ok(p.grounded);assert.equal(p.vy,0);
});
test('stomp holding jump yields a higher controllable bounce, still one reward',()=>{
 const values=[];for(const held of [false,true]){const b=flat(),s=b.test.get();s.current.enemies=[{x:800,y:426,w:34,h:34,dead:false}];Object.assign(s.player,{x:802,y:390,vy:220,grounded:false});s.input.jump=held;b.test.stompOrHurt();values.push(s.player.vy);assert.ok(s.player.vy<0);assert.equal(s.current.enemies[0].dead,true);const points=b.test.get().score;b.test.stompOrHurt();assert.equal(b.test.get().score,points);if(held){b.test.releaseJump();assert.ok(s.player.vy>values[1]);}}
 assert.ok(values[1]<values[0]-100);
});
test('powered brick cannot pay twice, seed absorbs a hit but never a fall',()=>{
 const b=flat(),s=b.test.get(),brick={x:600,y:300,w:40,h:22,type:'brick'};s.player.powered=true;b.test.bumpBlock(brick);const before=b.test.get().score;brick.bump=0;b.test.bumpBlock(brick);assert.equal(b.test.get().score,before);
 b.test.hurtPlayer();assert.equal(b.test.get().lives,3);assert.equal(s.player.powered,false);assert.ok(s.player.inv>0);b.test.hurtPlayer();assert.equal(b.test.get().lives,3);s.player.powered=true;s.player.inv=0;b.test.hurtPlayer(true);assert.equal(b.test.get().lives,2);
});
test('reward seeds move after emergence and remain inside their world',()=>{
 const b=flat();const s=b.test.get();s.player.x=100;b.test.set({powerups:[{x:800,y:420,w:24,h:24,vy:0,vx:65,born:0,type:'spark'}]});steps(b,120);assert.ok(b.test.get().powerups[0].x>820);assert.ok(b.test.get().powerups[0].y+b.test.get().powerups[0].h<=460);
 b.test.set({powerups:[{x:4990,y:420,w:24,h:24,vy:0,vx:65,born:1,type:'spark'}]});steps(b,1);assert.ok(b.test.get().powerups[0].x+b.test.get().powerups[0].w<=5000);assert.ok(b.test.get().powerups[0].vx<0);
});
test('coin box and moving seed can both be reached by ordinary player input',()=>{
 const data=require('./fixtures/mushroom-classic-bonus.json');let z=data.seed;const b=boot({rng:()=>((z=(Math.imul(z,1664525)+0x3c6ef35f)>>>0)/4294967296)});b.test.startGame();b.frame(0);
 for(const action of data.path){const right=[0,1].includes(action),left=[3,4].includes(action),jump=[1,2,4].includes(action);b.emit('window','keyup',{key:'ArrowRight'});b.emit('window','keyup',{key:'ArrowLeft'});if(right)b.key('ArrowRight');if(left)b.key('ArrowLeft');if(jump&&!b.test.get().input.jump)b.key(' ');if(!jump&&b.test.get().input.jump)b.emit('window','keyup',{key:' '});for(let i=0;i<data.ticksPerAction/2;i++)b.frame();}
 const s=b.test.get();assert.equal(s.lives,3);assert.ok(s.current.platforms.find(p=>p.type==='question'&&p.x===130).hit);assert.ok(s.player.powered);assert.ok(s.coins>=1);
});
test('teaching rewards are early and all overhead boxes have usable headroom',()=>{
 const levels=boot().test.get().LEVELS;assert.ok(levels[0].platforms.some(p=>p.type==='question'&&p.contents==='coin'&&p.x<200));assert.ok(levels[0].platforms.some(p=>p.type==='question'&&p.contents==='spark'&&p.x<650));
 for(const level of levels)for(const q of level.platforms.filter(p=>p.type==='question')){const supports=level.platforms.filter(p=>p!==q&&p.type!=='question'&&p.y>=q.y+q.h&&q.x+q.w/2>=p.x&&q.x+q.w/2<=p.x+p.w);assert.ok(supports.length,level.id+' unsupported box');const floor=Math.min(...supports.map(p=>p.y));assert.ok(floor-q.y-q.h>=54,level.id+' box '+q.x+' has only '+(floor-q.y-q.h)+'px headroom');}
});
