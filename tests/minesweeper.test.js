const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('first revealed cell is protected from mines', () => {
  const source=fs.readFileSync('minesweeper/game.js','utf8');
  assert.match(source,/function placeMines\(safeIndex\)/);
  assert.match(source,/if\(!started\)start\(i\)/);
});

test('win requires every non-mine cell to be open, not merely flagged', () => {
  const source=fs.readFileSync('minesweeper/game.js','utf8');
  const css=fs.readFileSync('minesweeper/style.css','utf8');
  assert.match(source,/cells\.every\(cell=>cell\.mine\|\|cell\.open\)/);
  assert.match(source,/event\.preventDefault\(\);if\(event\.pointerType==='touch'/);
  assert.match(source,/selectstart/);
  assert.match(source,/contextmenu/);
  assert.match(css,/-webkit-user-select:none/);
  assert.match(css,/-webkit-touch-callout:none/);
  assert.doesNotMatch(source,/x\.open\|\|x\.mine\|\|x\.flag/);
});

test('mobile layout stacks the board and status panel', () => {
  const css=fs.readFileSync('minesweeper/style.css','utf8');
  assert.match(css,/@media\(max-width:520px\)[\s\S]*\.layout\{flex-direction:column/);
  assert.match(css,/@media\(max-width:520px\)[\s\S]*\.gamebox\{[^}]*width:100%/);
});
