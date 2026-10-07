"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { createShooter } = require("./helpers/shooter-runtime");
test("legacy scores are validated, read only and never mixed into the campaign best", () => {
  for (const value of ["bad", "Infinity", "-12", "2.5", "9007199254740993"])
    assert.equal(
      createShooter({ storage: { "sky-patrol-best": value } }).snapshot()
        .legacyBest,
      0,
    );
  const a = createShooter({ storage: { "sky-patrol-best": "250" } });
  assert.equal(a.snapshot().legacyBest, 250);
  assert.equal(a.snapshot().best, 0);
  a.element("startButton").click();
  a.run("g.score=400;update(.01)");
  assert.equal(a.store.get("sky-patrol-best"), "250");
});
test("campaign shoots without audio support and survives disabled storage", () => {
  for (const options of [
    { noAudio: true },
    { audioThrows: true },
    { blockStorage: true },
  ]) {
    const a = createShooter(options);
    a.element("startButton").click();
    a.frames(1);
    assert.equal(a.snapshot().state, "playing");
    assert.ok(a.snapshot().bullets.length > 0);
  }
});
test("pause clears held input and rejects keyboard auto-repeat toggles", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.event("keydown", { key: "ArrowLeft" });
  a.event("keydown", { key: "p" });
  assert.equal(a.snapshot().state, "paused");
  a.event("keydown", { key: "p", repeat: true });
  assert.equal(a.snapshot().state, "paused");
  a.element("startButton").click();
  const x = a.snapshot().player.x;
  a.frames(0.2);
  assert.equal(a.snapshot().player.x, x);
});
test("blur, pagehide and background visibility pause without retaining touch movement", () => {
  for (const type of ["blur", "pagehide", "doc:visibilitychange"]) {
    const a = createShooter();
    a.element("startButton").click();
    a.element("rightButton").dispatch("pointerdown");
    if (type.startsWith("doc")) a.document.hidden = true;
    a.event(type);
    assert.equal(a.snapshot().state, "paused");
    a.document.hidden = false;
    a.event("doc:visibilitychange");
    assert.equal(a.snapshot().state, "paused");
    a.element("startButton").click();
    const x = a.snapshot().player.x;
    a.frames(0.2);
    assert.equal(a.snapshot().player.x, x);
  }
});
test("each held direction tracks independent pointers and release owners", () => {
  const a = createShooter({ captureThrows: true });
  a.element("startButton").click();
  const b = a.element("rightButton");
  b.dispatch("pointerdown", { pointerId: 1 });
  b.dispatch("pointerdown", { pointerId: 2 });
  b.dispatch("pointerup", { pointerId: 1 });
  const x = a.snapshot().player.x;
  a.frames(0.1);
  assert.ok(a.snapshot().player.x > x);
  b.dispatch("pointercancel", { pointerId: 2 });
  const next = a.snapshot().player.x;
  a.frames(0.1);
  assert.equal(a.snapshot().player.x, next);
  a.element("leftButton").dispatch("pointerdown", { pointerId: 3 });
  a.event("pointerup", { pointerId: 3 });
  a.frames(0.1);
  assert.equal(a.snapshot().player.x, next);
});
test("controls outside play cannot leak movement into the next run", () => {
  const a = createShooter();
  a.element("leftButton").dispatch("pointerdown");
  a.element("startButton").click();
  a.frames(0.1);
  assert.equal(a.snapshot().player.x, 240);
  a.event("keydown", { key: "p" });
  a.element("rightButton").dispatch("pointerdown");
  a.element("startButton").click();
  a.frames(0.1);
  assert.equal(a.snapshot().player.x, 240);
});
test("relative drag is single-pointer, bounded, inert after cancel and pause", () => {
  const a = createShooter({ captureThrows: true });
  a.element("startButton").click();
  const c = a.element("game"),
    p = a.snapshot().player;
  c.dispatch("pointerdown", { pointerId: 10, clientX: 80, clientY: 120 });
  assert.equal(a.snapshot().player.x, p.x);
  c.dispatch("pointermove", { pointerId: 11, clientX: 180, clientY: 120 });
  assert.equal(a.snapshot().player.x, p.x);
  c.dispatch("pointermove", { pointerId: 10, clientX: 110, clientY: 80 });
  assert.equal(a.snapshot().player.x, p.x + 30);
  assert.equal(a.snapshot().player.y, p.y - 40);
  c.dispatch("pointercancel", { pointerId: 10 });
  const cancelled = a.snapshot().player;
  c.dispatch("pointermove", { pointerId: 10, clientX: 0, clientY: 0 });
  assert.equal(a.snapshot().player.x, cancelled.x);
  c.dispatch("pointerdown", { pointerId: 12 });
  a.event("keydown", { key: "p" });
  c.dispatch("pointermove", { pointerId: 12, clientX: 0, clientY: 0 });
  assert.equal(a.snapshot().player.x, cancelled.x);
});
test("diagonal and cardinal movement have equal total speed", () => {
  const a = createShooter(),
    b = createShooter();
  for (const c of [a, b]) {
    c.element("startButton").click();
    c.run("g.player.x=240;g.player.y=324");
    c.event("keydown", { key: "ArrowRight" });
  }
  b.event("keydown", { key: "ArrowUp" });
  a.frames(0.2);
  b.frames(0.2);
  const p = a.snapshot().player,
    q = b.snapshot().player;
  assert.ok(Math.abs(Math.hypot(q.x - 240, q.y - 324) - (p.x - 240)) < 0.01);
});
test("15/30/60/120Hz preserve simulation time, automatic-fire cadence and warning lifetime", () => {
  const rows = [15, 30, 60, 120].map((hz) => {
    const a = createShooter();
    a.element("startButton").click();
    a.run(
      "g.director=()=>{};g.addHazard({kind:'bomb',x:40,y:50,radius:42,w:84,h:84,warning:2,ttl:.5})",
    );
    a.frames(1, hz);
    const s = a.snapshot();
    return {
      time: s.time,
      shots: s.stats.shots,
      warning: s.hazards[0].warning,
    };
  });
  for (const r of rows) {
    assert.ok(Math.abs(r.time - 1) < 0.01);
    assert.equal(r.shots, rows[0].shots);
    assert.ok(Math.abs(r.warning - rows[0].warning) < 0.01);
  }
});
test("long frame stalls are bounded and do not skip a warning", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.run("g.addHazard({kind:'bomb',x:50,y:50,radius:42,warning:1.4,ttl:.5})");
  a.frame(30000);
  assert.ok(a.snapshot().time <= 0.251);
  assert.equal(a.snapshot().hazards[0].active, false);
});
test("title, pause and pending chapter supply stop paints and text writes but react to theme", () => {
  const a = createShooter();
  a.frame(0);
  const draws = a.stats.draws,
    writes = a.stats.textWrites;
  a.frames(1);
  assert.equal(a.stats.draws, draws);
  assert.equal(a.stats.textWrites, writes);
  a.element("startButton").click();
  a.frames(0.1);
  a.event("keydown", { key: "p" });
  a.frame(1200);
  const paused = a.stats.draws;
  a.frames(1);
  assert.equal(a.stats.draws, paused);
  a.event("doc:themechange");
  a.frame(2300);
  assert.ok(a.stats.draws > paused);
  assert.equal(a.snapshot().state, "paused");
  a.element("startButton").click();
  a.run("g.mode='challenge';g.level=3;g.lives=2;g.finishStage();sync();requestFrame()");
  a.frame(2400);
  const ended = a.stats.draws;
  a.frames(1);
  assert.equal(a.stats.draws, ended);
});
test("fatal projectile collision freezes score before a simultaneous kill and pickup", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.run(
    `g.lives=1;g.score=100;g.director=()=>{};g.fireTimer=100;g.enemyBullets=[{x:g.player.x,y:g.player.y,w:6,h:12,vx:0,vy:0}];g.spawn('scout',240,{x:240,y:200,hp:1,speed:0});g.bullets=[{x:240,y:200,w:3,h:14,vy:0}];g.powerups=[{x:g.player.x,y:g.player.y,w:18,h:18,vy:0,kind:'double'}];update(.01)`,
  );
  const s = a.snapshot();
  assert.equal(s.state, "gameover");
  assert.equal(s.lives, 0);
  assert.equal(s.score, 100);
  assert.equal(s.player.fireLevel, 1);
  const frozen = s;
  a.frames(1);
  assert.deepEqual(a.snapshot(), frozen);
  assert.match(a.element("hint").textContent, /000100/);
});
test("escaped planes award nothing and remove only the wave clear bonus, never a life", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.run("g.director=()=>{};g.spawn('scout',300,{y:700});update(.01)");
  const s = a.snapshot();
  assert.equal(s.score, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.escapeCount, 1);
  assert.equal(s.enemies.length, 0);
});
test("rendered shots use the same center as collision geometry", () => {
  const a = createShooter();
  a.run(
    "g.player=null;g.bullets=[{x:100,y:200,w:3,h:14}];g.enemyBullets=[{x:200,y:100,w:6,h:12}]",
  );
  a.stats.commands.length = 0;
  a.run("draw()");
  for (const c of [
    ["fillRect", 98.5, 193, 3, 14],
    ["fillRect", 197, 94, 6, 12],
  ])
    assert.ok(
      a.stats.commands.some((x) => JSON.stringify(x) === JSON.stringify(c)),
    );
});
test("fast projectiles sweep through enemies and player without tunnelling", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.run(
    "g.director=()=>{};g.fireTimer=100;g.player.x=300;g.spawn('scout',240,{y:200,hp:1,speed:0});g.bullets=[{x:240,y:300,w:3,h:14,vx:0,vy:-20000}];update(.02)",
  );
  assert.equal(a.snapshot().score, 30);
  assert.equal(a.snapshot().enemies.length, 0);
  a.run(
    "g.enemyBullets=[{x:g.player.x,y:g.player.y-100,w:6,h:12,vx:0,vy:20000}];update(.02)",
  );
  assert.equal(a.snapshot().lives, 2);
});
test("enemy drift stays within the visible boundaries", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.run("g.director=()=>{};g.spawn('heavy',1,{y:200});update(.01)");
  const e = a.snapshot().enemies[0];
  assert.ok(e.x >= e.w / 2 && e.x <= 480 - e.w / 2);
});
test("offscreen enemies cannot originate fire", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.run(
    "g.spawn('scout',240,{y:-30,cooldown:0});g.spawn('scout',240,{y:700,cooldown:0});for(const e of g.enemies)g.updateEnemy(e,.01)",
  );
  assert.equal(a.snapshot().enemyBullets.length, 0);
  a.run("const e=g.spawn('scout',240,{y:120,cooldown:0});g.updateEnemy(e,.01)");
  assert.equal(a.snapshot().enemyBullets.length, 1);
});
test("pause and sound expose current state accessibly", () => {
  const a = createShooter({ storage: { "play-lang": "en" } });
  assert.equal(a.element("mobilePauseButton").disabled, true);
  a.element("startButton").click();
  assert.equal(a.element("mobilePauseButton").disabled, false);
  a.element("mobilePauseButton").click();
  assert.equal(a.element("mobilePauseButton").textContent, "RESUME");
  assert.match(a.element("flightStatus").textContent, /PAUSED/);
  a.element("startButton").click();
  assert.equal(a.element("mobilePauseButton").textContent, "PAUSE");
  a.element("soundButton").click();
  assert.equal(a.element("soundButton").getAttribute("aria-pressed"), "false");
});
test("entire player silhouette stays within both walls", () => {
  const a = createShooter();
  a.element("startButton").click();
  a.event("keydown", { key: "ArrowLeft" });
  a.frames(1);
  assert.ok(a.snapshot().player.x >= 15);
  a.event("keyup", { key: "ArrowLeft" });
  a.event("keydown", { key: "ArrowRight" });
  a.frames(2);
  assert.ok(a.snapshot().player.x <= 465);
});
test("blocked storage permits a fatal transition", () => {
  const a = createShooter({ blockStorage: true });
  a.element("startButton").click();
  a.frames(1);
  a.run("g.lives=1;g.hurt();sync()");
  assert.equal(a.snapshot().state, "gameover");
});
