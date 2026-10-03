"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { createSnake } = require("./helpers/snake-runtime");
const KEY = "classic-snake-high-score";
test("new garden from pause draws an undimmed board immediately", () => {
  const a = start();
  a.node("pauseButton").click();
  a.node("newGameButton").click();
  const clears = a.stats.commands.filter(
    (c) => c[0] === "fillRect" && c.at(-2) === 400 && c.at(-1) === 400,
  );
  assert.equal(clears.at(-1)[2], "#fffaf0");
  assert.equal(a.snapshot().state, "playing");
});

test("all four garden boundaries wrap to the opposite edge", () => {
  for (const [head, dir, next] of [
    [
      { x: 19, y: 4 },
      { x: 1, y: 0 },
      { x: 0, y: 4 },
    ],
    [
      { x: 0, y: 4 },
      { x: -1, y: 0 },
      { x: 19, y: 4 },
    ],
    [
      { x: 4, y: 0 },
      { x: 0, y: -1 },
      { x: 4, y: 19 },
    ],
    [
      { x: 4, y: 19 },
      { x: 0, y: 1 },
      { x: 4, y: 0 },
    ],
  ]) {
    const a = start();
    a.run(
      `snake=[${JSON.stringify(head)}];direction=${JSON.stringify(dir)};food={x:10,y:0,kind:'leaf'};tick()`,
    );
    assert.deepEqual(a.snapshot().snake[0], next);
  }
});
test("a vacating tail cell is legal but entering an occupied body ends the run", () => {
  const a = start();
  const fixture =
    "snake=[{x:5,y:5},{x:5,y:6},{x:4,y:6},{x:4,y:5}];direction={x:-1,y:0};food={x:0,y:0,kind:'leaf'}";
  a.run(fixture + ";tick()");
  assert.equal(a.snapshot().state, "playing");
  assert.deepEqual(a.snapshot().snake[0], { x: 4, y: 5 });
  a.run(fixture + ";food={x:4,y:5,kind:'apple'};tick()");
  assert.equal(a.snapshot().state, "over");
  assert.equal(a.snapshot().score, 0);
  assert.equal(a.node("message").classList.contains("hidden"), false);
  const head = a.snapshot().snake[0];
  a.frames(1);
  assert.deepEqual(a.snapshot().snake[0], head);
});
test("food generation always selects a free patch with a recognized silhouette", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const a = start({ seed });
    a.run(
      "snake=Array.from({length:399},(_,i)=>({x:i%20,y:Math.floor(i/20)}));food=randomFood()",
    );
    assert.deepEqual(
      { ...a.snapshot().food, kind: null },
      { x: 19, y: 19, kind: null },
    );
    assert.ok(["apple", "berry", "leaf"].includes(a.snapshot().food.kind));
  }
});
test("filling the final garden patch wins with final score and a replay path", () => {
  const a = start();
  const path = [];
  for (let y = 0; y < 20; y++)
    for (let i = 0; i < 20; i++) path.push({ x: y % 2 ? 19 - i : i, y });
  const food = path.pop();
  a.run(
    `snake=${JSON.stringify(path.reverse())};direction={x:-1,y:0};food=${JSON.stringify({ ...food, kind: "apple" })};score=3950;tick()`,
  );
  assert.equal(a.snapshot().state, "won");
  assert.equal(a.snapshot().snake.length, 400);
  assert.equal(a.snapshot().food, null);
  assert.equal(a.snapshot().score, 3960);
  assert.equal(a.store.get(KEY), "3960");
  assert.equal(a.node("messageTitle").textContent, "FULL GARDEN");
  const frames = a.stats.frames;
  a.frames(1);
  assert.equal(a.stats.frames, frames);
  a.node("startButton").click();
  assert.equal(a.snapshot().state, "playing");
  assert.equal(a.snapshot().snake.length, 4);
  assert.equal(a.snapshot().score, 0);
  assert.equal(a.snapshot().highScore, 3960);
});

test("drawing samples the computed palette once independent of body length", () => {
  const a = start();
  a.run("snake=Array.from({length:100},(_,i)=>({x:i%20,y:Math.floor(i/20)}))");
  const reads = a.stats.styleReads;
  a.run("draw()");
  assert.equal(a.stats.styleReads - reads, 1);
});

test("SPEED advances with each actual five-millisecond speed tier and has a cap", () => {
  const a = start();
  a.run("score=40;food={x:11,y:10,kind:'apple'};tick()");
  assert.equal(a.snapshot().stepMs, 140);
  assert.equal(a.node("speed").textContent, "02");
  a.run("score=10000;food={x:12,y:10,kind:'apple'};tick()");
  assert.equal(a.snapshot().stepMs, 65);
  assert.equal(a.node("speed").textContent, "17");
});

test("board swipes use screen-space thresholds and release cancellation clears ownership", () => {
  const a = start({ captureThrows: true }),
    b = a.node("board");
  const e = b.dispatch("pointerdown", {
    clientX: 100,
    clientY: 100,
    pointerId: 4,
  });
  assert.equal(e.defaultPrevented, true);
  b.dispatch("pointermove", { clientX: 100, clientY: 90, pointerId: 4 });
  assert.equal(a.snapshot().queue.length, 0);
  b.dispatch("pointermove", { clientX: 100, clientY: 60, pointerId: 7 });
  assert.equal(a.snapshot().queue.length, 0);
  b.dispatch("pointermove", { clientX: 100, clientY: 60, pointerId: 4 });
  assert.deepEqual(a.snapshot().queue, [{ x: 0, y: -1 }]);
  b.dispatch("pointermove", { clientX: 60, clientY: 60, pointerId: 4 });
  assert.equal(a.snapshot().queue.length, 2);
  b.dispatch("pointercancel", { pointerId: 4 });
  a.run("tick();tick()");
  b.dispatch("pointermove", { clientX: 60, clientY: 100, pointerId: 4 });
  assert.equal(a.snapshot().queue.length, 0);
});
test("pause abandons an in-progress swipe before resuming", () => {
  const a = start(),
    b = a.node("board");
  b.dispatch("pointerdown", { clientX: 100, clientY: 100 });
  a.node("pauseButton").click();
  a.node("startButton").click();
  b.dispatch("pointermove", { clientX: 100, clientY: 50 });
  assert.equal(a.snapshot().queue.length, 0);
});

test("native accessible click steers once and secondary pointers are ignored", () => {
  const a = start();
  a.node("up").click();
  assert.equal(a.snapshot().queue.length, 1);
  a.run("tick()");
  assert.deepEqual(a.snapshot().snake[0], { x: 10, y: 9 });
  a.node("left").dispatch("pointerdown", { button: 2 });
  assert.equal(a.snapshot().queue.length, 0);
  a.node("left").dispatch("pointerdown");
  a.node("left").dispatch("click", { detail: 1 });
  assert.equal(a.snapshot().queue.length, 1);
});

test("pause and direction buttons express valid state and keyboard focus follows overlays", () => {
  const a = createSnake();
  assert.equal(a.node("pauseButton").disabled, true);
  assert.ok(a.controls.every((b) => b.disabled));
  assert.equal(a.document.activeElement.id, "startButton");
  a.node("startButton").click();
  assert.equal(a.document.activeElement.id, "board");
  assert.ok(a.controls.every((b) => !b.disabled));
  a.node("pauseButton").click();
  assert.equal(a.node("pauseButton").textContent, "RESUME");
  assert.equal(a.node("pauseButton")["aria-pressed"], "true");
  assert.equal(a.document.activeElement.id, "startButton");
  a.node("startButton").click();
  a.run("gameWon()");
  assert.ok(a.controls.every((b) => b.disabled));
  assert.equal(a.node("pauseButton").disabled, true);
});

test("keyboard repeats do not oscillate pause and modifier shortcuts remain native", () => {
  const a = start();
  a.event("keydown", { key: "p" });
  a.event("keydown", { key: "p", repeat: true });
  assert.equal(a.snapshot().state, "paused");
  a.event("keydown", { key: "p" });
  assert.equal(a.snapshot().state, "playing");
  for (const event of [
    { key: "w", ctrlKey: true },
    { key: "a", metaKey: true },
    { key: "s", altKey: true },
    { key: "ArrowUp", target: { tagName: "INPUT" } },
    { key: "ArrowUp", target: { isContentEditable: true } },
  ]) {
    assert.notEqual(a.event("keydown", event).defaultPrevented, true);
    assert.equal(a.snapshot().queue.length, 0);
  }
  assert.equal(a.event("keydown", { key: "ArrowUp" }).defaultPrevented, true);
  a.event("keydown", { key: "ArrowLeft", repeat: true });
  assert.equal(a.snapshot().queue.length, 1);
});

test("blur hidden page and pagehide pause movement and discard queued turns", () => {
  for (const type of ["blur", "pagehide", "doc:visibilitychange"]) {
    const a = start();
    a.event("keydown", { key: "ArrowUp" });
    a.document.hidden = true;
    a.event(type);
    assert.equal(a.snapshot().state, "paused");
    assert.equal(a.snapshot().queue.length, 0);
    const head = a.snapshot().snake[0];
    a.frames(1);
    assert.deepEqual(a.snapshot().snake[0], head);
    a.node("startButton").click();
    a.frames(0.145);
    assert.deepEqual(a.snapshot().snake[0], { x: 11, y: 10 });
  }
});

test("title pause and terminal states have no active RAF while idle redraws still work", () => {
  const a = createSnake();
  const frames = a.stats.frames,
    paints = a.stats.paints;
  a.frames(1);
  assert.equal(a.stats.frames, frames);
  assert.equal(a.stats.paints, paints);
  a.node("startButton").click();
  a.frame(16);
  assert.ok(a.stats.frames > frames);
  a.node("pauseButton").click();
  const f = a.stats.frames,
    p = a.stats.paints;
  a.frames(1);
  assert.equal(a.stats.frames, f);
  assert.equal(a.stats.paints, p);
  a.event("doc:themechange");
  assert.ok(a.stats.paints > p);
  a.node("startButton").click();
  a.frame(2200);
  a.run("gameOver()");
  const end = a.stats.frames;
  a.frames(1);
  assert.equal(a.stats.frames, end);
});

test("two rapid perpendicular turns are executed on separate movement steps", () => {
  const a = start();
  a.event("keydown", { key: "ArrowUp" });
  a.event("keydown", { key: "ArrowLeft" });
  a.frame(145);
  assert.deepEqual(a.snapshot().snake[0], { x: 10, y: 9 });
  a.frame(290);
  assert.deepEqual(a.snapshot().snake[0], { x: 9, y: 9 });
});
test("queued duplicates and reversals cannot erase a valid turn", () => {
  const a = start();
  for (const key of ["ArrowUp", "ArrowUp", "ArrowDown"])
    a.event("keydown", { key });
  a.run("tick()");
  assert.deepEqual(a.snapshot().snake[0], { x: 10, y: 9 });
  a.event("keydown", { key: "ArrowRight" });
  a.event("keydown", { key: "ArrowDown" });
  a.event("keydown", { key: "ArrowLeft" });
  assert.equal(a.snapshot().queue.length, 2);
});

test("equal active time produces equal movement at 15 through 120Hz", () => {
  const positions = [];
  for (const hz of [15, 30, 60, 120]) {
    const a = start();
    a.run("food={x:0,y:0,kind:'leaf'}");
    a.frames(1.45, hz);
    positions.push(a.snapshot().snake[0]);
    assert.equal(a.snapshot().timer < 145, true);
  }
  assert.deepEqual(positions, [
    { x: 0, y: 10 },
    { x: 0, y: 10 },
    { x: 0, y: 10 },
    { x: 0, y: 10 },
  ]);
});

test("blocked storage does not stop title initialization or eating", () => {
  let a;
  assert.doesNotThrow(() => {
    a = start({ blockRead: true, blockWrite: true });
    a.run("food={x:11,y:10,kind:'apple'};tick()");
  });
  assert.equal(a.snapshot().score, 10);
  assert.equal(a.snapshot().highScore, 10);
});
test("invalid best-score values are discarded without deleting unrelated data", () => {
  for (const value of ["NaN", "Infinity", "-3", "1.5", "9007199254740992"]) {
    const a = createSnake({
      storage: { [KEY]: value, "other-record": "keep" },
    });
    assert.equal(a.snapshot().highScore, 0, value);
    assert.equal(a.store.get("other-record"), "keep");
  }
});

const start = (options) => {
  const a = createSnake(options);
  a.node("startButton").click();
  return a;
};
test("eating persists a new best before reset or terminal state", () => {
  const a = start();
  a.run("food={x:11,y:10,kind:'apple'};tick()");
  assert.equal(a.snapshot().score, 10);
  assert.equal(a.store.get(KEY), "10");
  a.node("newGameButton").click();
  assert.equal(a.snapshot().score, 0);
  assert.equal(a.snapshot().highScore, 10);
});
