(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GomokuEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  function createBoard(size = 15) {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  function inBounds(board, row, col) {
    return row >= 0 && col >= 0 && row < board.length && col < board.length;
  }

  function placeStone(board, row, col, color) {
    if (!inBounds(board, row, col) || board[row][col] !== 0) return false;
    board[row][col] = color;
    return true;
  }

  function countDirection(board, row, col, dr, dc, color) {
    let count = 0;
    for (let step = 1; inBounds(board, row + dr * step, col + dc * step); step += 1) {
      if (board[row + dr * step][col + dc * step] !== color) break;
      count += 1;
    }
    return count;
  }

  function lineLength(board, row, col, dr, dc, color) {
    return 1 + countDirection(board, row, col, dr, dc, color) + countDirection(board, row, col, -dr, -dc, color);
  }

  function isWinningMove(board, row, col, color) {
    if (!inBounds(board, row, col) || board[row][col] !== color) return false;
    return DIRECTIONS.some(([dr, dc]) => lineLength(board, row, col, dr, dc, color) >= 5);
  }

  function isFull(board) {
    return board.every((row) => row.every(Boolean));
  }

  function getResult(board, row, col, color) {
    if (isWinningMove(board, row, col, color)) return color === 1 ? 'human' : 'computer';
    return isFull(board) ? 'draw' : null;
  }

  function candidateMoves(board) {
    const moves = [];
    let hasStone = false;
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board.length; col += 1) {
        if (board[row][col]) hasStone = true;
      }
    }
    if (!hasStone) {
      const center = Math.floor(board.length / 2);
      return [{ row: center, col: center }];
    }
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board.length; col += 1) {
        if (board[row][col]) continue;
        let nearby = false;
        for (let dr = -2; dr <= 2 && !nearby; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            if ((dr || dc) && inBounds(board, row + dr, col + dc) && board[row + dr][col + dc]) {
              nearby = true;
              break;
            }
          }
        }
        if (nearby) moves.push({ row, col });
      }
    }
    return moves;
  }

  function patternScore(board, row, col, color) {
    let total = 0;
    board[row][col] = color;
    for (const [dr, dc] of DIRECTIONS) {
      const length = lineLength(board, row, col, dr, dc, color);
      const frontRow = row + dr * countDirection(board, row, col, dr, dc, color) + dr;
      const frontCol = col + dc * countDirection(board, row, col, dr, dc, color) + dc;
      const backRow = row - dr * countDirection(board, row, col, -dr, -dc, color) - dr;
      const backCol = col - dc * countDirection(board, row, col, -dr, -dc, color) - dc;
      const openEnds = Number(inBounds(board, frontRow, frontCol) && board[frontRow][frontCol] === 0) + Number(inBounds(board, backRow, backCol) && board[backRow][backCol] === 0);
      if (length >= 5) total += 1000000;
      else if (length === 4 && openEnds === 2) total += 90000;
      else if (length === 4) total += 18000;
      else if (length === 3 && openEnds === 2) total += 7000;
      else if (length === 3) total += 900;
      else if (length === 2 && openEnds === 2) total += 350;
      else total += length * 12 + openEnds * 4;
    }
    board[row][col] = 0;
    return total;
  }

  function immediateMove(board, color) {
    for (const move of candidateMoves(board)) {
      board[move.row][move.col] = color;
      const wins = isWinningMove(board, move.row, move.col, color);
      board[move.row][move.col] = 0;
      if (wins) return move;
    }
    return null;
  }

  function chooseComputerMove(board, difficulty = 'normal', random = Math.random) {
    const win = immediateMove(board, 2);
    if (win) return win;
    const block = immediateMove(board, 1);
    if (block) return block;
    const moves = candidateMoves(board);
    if (!moves.length) return null;
    const center = (board.length - 1) / 2;
    const scored = moves.map((move) => {
      const attack = patternScore(board, move.row, move.col, 2);
      const defense = patternScore(board, move.row, move.col, 1);
      const centrality = board.length - Math.abs(move.row - center) - Math.abs(move.col - center);
      return { ...move, score: attack * 1.12 + defense + centrality * 3 };
    }).sort((a, b) => b.score - a.score);
    if (difficulty === 'easy') return scored[Math.floor(random() * Math.min(6, scored.length))];
    if (difficulty === 'normal' && scored.length > 1 && random() < 0.18) return scored[1];
    return scored[0];
  }

  return { createBoard, placeStone, isWinningMove, getResult, chooseComputerMove };
});
