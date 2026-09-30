const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function loadRules() {
  delete require.cache[require.resolve('../firefly-watch/rules.js')];
  return require('../firefly-watch/rules.js');
}

test('Firefly Watch upgrades change combat stats and stop at their caps', () => {
  const rules = loadRules();
  let player = rules.createPlayerStats();

  player = rules.applyUpgrade(player, 'quick-glow');
  assert.equal(player.fireCooldown, 0.48);

  for (let index = 0; index < 10; index += 1) player = rules.applyUpgrade(player, 'quick-glow');
  assert.equal(player.fireCooldown, 0.22);

  for (let index = 0; index < 10; index += 1) player = rules.applyUpgrade(player, 'split-spark');
  assert.equal(player.projectiles, 4);

  for (let index = 0; index < 10; index += 1) player = rules.applyUpgrade(player, 'leaf-shield');
  assert.equal(player.maxShields, 3);
  assert.equal(player.shields, 3);
});

test('Firefly Watch offers three unique non-maxed upgrades deterministically', () => {
  const rules = loadRules();
  let player = rules.createPlayerStats();
  for (let index = 0; index < 5; index += 1) player = rules.applyUpgrade(player, 'quick-glow');

  const offer = rules.chooseUpgradeOffer(player, [0, 0.9, 0.4, 0.1]);
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer.map(upgrade => upgrade.id)).size, 3);
  assert.equal(offer.some(upgrade => upgrade.id === 'quick-glow'), false);
});

test('Firefly Watch difficulty rises without turning the main mode into a speed wall', () => {
  const rules = loadRules();
  const opening = rules.difficultyAt(0);
  const middle = rules.difficultyAt(180);
  const finale = rules.difficultyAt(360);

  assert.ok(opening.spawnInterval > middle.spawnInterval);
  assert.ok(middle.spawnInterval > finale.spawnInterval);
  assert.ok(finale.spawnInterval >= 0.24);
  assert.ok(opening.healthScale < middle.healthScale);
  assert.ok(middle.healthScale < finale.healthScale);
  assert.ok(finale.speedScale <= 1.65);
  assert.equal(rules.survivalDuration, 360);
});

test('Firefly Watch normalizes diagonal movement and uses circle collision boundaries', () => {
  const rules = loadRules();
  assert.deepEqual(rules.normalizeVector(0, 0), {x: 0, y: 0});
  const diagonal = rules.normalizeVector(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
  assert.equal(rules.circlesOverlap({x: 0, y: 0, r: 10}, {x: 19, y: 0, r: 10}), true);
  assert.equal(rules.circlesOverlap({x: 0, y: 0, r: 10}, {x: 20, y: 0, r: 10}), false);
  assert.deepEqual([1, 2, 3, 8].map(rules.xpNeeded), [10, 14, 18, 38]);
});

test('Firefly Watch ships a complete keyboard and mobile survival-game route', () => {
  const html = fs.readFileSync('firefly-watch/index.html', 'utf8');
  const css = fs.readFileSync('firefly-watch/style.css', 'utf8');
  const js = fs.readFileSync('firefly-watch/game.js', 'utf8');

  for (const id of ['game', 'overlay', 'startButton', 'pauseButton', 'score', 'best', 'time', 'level', 'xpFill', 'upgradePanel', 'upgradeChoices', 'moveUp', 'moveDown', 'moveLeft', 'moveRight']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /FIREFLY WATCH/);
  assert.match(html, /SURVIVE 6 MINUTES/);
  assert.match(html, /rules\.js\?v=firefly-watch-1/);
  assert.match(html, /game\.js\?v=firefly-watch-1/);
  assert.match(html, /style\.css\?v=firefly-watch-1/);
  assert.match(html, /src="\/theme\.js\?v=firefly-watch-1"/);
  assert.match(html, /src="\/clear-game-data\.js\?v=clear-1"/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /user-select:\s*none/);
  assert.match(js, /function findNearestEnemy/);
  assert.match(js, /function fireVolley/);
  assert.match(js, /chooseUpgradeOffer/);
  assert.match(js, /pointerdown/);
  assert.match(js, /themechange/);
  assert.match(js, /fireflyWatchBest/);
  assert.match(js, /survivalDuration/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|unpkg\.com|jsdelivr\.net/);
});

test('Firefly Watch is integrated into the canonical catalog and save-data utility', () => {
  const catalog = require('../data/games.js');
  const game = catalog.find(entry => entry.id === 'firefly-watch');
  assert.ok(game);
  assert.equal(game.order, 29);
  assert.equal(game.category, 'arcade');
  assert.equal(game.name.zh, '萤火守夜');
  assert.match(fs.readFileSync('clear-game-data.js', 'utf8'), /'firefly-watch': \['fireflyWatchBest'\]/);
  assert.match(fs.readFileSync('index.html', 'utf8'), /href="\/firefly-watch\/"/);
  assert.match(fs.readFileSync('README.md', 'utf8'), /\.\/firefly-watch\//);
});

test('Firefly Watch keeps the full playfield and desktop controls visible on short screens', () => {
  const css = fs.readFileSync('firefly-watch/style.css', 'utf8');
  assert.match(css, /\.arena-shell\{[^}]*width:min\(100%,calc\(100dvh - 280px\)\)/);
  assert.match(css, /\.arena-shell\{[^}]*margin-inline:auto/);
  assert.match(css, /\.move-pad\{width:112px;height:112px/);
});

test('Firefly Watch keeps mobile movement and utility controls at least 44px tall', () => {
  const html = fs.readFileSync('firefly-watch/index.html', 'utf8');
  const css = fs.readFileSync('firefly-watch/style.css', 'utf8');
  assert.match(html, /class="mobile-hint"[^>]*>HOLD THE ARROWS TO MOVE/);
  assert.match(css, /\.move-pad\{width:140px;height:140px/);
  assert.match(css, /\.move-pad button,.move-pad i\{[^}]*min-width:44px;min-height:44px/);
  assert.match(css, /\.theme-toggle,.clear-data-toggle\{min-height:44px/);
  assert.match(css, /\.mobile-hint\{display:none\}/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]*\.desktop-hint\{display:none\}[\s\S]*\.mobile-hint\{display:block\}/);
});

test('Firefly Watch runtime snapshot exposes movement and active-play state for browser QA', () => {
  const js = fs.readFileSync('firefly-watch/game.js', 'utf8');
  assert.match(js, /player:\{x:Number\(player\.x\.toFixed\(2\)\),y:Number\(player\.y\.toFixed\(2\)\)\}/);
  assert.match(js, /enemyCount: enemies\.length/);
  assert.match(js, /shotCount: shots\.length/);
});
