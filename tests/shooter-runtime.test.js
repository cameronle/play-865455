"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createShooter } = require("./helpers/shooter-runtime");
test("Sky Patrol rejects corrupt or non-finite best scores", () => {
  for (const value of ["bad", "Infinity", "-12", "2.5", "9007199254740993"]) {
    const app = createShooter({ storage: { "sky-patrol-best": value } });
    assert.equal(app.snapshot().best, 0);
  }
  assert.equal(
    createShooter({ storage: { "sky-patrol-best": "250" } }).snapshot().best,
    250,
  );
});
test("Sky Patrol can start and shoot without browser audio support", () => {
  for (const options of [{ noAudio: true }, { audioThrows: true }]) {
    const app = createShooter(options);
    app.element("startButton").click();
    app.frames(1);
    assert.equal(app.snapshot().state, "playing");
    assert.ok(app.snapshot().bullets.length > 0);
  }
});
test("pause clears held input and rejects keyboard auto-repeat toggles", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.event("keydown", { key: "ArrowLeft" });
  app.event("keydown", { key: "p" });
  assert.equal(app.snapshot().state, "paused");
  app.event("keydown", { key: "p", repeat: true });
  assert.equal(app.snapshot().state, "paused");
  app.element("startButton").click();
  const x = app.snapshot().player.x;
  app.frames(0.2);
  assert.equal(app.snapshot().player.x, x);
});
test("blur and background visibility pause without retaining touch movement", () => {
  for (const suspend of [
    (a) => a.event("blur"),
    (a) => {
      a.document.hidden = true;
      a.event("doc:visibilitychange");
    },
  ]) {
    const app = createShooter();
    app.element("startButton").click();
    app.element("rightButton").dispatch("pointerdown");
    suspend(app);
    assert.equal(app.snapshot().state, "paused");
    app.document.hidden = false;
    app.element("startButton").click();
    const x = app.snapshot().player.x;
    app.frames(0.2);
    assert.equal(app.snapshot().player.x, x);
  }
});
test("each held direction tracks its own pointers and cancels exactly once", () => {
  const app = createShooter({ captureThrows: true });
  app.element("startButton").click();
  const button = app.element("rightButton");
  button.dispatch("pointerdown", { pointerId: 1 });
  button.dispatch("pointerdown", { pointerId: 2 });
  button.dispatch("pointerup", { pointerId: 1 });
  const x = app.snapshot().player.x;
  app.frames(0.1);
  assert.ok(app.snapshot().player.x > x);
  button.dispatch("pointercancel", { pointerId: 2 });
  const next = app.snapshot().player.x;
  app.frames(0.1);
  assert.equal(app.snapshot().player.x, next);
  app.element("leftButton").dispatch("pointerdown", { pointerId: 3 });
  app.event("pointerup", { pointerId: 3 });
  app.frames(0.1);
  assert.equal(app.snapshot().player.x, next);
});
test("direction controls are inert outside active play and cannot leak into a new run", () => {
  const app = createShooter();
  app.element("leftButton").dispatch("pointerdown");
  app.element("startButton").click();
  app.frames(0.1);
  assert.equal(app.snapshot().player.x, 240);
  app.event("keydown", { key: "p" });
  app.element("rightButton").dispatch("pointerdown");
  app.element("startButton").click();
  app.frames(0.1);
  assert.equal(app.snapshot().player.x, 240);
});
test("dragging is relative, single-pointer, bounded, and inert after pause or cancel", () => {
  const app = createShooter({ captureThrows: true });
  app.element("startButton").click();
  const canvas = app.element("game"),
    before = app.snapshot().player;
  canvas.dispatch("pointerdown", { pointerId: 10, clientX: 80, clientY: 120 });
  assert.equal(app.snapshot().player.x, before.x);
  assert.equal(app.snapshot().player.y, before.y);
  canvas.dispatch("pointermove", { pointerId: 11, clientX: 180, clientY: 120 });
  assert.equal(app.snapshot().player.x, before.x);
  canvas.dispatch("pointermove", { pointerId: 10, clientX: 110, clientY: 80 });
  assert.equal(app.snapshot().player.x, before.x + 30);
  assert.equal(app.snapshot().player.y, before.y - 40);
  canvas.dispatch("pointercancel", { pointerId: 10 });
  const cancelled = app.snapshot().player;
  canvas.dispatch("pointermove", { pointerId: 10, clientX: 0, clientY: 0 });
  assert.equal(app.snapshot().player.x, cancelled.x);
  canvas.dispatch("pointerdown", { pointerId: 12, clientX: 200, clientY: 100 });
  app.event("keydown", { key: "p" });
  canvas.dispatch("pointermove", { pointerId: 12, clientX: 0, clientY: 0 });
  assert.equal(app.snapshot().player.x, cancelled.x);
});
test("diagonal movement has the same total speed as movement along one axis", () => {
  const straight = createShooter(),
    diagonal = createShooter();
  for (const app of [straight, diagonal]) {
    app.element("startButton").click();
    app.run("player.x=240;player.y=324");
    app.event("keydown", { key: "ArrowRight" });
  }
  diagonal.event("keydown", { key: "ArrowUp" });
  straight.frames(0.2);
  diagonal.frames(0.2);
  const a = straight.snapshot().player,
    b = diagonal.snapshot().player;
  assert.ok(Math.abs(Math.hypot(b.x - 240, b.y - 324) - (a.x - 240)) < 0.01);
});
test("15/30/60/120 Hz advance equal game time and automatic-fire cadence", () => {
  const rows = [15, 30, 60, 120].map((hz) => {
    const app = createShooter();
    app.element("startButton").click();
    app.run(
      "spawnTimer=100;enemyFireTimer=100;globalThis.shots=0;const originalFire=fire;fire=()=>{const before=bullets.length;originalFire();shots+=bullets.length-before}",
    );
    app.frames(3, hz);
    return { time: app.snapshot().levelTimer, shots: app.run("shots") };
  });
  for (const row of rows) {
    assert.ok(Math.abs(row.time - 3) < 0.01, JSON.stringify(rows));
    assert.equal(row.shots, rows[0].shots);
  }
});
test("title and pause do not paint continuously but react to theme changes", () => {
  const app = createShooter();
  app.frame(0);
  const titleDraws = app.stats.draws;
  app.frames(1);
  assert.equal(app.stats.draws, titleDraws);
  app.element("startButton").click();
  app.frames(0.1);
  app.event("keydown", { key: "p" });
  app.frame(1200);
  const pausedDraws = app.stats.draws;
  app.frames(1);
  assert.equal(app.stats.draws, pausedDraws);
  app.event("doc:themechange");
  app.frame(2300);
  assert.ok(app.stats.draws > pausedDraws);
  assert.equal(app.snapshot().state, "paused");
});
test("a fatal escape freezes the final score before other collisions or pickups", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.run(`lives=1;score=100;spawnTimer=100;enemyFireTimer=100;
    enemies=[{x:400,y:H+50,w:25,h:25,hp:1,vy:0,vx:0,phase:0,score:25}];
    powerups=[{x:player.x,y:player.y,w:15,h:15,vy:0,kind:'double'}];update(.01)`);
  const s = app.snapshot();
  assert.equal(s.state, "gameover");
  assert.equal(s.lives, 0);
  assert.equal(s.score, 100);
  assert.equal(s.best, 100);
  assert.equal(s.player.fireLevel, 1);
  assert.match(app.element(".hint").textContent, /000100/);
});
test("a new best is safely saved during play, not only on game over", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.run(`spawnTimer=100;enemyFireTimer=100;
    enemies=[{x:240,y:200,w:25,h:25,hp:1,vy:0,vx:0,phase:0,score:25,type:'scout'}];
    bullets=[{x:240,y:200,w:3,h:14,vy:0}];update(.01)`);
  assert.equal(app.snapshot().score, 25);
  assert.equal(app.snapshot().best, 25);
  assert.equal(app.store.get("sky-patrol-best"), "25");
  const writes = app.stats.storageWrites;
  app.frames(0.1);
  assert.equal(app.stats.storageWrites, writes);
});
test("projectiles draw around the same center used by collision tests", () => {
  const app = createShooter();
  app.run(
    "stars=[];player=null;bullets=[{x:100,y:200,w:3,h:14}];enemyBullets=[{x:200,y:100,w:4,h:12}]",
  );
  app.stats.commands.length = 0;
  app.run("draw()");
  assert.ok(
    app.stats.commands.some(
      (c) =>
        JSON.stringify(c) === JSON.stringify(["fillRect", 98.5, 193, 3, 14]),
    ),
  );
  assert.ok(
    app.stats.commands.some(
      (c) => JSON.stringify(c) === JSON.stringify(["fillRect", 198, 94, 4, 12]),
    ),
  );
});
test("fast projectiles cannot tunnel through enemies or the ship", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.run(`spawnTimer=100;enemyFireTimer=100;fireTimer=100;player.x=300;
    enemies=[{x:240,y:200,w:25,h:25,hp:1,vy:0,vx:0,phase:0,score:25,type:'scout'}];
    bullets=[{x:240,y:300,w:3,h:14,vy:-20000}];update(.02)`);
  assert.equal(app.snapshot().score, 25);
  assert.equal(app.snapshot().enemies.length, 0);
  app.run(
    `enemyBullets=[{x:player.x,y:player.y-100,w:4,h:12,vy:20000}];update(.02)`,
  );
  assert.equal(app.snapshot().lives, 2);
});
test("enemy drift stays visible so missed enemies and dropped powerups remain reachable", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.run(`spawnTimer=100;enemyFireTimer=100;
    enemies=[{x:1,y:200,w:34,h:34,hp:3,vy:0,vx:-28,phase:0,score:90,type:'heavy'}];update(.01)`);
  const e = app.snapshot().enemies[0];
  assert.ok(e.x >= e.w / 2);
  assert.ok(e.x <= 480 - e.w / 2);
});
test("only visible enemies can originate enemy fire", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.run(
    "enemies=[{x:240,y:-30,w:25,h:25},{x:240,y:H+20,w:25,h:25}];enemyFire()",
  );
  assert.equal(app.snapshot().enemyBullets.length, 0);
  app.run("enemies.push({x:240,y:120,w:25,h:25});enemyFire()");
  assert.equal(app.snapshot().enemyBullets.length, 1);
  assert.ok(app.snapshot().enemyBullets[0].y > 120);
});
test("pause and sound controls communicate their current states", () => {
  const app = createShooter();
  assert.equal(app.element("mobilePauseButton").disabled, true);
  app.element("startButton").click();
  assert.equal(app.element("mobilePauseButton").disabled, false);
  assert.match(app.element("flightStatus").textContent, /Flight started/);
  app.element("mobilePauseButton").click();
  assert.equal(app.element("mobilePauseButton").textContent, "RESUME");
  assert.match(app.element("flightStatus").textContent, /paused/);
  app.element("startButton").click();
  assert.equal(app.element("mobilePauseButton").textContent, "PAUSE");
  app.element("soundButton").click();
  assert.equal(
    app.element("soundButton").getAttribute("aria-pressed"),
    "false",
  );
});
test("the complete rendered ship stays inside the left and right walls", () => {
  const app = createShooter();
  app.element("startButton").click();
  app.event("keydown", { key: "ArrowLeft" });
  app.frames(1);
  assert.ok(app.snapshot().player.x >= 15);
  app.event("keyup", { key: "ArrowLeft" });
  app.event("keydown", { key: "ArrowRight" });
  app.frames(2);
  assert.ok(app.snapshot().player.x <= 465);
});
test("Sky Patrol boots and remains playable when local storage is disabled", () => {
  const app = createShooter({ blockStorage: true });
  app.element("startButton").click();
  app.frames(1);
  assert.equal(app.snapshot().state, "playing");
  app.run("lives=1; hurt()");
  assert.equal(app.snapshot().state, "gameover");
});
