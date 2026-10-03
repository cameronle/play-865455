const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function load(random = () => 0.4) {
  const c = {
    module: { exports: {} },
    Math: Object.assign(Object.create(Math), { random }),
    performance,
  };
  vm.runInNewContext(fs.readFileSync("connect-four/rules.js", "utf8"), c);
  return c.module.exports;
}
test("Connect Four rules reject invalid players and malformed or sparse grids without mutation", () => {
  const R = load(),
    b = R.createBoard();
  for (const p of [0, 3, -1, null, "1", NaN]) {
    const old = JSON.stringify(b);
    assert.equal(R.drop(b, 3, p), -1);
    assert.equal(JSON.stringify(b), old);
  }
  for (const bad of [
    null,
    [],
    Array(6),
    Array.from({ length: 6 }, () => Array(7)),
    Array.from({ length: 6 }, () => Array(8).fill(0)),
    [[3]],
    Array.from({ length: 6 }, () => Array(7).fill("0")),
  ]) {
    assert.doesNotThrow(() => {
      assert.equal(R.drop(bad, 3, 1), -1);
      assert.equal(R.winner(bad), 0);
      assert.equal(R.chooseMove(bad, 2, "hard"), -1);
    });
  }
});

test("Connect Four AI refuses to move after either player has connected four", () => {
  const R = load();
  for (const p of [1, 2]) {
    const b = R.createBoard();
    for (let c = 0; c < 4; c++) R.drop(b, c, p);
    assert.equal(R.chooseMove(b, 2, "hard"), -1);
  }
});

test("Even easy AI avoids supporting an immediate opponent win when a safe column exists", () => {
  const R = load(),
    b = R.createBoard();
  [2, 1, 1, 3, 2, 5, 3].forEach((c, i) => R.drop(b, c, 1 + (i % 2)));
  const old = JSON.stringify(b),
    c = R.chooseMove(b, 2, "easy");
  assert.ok(![0, 4].includes(c));
  assert.equal(JSON.stringify(b), old);
  R.drop(b, c, 2);
  for (let col = 0; col < 7; col++) {
    const n = b.map((r) => r.slice());
    if (R.drop(n, col, 1) >= 0) assert.notEqual(R.winner(n), 1);
  }
});

test("Hard AI obeys node and clock budgets with a legal non-mutating fallback", () => {
  const R = load(),
    b = R.createBoard(),
    before = JSON.stringify(b);
  let stats;
  const c = R.chooseMove(b, 2, "hard", {
    nodeBudget: 4,
    now: () => 0,
    onSearch: (s) => (stats = s),
  });
  assert.ok(c >= 0 && c < 7);
  assert.ok(stats && stats.nodes <= 4 && stats.limited);
  assert.equal(JSON.stringify(b), before);
  let tick = 0;
  R.chooseMove(b, 2, "hard", {
    maxTimeMs: 1,
    now: () => tick++,
    onSearch: (s) => (stats = s),
  });
  assert.ok(stats.limited);
  assert.equal(JSON.stringify(b), before);
});

test("64 seeded legal positions keep every difficulty legal and leave the caller board intact", () => {
  const R = load();
  for (let seed = 1; seed <= 64; seed++) {
    let state = seed,
      b = R.createBoard();
    const rng = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 7 + 2 * (seed % 8); i++) {
      const choices = R.validMoves(b).filter((c) => {
        const n = b.map((r) => r.slice());
        R.drop(n, c, 1 + (i % 2));
        return !R.winner(n);
      });
      if (!choices.length) break;
      R.drop(b, choices[Math.floor(rng() * choices.length)], 1 + (i % 2));
    }
    const before = JSON.stringify(b);
    for (const mode of ["easy", "medium", "hard"]) {
      let stats;
      const c = R.chooseMove(b, 2, mode, {
        rng,
        now: () => 0,
        onSearch: (s) => (stats = s),
      });
      assert.ok(R.validMoves(b).includes(c));
      assert.equal(JSON.stringify(b), before);
      assert.ok(stats.nodes <= 9000);
    }
  }
});
