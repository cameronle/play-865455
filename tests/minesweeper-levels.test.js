const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { levels, isLevelUnlocked, completionCount } = require('../minesweeper/levels.js');

test('Minesweeper ships 20 ordered levels with the agreed board and mine curve', () => {
  assert.equal(levels.length, 20);
  assert.deepEqual(levels[0], { id: 1, difficulty: 'EASY', rows: 9, cols: 9, mines: 8 });
  assert.deepEqual(levels[4], { id: 5, difficulty: 'EASY', rows: 12, cols: 10, mines: 18 });
  assert.deepEqual(levels[5], { id: 6, difficulty: 'NORMAL', rows: 12, cols: 12, mines: 20 });
  assert.deepEqual(levels[9], { id: 10, difficulty: 'NORMAL', rows: 16, cols: 14, mines: 40 });
  assert.deepEqual(levels[14], { id: 15, difficulty: 'HARD', rows: 20, cols: 16, mines: 76 });
  assert.deepEqual(levels[19], { id: 20, difficulty: 'EXPERT', rows: 24, cols: 16, mines: 124 });
  for (const level of levels) assert.ok(level.mines < level.rows * level.cols - 9);
});

test('level unlocks advance one level at a time from completed progress', () => {
  const none = Array(20).fill(false);
  assert.equal(isLevelUnlocked(0, none), true);
  assert.equal(isLevelUnlocked(1, none), false);
  none[0] = true;
  assert.equal(isLevelUnlocked(1, none), true);
  assert.equal(isLevelUnlocked(2, none), false);
  none[1] = true;
  assert.equal(isLevelUnlocked(2, none), true);
  assert.equal(isLevelUnlocked(4, none), false);
  none[2] = true;
  assert.equal(isLevelUnlocked(4, none), false);
  none[3] = true;
  assert.equal(isLevelUnlocked(4, none), true);
});

test('progress count only includes completed levels', () => {
  assert.equal(completionCount([true, false, true, true]), 3);
  assert.equal(completionCount([]), 0);
});

test('Minesweeper page exposes level selection and persistent per-level progress hooks', () => {
  const html = fs.readFileSync('minesweeper/index.html', 'utf8');
  const source = fs.readFileSync('minesweeper/game.js', 'utf8');
  const css = fs.readFileSync('minesweeper/style.css', 'utf8');
  assert.match(html, /id="levelsPanel"/);
  assert.match(html, /id="levelList"/);
  assert.match(source, /function renderLevelList\(\)/);
  assert.match(source, /renderLevelList\(\)/);
  assert.match(source, /levels\.forEach/);
  assert.match(source, /minesweeper-completed-v1/);
  assert.match(source, /minesweeper-best-times-v1/);
  assert.match(source, /isLevelUnlocked/);
  assert.match(source, /finishWin/);
  assert.match(css, /repeat\(var\(--cols\)/);
  assert.match(css, /@media\(max-width:520px\)[\s\S]*\.gamebox\{[^}]*width:100%/);
});

test('winning a level marks remaining mines and offers the next unlocked level', () => {
  const source = fs.readFileSync('minesweeper/game.js', 'utf8');
  assert.match(source, /cells\.filter\(cell=>cell\.mine\)\.forEach\(cell=>cell\.flag=true\)/);
  assert.match(source, /NEXT LEVEL/);
  assert.match(source, /completed\[levelIndex\]=true/);
});
