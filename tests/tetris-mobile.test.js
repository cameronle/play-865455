"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { createTetris } = require("./helpers/tetris-runtime");
test("soft-drop input on the title screen does not crash", () => {
  const app = createTetris();
  assert.doesNotThrow(() => app.node("down").dispatch("pointerdown"));
  assert.equal(app.snapshot().state, "title");
});
test("soft drop never carries over to the next piece while the key remains held", () => {
  const app = createTetris();
  app.node("startButton").click();
  app.run("piece=newPiece('I');piece.y=19");
  app.event("keydown", { key: "ArrowDown" });
  app.frames(0.3);
  app.event("keydown", { key: "ArrowDown", repeat: true });
  assert.equal(app.snapshot().piece.y, 0);
  app.event("keyup", { key: "ArrowDown" });
  app.event("keydown", { key: "ArrowDown" });
  assert.equal(app.snapshot().piece.y, 1);
});
test("touch soft drop stops when the button is released or cancelled", () => {
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    const app = createTetris();
    app.node("startButton").click();
    app.node("down").dispatch("pointerdown");
    app.node("down").dispatch(type);
    const y = app.snapshot().piece.y;
    app.frames(0.2);
    assert.equal(app.snapshot().piece.y, y);
  }
});
test("mobile layout stacks the compact HUD and board instead of squeezing them side by side", () => {
  const css = fs.readFileSync("tetris/style.css", "utf8");
  assert.match(css, /flex-direction:\s*column/);
  assert.match(css, /order:\s*-1/);
  assert.match(css, /100svh - 292px/);
  assert.match(css, /aspect-ratio:\s*1\s*\/\s*2/);
});
test("touch controls suppress long-press text selection and callout menus", () => {
  const css = fs.readFileSync("tetris/style.css", "utf8");
  assert.match(
    css,
    /\.touch-controls button\s*\{[^}]*-webkit-touch-callout:\s*none/,
  );
  assert.match(css, /\.touch-controls button\s*\{[^}]*user-select:\s*none/);
  assert.match(css, /\.touch-controls button\s*\{[^}]*touch-action:\s*none/);
});
test("mobile touch controls leave clearance for fixed utility buttons", () => {
  const css = fs.readFileSync("tetris/style.css", "utf8");
  assert.match(css, /64px \+ env\(safe-area-inset-bottom\)/);
  assert.match(css, /body \.theme-toggle/);
  assert.match(css, /bottom:\s*max\(10px,\s*env\(safe-area-inset-bottom\)\)/);
});
test("pointer capture failure is harmless and release outside stops the old hold", () => {
  const app = createTetris({ captureThrows: true });
  app.node("startButton").click();
  assert.doesNotThrow(() => app.node("down").dispatch("pointerdown"));
  app.event("pointerup", { pointerId: 1 });
  const y = app.snapshot().piece.y;
  app.frames(0.2);
  assert.equal(app.snapshot().piece.y, y);
});
