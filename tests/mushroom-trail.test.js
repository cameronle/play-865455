const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = file => fs.readFileSync(file, 'utf8');

test('Mushroom Trail has a self-contained mobile platformer entrypoint', () => {
  const html = read('mushroom-trail/index.html');
  const css = read('mushroom-trail/style.css');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  for (const id of ['game', 'overlay', 'startButton', 'pauseButton', 'leftButton', 'jumpButton', 'rightButton', 'world', 'coins', 'lives', 'score']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /MUSHROOM TRAIL/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /user-select:\s*none/);
  assert.doesNotMatch(html, /<img\b|fonts\.googleapis\.com|unpkg\.com|jsdelivr\.net/);
});

test('Mushroom Trail ships multiple handcrafted levels and classic platformer variety', () => {
  const js = read('mushroom-trail/game.js');
  assert.match(js, /const LEVELS\s*=\s*\[/);
  assert.match(js, /id:\s*'1-1'/);
  assert.match(js, /id:\s*'1-2'/);
  assert.match(js, /id:\s*'1-3'/);
  for (const marker of ['question', 'brick', 'pipe', 'moving', 'walker', 'hopper', 'checkpoint', 'goal']) assert.match(js, new RegExp(marker));
});

test('Mushroom Trail includes collision, stomp, power-up, lives, checkpoint, and best-score rules', () => {
  const js = read('mushroom-trail/game.js');
  for (const marker of ['function resolvePlayer', 'function stompOrHurt', 'function spawnPowerup', 'function reachCheckpoint', 'function levelClear', 'localStorage.setItem']) assert.match(js, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(js, /player\.powered/);
  assert.match(js, /lives--;/);
  assert.match(js, /lives--;setPlayerSpawn\(\);player\.inv/);
  assert.match(js, /state\s*=\s*'over'/);
});

test('Mushroom Trail exposes real keyboard and pointer controls', () => {
  const js = read('mushroom-trail/game.js');
  assert.match(js, /bindHold\('leftButton'/);
  assert.match(js, /bindHold\('rightButton'/);
  assert.match(js, /bindJump\('jumpButton'/);
  assert.match(js, /keydown/);
  assert.match(js, /pointerdown/);
  assert.match(js, /themechange/);
});

test('launcher, README, and clear-data routing include Mushroom Trail', () => {
  assert.match(read('index.html'), /\/mushroom-trail\//);
  assert.match(read('README.md'), /\.\/mushroom-trail\//);
  assert.match(read('clear-game-data.js'), /mushroom-trail/);
});
