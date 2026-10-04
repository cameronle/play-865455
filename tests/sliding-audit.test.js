const test = require("node:test"),
  assert = require("node:assert/strict");
const R = require("../sliding-puzzle/rules.js");
const solved = (n) =>
  Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
test("Sliding rules reject malformed permutations and unsafe move indices", () => {
  for (const board of [
    [],
    [0],
    [1, 1, 2, 3, 4, 5, 6, 7, 0],
    [1, 2, 3, 4, 5, 6, 7, 8, 0.5],
  ])
    assert.equal(R.isSolvable(board, 3), false);
  assert.equal(R.isSolved([0]), false);
  assert.equal(R.isSolvable(solved(3), 4), false);
  const b = solved(3);
  for (const i of [-1, 9, 2.5, Infinity, NaN, "7"])
    assert.equal(R.move(b, 3, i), null);
  assert.deepEqual(b, solved(3));
});
test("Sliding seeded shuffle stays solvable and terminates for degenerate RNG", () => {
  assert.throws(() => R.generateSolvableBoard(2), RangeError);
  for (const size of [3, 4, 5]) {
    let seed = 12345;
    const rng = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const boards = [];
    for (let i = 0; i < 1000; i++) {
      const b = R.generateSolvableBoard(size, rng);
      assert.ok(R.isValidBoard(b, size));
      assert.ok(R.isSolvable(b, size));
      assert.equal(R.isSolved(b), false);
      boards.push(b.join(","));
    }
    assert.ok(new Set(boards).size > 950);
    for (const rng of [() => 0.999999999, () => 0, () => NaN, () => 1]) {
      const b = R.generateSolvableBoard(size, rng);
      assert.ok(R.isValidBoard(b, size) && R.isSolvable(b, size));
      assert.equal(R.isSolved(b), false);
    }
  }
});
const { boot } = require("./helpers/sliding-runtime.js");
const fixture = [1, 2, 3, 4, 5, 6, 0, 7, 8];
test("Sliding malformed best-record storage cannot crash the page or poison HUD", () => {
  for (const data of [
    "null",
    "[]",
    '"oops"',
    '{"4":{"moves":"fake","time":-1}}',
  ])
    assert.doesNotThrow(() => {
      const h = boot({ storage: { "sliding-puzzle-best-v1": data } });
      assert.equal(h.nodes.bestStat.textContent, "--");
    });
  const h = boot({
    storage: {
      "sliding-puzzle-best-v1": JSON.stringify({
        4: { moves: 7, time: 120 },
        2: { moves: 1, time: 1 },
      }),
    },
  });
  assert.equal(h.nodes.bestStat.textContent, "7M · 02:00");
  assert.doesNotThrow(() => boot({ storageThrows: true }));
});
test("Sliding swipe belongs to one primary left pointer and cancelled strokes cannot move", () => {
  const h = boot({ size: 3, board: fixture });
  h.pointer("pointerdown", 8, { button: 2 });
  h.pointer("pointerup", 8, { button: 2, clientX: 120 });
  assert.equal(h.snapshot().moves, 0);
  h.pointer("pointerdown", 8, { pointerId: 4 });
  h.pointer("pointerdown", 2, { pointerId: 5, isPrimary: false });
  h.pointer("pointerup", 2, { pointerId: 5, isPrimary: false, clientY: 180 });
  assert.equal(h.snapshot().moves, 0);
  h.pointer("pointerup", 8, { pointerId: 4, clientX: 120 });
  assert.equal(h.snapshot().moves, 1);
  h.pointer("pointerdown", 8);
  h.pointer("pointercancel", 8);
  h.pointer("pointerup", 8, { clientX: 120 });
  assert.equal(h.snapshot().moves, 1);
});
test("Sliding native pointer tap has one action and compatibility click cannot replay it", () => {
  const h = boot({ size: 3, board: fixture });
  h.pointer("pointerdown", 7);
  h.pointer("pointerup", 7);
  assert.equal(h.snapshot().moves, 1);
  h.nodes.board.children[7].dispatch("click", { detail: 1 });
  assert.equal(h.snapshot().moves, 1);
  h.nodes.board.children[8].dispatch("click", { detail: 0 });
  assert.equal(h.snapshot().isWon, true);
});
test("Sliding focused native selectors and header buttons keep their keyboard behavior", () => {
  const h = boot({ size: 3, board: fixture });
  const before = h.snapshot();
  for (const node of [
    h.nodes.sizeSelect,
    h.nodes.newButton,
    h.nodes.undoButton,
  ])
    h.key("ArrowLeft", { target: node });
  assert.deepEqual(h.snapshot(), before);
  h.nodes.board.focus();
  h.key("ArrowLeft", { target: h.nodes.board });
  assert.equal(h.snapshot().moves, 1);
  h.key("KeyZ", { ctrlKey: true, target: h.nodes.board });
  assert.equal(h.snapshot().moves, 0);
});
test("Sliding theme repaint preserves DOM identity, focus and board state", () => {
  const h = boot({ size: 3, board: fixture });
  const tile = h.nodes.board.children[7];
  tile.focus();
  const before = h.snapshot();
  h.emit("document", "themechange");
  assert.equal(h.nodes.board.children[7], tile);
  assert.equal(h.document.activeElement, tile);
  assert.deepEqual(h.snapshot(), before);
});
test("Sliding unsupported sizes and invalid clicks cannot mutate state", () => {
  const h = boot({ size: 3, board: fixture });
  const before = h.snapshot();
  for (const n of [2, 6, 3.5, "4", NaN]) h.window.SlidingGame.setSize(n);
  for (const i of [-1, 9, 0.5, NaN, "7"])
    h.window.SlidingGame.handleTileClick(i);
  assert.deepEqual(h.snapshot(), before);
});
test("Sliding real lifecycle pause freezes the clock and requires explicit resume", () => {
  const h = boot({ size: 3, board: fixture });
  h.tile(7);
  h.advance(2200);
  h.pointer("pointerdown", 8, { pointerId: 4 });
  h.document.hidden = true;
  h.emit("document", "visibilitychange");
  assert.equal(h.snapshot().paused, true);
  assert.equal(h.snapshot().activeGesture, null);
  assert.equal(h.intervalCount(), 0);
  const elapsed = h.snapshot().elapsedSeconds,
    b = h.snapshot().board;
  h.advance(5000);
  assert.equal(h.snapshot().elapsedSeconds, elapsed);
  h.tile(8);
  assert.deepEqual(h.snapshot().board, b);
  h.document.hidden = false;
  h.emit("document", "visibilitychange");
  h.advance(2000);
  assert.equal(h.snapshot().paused, true);
  h.nodes.resumeButton.click();
  h.advance(1300);
  assert.equal(h.snapshot().paused, false);
  assert.ok(h.snapshot().elapsedSeconds >= elapsed + 1);
  h.tile(8);
  assert.equal(h.snapshot().isWon, true);
  assert.equal(h.intervalCount(), 0);
  assert.ok(
    h.nodes.winDetail.textContent.includes(h.nodes.timeStat.textContent),
  );
});
test("Sliding session restore preserves board, elapsed time and reversible undo history", () => {
  const h = boot({ size: 3, board: fixture });
  h.tile(7);
  h.advance(3200);
  h.emit("window", "pagehide");
  const h2 = boot({ storage: Object.fromEntries(h.storage) });
  assert.deepEqual(h2.snapshot().board, h.snapshot().board);
  assert.equal(h2.snapshot().size, 3);
  assert.equal(h2.snapshot().moves, 1);
  assert.equal(h2.snapshot().paused, true);
  assert.ok(h2.snapshot().elapsedSeconds >= 3);
  h2.nodes.resumeButton.click();
  h2.window.SlidingGame.undo();
  assert.deepEqual(h2.snapshot().board, fixture);
  assert.equal(h2.snapshot().moves, 0);
});
test("Sliding instant win freezes the same minimum time in HUD, detail and best record", () => {
  const h = boot({ size: 3, board: [1, 2, 3, 4, 5, 6, 7, 0, 8] });
  h.tile(8);
  assert.equal(h.snapshot().isWon, true);
  assert.equal(h.nodes.timeStat.textContent, "00:01");
  assert.ok(h.nodes.winDetail.textContent.includes("00:01"));
  assert.equal(
    JSON.parse(h.storage.get("sliding-puzzle-best-v1"))["3"].time,
    1,
  );
  const b = h.snapshot();
  h.tile(7);
  h.window.SlidingGame.undo();
  assert.deepEqual(h.snapshot(), b);
});
test("Sliding clear prevents both session and best saves from reappearing on pagehide", () => {
  const h = boot({ size: 3, board: fixture });
  h.tile(7);
  h.emit("window", "game-data-clearing");
  h.storage.delete("sliding-puzzle-game-v1");
  h.storage.delete("sliding-puzzle-best-v1");
  h.emit("window", "pagehide");
  assert.equal(h.storage.has("sliding-puzzle-game-v1"), false);
  assert.equal(h.storage.has("sliding-puzzle-best-v1"), false);
  const fs = require("node:fs");
  assert.match(
    fs.readFileSync("clear-game-data.js", "utf8"),
    /['"]sliding-puzzle-game-v1['"]/,
  );
});
test("Sliding rejects malformed session boards, metadata and impossible undo chains", () => {
  const good = {
    version: 1,
    size: 3,
    board: [1, 2, 3, 4, 5, 6, 7, 0, 8],
    moves: 1,
    started: true,
    elapsed: 3,
    history: [fixture],
  };
  const bad = [
    null,
    [],
    { ...good, size: 2 },
    { ...good, board: [1, 1, 2, 3, 4, 5, 6, 7, 0] },
    { ...good, board: [2, 1, 3, 4, 5, 6, 7, 0, 8] },
    { ...good, moves: -1 },
    { ...good, elapsed: "NaN" },
    { ...good, history: [solved(3)] },
    { ...good, history: [null] },
    { ...good, started: false },
  ];
  for (const s of bad) {
    const h = boot({
      storage: { "sliding-puzzle-game-v1": JSON.stringify(s) },
    });
    assert.equal(h.snapshot().size, 4);
    assert.equal(h.snapshot().moves, 0);
    assert.ok(R.isSolvable(h.snapshot().board, 4));
  }
});
test("Sliding all line-shift directions preserve permutation and reverse exactly in one move", () => {
  for (const n of [3, 4, 5])
    for (let blank = 0; blank < n * n; blank++) {
      const b = solved(n);
      [b[n * n - 1], b[blank]] = [b[blank], b[n * n - 1]];
      for (let i = 0; i < n * n; i++) {
        const next = R.move(b, n, i);
        const legal =
          i !== blank &&
          (Math.floor(i / n) === Math.floor(blank / n) || i % n === blank % n);
        assert.equal(next !== null, legal);
        if (next) {
          assert.equal(next[i], 0);
          assert.ok(R.isValidBoard(next, n));
          assert.deepEqual(R.move(next, n, blank), b);
        }
      }
    }
});
test("Sliding best records use move count then time and ignore slower replay", () => {
  const h = boot({
    size: 3,
    board: [1, 2, 3, 4, 5, 6, 7, 0, 8],
    storage: {
      "sliding-puzzle-best-v1": JSON.stringify({ 3: { moves: 1, time: 1 } }),
    },
  });
  h.tile(7);
  h.advance(4000);
  h.tile(8);
  assert.equal(h.snapshot().isWon, true);
  assert.deepEqual(JSON.parse(h.storage.get("sliding-puzzle-best-v1"))["3"], {
    moves: 1,
    time: 1,
  });
});
test("Sliding detached snapshots cannot alter the live board or gesture", () => {
  const h = boot({ size: 3, board: fixture });
  const s = h.snapshot();
  s.board[0] = 999;
  assert.equal(h.snapshot().board[0], 1);
  h.pointer("pointerdown", 8, { pointerId: 4 });
  const x = h.window.SlidingGame.getSnapshot();
  x.activeGesture.id = 999;
  assert.equal(h.snapshot().activeGesture.id, 4);
});
test("Sliding shell allows zoom and provides explicit pause, scoped utility dock and focusable board", () => {
  const fs = require("node:fs"),
    html = fs.readFileSync("sliding-puzzle/index.html", "utf8");
  assert.doesNotMatch(html, /user-scalable=no/);
  for (const id of [
    "pauseButton",
    "resumeButton",
    "pauseOverlay",
    "utilityDock",
    "gamePage",
    "boardFrame",
  ])
    assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /id="board"[^>]*tabindex="0"/);
  assert.match(html, /favicon\.svg/);
});
test("Sliding runtime mounts scoped utilities and refits on viewport changes", () => {
  const fs = require("node:fs"),
    js = fs.readFileSync("sliding-puzzle/game.js", "utf8");
  assert.match(js, /function fitBoard\(/);
  assert.match(js, /addEventListener\(['"]resize['"],\s*fitBoard/);
  assert.match(js, /clear-data-toggle/);
});
test('Sliding grid selector retains an independently usable touch target',()=>{
 const css=require('node:fs').readFileSync('sliding-puzzle/style.css','utf8');assert.match(css,/\.tool-select select\s*\{[^}]*min-height:\s*36px/s);
});

test('Sliding grid switch immediately refits after a long best record wraps the HUD',()=>{
 const h=boot({width:320,height:400,toolbarHeight:n=>n.bestStat.textContent.length>16?100:60,
  storage:{'sliding-puzzle-best-v1':JSON.stringify({3:{moves:1234567890123456,time:31536000}})}});
 const before=parseInt(h.nodes.boardFrame.style.width);h.window.SlidingGame.setSize(3);
 const after=parseInt(h.nodes.boardFrame.style.width);assert.ok(after<before,{before,after});
});
