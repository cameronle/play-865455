"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createCave } = require("./helpers/cave-runtime.js");
test("pause clears physically held thrust before manual resume", () => {
  const g = createCave();
  g.element("thrustButton").dispatch("pointerdown");
  assert.equal(g.snapshot().input.thrust, true);
  g.element("pauseButton").click();
  assert.equal(g.snapshot().paused, true);
  assert.equal(g.snapshot().input.thrust, false);
  assert.equal(g.element("thrustButton").classList.contains("active"), false);
  g.element("startButton").click();
  assert.equal(g.snapshot().paused, false);
  assert.equal(g.snapshot().input.thrust, false);
});

test("one pointer or keyboard release cannot cancel another held source", () => {
  const g = createCave();
  g.element("thrustButton").dispatch("pointerdown", { pointerId: 1 });
  g.event("keydown", { code: "Space", key: " ", repeat: false });
  g.element("thrustButton").dispatch("pointerup", { pointerId: 1 });
  assert.equal(g.snapshot().input.thrust, true);
  g.element("game").dispatch("pointerdown", { pointerId: 2 });
  g.event("keyup", { code: "Space", key: " " });
  assert.equal(g.snapshot().input.thrust, true);
  g.element("game").dispatch("pointercancel", { pointerId: 9 });
  assert.equal(g.snapshot().input.thrust, true);
  g.element("game").dispatch("lostpointercapture", { pointerId: 2 });
  assert.equal(g.snapshot().input.thrust, false);
  g.element("pauseButton").click();
  g.element("thrustButton").dispatch("pointerdown", { pointerId: 3 });
  assert.equal(g.snapshot().input.thrust, false);
  g.element("startButton").click();
  assert.equal(g.snapshot().input.thrust, false);
});

test("window blur suspends flight and releases all held actions", () => {
  const g = createCave();
  g.element("game").dispatch("pointerdown");
  g.event("blur");
  assert.equal(g.snapshot().paused, true);
  assert.equal(g.snapshot().input.thrust, false);
  const before = g.snapshot();
  g.frames(2);
  assert.equal(g.snapshot().distance, before.distance);
  g.event("blur");
  assert.equal(g.snapshot().paused, true);
});

test("secondary mouse presses do not start or thrust", () => {
  const g = createCave();
  g.element("game").dispatch("pointerdown", {
    pointerType: "mouse",
    button: 2,
  });
  assert.equal(g.snapshot().state, "title");
  g.element("thrustButton").dispatch("pointerdown", {
    pointerType: "mouse",
    button: 1,
  });
  assert.equal(g.snapshot().state, "title");
});

test("unavailable storage cannot stop boot or result rendering", () => {
  const g = createCave({ blockStorage: true });
  g.element("startButton").click();
  g.run("distance=50;gameOver()");
  assert.equal(g.snapshot().state, "over");
  assert.equal(g.snapshot().best, 50);
  assert.equal(g.element("message").textContent, "LIGHTS OUT");
});

test("new flights have a flat full-width warmup instead of per-segment shrink", () => {
  const g = createCave({ seed: 987 });
  g.element("startButton").click();
  for (const s of g.snapshot().cave.filter((s) => s.x <= 850)) {
    assert.equal(s.gap, 245);
    assert.equal(s.center, 240);
  }
  g.run(
    "distance=3500;cave=[{x:750,center:240,gap:170,shift:0}];for(let i=0;i<100;i++)generateCaveSegment()",
  );
  const list = g.snapshot().cave;
  for (let i = 1; i < list.length; i++) {
    const s = list[i],
      a = list[i - 1];
    assert.ok(s.gap >= 150 && s.gap <= 245);
    assert.ok(Math.abs(s.center - a.center) <= 14.001);
    assert.ok(Math.abs(s.gap - a.gap) <= 3.001);
    assert.ok(s.center - s.gap / 2 >= 28 && s.center + s.gap / 2 <= 452);
  }
});

test("crystals use their entire actual spawn footprint and leave a flyable corridor", () => {
  const g = createCave();
  g.element("startButton").click();
  g.run(
    "cave=[{x:-50,center:330,gap:200},{x:690,center:330,gap:200},{x:800,center:220,gap:180},{x:900,center:210,gap:180}];spawnObstacle()",
  );
  const o = g.snapshot().obstacles[0];
  assert.ok(o);
  const b = g.run(`caveBoundsFor(${o.x},${o.x + o.w})`);
  assert.ok(o.y >= b.top - 1e-6);
  assert.ok(o.y + o.h <= b.bottom + 1e-6);
  assert.ok(b.bottom - b.top - o.h >= 104 - 1e-6);
  g.run(
    "cave=[{x:-50,center:240,gap:150},{x:1100,center:240,gap:150}];obstacles=[];spawnObstacle()",
  );
  assert.equal(g.snapshot().obstacles.length, 1);
});

test("collision checks cave vertices inside the body, not only its two edges", () => {
  const g = createCave();
  g.element("startButton").click();
  g.run(
    "cave=[{x:0,center:240,gap:200},{x:140,center:300,gap:200},{x:280,center:240,gap:200}];helicopter.y=207;obstacles=[]",
  );
  assert.equal(g.run("checkCollision()"), true);
});

test("crystal empty bounding-box corners are safe but visible tips and bodies collide", () => {
  const g = createCave();
  g.element("startButton").click();
  g.run(
    "cave=[{x:0,center:240,gap:420},{x:1100,center:240,gap:420}];obstacles=[{x:100,y:100,w:50,h:80,fromTop:false}];helicopter={x:102,y:106,w:4,h:4,vy:0,rotor:0}",
  );
  assert.equal(g.run("checkCollision()"), false);
  g.run("helicopter.x=141;helicopter.y=107");
  assert.equal(g.run("checkCollision()"), true);
  g.run("helicopter.x=120;helicopter.y=177");
  assert.equal(g.run("checkCollision()"), true);
  g.run("obstacles[0].fromTop=true;helicopter.x=141;helicopter.y=173");
  assert.equal(g.run("checkCollision()"), true);
  g.run("helicopter.x=102;helicopter.y=174");
  assert.equal(g.run("checkCollision()"), false);
});

test("cyan scenery crystals are inside the walls rather than fake collision hazards", () => {
  const g = createCave();
  g.run("drawCave(false)");
  const pts = g.stats.commands
    .filter((x) => ["moveTo", "lineTo"].includes(x[0]))
    .slice(-60);
  assert.equal(pts.length, 60);
  for (let i = 0; i < pts.length; i += 6) {
    const x = pts[i + 1][1],
      b = g.run(`caveBoundsAt(${x})`);
    assert.ok(pts[i + 1][2] < b.top);
    assert.ok(pts[i + 4][2] > b.bottom);
  }
});

test("pause ignores key-repeat and shortcuts do not steal native button activation", () => {
  const g = createCave();
  g.element("startButton").click();
  g.event("keydown", { key: "p", code: "KeyP", repeat: false });
  assert.equal(g.snapshot().paused, true);
  g.event("keydown", { key: "p", code: "KeyP", repeat: true });
  assert.equal(g.snapshot().paused, true);
  g.element("startButton").click();
  g.event("keydown", {
    key: " ",
    code: "Space",
    target: g.element("pauseButton"),
  });
  assert.equal(g.snapshot().input.thrust, false);
  g.event("keydown", { key: "p", code: "KeyP", metaKey: true });
  assert.equal(g.snapshot().paused, false);
});

test("30, 60, 120 and 144Hz frames produce the same hold/release flight", () => {
  const samples = [];
  for (const hz of [30, 60, 120, 144]) {
    const g = createCave();
    g.element("game").dispatch("pointerdown");
    g.frames(0.25, hz);
    g.element("game").dispatch("pointerup");
    g.frames(0.25, hz);
    samples.push(g.snapshot());
  }
  for (const s of samples) {
    assert.equal(s.state, "playing");
    assert.ok(Math.abs(s.distance - samples[0].distance) < 1e-7);
    assert.ok(Math.abs(s.helicopter.y - samples[0].helicopter.y) < 1e-7);
    assert.ok(Math.abs(s.helicopter.vy - samples[0].helicopter.vy) < 1e-7);
  }
});

test("title and pause stop continuous painting, while death particles settle once", () => {
  const g = createCave();
  g.frame(0);
  const title = g.stats.draws;
  g.frames(2);
  assert.equal(g.stats.draws, title);
  g.element("startButton").click();
  g.element("pauseButton").click();
  g.frame(2050);
  const paints = g.stats.draws,
    writes = g.stats.textWrites;
  g.frames(2);
  assert.equal(g.stats.draws, paints);
  assert.equal(g.stats.textWrites, writes);
  g.element("startButton").click();
  g.run("distance=20;gameOver()");
  g.frames(2);
  assert.equal(g.snapshot().particles.length, 0);
  const over = g.stats.draws;
  g.frames(1);
  assert.equal(g.stats.draws, over);
  g.event("doc:themechange");
  g.frame(8000);
  assert.equal(g.stats.draws, over + 1);
});

test("live best is current, page suspension persists once, clear cannot resurrect it", () => {
  const g = createCave();
  g.element("startButton").click();
  g.run("distance=42.9;updateHud()");
  assert.equal(g.element("best").textContent, "00042m");
  g.event("blur");
  assert.equal(g.store.get("helicopterCaveBest"), "42");
  const writes = g.stats.storageWrites;
  g.event("beforeunload");
  assert.equal(g.stats.storageWrites, writes);
  g.event("game-data-clearing");
  g.event("beforeunload");
  assert.equal(g.snapshot().best, 0);
  assert.equal(g.snapshot().state, "title");
  assert.equal(g.element("best").textContent, "00000m");
  assert.equal(g.stats.storageWrites, writes);
});

test("HUD writes only changed labels and exposes pause and thrust states", () => {
  const g = createCave();
  const before = g.stats.textWrites;
  g.run("updateHud();updateHud()");
  assert.equal(g.stats.textWrites, before);
  assert.equal(g.element("pauseButton").disabled, true);
  g.element("game").dispatch("pointerdown");
  assert.equal(g.element("pauseButton").disabled, false);
  assert.equal(g.element("thrustButton").getAttribute("aria-pressed"), "true");
  g.element("pauseButton").click();
  assert.equal(g.element("pauseButton").getAttribute("aria-pressed"), "true");
  assert.equal(g.element("thrustButton").disabled, true);
});

test("unchanged HUD updates do not mutate aria attributes every simulation step", () => {
  const g = createCave();
  g.element("startButton").click();
  g.run("updateHud()");
  const n = g.stats.attributeWrites;
  g.run("for(let i=0;i<120;i++)updateHud()");
  assert.equal(g.stats.attributeWrites, n);
});

test("canvas context menus and text selection are canceled", () => {
  const g = createCave();
  for (const type of ["contextmenu", "selectstart", "dragstart"]) {
    assert.equal(g.element("game").dispatch(type).defaultPrevented, true);
  }
});

test("malformed records are discarded but legitimate legacy best is retained", () => {
  for (const value of [
    "Infinity",
    "NaN",
    "-42",
    "1.5",
    "9007199254740992",
    "garbage",
  ]) {
    const g = createCave({ storage: { helicopterCaveBest: value } });
    assert.equal(g.snapshot().best, 0);
  }
  const g = createCave({ storage: { helicopterCaveBest: "124" } });
  assert.equal(g.snapshot().best, 124);
});
test("end-of-flight records and particles are emitted only once", () => {
  const g = createCave();
  g.element("startButton").click();
  g.run("distance=99.9;gameOver()");
  const writes = g.stats.storageWrites,
    n = g.snapshot().particles.length;
  g.run("gameOver();gameOver()");
  assert.equal(g.stats.storageWrites, writes);
  assert.equal(g.snapshot().particles.length, n);
  assert.equal(g.snapshot().best, 99);
});
test("capture failures and canceled pointers still release safely", () => {
  const g = createCave({ captureThrows: true });
  g.element("game").dispatch("pointerdown");
  assert.equal(g.snapshot().input.thrust, true);
  g.element("game").dispatch("pointercancel");
  assert.equal(g.snapshot().input.thrust, false);
});
test("long suspension waits for manual resume without a catch-up step", () => {
  const g = createCave();
  g.element("game").dispatch("pointerdown");
  g.frames(0.1);
  g.document.hidden = true;
  g.event("doc:visibilitychange");
  const before = g.snapshot();
  g.frames(60);
  assert.equal(g.snapshot().distance, before.distance);
  g.document.hidden = false;
  g.event("doc:visibilitychange");
  assert.equal(g.snapshot().paused, true);
  g.element("startButton").click();
  g.frames(0.05);
  assert.ok(g.snapshot().distance - before.distance < 1);
  assert.equal(g.snapshot().input.thrust, false);
});

test("theme changes made while hidden repaint once upon becoming visible", () => {
  const g = createCave();
  g.frame(0);
  const n = g.stats.draws;
  g.document.hidden = true;
  g.event("doc:themechange");
  g.frames(1);
  assert.equal(g.stats.draws, n);
  g.document.hidden = false;
  g.event("doc:visibilitychange");
  g.frame(1200);
  assert.equal(g.stats.draws, n + 1);
});

test("crystal highlights are clipped to the same polygon used by collisions", () => {
  const g = createCave();
  g.run(
    "obstacles=[{x:100,y:100,w:50,h:80,fromTop:false}];drawObstacles(false)",
  );
  const commands = g.stats.commands.map((x) => x[0]);
  assert.ok(commands.indexOf("clip") >= 0);
  assert.ok(commands.indexOf("clip") < commands.indexOf("fillRect"));
});
