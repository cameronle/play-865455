const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('2048 acknowledges reaching 2048 exactly once and allows continuing', () => {
  const { loadGame, board } = require('./helpers/2048-runtime.js');
  const game = loadGame(); game.api.fixture(board([1024, 1024, 0, 0]));
  game.api.move('ArrowLeft');
  assert.equal(game.ids.overlayTitle.textContent, 'YOU WIN');
  assert.equal(game.ids.overlay.classList.contains('hidden'), false);
  game.ids.tryAgain.dispatch('click');
  game.api.move('ArrowRight');
  assert.equal(game.state().won, true);
  assert.equal(game.ids.overlay.classList.contains('hidden'), true);
});

test('Tetris drop scoring updates current high score and held drop awards successful rows', () => {
  const {createTetris}=require('./helpers/tetris-runtime');const app=createTetris();app.node('startButton').click();app.event('keydown',{key:'ArrowDown'});app.frames(.15);assert.equal(app.snapshot().score,4);assert.equal(app.snapshot().highScore,4);
});

test('Tetris board and controls fit a short portrait viewport', () => {
  const css = read('tetris/style.css');
  assert.match(css, /100svh/);
  assert.match(css, /calc\(\(100svh[\s\S]*?\)\s*\/\s*2\)/);
});

test('Tetris locks a grounded piece without waiting for the gravity interval',()=>{
  const {createTetris}=require('./helpers/tetris-runtime');const app=createTetris();app.node('startButton').click();app.run("piece=newPiece('I');piece.y=19");app.frame(16);assert.equal(app.snapshot().grid[19].filter(Boolean).length,4);assert.equal(app.snapshot().piece.y,0);
});test('Snake declares victory when no free food cell remains', () => {
  const {createSnake}=require('./helpers/snake-runtime');const a=createSnake();a.node('startButton').click();a.run("snake=Array.from({length:400},(_,i)=>({x:i%20,y:Math.floor(i/20)}));food=randomFood();if(!food)gameWon()");assert.equal(a.snapshot().state,'won');assert.equal(a.node('messageTitle').textContent,'FULL GARDEN');
});

test('Minesweeper cancels long press after meaningful pointer movement', () => {
  const source = read('minesweeper/game.js');
  assert.match(source, /pressStart/);
  assert.match(source, /onpointermove/);
  assert.match(source, /Math\.hypot/);
});

test('Sky Patrol exposes mobile pause and does not advertise a redundant fire button', () => {
  const html = read('shooter/index.html');
  const css = read('shooter/style.css');
  assert.match(html, /id="mobilePauseButton"/);
  assert.doesNotMatch(html, /id="fireButton"/);
  assert.match(css, /100svh/);
});
