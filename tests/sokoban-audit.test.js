const test = require('node:test');

test('level selector marks completion immediately without a page reload', () => {
  const a=loadSokoban({levels:[['#####','#@$.#','#####'],['#####','#@$.#','#####']]});
  assert.equal(a.nodes.levelSelect.options[0].textContent,'LEVEL 01');
  a.start();a.move(1,0);
  assert.equal(a.nodes.levelSelect.options[0].textContent,'LEVEL 01 ✓');
});


test('completion countdown freezes while hidden and resumes in foreground', () => {
  const a = loadSokoban({levels:[['#####','#@$.#','#####'],['#####','#@$.#','#####']]});
  a.start(); a.move(1,0);
  a.document.hidden=true; for(let i=0;i<8;i++)a.tick();
  assert.equal(a.snapshot().levelIndex,0);
  a.document.hidden=false; for(let i=0;i<5;i++)a.tick();
  assert.equal(a.snapshot().levelIndex,1);
  assert.equal(a.timers.size,0);
});

test('cancelled countdown cannot advance a reset puzzle even if its old callback runs', () => {
  const a = loadSokoban({levels:[['#####','#@$.#','#####'],['#####','#@$.#','#####']]});
  a.start(); a.move(1,0); const old = [...a.timers.values()][0];
  a.nodes.resetButton.emit('click'); for(let i=0;i<5;i++)old();
  assert.equal(a.snapshot().levelIndex,0);
  assert.equal(a.snapshot().state.moves,0);
});

test('undo restores counters, crate, facing and cancels completion timer', () => {
  const a = loadSokoban({levels:[['#####','#@$.#','#####'],['#####','#@$.#','#####']]});
  a.start(); a.move(1,0); a.undo();
  const s=a.snapshot();assert.equal(s.state.moves,0);assert.equal(s.state.pushes,0);
  assert.equal(s.state.boxes['2,1'],true); assert.equal(s.playerDirection,'down');
  assert.equal(s.gamePhase,'playing'); assert.equal(a.timers.size,0);
  assert.equal(a.store.get('sokobanBest0'),'1');
});

const assert = require('node:assert/strict');

test('a saved move path resumes the puzzle and retains full undo history', () => {
  const a=loadSokoban();a.start();a.move(1,0);a.move(1,0);
  const before=a.snapshot(); const b=loadSokoban({saved:Object.fromEntries(a.store)});
  assert.deepEqual(b.snapshot().state,before.state);assert.equal(b.snapshot().history.length,2);
  assert.match(b.nodes.startButton.textContent,/RESUME/);
  b.start();b.undo(); assert.equal(b.snapshot().state.moves,1);
  const c=loadSokoban({saved:Object.fromEntries(b.store)});assert.equal(c.snapshot().state.moves,1);
});

test('invalid saved paths cannot inject off-board positions or completed state', () => {
  for(const saved of ['{',JSON.stringify({version:1,level:0,path:'LLLLLLLL'}),JSON.stringify({version:1,level:0,path:'X'}),JSON.stringify({version:1,level:0.5,path:'R'})]){
    const a=loadSokoban({saved:{'sokoban-save-v1':saved}});assert.equal(a.snapshot().state.moves,0);
  }
});

const {loadSokoban} = require('./helpers/sokoban-runtime.js');

test('level navigation stops at endpoints and select can choose any original puzzle', () => {
  const a=loadSokoban(); assert.equal(a.nodes.previousButton.disabled,true);
  a.nodes.previousButton.emit('click');assert.equal(a.snapshot().levelIndex,0);
  a.nodes.levelSelect.value='19';a.nodes.levelSelect.emit('change');
  assert.equal(a.snapshot().levelIndex,19);assert.equal(a.nodes.nextButton.disabled,true);
  a.nodes.nextButton.emit('click');assert.equal(a.snapshot().levelIndex,19);
});

test('completed puzzle can be reviewed without auto advance or further moves', () => {
  const a=loadSokoban({levels:[['#####','#@$.#','#####'],['#####','#@$.#','#####']]});
  a.start();assert.equal(a.nodes.undoButton.disabled,true);a.move(1,0);
  a.nodes.reviewButton.emit('click');assert.equal(a.timers.size,0);
  assert.equal(a.nodes.overlay.classList.contains('hide'),true);
  a.move(-1,0);assert.equal(a.snapshot().state.moves,1);
  a.undo();assert.equal(a.snapshot().state.moves,0);
});


test('canvas swipe belongs only to its original primary pointer', () => {
  const a = loadSokoban(); a.start();
  a.nodes.game.emit('pointerdown',{pointerId:2,clientX:100});
  a.nodes.game.emit('pointerup',{pointerId:3,isPrimary:false,clientX:140});
  assert.equal(a.snapshot().state.moves,0);
  a.nodes.game.emit('pointerup',{pointerId:2,clientX:140});
  assert.equal(a.snapshot().state.moves,1);
});

test('right clicks and capture failure cannot break swipe controls', () => {
  const a = loadSokoban({captureThrows:true}); a.start();
  a.nodes.game.emit('pointerdown',{button:2});
  a.nodes.game.emit('pointerup',{button:2,clientX:140});
  assert.equal(a.snapshot().state.moves,0);
  a.nodes.game.emit('pointerdown');
  a.nodes.game.emit('pointerup',{clientX:140});
  assert.equal(a.snapshot().state.moves,1);
});

test('direction buttons support native click activation and ignore secondary clicks', () => {
  const a = loadSokoban(); a.start();
  a.dpad[3].emit('click',{button:2}); assert.equal(a.snapshot().state.moves,0);
  a.dpad[3].emit('click'); assert.equal(a.snapshot().state.moves,1);
});

test('modified arrows and typing in a select do not move the bear', () => {
  const a = loadSokoban(); a.start();
  a.window.emit('keydown',{code:'ArrowRight',ctrlKey:true});
  a.window.emit('keydown',{code:'ArrowRight',target:a.nodes.levelSelect});
  assert.equal(a.snapshot().state.moves,0);
});


test('blocked browser storage still starts and moves a puzzle', () => {
  const app = loadSokoban({getThrows:true,setThrows:true});
  app.start(); app.move(1,0);
  assert.equal(app.snapshot().state.moves,1);
});

test('corrupt progress and best records are ignored rather than crashing', () => {
  for (const value of ['NaN','Infinity','-1','0.5','999999','{}']) {
    const app = loadSokoban({saved:{sokobanUnlocked:value,sokobanBest0:'NaN'}});
    assert.equal(app.snapshot().levelIndex,0, value);
    assert.equal(app.nodes.best.textContent,'---');
  }
});
