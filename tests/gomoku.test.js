const test = require('node:test');
const assert = require('node:assert/strict');
const {
  newBoard,
  play,
  hasFive,
  outcome,
  pickMove,
} = require('../gomoku/rules.js');

test('new board is 15 by 15 and empty', () => {
  const board = newBoard();
  assert.equal(board.length, 15);
  assert.ok(board.every(row => row.length === 15 && row.every(cell => cell === 0)));
});

test('play rejects occupied and out-of-range positions', () => {
  const board = newBoard();
  assert.equal(play(board, 7, 7, 1), true);
  assert.equal(play(board, 7, 7, 2), false);
  assert.equal(play(board, -1, 7, 1), false);
  assert.equal(play(board, 15, 7, 1), false);
});

test('five stones win horizontally vertically and diagonally', () => {
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    const board = newBoard();
    for (let i = 0; i < 5; i++) board[7 + dr * i][7 + dc * i] = 1;
    assert.equal(hasFive(board, 7 + dr * 2, 7 + dc * 2, 1), true);
  }
});

test('four stones are not a win', () => {
  const board = newBoard();
  for (let col = 2; col < 6; col++) board[4][col] = 1;
  assert.equal(hasFive(board, 4, 4, 1), false);
});

test('outcome returns human, cpu, draw, or null', () => {
  const human = newBoard();
  for (let col = 2; col < 7; col++) human[5][col] = 1;
  assert.equal(outcome(human, 5, 6, 1), 'human');

  const cpu = newBoard();
  for (let row = 1; row < 6; row++) cpu[row][8] = 2;
  assert.equal(outcome(cpu, 5, 8, 2), 'cpu');

  const tiny = newBoard(2);
  tiny[0] = [1, 2]; tiny[1] = [2, 1];
  assert.equal(outcome(tiny, 1, 1, 1), 'draw');
  assert.equal(outcome(newBoard(), 7, 7, 1), null);
});

test('cpu wins immediately when possible', () => {
  const board = newBoard();
  for (let col = 4; col < 8; col++) board[7][col] = 2;
  const move = pickMove(board, 'normal', () => 0);
  assert.ok(move.row === 7 && (move.col === 3 || move.col === 8));
});

test('cpu blocks an immediate human win', () => {
  const board = newBoard();
  for (let row = 5; row < 9; row++) board[row][6] = 1;
  const move = pickMove(board, 'hard', () => 0);
  assert.ok(move.col === 6 && (move.row === 4 || move.row === 9));
});

test('cpu opens in the center', () => {
  assert.deepEqual(pickMove(newBoard(), 'hard', () => 0), { row: 7, col: 7 });
});
