const test = require('node:test');
const assert = require('node:assert/strict');
const { loadMaze } = require('./helpers/maze-runtime');

test('a full connected-room route collects every fish before advancing', () => {
  const {createMaze,neighbors}=require('../maze/logic');const maze=createMaze(),g=loadMaze();g.start();g.patch({enemies:[]});
  const total=g.snapshot().dots.length;let steps=0;
  while(g.snapshot().level===1 && steps<1000){
    const s=g.snapshot(),fish=new Set(s.dots),q=[{...s.player,path:[]}],seen=new Set();let path;
    for(let i=0;i<q.length;i++) {const p=q[i],k=`${p.row},${p.col}`;if(seen.has(k))continue;seen.add(k);
      if(fish.has(k)){path=p.path;break;}
      for(const n of neighbors(maze,p)){const name=n.direction.x===1?'right':n.direction.x===-1?'left':n.direction.y===1?'down':'up';q.push({...n,path:[...p.path,name]});}
    }
    assert.ok(path?.length);for(const name of path){g.key({right:'ArrowRight',left:'ArrowLeft',up:'ArrowUp',down:'ArrowDown'}[name]);g.step();steps++;}
  }
  const s=g.snapshot();assert.equal(s.level,2);assert.equal(s.score,total*10);assert.equal(s.lives,3);
  assert.equal(s.dots.length,total);assert.equal(s.enemies.length,2);
});


test('a blocked queued turn waits for the opening without stopping forward movement', () => {
  const g=loadMaze();g.start();g.patch({enemies:[]});g.key('ArrowRight');g.step();g.key('ArrowDown');
  for(let i=0;i<3;i++)g.step();assert.deepEqual(g.snapshot().player,{row:1,col:5});g.step();assert.deepEqual(g.snapshot().player,{row:2,col:5});
});
test('two contacting ghosts cost one life and restart keeps the best', () => {
  const g=loadMaze();g.start();g.key('ArrowRight');g.step();g.patch({enemies:[{row:1,col:3},{row:1,col:3}]});g.step();
  assert.equal(g.snapshot().lives,2);assert.deepEqual(g.snapshot().queued,{x:0,y:0});
  g.nodes.new.onclick();assert.equal(g.snapshot().score,0);assert.equal(g.snapshot().lives,3);assert.ok(g.snapshot().high>=10);
});


test('a short board tap chooses direction relative to the cat at any CSS scale', () => {
  const g=loadMaze();g.start();g.patch({enemies:[]});const c=g.nodes.game;
  c.emit('pointerdown',{clientX:80,clientY:48});c.emit('pointerup',{clientX:80,clientY:48});g.step();assert.equal(g.snapshot().score,10);
  g.patch({player:{row:3,col:6},direction:{x:0,y:0},queued:{x:0,y:0}});
  c.getBoundingClientRect=()=>({left:40,top:70,width:240,height:240});
  c.emit('pointerdown',{clientX:160,clientY:126});c.emit('pointerup',{clientX:160,clientY:126});g.step();
  assert.deepEqual(g.snapshot().player,{row:3,col:7});
});


test('remaining fish count follows pickup and room reset', () => {
  const g=loadMaze();g.start();const total=g.snapshot().dots.length;assert.equal(Number(g.nodes.remaining.textContent),total);
  g.key('ArrowRight');g.step();assert.equal(Number(g.nodes.remaining.textContent),total-1);
  g.patch({player:{row:3,col:2},dots:['3,3'],enemies:[]});g.key('ArrowRight');g.step();assert.equal(Number(g.nodes.remaining.textContent),total);
});


test('phone markup exposes restart, remaining fish and a keyboard-focusable board', () => {
  const html=require('node:fs').readFileSync('maze/index.html','utf8');
  assert.match(html,/<div class="top-actions">[\s\S]*id="new"/);
  assert.match(html,/id="remaining"/);assert.match(html,/<canvas[^>]*tabindex="0"/);assert.match(html,/class="utility-dock"/);
});


test('theme changes repaint the board while paused without restarting the loop', () => {
  const g=loadMaze();g.start();g.nodes.pause.onclick();g.document.emit('themechange');assert.equal(g.pending.size,0);
  assert.equal(g.snapshot().state,'pause');assert.ok(g.document.listeners.themechange?.length);
});


test('a cleared room resets positions before the next hunt', () => {
  const g=loadMaze();g.start();g.patch({player:{row:3,col:2},enemies:[],dots:['3,3']});g.key('ArrowRight');g.step();
  const s=g.snapshot();assert.equal(s.level,2);assert.equal(s.score,10);assert.deepEqual(s.player,{row:1,col:1});
  assert.deepEqual(s.direction,{x:0,y:0});assert.equal(s.enemies.length,2);assert.ok(s.dots.length>100);
});


test('the owning swipe survives other fingers and tolerates capture rejection', () => {
  const g=loadMaze({captureThrows:true});g.start();const c=g.nodes.game;
  assert.doesNotThrow(()=>c.emit('pointerdown',{pointerId:7,clientX:200,clientY:200}));
  c.emit('pointerdown',{pointerId:8,isPrimary:false,clientX:50,clientY:50});
  c.emit('pointerup',{pointerId:8,clientX:50,clientY:0});assert.equal(g.snapshot().swipe.id,7);
  c.emit('pointercancel',{pointerId:8});assert.equal(g.snapshot().swipe.id,7);
  c.emit('pointerup',{pointerId:7,clientX:260,clientY:200});assert.deepEqual(g.snapshot().queued,{x:1,y:0});assert.equal(g.snapshot().swipe,null);
  c.emit('pointerdown',{pointerId:9,clientX:200,clientY:200});g.nodes.pause.onclick();assert.equal(g.snapshot().swipe,null);
});


test('keyboard respects uppercase movement, repeats, modifiers and editable fields', () => {
  const g=loadMaze();g.key('D');assert.equal(g.snapshot().state,'play');g.step();assert.equal(g.snapshot().score,10);
  for(const extra of [{ctrlKey:true},{metaKey:true},{altKey:true},{target:{tagName:'INPUT'}},{target:{isContentEditable:true}}]) {
    g.key('ArrowDown',extra);assert.deepEqual(g.snapshot().queued,{x:1,y:0});
  }
  g.key('p',{repeat:true});assert.equal(g.snapshot().state,'play');g.key('p');assert.equal(g.snapshot().state,'pause');
  g.document.hidden=true;g.key('ArrowRight');assert.equal(g.snapshot().state,'pause');
});


test('the first direction starts or resumes without discarding that move', () => {
  for(const path of ['key','touch','keyboard-button']) {const g=loadMaze();
    if(path==='key') g.key('ArrowRight');else g.buttons.right.emit(path==='touch'?'pointerdown':'click',{detail:0});
    assert.equal(g.snapshot().state,'play',path);g.step();assert.equal(g.nodes.score.textContent,'000010',path);
    g.nodes.pause.onclick();if(path==='key')g.key('ArrowRight');else g.buttons.right.emit(path==='touch'?'pointerdown':'click',{detail:0});
    assert.equal(g.snapshot().state,'play');assert.equal(g.snapshot().score,10);g.step();assert.equal(g.snapshot().score,20);
  }
});


test('backgrounding automatically pauses and returning does not resume', () => {
  for(const action of ['blur','pagehide','hidden']) {const g=loadMaze();g.start();g.frame(100);
    if(action==='hidden'){g.document.hidden=true;g.document.emit('visibilitychange');}else g.window.emit(action);
    assert.equal(g.snapshot().state,'pause',action);assert.equal(g.pending.size,0);assert.equal(g.snapshot().timer,0);
    g.document.hidden=false;g.document.emit('visibilitychange');assert.equal(g.snapshot().state,'pause');}
});


test('title, pause and game-over stop animation scheduling', () => {
  const g=loadMaze();assert.equal(g.pending.size,0);g.start();assert.equal(g.pending.size,1);
  g.nodes.pause.onclick();assert.equal(g.pending.size,0);g.nodes.pause.onclick();assert.equal(g.pending.size,1);
  g.patch({lives:1,player:{row:1,col:2},enemies:[{row:1,col:3}]});g.key('ArrowRight');g.step();
  assert.equal(g.snapshot().state,'over');assert.equal(g.pending.size,0);
});


test('fixed-step movement preserves elapsed time at 30, 60 and 120 Hz', () => {
  for(const hz of [30,60,120]) {const g=loadMaze();g.start();g.patch({enemies:[]});g.key('ArrowRight');g.run(1500,hz);
    assert.equal(g.snapshot().player.col,9,`${hz} Hz`);assert.equal(g.snapshot().score,80);}
});


test('a cat and ghost swapping cells lose exactly one life', () => {
  const g=loadMaze();g.start();g.patch({player:{row:1,col:2},enemies:[{row:1,col:3,previous:{row:1,col:4}}]});g.key('ArrowRight');g.step();
  assert.equal(g.snapshot().lives,2);assert.deepEqual(g.snapshot().player,{row:1,col:1});
});


test('corrupt and unbounded best values fall back to zero', () => {
  for(const value of ['-10','Infinity','1.5','9007199254740992','NaN','not a score']) {
    const g=loadMaze({storage:new Map([['maze-high',value]])});assert.equal(g.nodes.high.textContent,'000000',value);
  }
});


test('storage denial does not prevent starting or picking up a fish', () => {
  assert.doesNotThrow(() => { const g=loadMaze({storageThrows:true});g.start();g.key('ArrowRight');g.step();assert.equal(g.nodes.score.textContent,'000010'); });
});


test('new high score survives reload immediately after a pickup', () => {
  const g = loadMaze(); g.start(); g.key('ArrowRight'); g.step();
  assert.equal(g.nodes.high.textContent, '000010');
  assert.equal(g.storage.get('maze-high'), '10');
  assert.equal(loadMaze({ storage: g.storage }).nodes.high.textContent, '000010');
});
