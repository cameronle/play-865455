const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/mushroom-runtime.js');
const certificate=require('./fixtures/mushroom-routes.json');
function seeded(seed){let z=seed;return ()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);}
for(const fps of [60,120])test('all three worlds have executable no-death routes at '+fps+' FPS',()=>{
 const b=boot({rng:seeded(certificate.seed)});b.test.startGame();
 for(let level=0;level<3;level++){
  if(level)b.nodes.startButton.click();
  assert.equal(b.test.get().levelIndex,level);
  let jump=false;b.key('ArrowRight');
  for(const action of certificate.paths[level]){
   assert.ok(action===0||action===1);
   if(action===1&&!jump)b.key(' ');else if(action===0&&jump)b.emit('window','keyup',{key:' '});jump=action===1;
   for(let f=0;f<fps*.15;f++)b.frame(1000/fps);
  }
  assert.equal(b.test.get().state,'clear','world '+level);assert.equal(b.test.get().lives,3);assert.equal(b.test.get().checkpointReached,true);
  const final=b.snapshot();for(let f=0;f<fps;f++)b.frame(1000/fps);assert.deepEqual(b.snapshot(),final);
 }
 assert.equal(b.nodes.message.textContent,'TRAIL COMPLETE');b.nodes.startButton.click();assert.equal(b.test.get().levelIndex,0);assert.equal(b.test.get().score,0);assert.equal(b.test.get().lives,3);
});
test('question blocks, brick breaks, pickup and stomp awards are single-use',()=>{
 const b=boot();b.test.startGame();const s=b.test.get(),q=s.current.platforms.find(p=>p.type==='question'&&p.contents==='coin');
 b.test.bumpBlock(q);q.bump=0;b.test.bumpBlock(q);assert.equal(b.test.get().coins,1);assert.equal(b.test.get().score,50);
 const brick=s.current.platforms.find(p=>p.type==='brick');s.player.powered=true;b.test.bumpBlock(brick);assert.equal(brick.broken,true);
 s.current.enemies=[{x:100,y:400,w:34,h:34,dead:false}];Object.assign(s.player,{x:102,y:365,vy:200});b.test.stompOrHurt();assert.equal(s.current.enemies[0].dead,true);const score=b.test.get().score;b.test.stompOrHurt();assert.equal(b.test.get().score,score);
});
test('published snapshots are deeply detached observation only',()=>{
 const b=boot();const view=b.window.MushroomTrail.getSnapshot();view.player.x=9999;view.world.platforms[0].x=9999;assert.equal(b.test.get().player.x,70);assert.equal(b.test.get().current.platforms[0].x,0);assert.equal(typeof b.window.MushroomTrail.update,'undefined');
});
test('enemies and sparks cannot snap onto solids from underneath',()=>{
 const b=boot();b.test.startGame();const s=b.test.get();s.current.platforms=[{id:'probe',x:400,y:350,w:180,h:22,type:'grass'}];s.current.enemies=[{x:420,y:331,w:34,h:34,vx:0,vy:1,minX:400,maxX:550,type:'walker',phase:0,dead:false}];
 b.test.updateEnemies(1/120);assert.ok(s.current.enemies[0].y>331);
 b.test.set({powerups:[{x:450,y:338,w:24,h:24,vy:10,born:0,type:'spark'}]});b.test.update(1/120);assert.ok(b.test.get().powerups[0].y>338);
});
test('full jump remains buffered when jump button starts the title state',()=>{
 const b=boot();b.nodes.jumpButton.dispatch('pointerdown',{pointerId:1});assert.equal(b.test.get().state,'playing');for(let i=0;i<4;i++)b.frame();assert.ok(b.test.get().player.vy<0);
});
test('zoom remains available and route assets use a fresh version',()=>{
 const html=require('node:fs').readFileSync('mushroom-trail/index.html','utf8');assert.doesNotMatch(html,/user-scalable=no/);assert.match(html,/game\.js\?v=mushroom-classic-5/);
});
test('clear-data freezes gameplay and cannot resurrect a deleted record',()=>{
 const b=boot({storage:{mushroomTrailBest:'9000'}});b.test.startGame();b.emit('window','game-data-clearing');b.storage.delete('mushroomTrailBest');b.test.levelClear();b.test.hurtPlayer();b.nodes.startButton.click();b.key('ArrowRight');for(let i=0;i<60;i++)b.frame();assert.equal(b.storage.has('mushroomTrailBest'),false);assert.ok(Object.values(b.test.get().input).every(v=>!v));
});
test('blocked storage and malformed best scores never break gameplay',()=>{
 for(const options of [{storageThrows:true},...['NaN','-10','Infinity','2.3','9007199254740992'].map(v=>({storage:{mushroomTrailBest:v}}))]){
  const b=boot(options);assert.equal(b.test.get().best,0);b.test.startGame();b.test.set({score:500});assert.doesNotThrow(()=>b.test.levelClear());assert.equal(b.test.get().best,1000);
 }
});
test('outer render cadence yields identical executable motion at 30, 60 and 120 FPS',()=>{
 const rows=[];for(const fps of [30,60,120]){const b=boot();b.test.startGame();b.test.get().current.enemies=[];b.test.get().current.platforms=b.test.get().current.platforms.filter(p=>p.type==='ground');b.key('ArrowRight');for(let i=0;i<fps;i++)b.frame(1000/fps);rows.push(b.snapshot().player);}
 for(const p of rows.slice(1)){assert.ok(Math.abs(p.x-rows[0].x)<1e-7,JSON.stringify(rows));assert.ok(Math.abs(p.vx-rows[0].vx)<1e-7);assert.equal(p.y,rows[0].y);}
});
test('paused and idle states do not repaint or rewrite unchanged HUD',()=>{
 const b=boot();for(let i=0;i<4;i++)b.frame();const title=b.paintCount();for(let i=0;i<60;i++)b.frame();assert.equal(b.paintCount(),title);
 b.test.startGame();for(let i=0;i<10;i++)b.frame();b.test.togglePause();for(let i=0;i<4;i++)b.frame();const before=[b.paintCount(),b.writeCount(),b.styleCount()],snapshot=JSON.stringify(b.snapshot());for(let i=0;i<60;i++)b.frame();assert.deepEqual([b.paintCount(),b.writeCount(),b.styleCount()],before);assert.equal(JSON.stringify(b.snapshot()),snapshot);
});
test('pause, blur and respawn release every held source and capture',()=>{
 for(const transition of ['pause','blur','hidden','respawn']){
  const b=boot();b.test.startGame();b.key('ArrowRight');b.nodes.jumpButton.dispatch('pointerdown',{pointerId:9});
  if(transition==='pause')b.test.togglePause();else if(transition==='blur')b.emit('window','blur');else if(transition==='hidden'){b.document.hidden=true;b.emit('document','visibilitychange');}else b.test.hurtPlayer();
  assert.ok(Object.values(b.test.get().input).every(v=>!v),transition);assert.equal(b.nodes.jumpButton.hasPointerCapture(9),false);
 }
});
test('keyboard and pointer directions keep independent ownership',()=>{
 const b=boot();b.test.startGame();b.key('ArrowRight');b.nodes.rightButton.dispatch('pointerdown',{pointerId:7});b.nodes.rightButton.dispatch('pointerup',{pointerId:7});assert.equal(b.test.get().input.right,true);
 b.emit('window','keyup',{key:'ArrowRight'});assert.equal(b.test.get().input.right,false);
 b.nodes.leftButton.dispatch('pointerdown',{pointerId:8});b.nodes.leftButton.dispatch('pointerup',{pointerId:9});assert.equal(b.test.get().input.left,true);b.nodes.leftButton.dispatch('pointerup',{pointerId:8});assert.equal(b.test.get().input.left,false);
});
test('final fall freezes score and recenters camera on visible respawn',()=>{
 const b=boot();b.test.startGame();const s=b.test.get();s.player.x=3100;s.player.y=120;b.test.update(1/60);
 b.test.set({lives:1,score:80,checkpointReached:false});s.player.y=800;const spawnCoin=s.current.coins[0];spawnCoin.x=85;spawnCoin.y=439;
 s.player.inv=0;s.player.powered=false;b.test.update(1/60);const after=b.test.get();assert.equal(after.state,'over');assert.equal(after.score,80);assert.equal(after.lives,0);assert.ok(after.player.x>=after.cameraX&&after.player.x<after.cameraX+960);
});
test('falling while powered or invulnerable loses one life and always respawns',()=>{
 for(const status of [{powered:true,inv:0},{powered:false,inv:1},{powered:true,inv:1}]){
  const b=boot();b.test.startGame();Object.assign(b.test.get().player,status,{y:800});b.test.resolvePlayer(1/60);
  const s=b.test.get();assert.equal(s.lives,2);assert.equal(s.player.powered,false);assert.ok(s.player.y+s.player.h<=460);
 }
});
test('moving platform carries a resting rider exactly once per step',()=>{
 const b=boot();b.test.startGame();const s=b.test.get(),p=s.current.platforms.find(p=>p.type==='moving');
 Object.assign(s.player,{x:p.x+20,y:p.y-s.player.h,grounded:true,supportId:p.id});
 const before=s.player.x;b.test.updatePlatforms(1/60);b.test.resolvePlayer(1/60);
 assert.ok(Math.abs(s.player.x-before-p._dx)<1e-9,JSON.stringify({carry:s.player.x-before,platform:p._dx}));
});
test('all handcrafted solids have finite dimensions and preserve brick semantics',()=>{
 const levels=boot().test.get().LEVELS;
 const bad=levels.flatMap(l=>l.platforms.filter(p=>!Number.isFinite(p.h)||p.h<=0).map(p=>({level:l.id,x:p.x,h:p.h})));
 assert.equal(bad.length,0,JSON.stringify(bad));
 for(const level of levels)assert.ok(level.platforms.filter(p=>p.type==='brick').length>=4);
});
test('checkpoint deaths preserve earned score, coins and single-use pickups',()=>{
 const b=boot();b.test.startGame();
 for(let i=0;i<3;i++){
  b.test.loadLevel(i);const s=b.test.get();s.player.x=s.current.checkpoint.x+1;b.test.reachCheckpoint();
  const q=s.current.platforms.find(p=>p.type==='question'&&p.contents==='coin');b.test.bumpBlock(q);s.current.coins[0].got=true;b.test.set({coins:b.test.get().coins+1,score:b.test.get().score+25,lives:3});
  const before=b.test.get();const earned={score:before.score,coins:before.coins};
  s.player.inv=0;s.player.powered=false;b.test.hurtPlayer();assert.equal(b.test.get().score,earned.score);assert.equal(b.test.get().coins,earned.coins);assert.equal(b.test.get().checkpointReached,true);assert.equal(q.hit,true);assert.equal(s.current.coins[0].got,true);
  b.test.get().player.y=800;b.test.resolvePlayer(1/120);assert.equal(b.test.get().score,earned.score);assert.equal(b.test.get().coins,earned.coins);assert.equal(b.test.get().lives,1);
 }
});
test('checkpoint respawns onto permanent ground in every world',()=>{
 const b=boot();b.test.startGame();
 for(let i=0;i<3;i++){
  b.test.loadLevel(i);b.test.get().current.enemies=[];b.test.set({checkpointReached:true,lives:3});b.test.hurtPlayer();
  const {player,current}=b.test.get();assert.ok(current.platforms.some(p=>p.type==='ground'&&player.x>=p.x&&player.x+player.w<=p.x+p.w&&player.y+player.h<=p.y),current.id+' unsafe checkpoint');
  for(let f=0;f<100;f++)b.test.update(1/60);assert.equal(b.test.get().lives,2);
 }
});
