const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { createMinesweeper } = require("./helpers/minesweeper-runtime");
const { levels } = require("../minesweeper/levels");
const unlocked = JSON.stringify(Array(20).fill(true));
const adjacent = (i, j, cols) =>
  i !== j &&
  Math.abs(Math.floor(i / cols) - Math.floor(j / cols)) <= 1 &&
  Math.abs((i % cols) - (j % cols)) <= 1;
test("first reveal and its neighborhood are safe with exact mine and clue counts: 720 seeded boards", () => {
  for (let level = 0; level < 20; level++)
    for (let seed = 1; seed <= 12; seed++)
      for (const i of [
        0,
        Math.floor(levels[level].rows / 2) * levels[level].cols +
          Math.floor(levels[level].cols / 2),
        levels[level].rows * levels[level].cols - 1,
      ]) {
        const g = createMinesweeper({
          seed,
          storage: {
            "minesweeper-completed-v1": unlocked,
            "minesweeper-level-v1": String(level),
          },
        });
        g.start();
        g.open(i);
        const s = g.snapshot();
        assert.equal(s.cells.filter((c) => c.mine).length, levels[level].mines);
        assert.equal(s.cells[i].n, 0);
        assert.equal(s.cells[i].open, true);
        assert.equal(s.over, false);
        for (const c of s.cells) {
          if (adjacent(i, c.i, s.cols)) assert.equal(c.mine, false);
          assert.equal(
            c.n,
            s.cells.filter((n) => n.mine && adjacent(c.i, n.i, s.cols)).length,
          );
        }
      }
});
test("a flagged safe patch cannot substitute for revealing it", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  const safe = g.snapshot().cells.find((c) => !c.open && !c.mine);
  assert.ok(safe);
  g.flag(safe.i);
  for (const c of g.snapshot().cells)
    if (!c.mine && !g.snapshot().cells[c.i].open) g.open(c.i);
  assert.equal(g.snapshot().over, false);
  g.flag(safe.i);
  g.open(safe.i);
  assert.equal(g.get("status").textContent, "CLEAR");
  assert.equal(g.snapshot().flags, 8);
});
test("opening a hazard ends play, freezes time and reveals all hazards without recording a win", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  g.advance(2200);
  g.open(g.snapshot().cells.find((c) => c.mine).i);
  assert.equal(g.get("status").textContent, "BOOM");
  assert.equal(g.snapshot().cells.filter((c) => c.mine && !c.open).length, 0);
  const before = g.snapshot();
  g.open(0);
  g.flag(0);
  g.advance(10000);
  assert.deepEqual(g.snapshot(), before);
  assert.equal(g.get("time").textContent, "002");
  assert.equal(before.completed[0], false);
});
test("mobile layout stacks the board and status panel with contained panning", () => {
  const css = fs.readFileSync("minesweeper/style.css", "utf8");
  assert.match(
    css,
    /@media\s*\(max-width:\s*520px\)[\s\S]*?\.layout\s*\{[^}]*flex-direction:\s*column/,
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*520px\)[\s\S]*?\.gamebox\s*\{[^}]*width:\s*100%/,
  );
  assert.match(css, /-webkit-user-select:\s*none/);
  assert.match(css, /-webkit-touch-callout:\s*none/);
});
