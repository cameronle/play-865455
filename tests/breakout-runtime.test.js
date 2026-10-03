const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { createBreakout } = require("./helpers/breakout-runtime");
test("mobile launch button starts and launches from the title screen", () => {
  const a = createBreakout();
  a.node("mobileLaunch").click();
  const first = a.snapshot().ball.y;
  a.frames(0.1);
  assert.equal(a.snapshot().state, "play");
  assert.ok(a.snapshot().ball.y < first);
});
test("a pointer on the playfield starts and launches the game", () => {
  const a = createBreakout();
  a.node("game").dispatch("pointerdown");
  a.node("game").dispatch("pointerup");
  const first = a.snapshot().ball.y;
  a.frames(0.1);
  assert.equal(a.snapshot().state, "play");
  assert.ok(a.snapshot().ball.y < first);
});
test("top collision clamps the ball inside and points velocity downward", () => {
  const a = createBreakout();
  a.node("start").click();
  a.run("ball={x:240,y:2,vx:0,vy:-250,r:7.5,stuck:false};update(1/120)");
  const b = a.snapshot().ball;
  assert.equal(b.y, 7.5);
  assert.equal(b.vy, 250);
});
test("mobile layout has height-bounded playfield and an accessible launch target", () => {
  const s = fs.readFileSync("breakout/style.css", "utf8");
  assert.match(s, /100svh - 304px/);
  assert.match(s, /grid-template-areas:\s*"sidebar" "frame" "actions"/);
  assert.match(s, /min-height:\s*48px/);
});
