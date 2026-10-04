(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SlidingRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SIZES = [3, 4, 5];
  function isValidBoard(board, size) {
    return (
      SIZES.includes(size) &&
      Array.isArray(board) &&
      board.length === size * size &&
      board.every((v) => Number.isInteger(v) && v >= 0 && v < board.length) &&
      new Set(board).size === board.length
    );
  }
  function countInversions(board) {
    let inversions = 0;
    const len = board.length;
    for (let i = 0; i < len; i++) {
      if (board[i] === 0) continue;
      for (let j = i + 1; j < len; j++) {
        if (board[j] === 0) continue;
        if (board[i] > board[j]) inversions++;
      }
    }
    return inversions;
  }

  function isSolvable(board, size) {
    if (!isValidBoard(board, size)) return false;
    const inversions = countInversions(board);
    if (size % 2 === 1) {
      return inversions % 2 === 0;
    }
    const blankIdx = board.indexOf(0);
    const blankRowFromBottom = size - Math.floor(blankIdx / size);
    return (inversions % 2 === 0) === (blankRowFromBottom % 2 === 1);
  }

  function isSolved(board) {
    if (!Array.isArray(board) || !isValidBoard(board, Math.sqrt(board.length)))
      return false;
    const total = board.length;
    for (let i = 0; i < total - 1; i++) {
      if (board[i] !== i + 1) return false;
    }
    return board[total - 1] === 0;
  }

  function shuffle(array, rng) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const value = rng();
      const j = Math.floor(
        (Number.isFinite(value)
          ? Math.min(1 - Number.EPSILON, Math.max(0, value))
          : 0) *
          (i + 1),
      );
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function generateSolvableBoard(size, rng = Math.random) {
    if (!SIZES.includes(size)) throw new RangeError("Unsupported puzzle size");
    const total = size * size;
    const initial = Array.from({ length: total - 1 }, (_, i) => i + 1).concat(
      0,
    );
    let candidate;
    for (let attempt = 0; attempt < 8; attempt++) {
      candidate = shuffle(initial, rng);
      if (!isSolvable(candidate, size)) {
        // Swap first two non-zero tiles to flip parity
        let first = -1,
          second = -1;
        for (let i = 0; i < candidate.length; i++) {
          if (candidate[i] !== 0) {
            if (first === -1) first = i;
            else if (second === -1) {
              second = i;
              break;
            }
          }
        }
        [candidate[first], candidate[second]] = [
          candidate[second],
          candidate[first],
        ];
      }
      if (!isSolved(candidate)) return candidate;
    }
    // A legal adjacent swap keeps a pathological RNG from hanging the page.
    [initial[total - 2], initial[total - 1]] = [
      initial[total - 1],
      initial[total - 2],
    ];
    return initial;
  }

  function move(board, size, clickedIdx) {
    if (
      !isValidBoard(board, size) ||
      !Number.isInteger(clickedIdx) ||
      clickedIdx < 0 ||
      clickedIdx >= board.length
    )
      return null;
    const blankIdx = board.indexOf(0);
    if (clickedIdx === blankIdx) return null;

    const r1 = Math.floor(clickedIdx / size);
    const c1 = clickedIdx % size;
    const r0 = Math.floor(blankIdx / size);
    const c0 = blankIdx % size;

    if (r1 !== r0 && c1 !== c0) return null; // Not in same row or column

    const next = board.slice();

    // Same row: shift tiles horizontally
    if (r1 === r0) {
      const step = c1 < c0 ? 1 : -1;
      for (let c = c0; c !== c1; c -= step) {
        const from = r0 * size + (c - step);
        const to = r0 * size + c;
        next[to] = next[from];
      }
      next[clickedIdx] = 0;
      return next;
    }

    // Same column: shift tiles vertically
    if (c1 === c0) {
      const step = r1 < r0 ? 1 : -1;
      for (let r = r0; r !== r1; r -= step) {
        const from = (r - step) * size + c0;
        const to = r * size + c0;
        next[to] = next[from];
      }
      next[clickedIdx] = 0;
      return next;
    }

    return null;
  }

  return {
    isValidBoard,
    countInversions,
    isSolvable,
    isSolved,
    generateSolvableBoard,
    move,
  };
});
