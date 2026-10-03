(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ConnectFourRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ROWS = 6,
    COLS = 7,
    ORDER = [3, 2, 4, 1, 5, 0, 6];
  const WINDOWS = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        if (r + 3 * dr >= ROWS || c + 3 * dc < 0 || c + 3 * dc >= COLS)
          continue;
        WINDOWS.push(
          Array.from({ length: 4 }, (_, i) => [r + i * dr, c + i * dc]),
        );
      }
    }
  function shape(board) {
    return (
      Array.isArray(board) &&
      board.length === ROWS &&
      Array.from(board).every(
        (row) =>
          Array.isArray(row) &&
          row.length === COLS &&
          Array.from(row).every((v) => v === 0 || v === 1 || v === 2),
      )
    );
  }
  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }
  function copy(board) {
    return board.map((row) => row.slice());
  }
  function dropRaw(board, column, player) {
    for (let row = ROWS - 1; row >= 0; row--)
      if (board[row][column] === 0) {
        board[row][column] = player;
        return row;
      }
    return -1;
  }
  function drop(board, column, player) {
    if (
      !shape(board) ||
      !Number.isInteger(column) ||
      column < 0 ||
      column >= COLS ||
      (player !== 1 && player !== 2)
    )
      return -1;
    return dropRaw(board, column, player);
  }
  function winningWindow(board) {
    for (const cells of WINDOWS) {
      const player = board[cells[0][0]][cells[0][1]];
      if (player && cells.every(([r, c]) => board[r][c] === player))
        return cells;
    }
    return null;
  }
  function winnerRaw(board) {
    const cells = winningWindow(board);
    return cells ? board[cells[0][0]][cells[0][1]] : 0;
  }
  function winner(board) {
    return shape(board) ? winnerRaw(board) : 0;
  }
  function winningCells(board) {
    return shape(board)
      ? (winningWindow(board) || []).map((cell) => cell.slice())
      : [];
  }
  function movesRaw(board) {
    return ORDER.filter((c) => board[0][c] === 0);
  }
  function validMoves(board) {
    return shape(board) ? movesRaw(board) : [];
  }
  function immediateMove(board, player) {
    for (const c of movesRaw(board)) {
      const r = dropRaw(board, c, player);
      const wins = winnerRaw(board) === player;
      board[r][c] = 0;
      if (wins) return c;
    }
    return -1;
  }
  function evaluate(board, player) {
    const opponent = 3 - player;
    let score = 0;
    for (let r = 0; r < ROWS; r++)
      score += board[r][3] === player ? 7 : board[r][3] === opponent ? -7 : 0;
    for (const cells of WINDOWS) {
      let own = 0,
        other = 0,
        supported = false;
      for (const [r, c] of cells) {
        const v = board[r][c];
        if (v === player) own++;
        else if (v === opponent) other++;
        else if (r === ROWS - 1 || board[r + 1][c] !== 0) supported = true;
      }
      if (own && other) continue;
      if (own === 3) score += supported ? 90 : 6;
      else if (other === 3) score -= supported ? 110 : 8;
      else if (own === 2) score += 12;
      else if (other === 2) score -= 10;
    }
    return score;
  }
  const LIMIT = Symbol("search budget");
  function search(board, depth, alpha, beta, maximizing, ai, budget) {
    if (budget.nodes >= budget.cap || budget.now() - budget.start >= budget.ms)
      throw LIMIT;
    budget.nodes++;
    const win = winnerRaw(board);
    if (win) return win === ai ? 1000000 + depth : -1000000 - depth;
    const moves = movesRaw(board);
    if (!moves.length) return 0;
    if (!depth) return evaluate(board, ai);
    let value = maximizing ? -Infinity : Infinity;
    const player = maximizing ? ai : 3 - ai;
    for (const c of moves) {
      const r = dropRaw(board, c, player);
      let score;
      try {
        score = search(board, depth - 1, alpha, beta, !maximizing, ai, budget);
      } finally {
        board[r][c] = 0;
      }
      if (maximizing) {
        value = Math.max(value, score);
        alpha = Math.max(alpha, value);
      } else {
        value = Math.min(value, score);
        beta = Math.min(beta, value);
      }
      if (alpha >= beta) break;
    }
    return value;
  }
  function chooseMove(board, player, difficulty = "medium", options = {}) {
    if (!shape(board) || (player !== 1 && player !== 2) || winnerRaw(board))
      return -1;
    if (!options || typeof options !== "object") options = {};
    let moves = movesRaw(board);
    if (!moves.length) return -1;
    const work = copy(board),
      rng = typeof options.rng === "function" ? options.rng : Math.random;
    const now =
      typeof options.now === "function"
        ? options.now
        : () =>
            typeof performance !== "undefined" ? performance.now() : Date.now();
    const cap = Number.isInteger(options.nodeBudget)
      ? Math.max(1, Math.min(30000, options.nodeBudget))
      : 9000;
    const ms = Number.isFinite(options.maxTimeMs)
      ? Math.max(1, Math.min(100, options.maxTimeMs))
      : difficulty === "hard"
        ? 60
        : 35;
    const budget = { nodes: 0, cap, ms, now, start: now() },
      stats = { nodes: 0, depth: 0, limited: false };
    const done = (c) => {
      stats.nodes = budget.nodes;
      if (typeof options.onSearch === "function")
        options.onSearch({ ...stats });
      return c;
    };
    const win = immediateMove(work, player);
    if (win !== -1) return done(win);
    const block = immediateMove(work, 3 - player);
    if (block !== -1) return done(block);
    const safe = moves.filter((c) => {
      const r = dropRaw(work, c, player);
      const loses = immediateMove(work, 3 - player) !== -1;
      work[r][c] = 0;
      return !loses;
    });
    if (safe.length) moves = safe;
    const randomMove = () => {
      const v = rng();
      return moves[
        Number.isFinite(v)
          ? Math.max(
              0,
              Math.min(moves.length - 1, Math.floor(v * moves.length)),
            )
          : 0
      ];
    };
    if (difficulty === "easy" || (difficulty === "medium" && rng() < 0.35))
      return done(randomMove());
    let best = moves[0];
    const maxDepth = difficulty === "hard" ? 5 : 3;
    // Commit only fully searched depths; a timeout must not favor a partial root.
    for (let depth = 1; depth <= maxDepth; depth++) {
      let iterationBest = moves[0],
        bestScore = -Infinity;
      try {
        for (const c of moves) {
          const r = dropRaw(work, c, player);
          let score;
          try {
            score = search(
              work,
              depth - 1,
              bestScore,
              Infinity,
              false,
              player,
              budget,
            );
          } finally {
            work[r][c] = 0;
          }
          if (score > bestScore) {
            bestScore = score;
            iterationBest = c;
          }
        }
      } catch (error) {
        if (error !== LIMIT) throw error;
        stats.limited = true;
        break;
      }
      best = iterationBest;
      stats.depth = depth;
    }
    return done(best);
  }
  return { createBoard, drop, winner, chooseMove, validMoves, winningCells };
});
