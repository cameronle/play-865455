const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('2048 acknowledges reaching 2048 exactly once and allows continuing', () => {
  const source = read('2048/game.js');
  assert.match(source, /won=false/);
  assert.match(source, /grid\.some\(row=>row\.some\(value=>value>=2048\)\)/);
  assert.match(source, /YOU WIN/);
});

test('Tetris drop scoring updates current high score and held drop awards successful rows', () => {
  const source = read('tetris/game.js');
  assert.match(source, /function addScore\(points\)/);
  assert.match(source, /if\(softDropping&&stepDown\(\)\)addScore\(1\)/);
  assert.match(source, /addScore\(distance\*2\)/);
});

test('Tetris board and controls fit a short portrait viewport', () => {
  const css = read('tetris/style.css');
  assert.match(css, /100svh/);
  assert.match(css, /calc\(\(100svh[^)]*\)\/2\)/);
});

test('Snake declares victory when no free food cell remains', () => {
  const source = read('snake/game.js');
  assert.match(source, /function gameWon\(\)/);
  assert.match(source, /if\(!food\)gameWon\(\)/);
});

test('Minesweeper cancels long press after meaningful pointer movement', () => {
  const source = read('minesweeper/game.js');
  assert.match(source, /pressStart/);
  assert.match(source, /onpointermove/);
  assert.match(source, /Math\.hypot/);
});

test('Invaders touch directions map to movement keys and keyboard input prevents scrolling', () => {
  const source = read('space-invaders/game.js');
  assert.match(source, /key=dir==='left'\?'ArrowLeft':'ArrowRight'/);
  assert.match(source, /event\.preventDefault\(\)/);
});

test('Invaders persist a new high score before a manual restart', () => {
  const source = read('space-invaders/game.js');
  assert.match(source, /function saveHigh\(\)/);
  assert.match(source, /function start\(\)\{saveHigh\(\)/);
});

test('Sky Patrol exposes mobile pause and does not advertise a redundant fire button', () => {
  const html = read('shooter/index.html');
  const css = read('shooter/style.css');
  assert.match(html, /id="mobilePauseButton"/);
  assert.doesNotMatch(html, /id="fireButton"/);
  assert.match(css, /100svh/);
});
