const test = require("node:test"),
  assert = require("node:assert/strict"),
  { boot } = require("./helpers/connect-four-runtime.js");
const discs = (g) => g.snapshot().board.flat().filter(Boolean).length;
test("Reset invalidates a delayed computer opening even if its callback was already delivered", () => {
  const g = boot({ fixedAi: true });
  g.nodes.firstPlayer.value = "computer";
  g.test.newGame();
  const stale = g.pending()[0];
  assert.ok(stale);
  g.nodes.firstPlayer.value = "human";
  g.test.newGame();
  stale();
  g.flush();
  assert.equal(discs(g), 0);
  assert.equal(g.snapshot().turn, 1);
  assert.equal(g.snapshot().busy, false);
});

test("Undo while thinking cancels the outstanding reply and returns the whole human turn", () => {
  const g = boot({ fixedAi: true });
  g.cols[3].click();
  const stale = g.pending()[0];
  g.nodes.undoButton.click();
  stale();
  g.flush();
  assert.equal(discs(g), 0);
  assert.equal(g.pendingCount(), 0);
  assert.equal(g.snapshot().turn, 1);
});

test("Review undo never refunds or repeatedly farms a settled result", () => {
  const g = boot({ fixedAi: true });
  for (const c of [0, 1, 2]) {
    g.cols[c].click();
    g.flush();
  }
  g.cols[3].click();
  assert.equal(g.snapshot().record.wins, 1);
  g.nodes.undoButton.click();
  assert.equal(g.snapshot().record.wins, 1);
  assert.equal(g.snapshot().recorded, true);
  g.cols[3].click();
  assert.equal(g.snapshot().record.wins, 1);
});

test("Blocked record writes never interrupt result rendering", () => {
  const g = boot({ fixedAi: true, storageThrows: true });
  for (const c of [0, 1, 2]) {
    g.cols[c].click();
    g.flush();
  }
  assert.doesNotThrow(() => g.cols[3].click());
  assert.equal(g.snapshot().record.wins, 1);
  assert.ok(g.cols.every((c) => c.disabled));
});

test("Records reject strings, negatives, fractions, containers and non-safe integers", () => {
  for (const record of [
    { wins: "3", losses: -2, draws: 1.5 },
    { wins: [], losses: {}, draws: Number.MAX_SAFE_INTEGER + 1 },
    null,
    [],
    7,
  ]) {
    const g = boot({ storage: { connectFourRecord: JSON.stringify(record) } });
    assert.deepEqual(g.snapshot().record, { wins: 0, losses: 0, draws: 0 });
  }
  const g = boot({
    storage: {
      connectFourRecord: JSON.stringify({ wins: 4, losses: 2, draws: 1 }),
    },
  });
  assert.deepEqual(g.snapshot().record, { wins: 4, losses: 2, draws: 1 });
});

test("Hotkeys do not hijack native select fields, browser chords or repeat placement", () => {
  const g = boot({ fixedAi: true });
  g.cols[2].click();
  g.flush();
  const before = discs(g);
  g.key("n", { ctrlKey: true });
  assert.equal(discs(g), before);
  g.key("n", { target: g.nodes.difficulty });
  assert.equal(discs(g), before);
  g.key("1", { repeat: true });
  g.flush();
  assert.equal(discs(g), before);
  g.key("u", { altKey: true });
  assert.equal(discs(g), before);
});

test("Record increments saturate at the largest safe integer", () => {
  const g = boot({
    fixedAi: true,
    storage: {
      connectFourRecord: JSON.stringify({
        wins: Number.MAX_SAFE_INTEGER,
        losses: 0,
        draws: 0,
      }),
    },
  });
  for (const c of [0, 1, 2]) {
    g.cols[c].click();
    g.flush();
  }
  g.cols[3].click();
  assert.equal(g.snapshot().record.wins, Number.MAX_SAFE_INTEGER);
});

test("Manual and automatic pause suspend an AI reply until explicit resume", () => {
  const g = boot({ fixedAi: true });
  g.cols[3].click();
  const stale = g.pending()[0];
  g.nodes.pauseButton.click();
  stale();
  g.flush();
  assert.equal(discs(g), 1);
  assert.equal(g.snapshot().paused, true);
  g.cols[1].click();
  assert.equal(discs(g), 1);
  g.nodes.resumeButton.click();
  g.flush();
  assert.equal(discs(g), 2);
  assert.equal(g.snapshot().turn, 1);
  g.document.hidden = true;
  g.emit("document", "visibilitychange");
  assert.equal(g.snapshot().paused, true);
  g.document.hidden = false;
  g.emit("document", "visibilitychange");
  g.flush();
  assert.equal(discs(g), 2);
  assert.equal(g.snapshot().paused, true);
  g.nodes.resumeButton.click();
  g.cols[2].click();
  g.flush();
  assert.equal(discs(g), 4);
});

test("Native new and setting changes preserve an active board when confirmation is declined", () => {
  const g = boot({ fixedAi: true, confirm: false });
  g.cols[3].click();
  g.flush();
  const before = JSON.stringify(g.snapshot().board);
  g.nodes.newButton.click();
  assert.equal(JSON.stringify(g.snapshot().board), before);
  g.nodes.difficulty.value = "hard";
  g.nodes.difficulty.dispatch("change");
  assert.equal(g.nodes.difficulty.value, "medium");
  assert.equal(JSON.stringify(g.snapshot().board), before);
  g.setConfirm(true);
  g.nodes.newButton.click();
  assert.equal(discs(g), 0);
});

test("An unfinished round restores paused, including a pending AI reply and whole-turn undo", () => {
  const g = boot({ fixedAi: true });
  g.nodes.difficulty.value = "hard";
  g.nodes.difficulty.dispatch("change");
  g.cols[3].click();
  const saved = g.storage.get("connectFourGame-v1");
  assert.ok(saved);
  assert.deepEqual(JSON.parse(saved).moves, [3]);
  const r = boot({ fixedAi: true, storage: { "connectFourGame-v1": saved } });
  assert.equal(discs(r), 1);
  assert.equal(r.snapshot().paused, true);
  assert.equal(r.nodes.difficulty.value, "hard");
  r.flush();
  assert.equal(discs(r), 1);
  r.nodes.resumeButton.click();
  r.flush();
  assert.equal(discs(r), 2);
  r.nodes.undoButton.click();
  assert.equal(discs(r), 0);
  assert.equal(r.storage.has("connectFourGame-v1"), false);
});

test("Primary board taps commit on release; drags, cancellation and secondary pointers do not", () => {
  const g = boot({ fixedAi: true });
  g.pointer("pointerdown", 3);
  assert.equal(discs(g), 0);
  g.pointer("pointerup", 3);
  assert.equal(discs(g), 1);
  g.nodes.board.dispatch("click", { target: g.cells()[38], detail: 1 });
  assert.equal(discs(g), 1);
  g.flush();
  g.nodes.undoButton.click();
  g.pointer("pointerdown", 3);
  g.pointer("pointermove", 3, { clientX: 380 });
  g.pointer("pointerup", 3);
  assert.equal(discs(g), 0);
  for (const e of ["pointercancel", "lostpointercapture"]) {
    g.pointer("pointerdown", 3);
    g.pointer(e, 3);
    g.pointer("pointerup", 3);
    assert.equal(discs(g), 0);
  }
  g.pointer("pointerdown", 3, { button: 2 });
  g.pointer("pointerup", 3, { button: 2 });
  assert.equal(discs(g), 0);
  g.pointer("pointerdown", 3);
  g.pointer("pointerdown", 3, { pointerId: 2, isPrimary: false });
  g.pointer("pointerup", 3);
  assert.equal(discs(g), 0);
});

test("Keyboard selection is visible and Enter only drops on the focused board", () => {
  const g = boot({ fixedAi: true });
  g.nodes.board.focus();
  g.key("ArrowRight");
  assert.equal(g.snapshot().selected, 4);
  g.key("Enter");
  assert.equal(discs(g), 1);
  g.flush();
  g.key("Enter", { target: g.nodes.newButton });
  assert.equal(discs(g), 2);
  assert.ok(g.nodes.board.getAttribute("aria-label").includes("column 5"));
  assert.equal(g.cells().length, 42);
  assert.equal(
    g.cells().filter((c) => c.getAttribute("aria-colindex") === "5").length,
    6,
  );
});

test("Final board can be inspected without reopening input or adding another result", () => {
  const g = boot({ fixedAi: true });
  for (const c of [0, 1, 2]) {
    g.cols[c].click();
    g.flush();
  }
  g.cols[3].click();
  g.nodes.viewButton.click();
  assert.equal(g.nodes.resultOverlay.classList.contains("show"), false);
  assert.equal(
    g.cells().filter((c) => c.classList.contains("winning")).length,
    4,
  );
  assert.equal(g.cells().filter((c) => c.classList.contains("last")).length, 1);
  g.cols[4].click();
  g.key("5");
  g.flush();
  assert.equal(discs(g), 7);
  assert.equal(g.snapshot().record.wins, 1);
});

test("Clearing game data deletes both record and progress, and stale events cannot recreate either", () => {
  const g = boot({
    fixedAi: true,
    storage: {
      connectFourRecord: JSON.stringify({ wins: 4, losses: 2, draws: 0 }),
      otherGame: "keep",
    },
  });
  g.cols[2].click();
  const stale = g.pending()[0];
  const btn = g.runSharedClear();
  assert.ok(btn);
  btn.click();
  stale();
  g.emit("window", "pagehide");
  assert.equal(g.storage.has("connectFourRecord"), false);
  assert.equal(g.storage.has("connectFourGame-v1"), false);
  assert.equal(g.storage.get("otherGame"), "keep");
});

test("Full-column AI fallback still makes exactly one legal reply", () => {
  const g = boot({ fixedAi: true });
  for (let i = 0; i < 3; i++) {
    g.cols[6].click();
    g.flush();
  }
  g.cols[0].click();
  g.flush();
  assert.equal(discs(g), 8);
  assert.equal(g.snapshot().turn, 1);
  assert.equal(g.snapshot().busy, false);
});

test("Large records stay compact but expose exact accessible counts", () => {
  const g = boot({
    storage: {
      connectFourRecord: JSON.stringify({
        wins: Number.MAX_SAFE_INTEGER,
        losses: 4000000,
        draws: 10000,
      }),
    },
  });
  assert.ok(g.nodes.wins.textContent.length <= 6);
  assert.ok(
    g.nodes.wins
      .getAttribute("aria-label")
      .includes(String(Number.MAX_SAFE_INTEGER)),
  );
  assert.ok(g.nodes.losses.textContent.length <= 6);
});

test("Accessible board groups exactly seven cells into each of six rows", () => {
  const g = boot();
  assert.equal(g.nodes.board.children.length, 6);
  assert.ok(
    g.nodes.board.children.every(
      (r) => r.getAttribute("role") === "row" && r.children.length === 7,
    ),
  );
});

test("Reset restores the default column cursor, not the previous round selection", () => {
  const g = boot({ fixedAi: true });
  g.nodes.board.focus();
  g.key("ArrowRight");
  assert.equal(g.snapshot().selected, 4);
  g.nodes.newButton.click();
  assert.equal(g.snapshot().selected, 3);
});

test("Corrupt, excessive, terminal or illegal saves fall back to a clean board", () => {
  const good = {
    version: 1,
    difficulty: "hard",
    first: "human",
    moves: [3],
    review: false,
  };
  for (const raw of [
    "bad",
    "x".repeat(3000),
    JSON.stringify(null),
    JSON.stringify({ ...good, version: 2 }),
    JSON.stringify({ ...good, moves: [7] }),
    JSON.stringify({ ...good, moves: ["3"] }),
    JSON.stringify({ ...good, moves: [NaN] }),
    JSON.stringify({ ...good, moves: Array(7).fill(3) }),
    JSON.stringify({ ...good, moves: [0, 6, 1, 6, 2, 6, 3] }),
    JSON.stringify({ ...good, moves: Array(43).fill(1) }),
    JSON.stringify({ ...good, difficulty: "other" }),
    JSON.stringify({ ...good, first: "bad" }),
    JSON.stringify({ ...good, review: "false" }),
  ]) {
    const g = boot({ storage: { "connectFourGame-v1": raw } });
    assert.equal(discs(g), 0);
    assert.equal(g.snapshot().paused, false);
    assert.equal(g.storage.has("connectFourGame-v1"), false);
  }
});
test("Computer-first resume and undo keep the original opening disc", () => {
  const g = boot({ fixedAi: true });
  g.nodes.firstPlayer.value = "computer";
  g.nodes.firstPlayer.dispatch("change");
  g.flush();
  assert.equal(discs(g), 1);
  g.cols[1].click();
  g.flush();
  const r = boot({ fixedAi: true, storage: Object.fromEntries(g.storage) });
  assert.equal(discs(r), 3);
  r.nodes.resumeButton.click();
  r.nodes.undoButton.click();
  assert.equal(discs(r), 1);
  assert.equal(r.snapshot().turn, 1);
});
test("Review flag survives reload, so replaying a winning move does not add another result", () => {
  const g = boot({ fixedAi: true });
  for (const c of [0, 1, 2]) {
    g.cols[c].click();
    g.flush();
  }
  g.cols[3].click();
  g.nodes.undoButton.click();
  const r = boot({ fixedAi: true, storage: Object.fromEntries(g.storage) });
  r.nodes.resumeButton.click();
  r.cols[3].click();
  assert.equal(r.snapshot().record.wins, 1);
  assert.equal(r.snapshot().recorded, true);
  assert.equal(r.storage.has("connectFourGame-v1"), false);
});

test("Changing a native select never steals its keyboard focus into the board", () => {
  const g = boot();
  g.nodes.difficulty.focus();
  g.nodes.difficulty.value = "hard";
  g.nodes.difficulty.dispatch("change");
  assert.equal(g.document.activeElement, g.nodes.difficulty);
  g.key("Enter", { target: g.nodes.difficulty });
  assert.equal(discs(g), 0);
});

test("Data clearing freezes all restart and resume paths before reload", () => {
  const g = boot({ fixedAi: true });
  g.cols[3].click();
  g.emit("window", "game-data-clearing");
  g.storage.clear();
  g.nodes.newButton.click();
  g.nodes.resumeButton.click();
  g.cols[2].click();
  g.flush();
  assert.equal(g.storage.size, 0);
  assert.equal(discs(g), 1);
});

test("A legal 41-move save produces a full-board draw and records it once", () => {
  const sequence = require("./fixtures/connect-four-draw.json").sequence;
  const g = boot({
    storage: {
      "connectFourGame-v1": JSON.stringify({
        version: 1,
        difficulty: "hard",
        first: "human",
        moves: sequence.slice(0, 41),
        review: false,
      }),
    },
  });
  g.nodes.resumeButton.click();
  g.flush();
  assert.equal(discs(g), 42);
  assert.equal(g.nodes.resultTitle.textContent, "DRAW");
  assert.equal(g.snapshot().record.draws, 1);
  assert.equal(g.snapshot().record.wins, 0);
  assert.equal(g.snapshot().record.losses, 0);
  assert.equal(
    g.cells().filter((c) => c.classList.contains("winning")).length,
    0,
  );
  g.nodes.viewButton.click();
  g.flush();
  assert.equal(g.snapshot().record.draws, 1);
});
test("Computer takes its immediate win before blocking a human threat", () => {
  const g = boot({
    storage: {
      "connectFourGame-v1": JSON.stringify({
        version: 1,
        difficulty: "hard",
        first: "human",
        moves: [0, 6, 1, 6, 2, 6, 5],
        review: false,
      }),
    },
  });
  g.nodes.resumeButton.click();
  g.flush();
  assert.equal(g.nodes.resultTitle.textContent, "COMPUTER WINS");
  assert.equal(g.snapshot().record.losses, 1);
  assert.equal(
    g.cells().filter((c) => c.classList.contains("winning")).length,
    4,
  );
  g.nodes.undoButton.click();
  assert.equal(g.snapshot().record.losses, 1);
});

test("Undo restores the pre-human column cursor even after reload", () => {
  const g = boot({ fixedAi: true });
  g.nodes.board.focus();
  g.key("ArrowRight");
  g.cols[0].click();
  g.flush();
  g.cols[1].click();
  const r = boot({ fixedAi: true, storage: Object.fromEntries(g.storage) });
  r.nodes.resumeButton.click();
  r.flush();
  r.nodes.undoButton.click();
  assert.equal(r.snapshot().selected, 0);
  assert.equal(discs(r), 2);
  r.nodes.undoButton.click();
  assert.equal(r.snapshot().selected, 4);
  assert.equal(discs(r), 0);
});

test("A replayed terminal round explicitly says its record is unchanged", () => {
  const g = boot({ fixedAi: true });
  for (const c of [0, 1, 2]) {
    g.cols[c].click();
    g.flush();
  }
  g.cols[3].click();
  g.nodes.undoButton.click();
  g.cols[3].click();
  assert.equal(
    g.nodes.resultText.textContent,
    "REVIEW ROUND · RECORD UNCHANGED",
  );
  assert.equal(g.snapshot().record.wins, 1);
});

test("Malformed saved selection or cursor lists are rejected", () => {
  const raw = {
    version: 1,
    difficulty: "hard",
    first: "human",
    moves: [3],
    review: false,
  };
  for (const extra of [
    { selected: "2" },
    { selected: 7 },
    { cursors: [-1] },
    { cursors: ["2"] },
    { cursors: [] },
    { cursors: [1, 2] },
    { cursors: 1 },
  ]) {
    const g = boot({
      storage: { "connectFourGame-v1": JSON.stringify({ ...raw, ...extra }) },
    });
    assert.equal(discs(g), 0);
    assert.equal(g.snapshot().paused, false);
  }
});
