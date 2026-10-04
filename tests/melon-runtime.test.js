const test=require('node:test'),assert=require('node:assert/strict');
const {boot,fruit}=require('./helpers/melon-runtime');
test('blocked local storage does not prevent Melon Lab from starting or scoring',()=>{
 const b=boot({storageThrows:true});b.test.start();b.test.set({score:120});assert.doesNotThrow(()=>b.test.gameOver());assert.equal(b.test.get().best,120);
});
test('falling physics and elapsed game time agree at 20, 30, 60 and 120 FPS',()=>{
 const states=[];for(const hz of [20,30,60,120]){const b=boot();b.test.start();b.test.spawnFruit(360,0);b.advance(.3,hz);states.push(b.snapshot())}for(const s of states){assert.ok(Math.abs(s.fruits[0].y-states[0].fruits[0].y)<1e-7);assert.ok(Math.abs(s.clock-300)<1e-6)}
});
test('title and pause stop continuous canvas paints and palette reads',()=>{
 const b=boot();b.frame();let p=b.paintCount(),s=b.styleCount();b.advance(1);assert.equal(b.paintCount(),p);assert.equal(b.styleCount(),s);b.test.start();b.frame();b.test.togglePause();b.frame();p=b.paintCount();const clock=b.test.get().clock;b.advance(1);assert.equal(b.paintCount(),p);assert.equal(b.test.get().clock,clock);b.emit('document','themechange');b.frame();assert.ok(b.paintCount()>p);
});
test('clearing data freezes the run and cannot recreate a deleted best',()=>{
 const b=boot({storage:{melonLabBest:'99'}});b.test.start();b.test.set({score:900});b.emit('window','game-data-clearing');b.storage.delete('melonLabBest');b.test.gameOver();b.test.start();b.nodes.dropButton.click();b.advance(1);assert.equal(b.storage.has('melonLabBest'),false);assert.equal(b.test.get().clearing,true);assert.equal(b.test.get().state,'clearing');
});
test('a new high score is saved during the run without repeating stable HUD writes',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,630),fruit(0,360,630)]});b.test.update(1/120);assert.equal(b.storage.get('melonLabBest'),'20');b.frame();const writes=b.writeCount();for(let i=0;i<100;i++)b.test.update(1/120);assert.ok(b.writeCount()-writes<15);
});
test('profile advancement preserves the promised next sample and advances one stage per call',()=>{
 const b=boot({rng:()=>.9});b.test.start();b.test.set({nextLevel:0,score:24000,dropCount:12,watermelonClears:3});b.test.maybeAdvanceProfile();assert.equal(b.test.get().currentProfileIndex,1);assert.equal(b.test.get().nextLevel,0);b.test.set({score:120000,dropCount:28,watermelonClears:6});b.test.maybeAdvanceProfile();assert.equal(b.test.get().currentProfileIndex,2);assert.equal(b.test.get().nextLevel,0);
});
test('stable HUD and accessibility attributes do not mutate on every physics substep',()=>{
 const b=boot();b.test.start();b.frame();const writes=b.writeCount();for(let i=0;i<100;i++)b.test.update(1/120);assert.ok(b.writeCount()-writes<15);
});
test('malformed or negative saved best is ignored',()=>{
 for(const value of ['broken','Infinity','-12','2.5'])assert.equal(boot({storage:{melonLabBest:value}}).test.get().best,0,value);
 assert.equal(boot({storage:{melonLabBest:'980'}}).test.get().best,980);
});
