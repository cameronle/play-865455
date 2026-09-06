const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = file => fs.readFileSync(file, 'utf8');

test('Melon Lab has a self-contained mobile fruit-synthesis entrypoint', () => {
  const html = read('melon-lab/index.html');
  const css = read('melon-lab/style.css');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  for (const id of ['game', 'overlay', 'startButton', 'pauseButton', 'stirButton', 'mobileStirButton', 'dropButton', 'modeButton', 'score', 'best', 'energy', 'fruitCount', 'nextFruit', 'route']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /MELON LAB/);
  assert.match(html, /SEMI-FLUID/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /user-select:\s*none/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|unpkg\.com|jsdelivr\.net/);
});

test('Melon Lab has multiple fruit tiers, danger line, collisions, merges, and stir energy', () => {
  const js = read('melon-lab/game.js');
  for (const marker of ['const FRUITS', 'DANGER_Y', 'function mergeFruits', 'function stirPool', 'function spawnFruit', 'dangerTimer', 'energy', 'localStorage.setItem']) {
    assert.match(js, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const fruit of ['kiwi', 'lemon', 'cherry', 'peach', 'orange', 'melon']) assert.match(js, new RegExp(fruit));
});

test('Melon Lab exposes pointer, keyboard, pause, and state-aware actions', () => {
  const js = read('melon-lab/game.js');
  assert.match(js, /canvas\.addEventListener\(['"]pointerdown/);
  assert.match(js, /keydown/);
  assert.match(js, /togglePause/);
  assert.match(js, /state==='title'/);
  assert.match(js, /themechange/);
});

test('Melon Lab keeps the aim arrow aligned with the actual drop center at pool edges', () => {
  const js = read('melon-lab/game.js');
  assert.match(js, /function aimBounds\(level=nextLevel\)/);
  assert.match(js, /function clampAimX\(value,level=nextLevel\)/);
  assert.match(js, /const type=FRUITS\[level\],safeX=clampAimX\(x,level\);aimX=safeX/);
  assert.match(js, /return clampAimX\(BIN\.x\+/);
  assert.match(js, /aimX=clampAimX\(aimX-34\)/);
  assert.match(js, /aimX=clampAimX\(aimX\+34\)/);
});

test('launcher, README, and clear-data routing include Melon Lab', () => {
  assert.match(read('index.html'), /\/melon-lab\//);
  assert.match(read('README.md'), /\.\/melon-lab\//);
  assert.match(read('clear-game-data.js'), /melon-lab/);
});
