"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { createRunner } = require("./helpers/runner-runtime.js");
test("unavailable and corrupt best storage never break the runner", () => {
  assert.doesNotThrow(() => {
    const g = createRunner({ blockStorage: true });
    g.element("startButton").click();
    g.run("distance=12;gameOver()");
    assert.equal(g.snapshot().state, "over");
  });
  for (const raw of ["Infinity", "-8", "2.5", "garbage"]) {
    const g = createRunner({ storage: { endlessRunnerBest: raw } });
    assert.equal(g.snapshot().best, 0);
  }
});
test("paused actions do not mutate flight, buffer, or restart the run", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.run("update(.2);togglePause()");
  const before = g.snapshot();
  g.element("jumpButton").dispatch("pointerdown");
  g.element("dropButton").dispatch("pointerdown");
  assert.deepEqual(g.snapshot(), before);
});
test("releasing one jump source cannot cancel another held source", () => {
  const g = createRunner();
  g.element("jumpButton").dispatch("pointerdown", { pointerId: 1 });
  g.event("keydown", { code: "Space", key: " " });
  g.element("jumpButton").dispatch("pointerup", { pointerId: 1 });
  assert.equal(g.snapshot().jumpHeld, true);
  const vy = g.snapshot().player.vy;
  g.event("keyup", { code: "Space", key: " " });
  assert.equal(g.snapshot().jumpHeld, false);
  assert.ok(g.snapshot().player.vy > vy);
  const cut = g.snapshot().player.vy;
  g.event("keyup", { code: "Space", key: " " });
  assert.equal(g.snapshot().player.vy, cut);
});
test("pause and window blur clear both held actions and freeze the run", () => {
  const g = createRunner();
  g.element("jumpButton").dispatch("pointerdown");
  g.element("dropButton").dispatch("pointerdown");
  g.run("togglePause()");
  assert.equal(g.snapshot().jumpHeld, false);
  assert.equal(g.snapshot().fastFall, false);
  g.run("togglePause()");
  g.element("jumpButton").dispatch("pointerdown");
  g.event("blur");
  assert.equal(g.snapshot().paused, true);
  assert.equal(g.snapshot().jumpHeld, false);
  const n = g.snapshot().distance;
  g.frames(1);
  assert.equal(g.snapshot().distance, n);
});
test("holding P does not repeatedly toggle pause", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.event("keydown", { code: "KeyP", key: "p", repeat: false });
  g.event("keydown", { code: "KeyP", key: "p", repeat: true });
  assert.equal(g.snapshot().paused, true);
});
test("30, 60, 120 and 144Hz drive identical distance and high-jump height", () => {
  const rows = [];
  for (const hz of [30, 60, 120, 144]) {
    const g = createRunner();
    g.element("jumpButton").dispatch("pointerdown");
    g.frames(0.3, hz);
    rows.push(g.snapshot());
  }
  for (const r of rows) {
    assert.ok(Math.abs(r.distance - rows[0].distance) < 1e-6);
    assert.ok(Math.abs(r.player.y - rows[0].player.y) < 1e-6);
  }
});
test("grounding uses the new world position of a moving gap", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.run(
    "hazards=[{type:'gap',x:165,y:GROUND,w:100,h:H-GROUND}];spawnX=1e9;update(1/120)",
  );
  assert.equal(g.snapshot().player.onGround, false);
});
test("Space on a focused native start button does not hijack or jump", () => {
  const g = createRunner();
  const b = g.element("startButton");
  g.event("keydown", { code: "Space", key: " ", target: b });
  assert.equal(g.snapshot().state, "title");
  const e = g.event("keydown", { code: "ArrowDown", key: "ArrowDown" });
  assert.equal(e.defaultPrevented, true);
});
test("right-click does not start and unavailable pointer capture is harmless", () => {
  const g = createRunner();
  g.element("game").dispatch("pointerdown", {
    pointerType: "mouse",
    button: 2,
  });
  assert.equal(g.snapshot().state, "title");
  const t = createRunner({ captureThrows: true });
  assert.doesNotThrow(() => t.element("jumpButton").dispatch("pointerdown"));
  assert.equal(t.snapshot().jumpHeld, true);
});
test("hold ARIA and button styling remain active until every finger is released", () => {
  const g = createRunner();
  const b = g.element("jumpButton");
  b.dispatch("pointerdown", { pointerId: 1 });
  b.dispatch("pointerdown", { pointerId: 2 });
  b.dispatch("pointerup", { pointerId: 1 });
  assert.equal(b.getAttribute("aria-pressed"), "true");
  assert.equal(b.classList.contains("active"), true);
  b.dispatch("pointercancel", { pointerId: 2 });
  assert.equal(b.getAttribute("aria-pressed"), "false");
  g.run("togglePause()");
  assert.equal(b.disabled, true);
});
test("best updates live, persists on suspension, and cannot resurrect after clear", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.frames(1);
  assert.equal(g.snapshot().best, Math.floor(g.snapshot().distance));
  g.run("togglePause()");
  assert.equal(Number(g.store.get("endlessRunnerBest")), g.snapshot().best);
  const n = g.stats.storageWrites;
  g.frames(1);
  assert.equal(g.stats.storageWrites, n);
  g.event("game-data-clearing");
  g.store.delete("endlessRunnerBest");
  g.event("pagehide");
  g.event("beforeunload");
  assert.equal(g.store.has("endlessRunnerBest"), false);
});
test("title and pause stop repainting while resume has only one loop", () => {
  const g = createRunner();
  g.frames(1);
  const idle = g.stats.draws;
  g.frames(1);
  assert.equal(g.stats.draws, idle);
  g.element("startButton").click();
  g.frames(0.2);
  g.run("togglePause()");
  g.frames(0.1);
  const n = g.stats.draws,
    writes = g.stats.textWrites;
  g.frames(1);
  assert.equal(g.stats.draws, n);
  assert.equal(g.stats.textWrites, writes);
  g.run("togglePause()");
  const d = g.snapshot().distance;
  g.frames(0.5);
  assert.ok(g.snapshot().distance - d > 8);
  assert.ok(g.snapshot().distance - d < 9);
});
test("unchanged HUD values cause no duplicate text writes", () => {
  const g = createRunner();
  const n = g.stats.textWrites;
  g.run("updateHud();updateHud();updateHud()");
  assert.equal(g.stats.textWrites, n);
});
test("transparent triangle and ink corners cannot kill the runner", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.run("player.y=301;hazards=[{type:'spike',x:169,y:341,w:30,h:24}]");
  assert.equal(g.run("checkCollision()"), false);
  g.run("player.x=171");
  assert.equal(g.run("checkCollision()"), true);
  g.run(
    "player.x=145;player.y=303;hazards=[{type:'ink',x:170,y:347,w:48,h:18}]",
  );
  assert.equal(g.run("checkCollision()"), false);
  g.run("player.x=165");
  assert.equal(g.run("checkCollision()"), true);
});
test("one Canvas finger cannot turn another finger's gesture into fast fall", () => {
  const g = createRunner();
  const c = g.element("game");
  c.dispatch("pointerdown", { pointerId: 1, clientY: 50 });
  c.dispatch("pointerdown", { pointerId: 2, clientY: 150 });
  c.dispatch("pointermove", { pointerId: 1, clientY: 80 });
  assert.equal(g.snapshot().fastFall, false);
  c.dispatch("pointermove", { pointerId: 1, clientY: 120 });
  assert.equal(g.snapshot().fastFall, true);
  c.dispatch("pointerup", { pointerId: 2 });
  assert.equal(g.snapshot().fastFall, true);
  c.dispatch("pointerup", { pointerId: 1 });
  assert.equal(g.snapshot().fastFall, false);
});
test("assistive button clicks start a short hop without sticking held input", () => {
  const g = createRunner();
  g.element("jumpButton").dispatch("click", { detail: 0 });
  assert.equal(g.snapshot().state, "playing");
  assert.ok(g.snapshot().player.vy < 0);
  assert.equal(g.snapshot().jumpHeld, false);
});
test("themechange redraws an idle scene without starting continuous paint", () => {
  const g = createRunner();
  g.frames(0.2);
  const n = g.stats.draws;
  g.event("doc:themechange");
  g.frames(0.1);
  assert.ok(g.stats.draws > n);
  const k = g.stats.draws;
  g.frames(0.5);
  assert.equal(g.stats.draws, k);
});

test("short and held hops remain distinct and fast fall accelerates only descent", () => {
  function peak(release) {
    const g = createRunner();
    g.element("jumpButton").dispatch("pointerdown");
    let low = 317;
    for (let i = 0; i < 100; i++) {
      if (i === release) g.element("jumpButton").dispatch("pointerup");
      g.run("update(1/120)");
      low = Math.min(low, g.snapshot().player.y);
    }
    return low;
  }
  assert.ok(peak(2) > peak(50) + 50);
  const g = createRunner();
  g.element("startButton").click();
  g.run(
    "player.onGround=false;player.y=200;player.vy=100;setFastFall(true);update(1/120)",
  );
  assert.ok(g.snapshot().player.vy > 125);
});
test("coyote jump and buffered landing are each consumed once", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.run("player.onGround=false;coyoteTime=.06;jump();");
  assert.ok(g.snapshot().player.vy < 0);
  assert.equal(g.snapshot().coyoteTime, 0);
  g.run(
    "clearInput();player.onGround=false;player.y=GROUND-player.h-1;player.vy=150;coyoteTime=0;jump();update(1/120)",
  );
  assert.ok(g.snapshot().player.vy < 0);
  assert.equal(g.snapshot().jumpBuffer, 0);
});
test("stickers never advance physical distance or stage", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.run(
    "spawnX=1e9;coins=[{x:player.x+player.w/2,y:player.y+player.h/2,r:7,taken:false}];update(1/120)",
  );
  const r = g.snapshot();
  assert.equal(r.stickerCount, 1);
  assert.ok(Math.abs(r.distance - r.travelDistance) < 1e-8);
  assert.ok(r.travelDistance < 1);
});
test("terminal results persist once and settled effects stop painting", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.frames(0.3);
  g.run("gameOver()");
  const n = g.stats.storageWrites;
  g.run("gameOver();gameOver()");
  assert.equal(g.stats.storageWrites, n);
  g.frames(1);
  const k = g.stats.draws;
  g.frames(1);
  assert.equal(g.stats.draws, k);
});
test("P still toggles after focusing a button without hijacking native Space", () => {
  const g = createRunner();
  g.element("startButton").click();
  g.event("keydown", {
    code: "KeyP",
    key: "p",
    target: g.element("pauseButton"),
  });
  assert.equal(g.snapshot().paused, true);
});
