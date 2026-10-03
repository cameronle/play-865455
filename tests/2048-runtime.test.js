"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const { loadGame, board } = require("./helpers/2048-runtime.js");

test("2048 starts and remains playable when browser storage is unavailable", () => {
  const game = loadGame({ denied: true });
  assert.equal(game.ids.board.children.length, 16);
  assert.equal(game.state().grid.flat().filter(Boolean).length, 2);
  game.api.fixture(board([2, 2, 0, 0]));
  game.api.move("ArrowLeft");
  assert.equal(game.state().score, 4);
  assert.equal(game.state().grid[0][0], 4);
});

test("2048 win overlay blocks input until Continue is explicitly activated", () => {
  const game = loadGame();
  game.api.fixture(board([1024, 1024, 0, 0]));
  game.api.move("ArrowLeft");
  assert.equal(game.ids.overlayTitle.textContent, "YOU WIN");
  assert.equal(game.ids.overlay.classList.contains("hidden"), false);
  const before = game.state();
  game.document.dispatch("keydown", { key: "ArrowRight" });
  assert.deepEqual(game.state(), before);
  game.ids.tryAgain.dispatch("click");
  game.api.move("ArrowRight");
  assert.notDeepEqual(game.state().grid, before.grid);
});

test("2048 discards a swipe if a second finger joins the gesture", () => {
  const game = loadGame();
  game.api.fixture(board([2, 2, 0, 0]));
  const first = { identifier: 1, clientX: 200, clientY: 100 };
  const second = { identifier: 2, clientX: 300, clientY: 100 };
  const before = game.state();
  game.ids.board.dispatch("touchstart", {
    touches: [first],
    changedTouches: [first],
  });
  game.ids.board.dispatch("touchstart", {
    touches: [first, second],
    changedTouches: [second],
  });
  game.ids.board.dispatch("touchend", {
    touches: [second],
    changedTouches: [{ ...first, clientX: 50 }],
  });
  assert.deepEqual(game.state(), before);
});

test("2048 clears cancelled and backgrounded touch gestures", () => {
  for (const cancellation of ["touchcancel", "blur", "visibilitychange"]) {
    const game = loadGame();
    game.api.fixture(board([2, 2, 0, 0]));
    const finger = { identifier: 1, clientX: 200, clientY: 100 };
    const before = game.state();
    game.ids.board.dispatch("touchstart", {
      touches: [finger],
      changedTouches: [finger],
    });
    if (cancellation === "touchcancel")
      game.ids.board.dispatch(cancellation, {
        touches: [],
        changedTouches: [finger],
      });
    else if (cancellation === "blur") game.window.dispatch(cancellation);
    else {
      game.document.hidden = true;
      game.document.dispatch(cancellation);
    }
    game.ids.board.dispatch("touchend", {
      touches: [],
      changedTouches: [{ ...finger, clientX: 50 }],
    });
    assert.deepEqual(game.state(), before, cancellation);
  }
});

test("2048 ignores repeated keys and browser shortcut modifiers", () => {
  for (const extra of [
    { repeat: true },
    { altKey: true },
    { ctrlKey: true },
    { metaKey: true },
  ]) {
    const game = loadGame();
    game.api.fixture(board([2, 2, 0, 0]));
    const before = game.state();
    const event = game.document.dispatch("keydown", {
      key: "ArrowLeft",
      ...extra,
    });
    assert.deepEqual(game.state(), before);
    if (!extra.repeat) assert.notEqual(event.defaultPrevented, true);
  }
});

test("2048 direction buttons work through click activation", () => {
  const game = loadGame();
  game.api.fixture(board([2, 2, 0, 0]));
  game.directions
    .find((button) => button.dataset.dir === "left")
    .dispatch("click");
  assert.equal(game.state().score, 4);
  assert.equal(game.state().grid[0][0], 4);
});

test("2048 restores the exact board and score after a page reload", () => {
  const saved = new Map();
  const game = loadGame({ saved });
  game.api.fixture(board([2, 2, 4, 0]), 12);
  game.api.move("ArrowLeft");
  const expected = game.state();
  const resumed = loadGame({ saved, seed: 99 });
  assert.deepEqual(resumed.state(), expected);
  assert.equal(resumed.ids.board.children.length, 16);
});

test("2048 single-step Undo restores the board and score without resetting the best", () => {
  const game = loadGame();
  game.api.fixture(board([2, 2, 4, 0]), 12);
  const before = game.state();
  game.api.move("ArrowLeft");
  assert.equal(game.state().score, 16);
  game.ids.undo.dispatch("click");
  assert.deepEqual(game.state().grid, before.grid);
  assert.equal(game.state().score, before.score);
  assert.equal(game.state().best, 16);
  assert.equal(game.ids.undo.disabled, true);
  const undone = game.state();
  game.ids.undo.dispatch("click");
  assert.deepEqual(game.state(), undone);
});

test("2048 Undo cannot reroll the spawned tile by repeating the same move", () => {
  const game = loadGame();
  game.api.fixture(board([2, 2, 4, 0]), 12);
  game.api.move("ArrowLeft");
  const first = game.state();
  game.ids.undo.dispatch("click");
  game.api.move("ArrowLeft");
  assert.deepEqual(game.state(), first);
});

test("2048 keyboard Undo supports Z and the standard shortcut without key-repeat", () => {
  for (const extra of [{}, { ctrlKey: true }, { metaKey: true }]) {
    const game = loadGame();
    game.api.fixture(board([2, 2, 0, 0]));
    const before = game.state().grid;
    game.api.move("ArrowLeft");
    game.document.dispatch("keydown", { key: "z", repeat: true, ...extra });
    assert.notDeepEqual(game.state().grid, before);
    const event = game.document.dispatch("keydown", { key: "z", ...extra });
    assert.deepEqual(game.state().grid, before);
    assert.equal(event.defaultPrevented, true);
  }
});

test("2048 reuses its sixteen cells and exposes a readable board description", () => {
  const game = loadGame();
  const cells = game.ids.board.children.slice();
  game.api.fixture(board([2, 2, 0, 0]));
  game.api.move("ArrowLeft");
  assert.equal(game.ids.board.children.length, 16);
  assert.equal(game.ids.board.children[0], cells[0]);
  assert.match(game.ids.board.getAttribute("aria-label"), /Row 1: 4/);
});

test("2048 announces successful merges and save feedback", () => {
  const game = loadGame();
  game.api.fixture(board([2, 2, 0, 0]));
  game.api.move("ArrowLeft");
  assert.match(game.ids.status.textContent, /MERGED.*4.*AUTO-SAVED/);
  const unavailable = loadGame({ denied: true });
  assert.match(unavailable.ids.status.textContent, /SAVING UNAVAILABLE/);
});

test("2048 merge combinations conserve tile mass and never merge a tile twice", () => {
  const game = loadGame();
  const values = [0, 2, 4, 8, 16];
  let count = 0;
  for (const a of values)
    for (const b of values)
      for (const c of values)
        for (const d of values) {
          const line = [a, b, c, d],
            expected = line.filter(Boolean);
          let points = 0;
          for (let i = 0; i < expected.length - 1; i++) {
            if (expected[i] === expected[i + 1]) {
              expected[i] *= 2;
              points += expected[i];
              expected.splice(i + 1, 1);
            }
          }
          while (expected.length < 4) expected.push(0);
          game.api.fixture(board(line));
          assert.deepEqual(Array.from(game.api.slide(line)), expected);
          assert.equal(game.state().score, points);
          assert.equal(
            expected.reduce((x, y) => x + y, 0),
            line.reduce((x, y) => x + y, 0),
          );
          count++;
        }
  assert.equal(count, 625);
});

test("2048 handles all four directions, rejects no-op moves, and keeps Undo available", () => {
  for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
    const game = loadGame();
    game.api.fixture(board([2, 2, 0, 0], [2, 2, 0, 0]));
    const mass = game
      .state()
      .grid.flat()
      .reduce((a, b) => a + b, 0);
    game.api.move(key);
    const after = game.state();
    assert.equal(after.score, 8, key);
    assert.ok(
      [mass + 2, mass + 4].includes(
        after.grid.flat().reduce((a, b) => a + b, 0),
      ),
      key,
    );
    assert.equal(game.ids.undo.disabled, false);
  }
  const game = loadGame();
  game.api.fixture(board([2, 0, 0, 0]));
  const before = game.state();
  const saved = Array.from(game.saved);
  game.api.move("ArrowLeft");
  assert.deepEqual(game.state(), before);
  assert.deepEqual(Array.from(game.saved), saved);
});

test("2048 refresh preserves Undo, a pending win, and acknowledged win continuation", () => {
  const saved = new Map();
  const game = loadGame({ saved });
  game.api.fixture(board([1024, 1024, 0, 0]));
  const before = game.state().grid;
  game.api.move("ArrowLeft");
  const restored = loadGame({ saved, seed: 5 });
  assert.equal(restored.ids.overlay.classList.contains("hidden"), false);
  assert.equal(restored.ids.overlayTitle.textContent, "YOU WIN");
  restored.ids.undo.dispatch("click");
  assert.deepEqual(restored.state().grid, before);
  assert.equal(restored.state().won, false);
  restored.api.move("ArrowLeft");
  restored.ids.tryAgain.dispatch("click");
  const continued = loadGame({ saved, seed: 9 });
  assert.equal(continued.ids.overlay.classList.contains("hidden"), true);
  continued.api.move("ArrowRight");
  assert.equal(continued.ids.overlay.classList.contains("hidden"), true);
});

test("2048 losing move shows Game Over and Undo recovers the last playable board", () => {
  const game = loadGame();
  const fixture = [
    [2, 4, 8, 16],
    [4, 8, 16, 32],
    [8, 16, 32, 64],
    [128, 256, 512, 0],
  ];
  game.api.fixture(fixture);
  game.api.move("ArrowRight");
  assert.equal(game.ids.overlayTitle.textContent, "GAME OVER");
  assert.equal(game.api.canMove(), false);
  const lost = game.state();
  game.document.dispatch("keydown", { key: "ArrowLeft" });
  assert.deepEqual(game.state(), lost);
  game.ids.undo.dispatch("click");
  assert.deepEqual(game.state().grid, fixture);
  assert.equal(game.api.canMove(), true);
});

test("2048 ignores corrupt saved boards and invalid high scores without crashing", () => {
  for (const invalid of [
    "{",
    "null",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ version: 1, grid: [[3]], score: 0, won: false }),
    JSON.stringify({
      version: 1,
      grid: board([3, 2, 0, 0]),
      score: 0,
      won: false,
    }),
    JSON.stringify({
      version: 1,
      grid: board([2, 2, 0, 0]),
      score: -1,
      won: false,
    }),
  ]) {
    const game = loadGame({
      saved: new Map([
        ["play-2048-save-v1", invalid],
        ["play-2048-best", "NaN"],
      ]),
    });
    assert.equal(game.state().score, 0);
    assert.equal(game.state().best, 0);
    assert.equal(game.state().grid.flat().filter(Boolean).length, 2);
  }
});

test("2048 single-finger swipes work and a tiny gesture does not advance the board", () => {
  const game = loadGame();
  game.api.fixture(board([2, 2, 0, 0]));
  const finger = { identifier: 9, clientX: 200, clientY: 100 };
  const before = game.state();
  game.ids.board.dispatch("touchstart", {
    touches: [finger],
    changedTouches: [finger],
  });
  game.ids.board.dispatch("touchend", {
    touches: [],
    changedTouches: [{ ...finger, clientX: 190 }],
  });
  assert.deepEqual(game.state(), before);
  game.ids.board.dispatch("touchstart", {
    touches: [finger],
    changedTouches: [finger],
  });
  game.ids.board.dispatch("touchend", {
    touches: [],
    changedTouches: [{ ...finger, clientX: 50 }],
  });
  assert.equal(game.state().score, 4);
  game.ids.newGame.dispatch("click");
  assert.equal(game.state().score, 0);
  assert.equal(game.ids.undo.disabled, true);
});

test("2048 focuses Continue on victory so the keyboard can acknowledge it", () => {
  const game = loadGame();
  game.api.fixture(board([1024, 1024, 0, 0]));
  game.api.move("ArrowLeft");
  assert.equal(game.document.activeElement, game.ids.tryAgain);
});

module.exports = { loadGame, board };
