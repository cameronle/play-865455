const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createBoard,
  placeStone,
  isWinningMove,
  getResult,
  chooseComputerMove,
} = require('../gomoku/engine.js');

test('places a stone only on an empty intersection', () => {
  const board = createBoard();
  assert.equal(placeStone(board, 7, 7, 1), true);
  assert.equal(board[7][7], 1);
  assert.equal(placeStone(board, 7, 7, 2), false);
  assert.equal(board[7][7], 1);
});

test('detects five contiguous stones in every direction', () => {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const board = createBoard();
    for (let i = 0; i < 5; i += 1) board[7 + dr * i][7 + dc * i] = 1;
    assert.equal(isWinningMove(board, 7 + dr * 4, 7 + dc * 4, 1), true);
  }
});

test('does not call four stones a win', () => {
  const board = createBoard();
  for (let c = 3; c < 7; c += 1) board[8][c] = 1;
  assert.equal(isWinningMove(board, 8, 6, 1), false);
});

test('computer takes an immediate winning move', () => {
  const board = createBoard();
  for (let c = 4; c < 8; c += 1) board[7][c] = 2;
  const move = chooseComputerMove(board, 'normal');
  assert.ok((move.row === 7 && move.col === 3) || (move.row === 7 && move.col === 8));
});

test('computer blocks an immediate human win', () => {
  const board = createBoard();
  for (let r = 5; r < 9; r += 1) board[r][6] = 1;
  const move = chooseComputerMove(board, 'hard');
  assert.ok((move.row === 4 && move.col === 6) || (move.row === 9 && move.col === 6));
});

test('reports a draw when the board is full without a winner', () => {
  const board = createBoard(3);
  const pattern = [
    [1, 2, 1],
    [2, 1, 2],
    [2, 1, 2],
  ];
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) board[r][c] = pattern[r][c];
  assert.equal(getResult(board, 2, 2, 2), 'draw');
});
