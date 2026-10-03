const test = require("node:test"),
  assert = require("node:assert/strict");
const { createMinesweeper } = require("./helpers/minesweeper-runtime");
test("invalid saved level and record values fall back without unlocking patches", () => {
  const g = createMinesweeper({
    storage: {
      "minesweeper-level-v1": "0.5",
      "minesweeper-completed-v1": JSON.stringify(["false", {}, true]),
      "minesweeper-best-times-v1": JSON.stringify([-4, "9", {}, null]),
    },
  });
  assert.equal(g.snapshot().levelIndex, 0);
  assert.deepEqual(g.snapshot().completed.slice(0, 3), [false, false, true]);
  assert.equal(g.get("best").textContent, "---");
});
test("restart invalidates every pending long press", () => {
  const g = createMinesweeper();
  g.start();
  g.cell(0).dispatch("pointerdown");
  g.advance(100);
  g.get("new").click();
  g.advance(600);
  assert.equal(g.snapshot().flags, 0);
  assert.equal(g.snapshot().started, false);
});
test("a zero-second best survives a slower replay", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  for (const c of g.snapshot().cells) if (!c.mine) g.open(c.i);
  assert.equal(g.snapshot().bestTimes[0], 0);
  g.get("new").click();
  g.open(40);
  g.advance(2200);
  for (const c of g.snapshot().cells) if (!c.mine) g.open(c.i);
  assert.equal(g.snapshot().bestTimes[0], 0);
  assert.equal(g.get("best").textContent, "000");
});
test("clears longer than 999 seconds keep the real duration", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  g.advance(1250500);
  for (const c of g.snapshot().cells) if (!c.mine) g.open(c.i);
  assert.equal(g.snapshot().bestTimes[0], 1250);
  assert.equal(g.get("time").textContent, "1250");
});
test("flag mode offers safe short-tap flagging without starting the clock", () => {
  const g = createMinesweeper();
  g.start();
  g.get("flagMode").click();
  const c = g.cell(0);
  c.dispatch("pointerdown");
  c.dispatch("pointerup");
  c.dispatch("click", { detail: 1 });
  assert.equal(g.snapshot().flags, 1);
  assert.equal(g.snapshot().started, false);
  assert.match(c.getAttribute("aria-label"), /Flagged/);
  c.dispatch("pointerdown");
  c.dispatch("pointerup");
  assert.equal(g.snapshot().flags, 0);
  g.get("flagMode").click();
  c.click();
  assert.equal(g.snapshot().started, true);
});
test("flags cannot exceed the hazard count and unflagging frees a slot", () => {
  const g = createMinesweeper();
  g.start();
  for (let i = 0; i < 9; i++) g.flag(i);
  assert.equal(g.snapshot().flags, 8);
  assert.equal(g.get("mines").textContent, "000");
  g.flag(0);
  g.flag(8);
  assert.equal(g.snapshot().flags, 8);
  assert.equal(g.snapshot().cells[8].flag, true);
});
test("tapping a numbered patch chords when its surrounding mines are correctly flagged", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  let st = g.snapshot();
  const neighbors = (i) =>
    st.cells.filter(
      (c) =>
        c.i !== i &&
        Math.abs(Math.floor(c.i / st.cols) - Math.floor(i / st.cols)) <= 1 &&
        Math.abs((c.i % st.cols) - (i % st.cols)) <= 1,
    );
  const clue = st.cells.find(
    (c) => c.open && c.n && neighbors(c.i).some((n) => !n.open && !n.mine),
  );
  assert.ok(clue);
  for (const c of neighbors(clue.i)) if (c.mine) g.flag(c.i);
  const before = g.snapshot().cells.filter((c) => c.open).length;
  g.cell(clue.i).click();
  assert.ok(g.snapshot().cells.filter((c) => c.open).length > before);
  assert.notEqual(g.get("status").textContent, "BOOM");
});
test("keyboard arrows retain patch focus and F toggles a flag", () => {
  const g = createMinesweeper();
  g.start();
  g.cell(0).focus();
  g.cell(0).dispatch("keydown", { key: "ArrowRight" });
  assert.equal(g.document.activeElement, g.cell(1));
  g.cell(1).dispatch("keydown", { key: "f" });
  assert.equal(g.snapshot().flags, 1);
  g.cell(1).dispatch("keydown", { key: "f", repeat: true });
  assert.equal(g.snapshot().flags, 1);
  g.cell(1).dispatch("keydown", { key: "f", ctrlKey: true });
  assert.equal(g.snapshot().flags, 1);
  g.cell(1).dispatch("keydown", { key: "f" });
  g.cell(1).click();
  assert.equal(g.document.activeElement, g.cell(1));
  assert.equal(g.snapshot().started, true);
});
test("large-patch mode changes only cell sizing and cancels pending input", () => {
  const g = createMinesweeper();
  g.start();
  g.cell(0).dispatch("pointerdown");
  g.get("zoom").click();
  g.advance(600);
  assert.equal(g.snapshot().flags, 0);
  assert.equal(g.get("grid").classList.contains("large"), true);
  assert.equal(g.get("zoom").getAttribute("aria-pressed"), "true");
  g.get("zoom").click();
  assert.equal(g.get("grid").classList.contains("large"), false);
});
test("returning to a saved patch shows its actual level in the title", () => {
  const g = createMinesweeper({
    storage: {
      "minesweeper-completed-v1": JSON.stringify(Array(20).fill(true)),
      "minesweeper-level-v1": "19",
    },
  });
  assert.match(g.get("hint").textContent, /LEVEL 20/);
  assert.equal(g.snapshot().cells.length, 384);
});
test("the level picker cancels held input and returns keyboard focus on close", () => {
  const g = createMinesweeper();
  g.start();
  g.cell(0).dispatch("pointerdown");
  g.get("levels").click();
  g.advance(700);
  assert.equal(g.snapshot().flags, 0);
  assert.equal(g.document.activeElement.id, "closeLevels");
  g.get("closeLevels").click();
  assert.equal(g.document.activeElement.id, "levels");
  assert.equal(g.get("levelsPanel").classList.contains("hide"), true);
});
test("terminal victory clears pending input timers as well as the clock", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  const closed = g.snapshot().cells.find((c) => !c.open && !c.mine);
  g.cell(closed.i).dispatch("pointerdown");
  for (const c of g.snapshot().cells) if (!c.mine) g.open(c.i);
  assert.equal(g.timerCount(), 0);
});
test("overlays keep hidden patches out of keyboard navigation and focus their action", () => {
  const g = createMinesweeper();
  assert.equal(g.get("grid").inert, true);
  assert.equal(g.document.activeElement.id, "start");
  g.start();
  assert.equal(g.get("grid").inert, false);
  g.open(40);
  for (const c of g.snapshot().cells) if (!c.mine) g.open(c.i);
  assert.equal(g.get("grid").inert, true);
  assert.equal(g.document.activeElement.id, "start");
});
test("storage denial does not prevent Minesweeper from booting or clearing", () => {
  const g = createMinesweeper({ blockRead: true, blockWrite: true });
  g.start();
  g.open(40);
  assert.equal(g.snapshot().started, true);
  for (const c of g.snapshot().cells) if (!c.mine) g.open(c.i);
  assert.equal(g.snapshot().over, true);
  assert.equal(g.get("status").textContent, "CLEAR");
});
