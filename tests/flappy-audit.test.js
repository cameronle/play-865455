const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('../flappy/rules.js'),{boot}=require('./helpers/flappy-runtime.js');
test('Flappy persists a newly earned best during the scoring event and keeps it after death',()=>{
 const h=boot();h.test.set({state:'playing',bird:{x:90,y:260,vy:0,r:14,angle:0},pipes:[{x:0,width:52,topY:150,bottomY:290,scored:false}]});
 h.test.update(.001);assert.equal(h.snapshot().score,1);assert.equal(h.storage.get('flappy-best-v1'),'1');h.test.gameOver();assert.equal(h.storage.get('flappy-best-v1'),'1');
});
test('Flappy best storage rejects malformed values and storage failure cannot kill the game',()=>{
 for(const s of ['NaN','Infinity','-3','1.5','bad','9007199254740992']){const h=boot({storage:{'flappy-best-v1':s}});assert.equal(h.snapshot().best,0)}
 assert.doesNotThrow(()=>{const h=boot({storageThrows:true});h.window.FlappyGame.flap();h.test.gameOver()});
});
test('Flappy overlay Resume resumes the existing run without resetting or flapping',()=>{
 const h=boot();h.window.FlappyGame.flap();h.nodes.pauseButton.click();const b=JSON.parse(JSON.stringify(h.test.get().bird));h.nodes.startButton.click();assert.equal(h.snapshot().state,'playing');assert.deepEqual(JSON.parse(JSON.stringify(h.test.get().bird)),b);
});
test('Flappy stale loss overlay cannot resurrect during an immediately restarted run',()=>{
 const h=boot();h.window.FlappyGame.flap();h.test.gameOver();h.window.FlappyGame.flap();h.advance(400);assert.equal(h.snapshot().state,'playing');assert.equal(h.nodes.overlay.classList.contains('hide'),true);
});
test('Flappy gravity integrates identically across frame partitions',()=>{
 const start={y:100,vy:-50};const a=R.updatePhysics(start,.5,1050);let b=start;
 for(let i=0;i<60;i++)b=R.updatePhysics(b,.5/60,1050);assert.ok(Math.abs(a.y-b.y)<1e-8);assert.ok(Math.abs(a.vy-b.vy)<1e-8);assert.deepEqual(start,{y:100,vy:-50});
});
test('Flappy circle collision keeps transparent corners safe but detects visible pipe edges',()=>{
 const p={x:100,width:52,topY:150,bottomY:290};assert.equal(R.checkPipeCollision({x:90,y:160,r:14},p),false);assert.equal(R.checkPipeCollision({x:91,y:159,r:14},p),true);assert.equal(R.checkPipeCollision({x:126,y:164,r:14},p),false);
});
test('Flappy canonical step scores only after full clearance and never scores after a collision',()=>{
 const bird={x:90,y:260,vy:0,r:14,angle:0},p={x:25,width:52,topY:150,bottomY:290,scored:false};
 let w={bird,pipes:[p],score:0,dead:false,time:0};w=R.advanceWorld(w,1/120,()=>.5);assert.equal(w.score,1);w=R.advanceWorld(w,1/120,()=>.5);assert.equal(w.score,1);
 const touching={...p,x:27};const notYet=R.advanceWorld({bird,pipes:[touching],score:0,dead:false,time:0},1/120,()=>.5);assert.equal(notYet.score,0);
 const crash=R.advanceWorld({bird:{...bird,y:100},pipes:[{...p,x:78}],score:3,dead:false,time:0},1/120,()=>.5);assert.equal(crash.dead,true);assert.equal(crash.score,3);assert.deepEqual(R.advanceWorld(crash,.1,()=>.5),crash);
});
test('Flappy runtime tests collision after obstacle motion using the canonical engine',()=>{
 const h=boot();h.test.set({state:'playing',bird:{x:90,y:100,vy:0,r:14,angle:0},pipes:[{x:105,width:52,topY:150,bottomY:290,scored:false}]});h.test.update(.05);assert.equal(h.snapshot().state,'over');assert.equal(h.snapshot().score,0);
});
test('Flappy ignores nonprimary and right-button flight gestures',()=>{
 for(const extra of [{button:2},{isPrimary:false}]){const h=boot();h.nodes.game.dispatch('pointerdown',extra);assert.equal(h.snapshot().state,'title')}
 const h=boot();h.nodes.game.dispatch('pointerdown',{pointerId:4});h.test.update(.01);const v=h.test.get().bird.vy;h.nodes.game.dispatch('pointerdown',{pointerId:9});assert.equal(h.test.get().bird.vy,v);h.nodes.game.dispatch('pointercancel',{pointerId:9});h.nodes.game.dispatch('pointerdown',{pointerId:9});assert.equal(h.test.get().bird.vy,v);h.nodes.game.dispatch('pointerup',{pointerId:4});h.nodes.game.dispatch('pointerdown',{pointerId:9});assert.equal(h.test.get().bird.vy,-350);
});
test('Flappy preserves shortcuts, focused buttons and held-key semantics',()=>{
 const h=boot();h.window.FlappyGame.flap();h.test.update(.01);const v=h.test.get().bird.vy;
 for(const extra of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{target:h.nodes.pauseButton}]){const e=h.key('Space',extra);assert.equal(h.test.get().bird.vy,v);assert.equal(Boolean(e.defaultPrevented),false)}
 h.key('KeyP');assert.equal(h.snapshot().state,'paused');h.key('KeyP',{repeat:true});assert.equal(h.snapshot().state,'paused');
});
test('Flappy an intentional overlay background tap starts or resumes exactly once',()=>{
 const h=boot();h.nodes.overlay.dispatch('pointerdown');assert.equal(h.snapshot().state,'playing');h.nodes.pauseButton.click();h.nodes.overlay.dispatch('pointerdown');assert.equal(h.snapshot().state,'playing');
 const fresh=boot();fresh.nodes.overlay.dispatch('pointerdown',{target:fresh.nodes.startButton});assert.equal(fresh.snapshot().state,'title');fresh.nodes.startButton.click();assert.equal(fresh.snapshot().state,'playing');
});
test('Flappy does not continuously paint title, pause or terminal states',()=>{
 const h=boot();h.frame();let count=h.paintCount();for(let i=0;i<15;i++)h.frame(100);assert.equal(h.paintCount(),count);
 h.window.FlappyGame.flap();h.nodes.pauseButton.click();h.frame();count=h.paintCount();for(let i=0;i<15;i++)h.frame(100);assert.equal(h.paintCount(),count);
 h.nodes.startButton.click();h.test.gameOver();for(let i=0;i<30;i++)h.frame(100);count=h.paintCount();for(let i=0;i<15;i++)h.frame(100);assert.equal(h.paintCount(),count);
 h.emit('document','themechange');h.frame();assert.equal(h.paintCount(),count+1);
});
test('Flappy runtime keeps physics and pipe motion equal at 15, 30, 60 and 120 Hz',()=>{
 let expected;for(const fps of [15,30,60,120]){const h=boot({rng:()=>.5});h.frame(0);h.window.FlappyGame.flap();for(let i=0;i<.4*fps;i++)h.frame(1000/fps);const s=h.test.get();assert.equal(s.state,'playing');assert.ok(Math.abs(s.pipes[0].x-406)<1e-8);if(expected){assert.ok(Math.abs(s.bird.y-expected.bird.y)<1e-8);assert.ok(Math.abs(s.bird.vy-expected.bird.vy)<1e-8)}expected=s}
});
test('Flappy suspends on hidden, blur and pagehide and requires explicit resume',()=>{
 for(const type of ['visibilitychange','blur','pagehide']){const h=boot();h.window.FlappyGame.flap();h.frame(100);const before=JSON.stringify(h.test.get().bird);if(type==='visibilitychange'){h.document.hidden=true;h.emit('document',type)}else h.emit('window',type);
 assert.equal(h.snapshot().state,'paused');h.frame(2000);assert.equal(JSON.stringify(h.test.get().bird),before);h.document.hidden=false;h.emit('document','visibilitychange');h.frame(1000);assert.equal(h.snapshot().state,'paused');h.nodes.startButton.click();h.frame(10);assert.equal(h.snapshot().state,'playing');assert.ok(Math.abs(h.test.get().bird.y-JSON.parse(before).y)<5)}
});
test('Flappy clear-data transition prevents old records being written back',()=>{
 const h=boot();h.window.FlappyGame.flap();h.emit('window','game-data-clearing');h.storage.delete('flappy-best-v1');h.test.set({state:'playing',score:9,best:9});h.test.gameOver();h.window.FlappyGame.flap();assert.equal(h.storage.has('flappy-best-v1'),false);assert.notEqual(h.snapshot().state,'playing');
});
test('Flappy pipe drawing uses its collision width rather than an invisible wider box',()=>{
 const js=fs.readFileSync('flappy/game.js','utf8');assert.match(js,/cloudPillar\(pipe\.x,0,pipe\.width/);assert.doesNotMatch(js,/fillRect\(x\+7,y,38,h\)/);
});
test('Flappy snapshots cannot mutate live nested gameplay state',()=>{
 const h=boot();h.window.FlappyGame.flap();const s=h.window.FlappyGame.getSnapshot();assert.ok(s.bird&&s.pipes);s.bird.y=0;s.pipes[0].x=-10000;assert.equal(h.test.get().bird.y,260);assert.equal(h.test.get().pipes[0].x,460);
});
test('Flappy 2000 deterministic courses sustain 20 full passes through actual physics',()=>{
 for(let seed=1;seed<=2000;seed++){
  let x=seed;const rng=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296};let w=R.createWorld(rng),last=-1;w.bird=R.flap(w.bird,-350);
  for(let i=0;i<5400&&!w.dead&&w.score<20;i++){const next=w.pipes.find(p=>!p.scored),target=(next.topY+next.bottomY)/2;if(w.time-last>=.16&&w.bird.y>target+30){w={...w,bird:R.flap(w.bird,-350)};last=w.time}w=R.advanceWorld(w,1/120,rng)}
  assert.equal(w.dead,false,`seed ${seed}`);assert.equal(w.score,20,`seed ${seed}`);
 }
});
test('Flappy fitting reserves the measured outer chrome and can refit long records',()=>{
 const h=boot();const page=h.nodes.gamePage,frame=h.nodes.gameFrame;page.clientWidth=320;page.offsetHeight=600;frame.offsetHeight=400;const values={};frame.style.setProperty=(k,v)=>values[k]=v;
 h.window.innerWidth=320;h.window.innerHeight=568;h.emit('window','resize');assert.ok(parseFloat(values['--arena-width'])>200);assert.ok(parseFloat(values['--arena-width'])<260);
});
test('Flappy start and resume put keyboard focus in the arena, and Escape remains available in the dialog',()=>{
 const h=boot();h.nodes.startButton.click();assert.equal(h.document.activeElement,h.nodes.game);h.nodes.pauseButton.click();h.nodes.startButton.focus();h.key('Escape');assert.equal(h.snapshot().state,'playing');assert.equal(h.document.activeElement,h.nodes.game);
});
test('Flappy game gestures do not invoke selection or long-press menus',()=>{
 const h=boot();assert.equal(h.nodes.game.dispatch('contextmenu').defaultPrevented,true);assert.equal(h.nodes.game.dispatch('selectstart').defaultPrevented,true);
});
test('Flappy later light palette cannot override the dark muted-text contrast token',()=>{
 const css=fs.readFileSync('flappy/style.css','utf8');let muted;
 for(const m of css.matchAll(/(:root|\[data-theme="dark"\])\s*\{([^}]*)\}/g)){const v=m[2].match(/--muted:\s*([^;}]+)/);if(v)muted=v[1].trim()}
 assert.equal(muted,'#a8b8b2');
});
test('Flappy terminal particles paint one final clean frame before stopping',()=>{
 const h=boot({rng:()=>.5});h.window.FlappyGame.flap();h.test.gameOver();let frames=0;
 while(h.rafCount()){const count=h.paintCount();h.frame(50);assert.equal(h.paintCount(),count+1);assert.ok(++frames<40)}
});
