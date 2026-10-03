"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { createTetris } = require("./helpers/tetris-runtime");

test("held soft drop advances by elapsed time at 15 30 60 and 120 Hz", () => {
  for (const hz of [15, 30, 60, 120]) {
    const app = start(createTetris());
    app.run("piece=newPiece('I')");
    app.event("keydown", { key: "ArrowDown" });
    app.frames(0.3, hz);
    assert.equal(app.snapshot().piece.y, 7, `soft-drop rows at ${hz} Hz`);
    assert.equal(app.snapshot().score, 7);
  }
});

test("line-clear points use the level at the start of the clear", () => {
  const app = start(createTetris());
  app.run("grid[19].fill('I');lines=9;level=1;clearLines()");
  const s = app.snapshot();
  assert.equal(s.lines, 10);
  assert.equal(s.level, 2);
  assert.equal(s.score, 100);
});

test("keyboard repeats cannot stack hard drops or toggle pause back on", () => {
  const app = start(createTetris());
  app.event("keydown", { key: " " });
  const s = app.snapshot();
  app.event("keydown", { key: " ", repeat: true });
  assert.deepEqual(app.snapshot(), s);
  app.event("keydown", { key: "p" });
  app.event("keydown", { key: "p", repeat: true });
  assert.equal(app.snapshot().state, "paused");
});
test("browser shortcuts text entry and focused-button space retain their native behavior", () => {
  const app = start(createTetris());
  const s = app.snapshot();
  for (const e of [
    { key: "p", ctrlKey: true },
    { key: "ArrowDown", target: { tagName: "INPUT" } },
    { key: " ", target: app.node("pauseButton") },
  ]) {
    assert.ok(!app.event("keydown", e).defaultPrevented);
    assert.deepEqual(app.snapshot(), s);
  }
});

test("blur and hidden visibility pause and clear the old soft-drop request", () => {
  for (const reason of ["blur", "doc:visibilitychange", "pagehide"]) {
    const app = start(createTetris());
    app.event("keydown", { key: "ArrowDown" });
    app.document.hidden = true;
    app.event(reason);
    assert.equal(app.snapshot().state, "paused");
    assert.equal(app.snapshot().softDropRequested, false);
    app.node("startButton").click();
    const y = app.snapshot().piece.y;
    app.frames(0.2);
    assert.equal(app.snapshot().piece.y, y);
  }
});
test("idle title pause and result screens stop animation scheduling", () => {
  const app = createTetris();
  const first = app.stats.frames;
  app.frames(0.2);
  assert.equal(app.stats.frames, first);
  start(app);
  app.node("pauseButton").click();
  const count = app.stats.frames;
  app.frames(1);
  assert.equal(app.stats.frames, count);
  assert.equal(app.node("pauseButton").textContent, "RESUME");
  app.node("startButton").click();
  app.run("gameOver()");
  const end = app.stats.frames;
  app.frames(0.5);
  assert.equal(app.stats.frames, end);
  assert.equal(app.node("pauseButton").disabled, true);
});

test("held horizontal controls repeat by elapsed time on keyboard and touch", () => {
  for (const hz of [15, 30, 60, 120])
    for (const input of ["keyboard", "touch"]) {
      const app = start(createTetris());
      app.run("piece=newPiece('I')");
      if (input === "keyboard") app.event("keydown", { key: "ArrowLeft" });
      else app.node("left").dispatch("pointerdown");
      assert.equal(app.snapshot().piece.x, 2);
      app.frames(0.27, hz);
      assert.equal(app.snapshot().piece.x, 0, `${input} repeat at ${hz} Hz`);
      if (input === "keyboard") app.event("keyup", { key: "ArrowLeft" });
      else app.event("pointerup", { pointerId: 1 });
      app.frames(0.3, hz);
      assert.equal(app.snapshot().piece.x, 0);
    }
});
test("releasing one of two soft-drop pointers retains the other hold", () => {
  const app = start(createTetris());
  const b = app.node("down");
  b.dispatch("pointerdown", { pointerId: 1 });
  b.dispatch("pointerdown", { pointerId: 2 });
  b.dispatch("pointerup", { pointerId: 1 });
  const y = app.snapshot().piece.y;
  app.frames(0.1);
  assert.equal(app.snapshot().piece.y, y + 2);
  b.dispatch("pointercancel", { pointerId: 2 });
  const end = app.snapshot().piece.y;
  app.frames(0.2);
  assert.equal(app.snapshot().piece.y, end);
});

test("hard drop starts the next piece with a fresh gravity interval", () => {
  const app = start(createTetris());
  app.frames(0.7);
  app.event("keydown", { key: " " });
  app.frames(0.2);
  assert.equal(app.snapshot().piece.y, 0);
});

test("unchanged active frames do not repaint the whole board", () => {
  const app = start(createTetris());
  const paints = app.stats.paints;
  app.frames(0.3);
  assert.equal(app.stats.paints, paints);
  app.frames(0.5);
  assert.equal(app.snapshot().piece.y, 1);
  assert.ok(app.stats.paints > paints);
});

test("dense-board painting reads CSS palette only twice", () => {
  const app = start(createTetris());
  app.run("grid[19].fill('O')");
  const reads = app.stats.styleReads;
  app.run("draw()");
  assert.equal(app.stats.styleReads - reads, 2);
});

test("start and resume focus the board while pause focuses its resume action", () => {
  const app = start(createTetris());
  assert.equal(app.document.activeElement?.id, "board");
  app.node("pauseButton").click();
  assert.equal(app.document.activeElement?.id, "startButton");
  app.node("startButton").click();
  assert.equal(app.document.activeElement?.id, "board");
});

test("disabled score storage does not prevent starting scoring or game over", () => {
  for (const options of [
    { blockRead: true },
    { blockWrite: true },
    { blockRead: true, blockWrite: true },
  ]) {
    const app = start(createTetris(options));
    assert.doesNotThrow(() => app.event("keydown", { key: " " }));
    app.run("gameOver()");
    assert.equal(app.snapshot().state, "over");
    assert.ok(app.snapshot().score > 0);
  }
});
test("invalid saved records never corrupt the score HUD", () => {
  for (const value of [
    "NaN",
    "Infinity",
    "-1",
    "1.5",
    "9007199254740992",
    "broken",
  ])
    assert.equal(
      createTetris({ storage: { [KEY]: value } }).snapshot().highScore,
      0,
    );
  assert.equal(
    createTetris({ storage: { [KEY]: "1234" } }).snapshot().highScore,
    1234,
  );
});
test("gravity carries its remainder at low and high frame rates", () => {
  for (const hz of [15, 30, 60, 120]) {
    const app = start(createTetris());
    app.frames(2.4, hz);
    assert.equal(app.snapshot().piece.y, 3);
    assert.equal(app.snapshot().score, 0);
  }
});
test("long suspended-frame gaps cannot skip half the board", () => {
  const app = start(createTetris());
  app.frame(10000);
  assert.equal(app.snapshot().piece.y, 0);
});
test("one through four lines compact the board and award classic level-scaled points", () => {
  for (let count = 1; count <= 4; count++) {
    const app = start(createTetris());
    app.run(
      `lines=10;level=2;for(let y=20-${count};y<20;y++)grid[y].fill('I');grid[19-${count}][0]='T';clearLines()`,
    );
    const s = app.snapshot();
    assert.equal(s.lines, 10 + count);
    assert.equal(s.score, [0, 100, 300, 500, 800][count] * 2);
    assert.equal(s.grid.length, 20);
    assert.equal(s.grid[19][0], "T");
  }
});
test("landing clears a completed row on the next frame without gravity delay", () => {
  const app = start(createTetris());
  app.run(
    "piece=newPiece('I');piece.y=19;grid[19].fill('J');for(let x=3;x<=6;x++)grid[19][x]=null",
  );
  app.frame(16);
  assert.equal(app.snapshot().lines, 1);
  assert.equal(app.snapshot().score, 100);
  assert.equal(app.snapshot().piece.y, 0);
});
test("all seven shapes retain four blocks after four rotations", () => {
  const app = createTetris();
  const shapes = JSON.parse(app.run("JSON.stringify(SHAPES)"));
  for (const [type, matrix] of Object.entries(shapes)) {
    app.run(
      `piece=newPiece('${type}');for(let i=0;i<4;i++)piece.matrix=rotate(piece.matrix)`,
    );
    assert.deepEqual(app.snapshot().piece.matrix, matrix);
    assert.equal(matrix.flat().filter(Boolean).length, 4);
  }
});
test("wall kicks rotate a vertical I piece back inside the right wall", () => {
  const app = start(createTetris());
  app.run(
    "piece=newPiece('I');piece.matrix=rotate(piece.matrix);piece.x=8;piece.y=4;turn()",
  );
  const s = app.snapshot();
  assert.equal(s.piece.matrix[0].length, 4);
  assert.ok(s.piece.x + 4 <= 10);
  assert.equal(app.run("collides(piece)"), false);
});
test("a blocked floor rotation leaves the board and piece unchanged", () => {
  const app = start(createTetris());
  app.run("piece=newPiece('T');piece.y=18");
  const s = app.snapshot();
  app.event("keydown", { key: "ArrowUp" });
  assert.deepEqual(app.snapshot(), s);
});
test("hard drop locks exactly four cells and awards two points per successful row", () => {
  const app = start(createTetris());
  app.run("piece=newPiece('I')");
  app.event("keydown", { key: " " });
  const s = app.snapshot();
  assert.equal(s.score, 38);
  assert.equal(s.grid.flat().filter(Boolean).length, 4);
  assert.equal(s.piece.y, 0);
});
test("blocked spawn shows final score and refuses further movement or pause", () => {
  const app = start(createTetris());
  app.run(
    "for(let x=3;x<=6;x++)grid[0][x]='J';piece=newPiece('I');piece.y=19;hardDrop()",
  );
  assert.equal(app.snapshot().state, "over");
  assert.equal(
    app.node("messageHint").textContent,
    "FINAL SCORE " + String(app.snapshot().score).padStart(6, "0"),
  );
  const s = app.snapshot();
  app.event("keydown", { key: "p" });
  app.event("keydown", { key: " " });
  app.node("left").dispatch("pointerdown");
  assert.deepEqual(app.snapshot(), s);
  app.node("startButton").click();
  assert.equal(app.snapshot().score, 0);
  assert.equal(app.snapshot().state, "playing");
});
test("keyboard activation of a direction button performs one accessible action", () => {
  const app = start(createTetris());
  const x = app.snapshot().piece.x;
  app.node("left").dispatch("click", { detail: 0 });
  assert.equal(app.snapshot().piece.x, x - 1);
  app.node("left").dispatch("click", { detail: 1 });
  assert.equal(app.snapshot().piece.x, x - 1);
});
test("opposing held directions cancel until one is released", () => {
  const app = start(createTetris());
  app.event("keydown", { key: "ArrowLeft" });
  app.event("keydown", { key: "ArrowRight" });
  const x = app.snapshot().piece.x;
  app.frames(0.3);
  assert.equal(app.snapshot().piece.x, x);
  app.event("keyup", { key: "ArrowLeft" });
  app.frames(0.25);
  assert.ok(app.snapshot().piece.x > x);
});
const KEY = "classic-tetris-high-score";
function start(app) {
  app.node("startButton").click();
  return app;
}
test("a new record is persisted during play and survives a fresh runtime", () => {
  const app = start(createTetris());
  app.event("keydown", { key: " " });
  const score = app.snapshot().score;
  assert.ok(score > 0);
  assert.equal(app.store.get(KEY), String(score));
  assert.equal(
    createTetris({ storage: Object.fromEntries(app.store) }).snapshot()
      .highScore,
    score,
  );
});
