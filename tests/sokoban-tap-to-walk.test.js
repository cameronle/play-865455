const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../sokoban/rules.js');
const {loadSokoban} = require('./helpers/sokoban-runtime.js');
const fs = require('node:fs');
const codes = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};

test('the mobile status advertises tapping and changed runtime assets have fresh version keys', () => {
  const app=loadSokoban();app.start();assert.match(app.nodes.statusText.textContent,/TAP TO WALK/);
  const html=fs.readFileSync('sokoban/index.html','utf8');
  for(const asset of ['rules.js','game.js'])assert.ok(html.includes(`${asset}?v=tap-walk-1`));
  assert.match(html,/TAP A TILE/);
});

test('tap walking finds a shortest legal detour without mutating the puzzle', () => {
  const state = R.parseLevel(['########','#@ #   #','#  #   #','#      #','########']);
  const before = JSON.stringify(state);
  assert.equal(typeof R.findWalkPath, 'function', 'a walk-only route planner is required');
  const path = R.findWalkPath(state, 5, 1);
  assert.equal(path.length, 8);
  assert.equal(JSON.stringify(state), before);
  for (const code of path) assert.equal(R.move(state, ...codes[code]), true);
  assert.deepEqual(state.player, {x:5,y:1});
  assert.equal(state.pushes, 0);
});

function tapTile(app, x, y, props = {}) {
  const state = app.snapshot().state, rect = app.nodes.game.getBoundingClientRect();
  const size = Math.floor(Math.min(560 / state.width, 560 / state.height));
  const ox = Math.floor((560 - state.width * size) / 2), oy = Math.floor((560 - state.height * size) / 2);
  const point = {clientX:rect.left + (ox + (x + .5) * size) * rect.width / 560,clientY:rect.top + (oy + (y + .5) * size) * rect.height / 560,...props};
  app.nodes.game.emit('pointerdown', point);
  app.nodes.game.emit('pointerup', point);
}

test('a tap on the scaled canvas walks one step at a time and saves each actual move', () => {
  const app = loadSokoban({levels:[['########','#@     #','#      #','#  $ . #','########']]});
  app.nodes.game.getBoundingClientRect = () => ({left:30,top:70,width:280,height:280});
  app.start(); tapTile(app, 5, 1);
  assert.deepEqual(app.snapshot().state.player, {x:2,y:1});
  assert.equal(app.snapshot().state.moves, 1);
  assert.equal(app.timers.size, 1);
  for (let i=0;i<3;i++) app.tick();
  assert.deepEqual(app.snapshot().state.player, {x:5,y:1});
  assert.equal(app.snapshot().state.moves, 4);
  assert.equal(app.snapshot().state.pushes, 0);
  assert.equal(app.timers.size, 0);
  assert.deepEqual(JSON.parse(app.store.get('sokoban-save-v1')), {version:1,level:0,path:'RRRR'});
});

const openPuzzle = ['########','#@     #','#      #','#  $ . #','########'];
for (const action of ['undo','reset','level','blur/focus','hidden/visible','resize']) {
  test(`${action} cancels automatic walking, including an already queued callback`, () => {
    const app = loadSokoban({levels:[openPuzzle,openPuzzle]}); app.start(); tapTile(app, 6, 1);
    const old = [...app.timers.values()][0]; assert.equal(typeof old, 'function');
    if (action==='undo') app.undo();
    if (action==='reset') app.nodes.resetButton.emit('click');
    if (action==='level') {app.nodes.levelSelect.value='1';app.nodes.levelSelect.emit('change');}
    if (action==='blur/focus') {app.window.emit('blur');app.window.emit('focus');}
    if (action==='hidden/visible') {app.document.hidden=true;app.document.emit('visibilitychange');app.document.hidden=false;app.document.emit('visibilitychange');}
    if (action==='resize') app.window.emit('resize');
    const before = app.snapshot(); old(); for(let i=0;i<8;i++) app.tick();
    assert.deepEqual(app.snapshot(), before);
    assert.equal(app.timers.size, 0);
  });
}

test('a new destination replaces the previous route and manual input cancels it', () => {
  const app = loadSokoban({levels:[openPuzzle]});app.start();tapTile(app,6,1);
  const old = [...app.timers.values()][0];tapTile(app,2,2);old();app.tick();
  assert.deepEqual(app.snapshot().state.player,{x:2,y:2});assert.equal(app.snapshot().state.moves,2);
  tapTile(app,6,2);app.window.emit('keydown',{code:'ArrowDown'});
  const before=app.snapshot();for(let i=0;i<8;i++)app.tick();assert.deepEqual(app.snapshot(),before);
  assert.equal(app.timers.size,0);
});

test('walk planning rejects crates, blocked floors, wall targets, exterior and ragged padding', () => {
  const state=R.parseLevel(['########','#@ $  .#','########','  ']);
  for(const [x,y] of [[3,1],[4,1],[0,0],[-1,1],[8,1],[1,4],[3,3],[1.5,1],[NaN,1],[1,'1']])assert.equal(R.findWalkPath(state,x,y),null);
  assert.equal(R.findWalkPath(state,1,1),'');
});

test('tap pushing is exactly one adjacent push and does not choose a side for a distant crate', () => {
  const app=loadSokoban({levels:[['########','#@ $ . #','#      #','########']]});app.start();
  tapTile(app,3,1);assert.equal(app.snapshot().state.moves,0);assert.equal(app.timers.size,0);
  tapTile(app,2,1);tapTile(app,3,1);
  assert.equal(app.snapshot().state.moves,2);assert.equal(app.snapshot().state.pushes,1);
  assert.deepEqual(app.snapshot().state.player,{x:3,y:1});assert.equal(app.snapshot().state.boxes['4,1'],true);
  const saved=app.snapshot();tapTile(app,0,0);tapTile(app,3,1);assert.deepEqual(app.snapshot(),saved);
  tapTile(app,4,1);assert.equal(app.snapshot().gamePhase,'complete');assert.equal(app.store.get('sokobanBest0'),'3');
  const won=app.snapshot();tapTile(app,3,2);assert.deepEqual(app.snapshot(),won);
});

test('cancelled and secondary pointers never produce a tap movement', () => {
  const app=loadSokoban({levels:[openPuzzle]});app.start();
  tapTile(app,2,1,{button:2});tapTile(app,2,1,{isPrimary:false});assert.equal(app.snapshot().state.moves,0);
  app.nodes.game.emit('pointerdown',{clientX:175,clientY:210});
  app.nodes.game.emit('pointercancel');app.nodes.game.emit('pointerup',{clientX:175,clientY:210});
  assert.equal(app.snapshot().state.moves,0);
  app.nodes.game.emit('pointerdown',{pointerId:2,clientX:175,clientY:210});
  app.nodes.game.emit('pointerup',{pointerId:3,isPrimary:false,clientX:175,clientY:210});assert.equal(app.snapshot().state.moves,0);
  app.nodes.game.emit('pointerup',{pointerId:2,clientX:175,clientY:210});assert.equal(app.snapshot().state.moves,1);
});

test('the automatic path restores real undo history and survives blocked storage without teleportation', () => {
  for(const options of [{},{getThrows:true,setThrows:true}]){
    const app=loadSokoban({...options,levels:[openPuzzle]});app.start();tapTile(app,5,1);for(let i=0;i<3;i++)app.tick();
    assert.equal(app.snapshot().state.moves,4);assert.equal(app.snapshot().history.length,4);
    app.undo();assert.deepEqual(app.snapshot().state.player,{x:4,y:1});
    if(!options.setThrows){const restored=loadSokoban({levels:[openPuzzle],saved:Object.fromEntries(app.store)});assert.deepEqual(restored.snapshot().state,app.snapshot().state);assert.equal(restored.snapshot().history.length,3);}
  }
});
