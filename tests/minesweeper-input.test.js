const test = require("node:test"),
  assert = require("node:assert/strict");
const { createMinesweeper } = require("./helpers/minesweeper-runtime");
test("stationary touch and pen holds flag exactly once without a follow-up reveal", () => {
  for (const pointerType of ["touch", "pen"]) {
    const g = createMinesweeper();
    g.start();
    const c = g.cell(0);
    c.dispatch("pointerdown", { pointerType });
    g.advance(1200);
    c.dispatch("pointerup", { pointerType });
    c.dispatch("click", { detail: 1 });
    assert.equal(g.snapshot().flags, 1);
    assert.equal(g.snapshot().started, false);
    assert.equal(g.cell(0), c);
    assert.equal(g.timerCount(), 0);
  }
});
test("a short native tap starts the game once and keeps the tapped node focused", () => {
  const g = createMinesweeper();
  g.start();
  const c = g.cell(40);
  c.dispatch("pointerdown");
  g.advance(100);
  c.dispatch("pointerup");
  const before = g.snapshot();
  c.dispatch("click", { detail: 1 });
  assert.deepEqual(g.snapshot(), before);
  assert.equal(before.started, true);
  assert.equal(before.cells[40].open, true);
  assert.equal(g.document.activeElement.dataset.index, "40");
});
test("pointer cancellation and lost capture have no secondary action", () => {
  for (const event of ["pointercancel", "lostpointercapture"]) {
    const g = createMinesweeper();
    g.start();
    g.cell(0).dispatch("pointerdown");
    g.advance(50);
    g.cell(0).dispatch(event);
    g.advance(1000);
    g.cell(0).dispatch("click", { detail: 1 });
    assert.equal(g.snapshot().flags, 0);
    assert.equal(g.snapshot().started, false);
  }
});
test("a second pointer cannot steal or cancel the first hold", () => {
  const g = createMinesweeper();
  g.start();
  g.cell(0).dispatch("pointerdown", { pointerId: 1 });
  g.cell(1).dispatch("pointerdown", { pointerId: 2 });
  g.cell(1).dispatch("pointerup", { pointerId: 2 });
  g.advance(550);
  g.cell(0).dispatch("pointerup", { pointerId: 1 });
  assert.equal(g.snapshot().cells[0].flag, true);
  assert.equal(g.snapshot().cells[1].flag, false);
  assert.equal(g.snapshot().started, false);
});
test("blur pagehide and hidden-page lifecycle cancel pending holds", () => {
  for (const event of ["blur", "pagehide", "visibilitychange"]) {
    const g = createMinesweeper();
    g.start();
    g.cell(0).dispatch("pointerdown");
    if (event === "visibilitychange") g.document.hidden = true;
    g.emit(event);
    g.advance(800);
    assert.equal(g.snapshot().flags, 0);
  }
});
test("synthetic pointer capture failures do not break the input lifecycle", () => {
  const g = createMinesweeper({ captureThrows: true });
  g.start();
  g.cell(0).dispatch("pointerdown");
  g.advance(600);
  g.cell(0).dispatch("pointerup");
  assert.equal(g.snapshot().flags, 1);
});
test("secondary mouse buttons never dig and right click flags a closed patch", () => {
  const g = createMinesweeper();
  g.start();
  const c = g.cell(0);
  c.dispatch("pointerdown", { pointerType: "mouse", button: 2 });
  c.dispatch("pointerup", { pointerType: "mouse", button: 2 });
  assert.equal(g.snapshot().started, false);
  const event = c.dispatch("contextmenu");
  assert.equal(event.defaultPrevented, true);
  assert.equal(g.snapshot().flags, 1);
});
test("wrong chord flags can hit a hazard and never claim a clear", () => {
  const g = createMinesweeper();
  g.start();
  g.open(40);
  const s = g.snapshot(),
    near = (i) =>
      s.cells.filter(
        (c) =>
          c.i !== i &&
          Math.abs(Math.floor(c.i / s.cols) - Math.floor(i / s.cols)) <= 1 &&
          Math.abs((c.i % s.cols) - (i % s.cols)) <= 1,
      );
  const n = s.cells.find(
    (c) =>
      c.open &&
      c.n &&
      near(c.i).filter((x) => !x.open && !x.mine).length >= c.n,
  );
  assert.ok(n);
  for (const c of near(n.i)
    .filter((x) => !x.open && !x.mine)
    .slice(0, n.n))
    g.flag(c.i);
  g.cell(n.i).click();
  assert.equal(g.get("status").textContent, "BOOM");
  assert.equal(g.snapshot().completed[0], false);
});
test("the 20-level pack completes and round-trips unlocks and independent records", () => {
  const g = createMinesweeper();
  g.start();
  for (let lv = 0; lv < 20; lv++) {
    assert.equal(g.snapshot().levelIndex, lv);
    g.open(Math.floor(g.snapshot().cells.length / 2));
    g.advance((lv + 1) * 1000);
    for (const c of g.snapshot().cells)
      if (!c.mine && !g.snapshot().cells[c.i].open) g.open(c.i);
    assert.equal(g.get("status").textContent, "CLEAR");
    assert.equal(
      g.get("start").textContent,
      lv === 19 ? "PLAY AGAIN" : "NEXT LEVEL",
    );
    if (lv < 19) g.get("start").click();
  }
  assert.equal(g.snapshot().completed.filter(Boolean).length, 20);
  assert.deepEqual(
    g.snapshot().bestTimes,
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
  const reload = createMinesweeper({ storage: Object.fromEntries(g.store) });
  assert.equal(reload.snapshot().levelIndex, 19);
  assert.equal(reload.get("best").textContent, "020");
  reload.get("levels").click();
  const buttons = reload
    .get("levelList")
    .children.filter((b) => b.tagName === "BUTTON");
  assert.equal(buttons.length, 20);
  assert.equal(buttons.filter((b) => b.disabled).length, 0);
  buttons[0].click();
  assert.equal(reload.get("best").textContent, "001");
  assert.equal(reload.snapshot().cells.length, 81);
});
