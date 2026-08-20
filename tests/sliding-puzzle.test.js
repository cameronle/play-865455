const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rules = require('../sliding-puzzle/rules.js');

test('Sliding Puzzle calculates inversions and checks solvability mathematically', () => {
  // Solved 3x3: [1,2,3,4,5,6,7,8,0] -> 0 inversions -> solvable
  assert.equal(rules.isSolvable([1, 2, 3, 4, 5, 6, 7, 8, 0], 3), true);
  // Unsolvable 3x3 (single swap): [2,1,3,4,5,6,7,8,0] -> 1 inversion -> unsolvable
  assert.equal(rules.isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 0], 3), false);

  // Solved 4x4: blank at row 3 (0-indexed, which is row 1 from bottom).
  // Inversions = 0 (even), blank row from bottom = 1 (odd) -> Inversions + blankRow = odd ?
  // Let's verify standard 4x4 solved state with rules
  const solved4 = Array.from({ length: 15 }, (_, i) => i + 1).concat(0);
  assert.equal(rules.isSolvable(solved4, 4), true);
});

test('Sliding Puzzle generates guaranteed solvable boards', () => {
  for (const size of [3, 4, 5]) {
    for (let i = 0; i < 20; i++) {
      const board = rules.generateSolvableBoard(size);
      assert.equal(board.length, size * size);
      assert.equal(rules.isSolvable(board, size), true);
      assert.equal(rules.isSolved(board), false); // generated boards should be shuffled
    }
  }
});

test('Sliding Puzzle supports single and multi-tile column/row sliding', () => {
  // 3x3:
  // 1 2 3
  // 4 5 6
  // 7 8 0 (blank at index 8)
  const board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  // Click tile 8 (index 7) -> moves tile 8 to 8, blank to 7
  const next1 = rules.move(board, 3, 7);
  assert.deepEqual(next1, [1, 2, 3, 4, 5, 6, 7, 0, 8]);

  // Click tile 3 (index 2) in column 2 -> moves tile 6 (index 5) down, tile 3 down, blank to 2
  const next2 = rules.move(board, 3, 2);
  assert.deepEqual(next2, [1, 2, 0, 4, 5, 3, 7, 8, 6]);
});

test('Sliding Puzzle page is a complete themed mobile static entrypoint', () => {
  const html = fs.readFileSync('sliding-puzzle/index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /id="board"/);
  assert.match(html, /rules\.js\?v=/);
  assert.match(html, /game\.js\?v=/);
  assert.match(fs.readFileSync('sliding-puzzle/style.css', 'utf8'), /touch-action:\s*none/);
});
