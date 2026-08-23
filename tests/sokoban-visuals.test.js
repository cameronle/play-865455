const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = () => fs.readFileSync('sokoban/game.js', 'utf8');

test('Sokoban has distinct drawing primitives for goals, crates, walls and player', () => {
  const js = source();
  for (const name of ['drawWall', 'drawGoal', 'drawCrate', 'drawPlayer']) {
    assert.match(js, new RegExp(`function ${name}\\(`));
  }
  assert.match(js, /drawCrate\([^;]+onGoal/);
});

test('Sokoban crates use clean flat design and completed crates expose a check mark', () => {
  const js = source();
  assert.match(js, /function drawCrate\(/);
  assert.match(js, /if\s*\(onGoal\)[\s\S]*ctx\.lineTo/);
});

test('Sokoban goals use the same flat rounded-square language as the other tokens',()=>{
  const js=source();
  assert.match(js,/function drawGoal\(/);
  assert.match(js,/ctx\.moveTo\(x \+ inset \+ radius, y \+ inset\)/);
  assert.match(js,/ctx\.fillRect\(x \+ s \* 0\.47, y \+ s \* 0\.47/);
});

test('Sokoban player tracks the last movement direction with clean vector avatar', () => {
  const js = source();
  assert.match(js, /let playerDirection = 'down'/);
  assert.match(js, /playerDirection = directionName\(dx, dy\)/);
  assert.match(js, /function drawPlayer\(/);
  assert.match(js, /playerDirection === 'left'/);
  assert.match(js, /playerDirection === 'right'/);
});

test('Sokoban light board uses a subdued neutral center instead of a bright white playfield',()=>{
  const css=fs.readFileSync('sokoban/style.css','utf8');
  assert.match(css,/--board:#e7e1d7/);
  assert.match(css,/--floor:#ebe6de/);
  assert.match(css,/--floor-grid:#ded7cd/);
});
test('Sokoban visual refresh does not change the twenty-level pack', () => {
  const levels = fs.readFileSync('sokoban/levels.js', 'utf8'), html = fs.readFileSync('sokoban/index.html', 'utf8');
  assert.match(html, /01 \/ 20/);
  assert.match(levels, /root\.SokobanLevels/);
});
