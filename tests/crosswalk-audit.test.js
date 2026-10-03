const test=require('node:test'),assert=require('node:assert/strict');
const {loadCrosswalk}=require('./helpers/crosswalk-runtime.js');
function clear(a){a.setPlayer({row:0,y:30});a.finish();}

test('selecting an unlocked level from result does not restore the old countdown state',()=>{
 const a=loadCrosswalk();a.start();clear(a);a.nodes.levelsButton.emit('click');a.nodes.levelGrid.children[0].emit('click');
 assert.equal(a.snapshot().state,'playing');a.step(20);assert.equal(a.snapshot().levelIndex,0);
});

test('opening selector twice preserves the state to return to',()=>{
 const a=loadCrosswalk();a.start();a.nodes.levelsButton.emit('click');a.nodes.levelsButton.emit('click');a.nodes.closeLevels.emit('click');
 assert.equal(a.snapshot().state,'playing');
});

test('modal keyboard and hidden start actions cannot restart the background run',()=>{
 const a=loadCrosswalk();a.nodes.levelsButton.emit('click');a.key('Enter');a.move('up');
 assert.equal(a.snapshot().state,'title');assert.equal(a.snapshot().score,0);
});



test('saved completion and records are type checked, bounded and cannot inject markup',()=>{
 const saved={'crosswalk-progress-v2':JSON.stringify({completed:['false',true],bestScores:{1:'<img src=x onerror=alert(1)>',2:-10},bestTimes:{1:'<img src=x>',2:Infinity},flawless:{1:'false'}})};
 const a=loadCrosswalk({saved});assert.equal(a.snapshot().progress.completed[0],false);
 a.nodes.levelsButton.emit('click');assert.ok(!JSON.stringify(a.snapshot().progress).includes('<img'));
 assert.equal(a.snapshot().progress.flawless[1],undefined);
});

test('blocked storage does not prevent title start movement or completion',()=>{
 const a=loadCrosswalk({storageThrows:true});a.start();a.move('up');clear(a);assert.equal(a.snapshot().state,'level-clear');
});



test('revisiting an already reached row cannot farm score',()=>{
 const a=loadCrosswalk();a.start();a.move('up');a.update(.1);a.move('down');a.update(.1);a.move('up');
 assert.equal(a.snapshot().score,10);
});

test('clear HUD remains on the completed level and completion is idempotent',()=>{
 const a=loadCrosswalk();a.start();clear(a);assert.equal(a.snapshot().level,1);
 const before=a.snapshot();a.finish();assert.equal(a.snapshot().autoNextTimer,before.autoNextTimer);
 assert.equal(a.snapshot().level,before.level);
});

test('records use this level only and flawless reflects this level deaths not total lives',()=>{
 const a=loadCrosswalk();a.start();a.move('up');clear(a);a.nodes.startButton.emit('click');
 a.setCars(lanes=>lanes.forEach(l=>l.cars=[]));a.setPlayer({col:4,row:1,x:300,y:90});a.move('up');
 assert.equal(a.snapshot().progress.levelScores[2],110);
 // A new replay can be flawless even when a previous level lost a life.
 const b=loadCrosswalk();b.start();b.setPlayer({row:9,x:72,y:570});b.update(.001);b.update(.7);clear(b);b.nodes.startButton.emit('click');
 b.setPlayer({row:1,x:300,y:90});b.move('up');assert.equal(b.snapshot().progress.flawless[2],true);
});



test('traffic clock and car motion agree at 20Hz and 120Hz',()=>{
 const a=loadCrosswalk(),b=loadCrosswalk();a.start();b.start();a.advance(2000,20);b.advance(2000,120);
 assert.ok(Math.abs(a.snapshot().worldTime-b.snapshot().worldTime)<.009);
 assert.ok(Math.abs(a.snapshot().lanes[0].cars[0].x-b.snapshot().lanes[0].cars[0].x)<1);
});

test('title and paused screens do not redraw idle frames',()=>{
 const a=loadCrosswalk(),paint=a.paints;a.advance(500);assert.equal(a.paints,paint);
 a.start();a.step(20);a.nodes.pauseButton.emit('click');a.step(20);const n=a.paints;a.advance(500);assert.equal(a.paints,n);
});

test('hidden or unfocused result freezes auto next and resumes without elapsed catchup',()=>{
 const a=loadCrosswalk();a.start();clear(a);a.document.hidden=true;a.document.emit('visibilitychange');a.advance(5000,60);assert.equal(a.snapshot().levelIndex,0);
 a.document.hidden=false;a.document.emit('visibilitychange');a.advance(1000,60);assert.equal(a.snapshot().levelIndex,0);assert.ok(a.snapshot().autoNextTimer>1.9);
 a.window.emit('blur');a.advance(5000);assert.equal(a.snapshot().levelIndex,0);
});

test('stepping onto an occupied traffic cell loses one life immediately',()=>{
 const a=loadCrosswalk();a.start();a.setPlayer({row:10,col:4,x:300,y:630});a.setCars(lanes=>lanes.find(l=>l.row===9).cars[0].x=300);a.move('up');
 assert.equal(a.snapshot().lives,2);assert.equal(a.snapshot().player.alive,false);a.update(.01);assert.equal(a.snapshot().lives,2);
});

test('moving-strip exposure clears when leaving the strip for a traffic row',()=>{
 const a=loadCrosswalk();a.start();a.load(11);a.setPlayer({row:8,col:8,x:566,y:510});a.update(.3);
 a.setPlayer({row:7});a.setCars(lanes=>lanes.forEach(l=>l.cars=[]));a.update(.01);assert.equal(a.snapshot().movingExposure,0);
});



test('canvas swipe belongs to the first primary pointer, not a second touch',()=>{
 const a=loadCrosswalk();a.start();a.nodes.game.emit('pointerdown',{pointerId:1});a.nodes.game.emit('pointerdown',{pointerId:2,isPrimary:false,clientX:140});
 a.nodes.game.emit('pointerup',{pointerId:2,isPrimary:false,clientY:150});assert.equal(a.snapshot().player.row,11);
 a.nodes.game.emit('pointerup',{pointerId:1,clientY:60});assert.equal(a.snapshot().player.row,10);
});

test('right click and stale gesture released after pause cannot move the duck',()=>{
 const a=loadCrosswalk();a.start();a.nodes.game.emit('pointerdown',{button:2});a.nodes.game.emit('pointerup',{button:2,clientY:60});assert.equal(a.snapshot().player.row,11);
 a.nodes.game.emit('pointerdown');a.nodes.pauseButton.emit('click');a.nodes.pauseButton.emit('click');a.nodes.game.emit('pointerup',{clientY:60});assert.equal(a.snapshot().player.row,11);
});

test('direction buttons accept native click activation and modified arrows do not move',()=>{
 const a=loadCrosswalk();a.start();a.dirs[0].emit('click');assert.equal(a.snapshot().player.row,10);
 a.update(.1);a.key('ArrowUp',{ctrlKey:true});assert.equal(a.snapshot().player.row,10);
 a.key('Enter',{target:{tagName:'BUTTON'}});assert.equal(a.snapshot().player.row,10);assert.equal(a.snapshot().score,10);
});



test('chapter one grants the same checkpoint safety as later chapters',()=>{
 const a=loadCrosswalk();a.start();a.load(3);a.setPlayer({row:9,x:72});a.update(.001);a.update(.7);clear(a);
 assert.equal(a.snapshot().checkpointIndex,4);assert.equal(a.snapshot().lives,3);
});

test('hiding while selector is open cannot silently resume traffic when selector closes',()=>{
 const a=loadCrosswalk();a.start();a.nodes.levelsButton.emit('click');a.document.hidden=true;a.document.emit('visibilitychange');
 a.document.hidden=false;a.document.emit('visibilitychange');a.nodes.closeLevels.emit('click');assert.equal(a.snapshot().state,'paused');assert.equal(a.nodes.overlayTitle.textContent,'PAUSED');
});

test('invalid level ids cannot break the runtime',()=>{
 const a=loadCrosswalk();a.start();a.load(NaN);assert.equal(a.snapshot().levelIndex,0);a.load('1');assert.equal(a.snapshot().levelIndex,0);
});



test('palette reads are cached during gameplay and invalidated on theme changes',()=>{
 let reads=0;const a=loadCrosswalk({onStyleRead:()=>reads++});a.start();reads=0;a.advance(500);assert.equal(reads,0);
 a.document.emit('themechange');a.step(20);assert.equal(reads,1);a.advance(200);assert.equal(reads,1);
});



test('selector focuses its exit, makes the game inert and returns focus when closed',()=>{
 const a=loadCrosswalk();a.nodes.levelsButton.focus();a.nodes.levelsButton.emit('click');
 assert.equal(a.document.activeElement,a.nodes.closeLevels);assert.equal(a.nodes.gamePage.inert,true);
 a.nodes.closeLevels.emit('click');assert.equal(a.nodes.gamePage.inert,false);assert.equal(a.document.activeElement,a.nodes.levelsButton);
});



test('finishing requires a living duck at home, not merely a running level',()=>{
 const a=loadCrosswalk();a.start();a.finish();assert.equal(a.snapshot().state,'playing');assert.equal(a.snapshot().progress.completed[0],false);
});

test('public observation includes detached player and progress for runtime QA',()=>{
 const a=loadCrosswalk();a.start();const s=a.window.CrosswalkGame.getSnapshot();assert.equal(s.player.row,11);s.player.row=0;s.progress.completed[0]=true;
 assert.equal(a.snapshot().player.row,11);assert.equal(a.snapshot().progress.completed[0],false);
});



test('a gesture begun before death cannot activate after respawn',()=>{
 const a=loadCrosswalk();a.start();a.nodes.game.emit('pointerdown');a.setPlayer({row:9,x:72});a.update(.001);a.update(.7);
 a.nodes.game.emit('pointerup',{clientY:50});assert.equal(a.snapshot().player.row,11);
});



test('sideways movement outside the moving strip cannot reset continuous danger exposure',()=>{
 const a=loadCrosswalk();a.start();a.load(11);a.setPlayer({row:8,col:6,x:(6.5)*600/9});a.update(.3);a.move('right');a.update(.2);
 assert.equal(a.snapshot().lives,2);assert.equal(a.snapshot().player.alive,false);
});

module.exports={clear};
