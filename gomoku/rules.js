(function (root, build) {
  const rules = build();
  if (typeof module === 'object' && module.exports) module.exports = rules;
  root.GomokuRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LINES = [[1, 0], [0, 1], [1, 1], [1, -1]];

  function newBoard(size = 15) {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  function valid(board, row, col) {
    return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < board.length && col < board.length;
  }

  function play(board, row, col, stone) {
    if (!valid(board, row, col) || board[row][col] !== 0) return false;
    board[row][col] = stone;
    return true;
  }

  function count(board, row, col, dr, dc, stone) {
    let total = 0;
    for (let step = 1; valid(board, row + dr * step, col + dc * step); step++) {
      if (board[row + dr * step][col + dc * step] !== stone) break;
      total++;
    }
    return total;
  }

  function runLength(board, row, col, dr, dc, stone) {
    return 1 + count(board, row, col, dr, dc, stone) + count(board, row, col, -dr, -dc, stone);
  }

  function hasFive(board, row, col, stone) {
    return valid(board, row, col) && board[row][col] === stone && LINES.some(([dr, dc]) => runLength(board, row, col, dr, dc, stone) >= 5);
  }

  function outcome(board, row, col, stone) {
    if (hasFive(board, row, col, stone)) return stone === 1 ? 'human' : 'cpu';
    return board.every(line => line.every(Boolean)) ? 'draw' : null;
  }

  function nearbyMoves(board) {
    const moves = [];
    let occupied = false;
    for (let row = 0; row < board.length; row++) for (let col = 0; col < board.length; col++) occupied ||= board[row][col] !== 0;
    if (!occupied) {
      const middle = Math.floor(board.length / 2);
      return [{ row: middle, col: middle }];
    }
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board.length; col++) {
        if (board[row][col] !== 0) continue;
        let close = false;
        for (let dr = -2; dr <= 2 && !close; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if ((dr || dc) && valid(board, row + dr, col + dc) && board[row + dr][col + dc]) { close = true; break; }
          }
        }
        if (close) moves.push({ row, col });
      }
    }
    return moves;
  }

  function winningMove(board, stone) {
    for (const move of nearbyMoves(board)) {
      board[move.row][move.col] = stone;
      const wins = hasFive(board, move.row, move.col, stone);
      board[move.row][move.col] = 0;
      if (wins) return move;
    }
    return null;
  }

  function shapeScore(board, row, col, stone) {
    board[row][col] = stone;
    let score = 0;
    for (const [dr, dc] of LINES) {
      const forward = count(board, row, col, dr, dc, stone);
      const backward = count(board, row, col, -dr, -dc, stone);
      const length = 1 + forward + backward;
      const aRow = row + dr * (forward + 1), aCol = col + dc * (forward + 1);
      const bRow = row - dr * (backward + 1), bCol = col - dc * (backward + 1);
      const openings = Number(valid(board, aRow, aCol) && board[aRow][aCol] === 0) + Number(valid(board, bRow, bCol) && board[bRow][bCol] === 0);
      if (length >= 5) score += 1000000;
      else if (length === 4 && openings === 2) score += 100000;
      else if (length === 4) score += 20000;
      else if (length === 3 && openings === 2) score += 9000;
      else if (length === 3) score += 1200;
      else if (length === 2 && openings === 2) score += 450;
      else score += length * 18 + openings * 8;
    }
    board[row][col] = 0;
    return score;
  }

  function pickMove(board, level = 'normal', random = Math.random) {
    const win = winningMove(board, 2);
    if (win) return win;
    const block = winningMove(board, 1);
    if (block) return block;
    const options = nearbyMoves(board);
    if (!options.length) return null;
    if (options.length === 1) return options[0];
    const middle = (board.length - 1) / 2;
    const ranked = options.map(move => ({
      ...move,
      value: shapeScore(board, move.row, move.col, 2) * 1.08 + shapeScore(board, move.row, move.col, 1) + (board.length - Math.abs(move.row - middle) - Math.abs(move.col - middle)) * 4
    })).sort((a, b) => b.value - a.value);
    if (level === 'easy') return ranked[Math.floor(random() * Math.min(7, ranked.length))];
    if (level === 'normal' && random() < 0.15) return ranked[Math.min(1, ranked.length - 1)];
    return { row: ranked[0].row, col: ranked[0].col };
  }

  return { newBoard, play, hasFive, outcome, pickMove };
});
