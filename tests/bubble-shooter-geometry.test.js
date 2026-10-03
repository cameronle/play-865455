"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const R = require("../bubble-shooter/rules.js");
test("neighbor graph is reciprocal and matches geometric proximity in both parities", () => {
  for (let p = 0; p < 2; p++)
    for (let r = 0; r < 13; r++)
      for (let c = 0; c < 8; c++)
        for (const [nr, nc] of R.neighbors(r, c, p)) {
          if (!R.inside(R.emptyGrid(13, 8), nr, nc)) continue;
          assert.ok(
            R.neighbors(nr, nc, p).some(([ar, ac]) => ar === r && ac === c),
          );
          const a = R.cellCenter(r, c, p),
            b = R.cellCenter(nr, nc, p);
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 57);
        }
});
test("multi-bounce flight conserves remaining distance across 30/60/120/144Hz", () => {
  for (const side of [-1, 1]) {
    const grid = R.emptyGrid(13, 8),
      angle = Math.PI / 12;
    const start = {
        x: 240,
        y: 675,
        vx: side * Math.cos(angle),
        vy: -Math.sin(angle),
      },
      whole = R.advanceShot(grid, start, 1500);
    for (const hz of [30, 60, 120, 144]) {
      let shot = start;
      for (let n = 0; n < hz; n++)
        shot = R.advanceShot(grid, shot, 1500 / hz).shot;
      assert.ok(
        Math.hypot(shot.x - whole.shot.x, shot.y - whole.shot.y) < 1e-7,
      );
      assert.ok(shot.x >= 27 && shot.x <= 453);
    }
  }
});
test("attachment only uses a vacant neighboring cell on the incoming side", () => {
  for (let p = 0; p < 2; p++) {
    const g = R.emptyGrid(13, 8);
    g[4][3] = "mint";
    const center = R.cellCenter(4, 3, p),
      hit = { kind: "bubble", row: 4, col: 3, x: center.x, y: center.y + 50 },
      cell = R.attachmentCell(g, hit, p);
    assert.ok(
      R.neighbors(4, 3, p).some(([r, c]) => r === cell.row && c === cell.col),
    );
    assert.ok(R.cellCenter(cell.row, cell.col, p).y >= center.y);
    assert.equal(g[cell.row][cell.col], null);
  }
});
test("zero velocity and null collision are harmless", () => {
  assert.equal(
    R.advanceShot(R.emptyGrid(), { x: 240, y: 675, vx: 0, vy: 0 }, 50).hit,
    null,
  );
  assert.equal(R.attachmentCell(R.emptyGrid(), null), null);
});
