(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SudokuRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SIZE = 9, BOX = 3;
  const clone = board => board.map(row => row.slice());
  const coordinate = n => Number.isInteger(n) && n >= 0 && n < SIZE;
  const shape = board => Array.isArray(board) && board.length === SIZE && Array.from(board).every(row =>
    Array.isArray(row) && row.length === SIZE && Array.from(row).every(n => Number.isInteger(n) && n >= 0 && n <= 9));

  function legal(board, row, col, value) {
    if (value === 0) return true;
    for (let i = 0; i < SIZE; i++) {
      if (i !== col && board[row][i] === value) return false;
      if (i !== row && board[i][col] === value) return false;
    }
    const br = Math.floor(row / BOX) * BOX, bc = Math.floor(col / BOX) * BOX;
    for (let r = br; r < br + BOX; r++) for (let c = bc; c < bc + BOX; c++) {
      if ((r !== row || c !== col) && board[r][c] === value) return false;
    }
    return true;
  }
  function validBoard(board) {
    return shape(board) && board.every((row, r) => row.every((value, c) => legal(board, r, c, value)));
  }
  function canPlace(board, row, col, value) {
    return shape(board) && coordinate(row) && coordinate(col) && Number.isInteger(value) &&
      value >= 0 && value <= 9 && legal(board, row, col, value);
  }
  function findEmpty(board) {
    let best = null;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) {
      const options = [];
      for (let n = 1; n <= 9; n++) if (legal(board, r, c, n)) options.push(n);
      if (!best || options.length < best.options.length) best = {row: r, col: c, options};
      if (options.length <= 1) return best;
    }
    return best;
  }
  function solve(input) {
    if (!validBoard(input)) return null;
    const board = clone(input);
    function fill() {
      const empty = findEmpty(board);
      if (!empty) return true;
      for (const value of empty.options) {
        board[empty.row][empty.col] = value;
        if (fill()) return true;
        board[empty.row][empty.col] = 0;
      }
      return false;
    }
    return fill() ? board : null;
  }
  function countSolutions(input, limit = 2, nodeLimit = Infinity) {
    if (!validBoard(input) || !Number.isInteger(limit) || limit < 1) return 0;
    const board = clone(input);
    let count = 0, visited = 0;
    function visit() {
      if (count >= limit) return;
      // Reaching the untrusted-input budget cannot establish uniqueness.
      if (visited++ >= nodeLimit) { count = limit; return; }
      const empty = findEmpty(board);
      if (!empty) { count++; return; }
      for (const value of empty.options) {
        board[empty.row][empty.col] = value;
        visit();
        board[empty.row][empty.col] = 0;
        if (count >= limit) return;
      }
    }
    visit();
    return count;
  }
  function isComplete(board) { return validBoard(board) && board.every(row => row.every(n => n > 0)); }
  function shuffled(values, rng) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function createSolution(rng) {
    const base = [1,2,3,4,5,6,7,8,9];
    const rows = shuffled([0,1,2], rng).flatMap(b => shuffled([0,1,2], rng).map(r => b * 3 + r));
    const cols = shuffled([0,1,2], rng).flatMap(b => shuffled([0,1,2], rng).map(c => b * 3 + c));
    const nums = shuffled(base, rng);
    return rows.map(r => cols.map(c => nums[(r * 3 + Math.floor(r / 3) + c) % 9]));
  }
  function generatePuzzle(difficulty = 'medium', rng = Math.random) {
    const ranges = {easy: [38,44], medium: [31,37], hard: [25,30]};
    if (!Object.hasOwn(ranges, difficulty)) difficulty = 'medium';
    const range = ranges[difficulty];
    for (let attempt = 0; attempt < 8; attempt++) {
      const solution = createSolution(rng), puzzle = clone(solution);
      const target = range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
      const positions = shuffled(Array.from({length: 81}, (_, i) => i), rng);
      let clues = 81;
      for (const pos of positions) {
        if (clues <= target) break;
        const r = Math.floor(pos / 9), c = pos % 9, old = puzzle[r][c];
        puzzle[r][c] = 0;
        if (countSolutions(puzzle, 2) !== 1) puzzle[r][c] = old;
        else clues--;
      }
      if (clues >= range[0] && clues <= range[1]) return {puzzle, solution, difficulty};
    }
    throw new Error('Unable to generate a unique puzzle');
  }
  function candidates(board, row, col) {
    if (!shape(board) || !coordinate(row) || !coordinate(col) || board[row][col]) return [];
    const list = [];
    for (let n = 1; n <= 9; n++) if (legal(board, row, col, n)) list.push(n);
    return list;
  }
  return {canPlace, solve, countSolutions, isComplete, generatePuzzle, candidates, clone, validBoard};
});
