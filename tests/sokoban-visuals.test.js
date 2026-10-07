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

test('Sokoban goals retain a quiet floor target distinct from crates',()=>{
  const js=source();
  assert.match(js,/function drawGoal\(/);
  assert.match(js,/ctx\.roundRect\(x \+ inset, y \+ inset, size, size/);
  assert.match(js,/ctx\.setLineDash\(covered/);
  assert.match(js,/if \(!covered\)/);
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
  const root=css.match(/:root\{([^}]+)\}/)[1];
  for (const role of ['board','floor','floor-grid']) {
    const value=root.match(new RegExp(`--${role}:#([a-f0-9]{6})`));
    assert.ok(value, `${role} needs a valid neutral surface color`);
    const channels=value[1].match(/../g).map(hex=>parseInt(hex,16));
    assert.ok(Math.max(...channels)-Math.min(...channels)<20, `${role} should remain subdued`);
    assert.ok(Math.max(...channels)<250, `${role} must not become a bright white tile`);
  }
});
test('Sokoban completes with a five-second next-level countdown and safe timer cancellation',()=>{
  const js=source();
  assert.match(js,/const NEXT_LEVEL_SECONDS = 5/);
  assert.match(js,/function startNextLevelCountdown\(/);
  assert.match(js,/NEXT LEVEL IN \$\{seconds\}S/);
  assert.match(js,/function cancelNextLevelCountdown\(/);
  assert.match(js,/SKIP 5S/);
  assert.match(js,/gamePhase === 'complete'/);
});

test('Sokoban visual refresh does not change the twenty-level pack', () => {
  const levels = fs.readFileSync('sokoban/levels.js', 'utf8'), html = fs.readFileSync('sokoban/index.html', 'utf8');
  assert.match(html, /01 \/ 20/);
  assert.match(html, /BEAR &amp; BOXES/);
  assert.match(levels, /root\.SokobanLevels/);
});
