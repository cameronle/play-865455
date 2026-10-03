const test = require("node:test"),
  assert = require("node:assert/strict");
const { createBreakout } = require("./helpers/breakout-runtime");
test("both side walls clamp the complete ball and bounce inward", () => {
  for (const [x, vx, expected] of [
    [1, -190, 7.5],
    [479, 190, 472.5],
  ]) {
    const a = start();
    a.run(
      `ball={x:${x},y:400,vx:${vx},vy:-200,r:7.5,stuck:false};update(1/120)`,
    );
    const b = a.snapshot().ball;
    assert.equal(b.x, expected);
    assert.equal(Math.sign(b.vx), -Math.sign(vx));
  }
});
test("last flower advances one garden, preserves chances and awaits deliberate release", () => {
  const a = start();
  a.run(
    "lives=2;bar.x=50;bricks=[{x:100,y:100,w:41,h:20,alive:true}];ball={x:120.5,y:127,vx:0,vy:-250,r:7.5,stuck:false}",
  );
  a.event("keydown", { key: "ArrowRight" });
  a.run("update(.02)");
  let s = a.snapshot();
  assert.equal(s.level, 2);
  assert.equal(s.score, 10);
  assert.equal(s.lives, 2);
  assert.equal(s.bricks.length, 72);
  assert.equal(s.ball.stuck, true);
  assert.equal(s.keys.length, 0);
  assert.equal(a.node("mobileLaunch").textContent, "RELEASE FIREFLY");
  a.frames(0.2);
  assert.equal(a.snapshot().ball.stuck, true);
  a.event("keydown", { key: " " });
  assert.equal(a.snapshot().ball.stuck, false);
});
test("level target count grows to a bounded ten rows and silhouettes remain separate", () => {
  const a = start();
  for (let level = 1; level <= 20; level++) {
    a.run(`level=${level};makeBricks()`);
    const b = a.snapshot().bricks;
    assert.equal(b.length, 9 * (6 + Math.min(level, 4)));
    assert.ok(b.every((v) => v.x >= 0 && v.x + v.w <= 480 && v.y + v.h < 598));
    assert.equal(a.run("FLOWER_RADIUS*2<27"), true);
  }
});

test("an exactly centered stationary overlap never creates NaN coordinates", () => {
  const a = start();
  a.run(
    "bricks=[{x:100,y:100,w:41,h:20,alive:true},{x:300,y:100,w:41,h:20,alive:true}];ball={x:120.5,y:110,vx:0,vy:0,r:7.5,stuck:false};update(.008)",
  );
  assert.equal(a.run("Number.isFinite(ball.x)&&Number.isFinite(ball.y)"), true);
});

test("ending a pointer drag retains independently held keyboard movement", () => {
  const a = start();
  a.event("keydown", { key: "ArrowRight" });
  a.node("game").dispatch("pointerdown", { pointerId: 4 });
  a.node("game").dispatch("pointerup", { pointerId: 4 });
  assert.deepEqual(a.snapshot().keys, ["ArrowRight"]);
  const old = a.snapshot().bar.x;
  a.run("update(.05)");
  assert.ok(a.snapshot().bar.x > old);
});
const start = (o) => {
  const a = createBreakout(o);
  a.node("start").click();
  return a;
};
test("public controls express title flight waiting pause and result states without accidental release", () => {
  const a = createBreakout();
  assert.equal(a.node("pause").disabled, true);
  assert.equal(a.document.activeElement.id, "start");
  a.node("start").click();
  assert.equal(a.node("mobileLaunch").disabled, true);
  assert.equal(a.node("mobileLaunch").textContent, "IN FLIGHT");
  assert.equal(a.document.activeElement.id, "game");
  a.node("pause").click();
  assert.equal(a.node("pause").textContent, "RESUME");
  assert.equal(a.node("pause")["aria-pressed"], "true");
  a.node("start").click();
  a.run("lose()");
  assert.equal(a.node("mobileLaunch").textContent, "RELEASE FIREFLY");
  a.node("pause").click();
  a.node("start").click();
  assert.equal(a.snapshot().ball.stuck, true);
  a.node("mobileLaunch").click();
  assert.equal(a.snapshot().ball.stuck, false);
  a.node("mobileNew").click();
  assert.equal(a.snapshot().lives, 3);
  assert.equal(a.snapshot().score, 0);
  a.run("lives=1;lose()");
  assert.equal(a.node("pause").disabled, true);
  assert.equal(a.node("mobileLaunch").disabled, false);
});
test("life loss attaches to the current leaf, clears held input, and terminal score is stable", () => {
  const a = start();
  a.run("bar.x=50;score=80");
  a.event("keydown", { key: "ArrowRight" });
  a.run("lose()");
  let s = a.snapshot();
  assert.equal(s.lives, 2);
  assert.equal(s.ball.stuck, true);
  assert.equal(s.ball.x, s.bar.x + s.bar.w / 2);
  assert.equal(s.keys.length, 0);
  a.frames(0.2);
  assert.equal(a.snapshot().bar.x, 50);
  a.node("mobileLaunch").click();
  a.run("lives=1;lose()");
  s = a.snapshot();
  assert.equal(s.state, "over");
  assert.equal(s.score, 80);
  assert.equal(s.lives, 0);
  a.run("lose()");
  assert.equal(a.snapshot().lives, 0);
  assert.equal(a.snapshot().score, 80);
  a.node("start").click();
  assert.equal(a.snapshot().lives, 3);
  assert.equal(a.snapshot().score, 0);
});
test("flower collision follows its visible footprint rather than an empty rectangular corner", () => {
  const a = start();
  a.run(
    "bricks=[{x:100,y:100,w:41,h:20,alive:true},{x:300,y:100,w:41,h:20,alive:true}];ball={x:101,y:100,vx:0,vy:0,r:6,stuck:false};update(.008)",
  );
  assert.equal(a.snapshot().score, 0);
  assert.equal(a.snapshot().bricks[0].alive, true);
  a.run("ball={x:137,y:110,vx:-100,vy:0,r:6,stuck:false};update(.008)");
  const s = a.snapshot();
  assert.equal(s.score, 10);
  assert.equal(s.bricks[0].alive, false);
  assert.ok(s.ball.vx > 0);
  assert.ok(Math.abs(s.ball.vy) >= 20);
  assert.ok(Math.abs(Math.hypot(s.ball.vx, s.ball.vy) - 100) < 1e-6);
  const x = s.ball.x;
  a.run("update(.008)");
  assert.equal(a.snapshot().score, 10);
  assert.ok(a.snapshot().ball.x > x);
});
test("paddle edge brushes bounce once, separate the ball and preserve speed", () => {
  const a = start();
  a.run(
    "bricks=[{x:50,y:50,w:41,h:20,alive:true}];ball={x:bar.x-3,y:bar.y-7,vx:0,vy:250,r:6,stuck:false};update(.008)",
  );
  const s = a.snapshot();
  assert.ok(s.ball.vy < 0);
  assert.ok(s.ball.y + s.ball.r <= s.bar.y);
  assert.ok(Math.abs(Math.hypot(s.ball.vx, s.ball.vy) - 250) < 1e-6);
  a.run("update(.008)");
  assert.ok(a.snapshot().ball.vy < 0);
});
test("keyboard pause ignores repeats, native button activation and modifiers are preserved", () => {
  const a = start();
  a.event("keydown", { key: "p" });
  a.event("keydown", { key: "p", repeat: true });
  assert.equal(a.snapshot().state, "pause");
  a.event("keydown", { key: "p" });
  assert.equal(a.snapshot().state, "play");
  for (const e of [
    { key: "d", ctrlKey: true },
    { key: "ArrowRight", target: { tagName: "INPUT" } },
    { key: " ", target: { tagName: "BUTTON" } },
  ]) {
    assert.notEqual(a.event("keydown", e).defaultPrevented, true);
    assert.equal(a.snapshot().keys.length, 0);
  }
  a.event("keydown", { key: "D" });
  assert.deepEqual(a.snapshot().keys, ["d"]);
  a.event("keyup", { key: "D" });
  assert.equal(a.snapshot().keys.length, 0);
  a.event("keydown", { key: "ArrowRight" });
  const b = a.snapshot().bar.x;
  a.event("blur");
  assert.equal(a.snapshot().state, "pause");
  assert.equal(a.snapshot().keys.length, 0);
  a.node("start").click();
  a.frames(0.1);
  assert.equal(a.snapshot().bar.x, b);
});
test("drag is relative, pointer-owned and never resets a paused garden", () => {
  const a = start({ captureThrows: true });
  a.run("score=20;lives=2");
  a.node("pause").click();
  a.node("game").dispatch("pointerdown", { pointerId: 3, clientX: 100 });
  assert.equal(a.snapshot().state, "pause");
  assert.equal(a.snapshot().score, 20);
  a.node("start").click();
  const b = a.snapshot().bar.x;
  assert.doesNotThrow(() =>
    a.node("game").dispatch("pointerdown", { pointerId: 3, clientX: 100 }),
  );
  assert.equal(a.snapshot().bar.x, b);
  a.node("game").dispatch("pointerdown", { pointerId: 4, clientX: 300 });
  a.node("game").dispatch("pointermove", { pointerId: 4, clientX: 340 });
  assert.equal(a.snapshot().bar.x, b);
  a.node("game").dispatch("pointermove", { pointerId: 3, clientX: 120 });
  assert.ok(Math.abs(a.snapshot().bar.x - b - (20 * 480) / 360) < 1e-6);
  a.node("game").dispatch("pointerup", { pointerId: 4 });
  a.node("game").dispatch("pointermove", { pointerId: 3, clientX: 140 });
  assert.ok(a.snapshot().bar.x > b + 40);
  a.node("game").dispatch("pointercancel", { pointerId: 3 });
  const end = a.snapshot().bar.x;
  a.node("game").dispatch("pointermove", { pointerId: 3, clientX: 300 });
  assert.equal(a.snapshot().bar.x, end);
  a.node("game").dispatch("pointerdown", { button: 2 });
  assert.equal(a.snapshot().dragging, false);
});
test("title, pause and game over stop RAF, while theme and resize redraw once", () => {
  const a = createBreakout();
  const p = a.stats.paints;
  a.frames(1);
  assert.equal(a.stats.frames, 0);
  assert.equal(a.stats.paints, p);
  a.event("doc:themechange");
  assert.equal(a.stats.paints, p + 1);
  a.node("start").click();
  a.frame(16);
  a.node("pause").click();
  const f = a.stats.frames;
  a.frames(1);
  assert.equal(a.stats.frames, f);
  const old = a.snapshot().ball;
  a.node("start").click();
  a.frame(1032);
  assert.ok(Math.abs(a.snapshot().ball.y - old.y) < 10);
  a.run("lives=1;lose()");
  const end = a.stats.frames;
  a.frames(1);
  assert.equal(a.stats.frames, end);
});
test("equal active time gives the same trajectory at 15/30/60/120Hz", () => {
  const positions = [];
  for (const hz of [15, 30, 60, 120]) {
    const a = start();
    a.run(
      "bricks=[{x:50,y:50,w:41,h:20,alive:true}];ball={x:240,y:320,vx:100,vy:-100,r:6,stuck:false}",
    );
    a.frames(2, hz);
    positions.push(a.snapshot().ball);
    assert.ok(Math.abs(a.snapshot().ball.x - 440) < 1e-6);
    assert.ok(Math.abs(a.snapshot().ball.y - 120) < 1e-6);
  }
  for (const p of positions) assert.ok(Math.abs(p.x - positions[0].x) < 1e-6);
});
test("storage denial and invalid saved best never prevent play", () => {
  assert.doesNotThrow(() => start({ blockRead: true, blockWrite: true }));
  for (const value of ["-2", "NaN", "Infinity", "1.5", "9007199254740992"])
    assert.equal(
      start({ storage: { "breakout-high": value } }).snapshot().high,
      0,
    );
});
test("NEW NIGHT resets an active run instead of being a second no-op launch", () => {
  const a = start();
  a.run("score=90;level=3;lives=1");
  a.node("new").click();
  assert.equal(a.snapshot().score, 0);
  assert.equal(a.snapshot().level, 1);
  assert.equal(a.snapshot().lives, 3);
  assert.equal(a.snapshot().ball.stuck, false);
});
test("a new best is persisted at the hit, including when the run is restarted", () => {
  const a = start();
  a.run(
    "bricks=[{x:100,y:100,w:41,h:20,alive:true},{x:300,y:100,w:41,h:20,alive:true}];ball={x:120,y:110,vx:0,vy:100,r:6,stuck:false};update(.008)",
  );
  assert.equal(a.store.get("breakout-high"), "10");
  a.node("new").click();
  assert.equal(a.snapshot().high, 10);
});
