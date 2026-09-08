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
  assert.match(html, /rules\.js\?v=melon-lab-3/);
  assert.match(html, /game\.js\?v=melon-lab-7/);
  assert.match(html, /style\.css\?v=melon-lab-2/);
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
  assert.deepEqual(rules.FRUITS.map(fruit => fruit.id), [
    'kiwi', 'lemon', 'cherry', 'peach', 'orange', 'pear', 'pineapple',
    'melon', 'dragonfruit', 'papaya', 'watermelon'
  ]);
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
  assert.equal(rules.topTierClearBonus(), rules.FRUITS.at(-1).score * rules.DIFFICULTY_PROFILE.topTierBonusMultiplier);
  assert.match(js, /if\(a\.level===FRUITS\.length-1\)/);
  assert.match(js, /clearPulse=TOP_CLEAR_DURATION/);
  assert.match(js, /score\+=RULES\.topTierClearBonus\(\)/);
  assert.match(js, /function drawClearEffect\(p\)/);
  assert.match(html, /MELON → DRAGONFRUIT → PAPAYA → WATERMELON/);
});

test('Melon Lab exports eleven fruit tiers with stable IDs and increasing synthesis values', () => {
  const rules = require('../melon-lab/rules.js');
  assert.equal(rules.FRUITS.length, 11);
  assert.deepEqual(rules.FRUITS.map(fruit => [fruit.id, fruit.label]), [
    ['kiwi', 'KIWI'],
    ['lemon', 'LEMON'],
    ['cherry', 'CHERRY'],
    ['peach', 'PEACH'],
    ['orange', 'ORANGE'],
    ['pear', 'PEAR'],
    ['pineapple', 'PINEAPPLE'],
    ['melon', 'MELON'],
    ['dragonfruit', 'DRAGONFRUIT'],
    ['papaya', 'PAPAYA'],
    ['watermelon', 'WATERMELON']
  ]);
  assert.equal(new Set(rules.FRUITS.map(fruit => fruit.id)).size, rules.FRUITS.length);
  assert.ok(rules.FRUITS.every(fruit => ['shape', 'color', 'dark', 'light', 'r', 'score'].every(field => field in fruit)));
  assert.ok(rules.FRUITS.every(fruit => typeof fruit.shape === 'string' && fruit.shape.length > 0));
  assert.ok(rules.FRUITS.every((fruit, index) => index === 0 || fruit.r > rules.FRUITS[index - 1].r));
  assert.ok(rules.FRUITS.every((fruit, index) => index === 0 || fruit.score > rules.FRUITS[index - 1].score));
  assert.equal(rules.FRUITS.at(-1).id, 'watermelon');
});

test('Melon Lab displays the complete route and has distinct renderers for new fruit silhouettes', () => {
  const html = read('melon-lab/index.html');
  const js = read('melon-lab/game.js');
  const css = read('melon-lab/style.css');
  for (const label of ['KIWI', 'LEMON', 'CHERRY', 'PEACH', 'ORANGE', 'PEAR', 'PINEAPPLE', 'MELON', 'DRAGONFRUIT', 'PAPAYA', 'WATERMELON']) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(js, /FRUITS\.slice\(0,6\)/);
  for (const id of ['pear', 'pineapple', 'dragonfruit', 'papaya']) {
    assert.match(js, new RegExp(`t\\.id==='${id}'`));
  }
  assert.match(css, /\.lab-panel \.stir-button\s*\{\s*display:\s*none;/);
});

test('Melon Lab chooses direct drop levels at deterministic random boundaries', () => {
  const rules = require('../melon-lab/rules.js');
  const rolls = [0, .199999, .2, .399999, .4, .599999, .6, .749999, .75, .899999, .9, 1];
  assert.deepEqual(rolls.map(roll => rules.chooseDropLevel(roll)), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

test('Melon Lab danger line rises in two stages and stops at the profile cap', () => {
  const rules = require('../melon-lab/rules.js');
  const profile = rules.DIFFICULTY_PROFILE;
  const positions = [0, 23, 24, 47, 48, 1000].map(dropCount => rules.dangerLineY(dropCount, profile));
  assert.ok(positions.every((position, index) => index === 0 || position <= positions[index - 1]));
  assert.equal(positions[0], profile.dangerLineStart);
  assert.equal(positions.at(-1), profile.dangerLineCap);
  assert.equal(rules.dangerLineY(1001, profile), profile.dangerLineCap);
  assert.ok(positions[2] < positions[1]);
  assert.equal(positions[3], positions[2]);
  assert.ok(positions[4] < positions[3]);
});

test('Melon Lab wires successful drops to weighted levels and staged danger pressure', () => {
  const js = read('melon-lab/game.js');
  const rules = require('../melon-lab/rules.js');
  assert.match(js, /dropCount=0/);
  assert.match(js, /dropCount\+=1/);
  assert.match(js, /RULES\.chooseDropLevel\(Math\.random\(\)\)/);
  assert.match(js, /DANGER_Y\(\)/);
  assert.match(js, /dangerGracePeriod/);
  assert.equal(rules.DIFFICULTY_PROFILE.directDropLevels, 6);
  assert.equal(rules.DIFFICULTY_PROFILE.dangerStageDrops, 24);
});

test('Melon Lab derives the top-tier clear bonus from the top fruit score', () => {
  const rules = require('../melon-lab/rules.js');
  assert.equal(rules.topTierClearBonus(), rules.FRUITS.at(-1).score * rules.DIFFICULTY_PROFILE.topTierBonusMultiplier);
});

test('launcher, README, and clear-data routing include Melon Lab', () => {
  assert.match(read('index.html'), /\/melon-lab\//);
  assert.match(read('README.md'), /\.\/melon-lab\//);
  assert.match(read('clear-game-data.js'), /melon-lab/);
});
