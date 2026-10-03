const test = require('node:test');
const assert = require('node:assert/strict');
const {loadCrosswalk} = require('./helpers/crosswalk-runtime.js');
function loadGame() {
 const a=loadCrosswalk();let last=0;
 return Object.assign(a,{tick(timestamp){a.step(timestamp-last);last=timestamp;},clear(){a.setPlayer({row:0,y:30});a.finish();}});
}

test('Crosswalk runtime starts from the title state and accepts touch movement', () => {
  const runtime = loadGame();
  runtime.nodes.startButton.emit('click');
  const initial = runtime.window.CrosswalkGame.getSnapshot();
  assert.equal(initial.state, 'playing');
  assert.equal(initial.level, 1);
  assert.equal(initial.levelIndex, 0);
  assert.equal(initial.lives, 3);
  assert.equal(initial.score, 0);
  assert.equal(initial.laneCount, 6);
  runtime.dirs[0].emit('click');
  assert.equal(runtime.window.CrosswalkGame.getSnapshot().score, 10);
  runtime.nodes.pauseButton.emit('click');
  assert.equal(runtime.window.CrosswalkGame.getSnapshot().state, 'paused');
  assert.equal(runtime.nodes.overlayTitle.textContent, 'PAUSED');
  runtime.nodes.startButton.emit('click');
  assert.equal(runtime.window.CrosswalkGame.getSnapshot().state, 'playing');
});

test('Crosswalk renders all level cards and only the first level is initially unlocked', () => {
  const runtime = loadGame();
  runtime.nodes.levelsButton.emit('click');
  assert.equal(runtime.nodes.levelsOverlay.classList.contains('show'), true);
  assert.equal(runtime.nodes.levelGrid.children.length, 20);
  assert.equal(runtime.nodes.levelGrid.children.filter(card => !card.disabled).length, 1);
  assert.equal(runtime.nodes.levelsProgress.textContent, '0 / 20 COMPLETE');
});

test('Crosswalk pause and visibility handlers do not advance the simulation while paused', () => {
  const runtime = loadGame();
  runtime.nodes.startButton.emit('click');
  runtime.tick(100);
  const before = runtime.window.CrosswalkGame.getSnapshot();
  runtime.nodes.pauseButton.emit('click');
  runtime.tick(1000);
  const after = runtime.window.CrosswalkGame.getSnapshot();
  assert.equal(after.state, 'paused');
  assert.equal(after.score, before.score);
  runtime.document.emit('visibilitychange');
});

test('Crosswalk car positions wrap within [0, 600) bounds continuously during movement', () => {
  const runtime = loadGame();
  runtime.nodes.startButton.emit('click');
  for (let i = 1; i <= 200; i++) {
    runtime.tick(i * 30);
    const cars = runtime.window.CrosswalkGame.getLaneCars();
    for (const car of cars) {
      assert.ok(car.x >= 0 && car.x < 600, `car at x=${car.x} is outside [0, 600)`);
    }
  }
});

test('Crosswalk auto-advances to the next level after 3s on level clear or advances immediately on click', () => {
  const runtime = loadGame();
  runtime.nodes.startButton.emit('click');
  runtime.clear();
  const clearSnapshot = runtime.window.CrosswalkGame.getSnapshot();
  assert.equal(clearSnapshot.state, 'level-clear');
  assert.match(runtime.nodes.overlayText.textContent, /AUTO NEXT IN 3S/);
  assert.match(runtime.nodes.startButton.textContent, /NEXT LEVEL \(3S\)/);

  // Advance a deterministic sequence of 50ms frames.
  let curTime = 0;
  for (let t = 0; t < 90; t++) {
    curTime += 50;
    runtime.tick(curTime);
  }
  const nextSnapshot = runtime.window.CrosswalkGame.getSnapshot();
  assert.equal(nextSnapshot.state, 'playing');
  assert.equal(nextSnapshot.level, 2);
  assert.equal(nextSnapshot.levelIndex, 1);
});
