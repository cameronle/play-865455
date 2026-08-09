const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMaze,
  neighbors,
  chooseEnemyStep,
} = require('../maze/logic.js');

test('both enemy spawn cells have an escape route and the maze is connected', () => {
  const maze = createMaze();
  const spawns = [{ row: 13, col: 1 }, { row: 13, col: 13 }];
  for (const spawn of spawns) assert.ok(neighbors(maze, spawn).length >= 2, `${spawn.row},${spawn.col} is a dead end`);

  const open = [];
  for (let row = 0; row < maze.size; row++) for (let col = 0; col < maze.size; col++) if (!maze.isWall(row, col)) open.push(`${row},${col}`);
  const visited = new Set([open[0]]);
  const queue = [open[0].split(',').map(Number)];
  while (queue.length) {
    const [row, col] = queue.shift();
    for (const next of neighbors(maze, { row, col })) {
      const key = `${next.row},${next.col}`;
      if (!visited.has(key)) { visited.add(key); queue.push([next.row, next.col]); }
    }
  }
  assert.equal(visited.size, open.length);
});

test('enemy does not immediately reverse when another route exists', () => {
  const maze = createMaze();
  const enemy = { row: 13, col: 2, previous: { row: 13, col: 1 } };
  const step = chooseEnemyStep(maze, enemy, { row: 1, col: 1 }, () => 0);
  assert.notDeepEqual(step, enemy.previous);
});

test('enemy leaves its spawn area instead of looping across two cells', () => {
  const maze = createMaze();
  let enemy = { row: 13, col: 1, previous: null };
  const seen = new Set();
  for (let tick = 0; tick < 20; tick++) {
    seen.add(`${enemy.row},${enemy.col}`);
    const next = chooseEnemyStep(maze, enemy, { row: 1, col: 1 }, () => 0);
    enemy = { ...next, previous: { row: enemy.row, col: enemy.col } };
  }
  assert.ok(seen.size >= 8, `enemy only visited ${seen.size} cells`);
});

test('page exposes swipe and visible touch controls', () => {
  const html = require('node:fs').readFileSync('maze/index.html', 'utf8');
  const css = require('node:fs').readFileSync('maze/style.css', 'utf8');
  const js = require('node:fs').readFileSync('maze/game.js', 'utf8');
  assert.match(html, /class="mobile-controls"/);
  assert.match(html, /SWIPE OR TAP TO MOVE/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*\.mobile-controls\{display:grid/);
  assert.match(css, /touch-action:none/);
  assert.match(js, /pointerdown/);
  assert.match(js, /pointerup/);
});
