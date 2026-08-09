(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ConnectFourRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROWS = 6;
  const COLS = 7;
  const CENTER_ORDER = [3, 2, 4, 1, 5, 0, 6];

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function drop(board, column, player) {
    if (!Number.isInteger(column) || column < 0 || column >= COLS) return -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][column] === 0) {
        board[row][column] = player;
        return row;
      }
    }
    return -1;
  }

  function winner(board) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const player = board[row][col];
        if (!player) continue;
        for (const [dr, dc] of directions) {
          let count = 1;
          for (let step = 1; step < 4; step++) {
            const r = row + dr * step;
            const c = col + dc * step;
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
            count++;
          }
          if (count === 4) return player;
        }
      }
    }
    return 0;
  }

  function validMoves(board) {
    return CENTER_ORDER.filter(column => board[0][column] === 0);
  }

  function copyBoard(board) {
    return board.map(row => row.slice());
  }

  function immediateMove(board, player) {
    for (const column of validMoves(board)) {
      const next = copyBoard(board);
      drop(next, column, player);
      if (winner(next) === player) return column;
    }
    return -1;
  }

  function scoreWindow(window, player) {
    const opponent = player === 1 ? 2 : 1;
    const own = window.filter(cell => cell === player).length;
    const other = window.filter(cell => cell === opponent).length;
    const empty = 4 - own - other;
    if (own === 4) return 100000;
    if (other === 4) return -100000;
    if (own === 3 && empty === 1) return 90;
    if (own === 2 && empty === 2) return 12;
    if (other === 3 && empty === 1) return -110;
    if (other === 2 && empty === 2) return -10;
    return 0;
  }

  function evaluate(board, player) {
    let score = 0;
    for (let row = 0; row < ROWS; row++) if (board[row][3] === player) score += 7;
    const windows = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col <= COLS - 4; col++) windows.push(board[row].slice(col, col + 4));
    for (let col = 0; col < COLS; col++) for (let row = 0; row <= ROWS - 4; row++) windows.push([0, 1, 2, 3].map(i => board[row + i][col]));
    for (let row = 0; row <= ROWS - 4; row++) for (let col = 0; col <= COLS - 4; col++) windows.push([0, 1, 2, 3].map(i => board[row + i][col + i]));
    for (let row = 0; row <= ROWS - 4; row++) for (let col = 3; col < COLS; col++) windows.push([0, 1, 2, 3].map(i => board[row + i][col - i]));
    return score + windows.reduce((sum, window) => sum + scoreWindow(window, player), 0);
  }

  function minimax(board, depth, alpha, beta, maximizing, ai) {
    const result = winner(board);
    const moves = validMoves(board);
    if (result || depth === 0 || moves.length === 0) {
      if (result === ai) return 1000000 + depth;
      if (result && result !== ai) return -1000000 - depth;
      return evaluate(board, ai);
    }
    const player = maximizing ? ai : (ai === 1 ? 2 : 1);
    if (maximizing) {
      let value = -Infinity;
      for (const column of moves) {
        const next = copyBoard(board); drop(next, column, player);
        value = Math.max(value, minimax(next, depth - 1, alpha, beta, false, ai));
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break;
      }
      return value;
    }
    let value = Infinity;
    for (const column of moves) {
      const next = copyBoard(board); drop(next, column, player);
      value = Math.min(value, minimax(next, depth - 1, alpha, beta, true, ai));
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  function chooseMove(board, player, difficulty) {
    const moves = validMoves(board);
    if (!moves.length) return -1;
    const win = immediateMove(board, player);
    if (win !== -1) return win;
    const opponent = player === 1 ? 2 : 1;
    const block = immediateMove(board, opponent);
    if (block !== -1) return block;
    if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
    if (difficulty === 'medium' && Math.random() < 0.35) return moves[Math.floor(Math.random() * moves.length)];
    const depth = difficulty === 'hard' ? 5 : 3;
    let bestScore = -Infinity;
    let best = moves[0];
    for (const column of moves) {
      const next = copyBoard(board); drop(next, column, player);
      const score = minimax(next, depth - 1, -Infinity, Infinity, false, player);
      if (score > bestScore) { bestScore = score; best = column; }
    }
    return best;
  }

  return { createBoard, drop, winner, chooseMove };
});
