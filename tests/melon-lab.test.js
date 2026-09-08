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
  for (const marker of ['const RULES=MelonLabRules', 'const FRUITS=RULES.FRUITS', 'DANGER_Y', 'function mergeFruits', 'function stirPool', 'function spawnFruit', 'dangerTimer', 'energy', 'localStorage.setItem']) {
    assert.match(js, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const rules = require('../melon-lab/rules.js');
  assert.deepEqual(rules.FRUITS.map(fruit => fruit.id), ['kiwi', 'lemon', 'cherry', 'peach', 'orange', 'melon', 'watermelon']);
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

test('Melon Lab stir uses a visible rolling vortex and tangent fruit impulse', () => {
  const js = read('melon-lab/game.js');
  assert.match(js, /STIR_DURATION/);
  assert.match(js, /f\.stirTime=STIR_DURATION/);
  assert.match(js, /f\.stirDirection/);
  assert.match(js, /function drawStirEffect\(p\)/);
  assert.match(js, /drawStirEffect\(p\)/);
});

test('Melon Lab clears two top-tier watermelons with a bonus', () => {
  const js = read('melon-lab/game.js');
  const html = read('melon-lab/index.html');
  const rules = require('../melon-lab/rules.js');
  assert.equal(rules.FRUITS.at(-1).id, 'watermelon');
  assert.equal(rules.topTierClearBonus(), 3200);
  assert.match(js, /if\(a\.level===FRUITS\.length-1\)/);
  assert.match(js, /clearPulse=TOP_CLEAR_DURATION/);
  assert.match(js, /score\+=RULES\.topTierClearBonus\(\)/);
  assert.match(js, /function drawClearEffect\(p\)/);
  assert.match(html, /MELON → WATERMELON/);
});

test('Melon Lab exports the seven current fruit tiers and stable IDs', () => {
  const rules = require('../melon-lab/rules.js');
  assert.equal(rules.FRUITS.length, 7);
  assert.deepEqual(rules.FRUITS.map(fruit => [fruit.id, fruit.label]), [
    ['kiwi', 'KIWI'],
    ['lemon', 'LEMON'],
    ['cherry', 'CHERRY'],
    ['peach', 'PEACH'],
    ['orange', 'ORANGE'],
    ['melon', 'MELON'],
    ['watermelon', 'WATERMELON']
  ]);
});

test('Melon Lab chooses direct drop levels at deterministic random boundaries', () => {
  const rules = require('../melon-lab/rules.js');
  const rolls = [0, .239999, .24, .479999, .48, .719999, .72, 1];
  assert.deepEqual(rolls.map(roll => rules.chooseDropLevel(roll)), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('Melon Lab danger line rises monotonically and stops at the profile cap', () => {
  const rules = require('../melon-lab/rules.js');
  const profile = rules.DIFFICULTY_PROFILE;
  const positions = [0, 1, 10, 1000].map(dropCount => rules.dangerLineY(dropCount, profile));
  assert.ok(positions.every((position, index) => index === 0 || position >= positions[index - 1]));
  assert.equal(positions[0], profile.dangerLineStart);
  assert.equal(positions.at(-1), profile.dangerLineCap);
  assert.equal(rules.dangerLineY(1001, profile), profile.dangerLineCap);
});

test('Melon Lab derives the top-tier clear bonus from the top fruit score', () => {
  const rules = require('../melon-lab/rules.js');
  assert.equal(rules.topTierClearBonus(), rules.FRUITS.at(-1).score * rules.DIFFICULTY_PROFILE.topTierBonusMultiplier);
  assert.equal(rules.topTierClearBonus(), 3200);
});

test('launcher, README, and clear-data routing include Melon Lab', () => {
  assert.match(read('index.html'), /\/melon-lab\//);
  assert.match(read('README.md'), /\.\/melon-lab\//);
  assert.match(read('clear-game-data.js'), /melon-lab/);
});
