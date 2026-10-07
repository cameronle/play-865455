"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { createShooter } = require("./helpers/shooter-runtime");

function defeat(a, level = 1, mode = "normal", hz = 60) {
  if (mode === "challenge") a.element("challengeButton").click();
  a.element("startButton").click();
  a.run(`g.level=${level};g.enterBoss(C.STAGES[g.level-1].boss);g.phase="boss";
    g.boss.y=110;g.boss.phase=3;g.boss.hp=1;
    for(const t of g.boss.turrets||[])t.hp=0;
    g.boss.cooldown=100;g.fireTimer=100;g.lives=2;g.pulses=1;
    g.bullets=[{x:g.boss.x,y:g.boss.y,w:3,h:14,vx:0,vy:0}];`);
  a.frames(0.02, hz);
}
function combat(s) {
  const { particles, pulseTime, ...rest } = s;
  return rest;
}

test("boss explosion finishes on its own stage before the result overlay appears", () => {
  const a = createShooter();
  defeat(a);
  const initial = a.snapshot();
  assert.equal(initial.state, "intermission");
  assert.equal(initial.particles.filter(p => p.boss).length, 1);
  assert.equal(a.element("overlay").classList.contains("hidden"), true);
  assert.equal(a.element("startButton").disabled, true);
  a.frames(0.2);
  assert.ok(a.snapshot().particles[0].ttl < initial.particles[0].ttl);
  assert.deepEqual(combat(a.snapshot()), combat(initial));
  a.frames(0.3);
  assert.equal(a.snapshot().particles.length, 0);
  assert.equal(a.element("overlay").classList.contains("hidden"), false);
  assert.equal(a.element("startButton").disabled, false);
  const draws = a.stats.draws, writes = a.stats.textWrites;
  a.frames(1);
  assert.equal(a.stats.draws, draws);
  assert.equal(a.stats.textWrites, writes);
  a.element("startButton").click();
  assert.equal(a.snapshot().level, 2);
  assert.equal(a.snapshot().particles.length, 0);
});

test("next-stage cleanup discards any old particles and pulse even before a visual drain", () => {
  const a = createShooter();
  defeat(a);
  a.run("g.pulseTime=0.5;g.nextStage()");
  assert.equal(a.snapshot().level, 2);
  assert.equal(a.snapshot().particles.length, 0);
  assert.equal(a.snapshot().pulseTime, 0);
});

test("result effects suspend on blur, pagehide and background without advancing combat", () => {
  for (const type of ["blur", "pagehide", "doc:visibilitychange"]) {
    const a = createShooter();
    defeat(a);
    const initial = a.snapshot();
    if (type === "doc:visibilitychange") a.document.hidden = true;
    a.event(type);
    a.frames(0.2);
    assert.deepEqual(a.snapshot(), initial, type);
    const draws = a.stats.draws;
    a.frames(1);
    assert.equal(a.stats.draws, draws, type);
    a.document.hidden = false;
    a.event(type === "doc:visibilitychange" ? "doc:visibilitychange" : "focus");
    a.frames(0.6);
    assert.equal(a.snapshot().particles.length, 0, type);
    assert.deepEqual(combat(a.snapshot()), combat(initial), type);
    assert.equal(a.element("overlay").classList.contains("hidden"), false);
  }
});

test("result actions cannot skip the explosion or choose supply before it finishes", () => {
  for (const [level, mode] of [[3, "challenge"], [15, "normal"]]) {
    const a = createShooter();
    defeat(a, level, mode);
    const initial = a.snapshot();
    assert.equal(a.element("startButton").disabled, true);
    if (level === 3) {
      assert.equal(a.element("supplyLifeButton").disabled, true);
      assert.equal(a.element("supplyPulseButton").disabled, true);
    } else {
      assert.equal(a.element("normalButton").disabled, true);
      assert.equal(a.element("challengeButton").disabled, true);
    }
    for (const id of ["startButton", "supplyLifeButton", "supplyPulseButton", "normalButton", "challengeButton"])
      a.element(id).click();
    a.event("keydown", { key: "ArrowRight" });
    a.event("keydown", { key: " " });
    a.element("rightButton").dispatch("pointerdown");
    a.frames(0.1);
    assert.deepEqual(combat(a.snapshot()), combat(initial));
    a.frames(0.5);
    assert.equal(a.element("overlay").classList.contains("hidden"), false);
    if (level === 3) {
      a.element("supplyPulseButton").click();
      assert.equal(a.snapshot().pulses, 2);
      a.element("supplyLifeButton").click();
      assert.equal(a.snapshot().lives, 2);
      a.element("startButton").click();
      assert.equal(a.snapshot().level, 4);
      const x = a.snapshot().player.x;
      a.frames(0.1);
      assert.equal(a.snapshot().player.x, x);
    }
  }
});

test("every boss in both modes drains only visuals at 15/30/60/120Hz", () => {
  const seen = new Set();
  for (const mode of ["normal", "challenge"]) for (let level = 1; level <= 15; level++)
    for (const hz of [15, 30, 60, 120]) {
      const a = createShooter();
      defeat(a, level, mode, hz);
      const initial = a.snapshot();
      assert.equal(initial.state, level === 15 ? "clear" : "intermission");
      assert.equal(a.element("overlay").classList.contains("hidden"), true);
      const initialRadius = 5 + (1 - initial.particles[0].ttl / 0.45) * 70;
      a.frames(0.2, hz);
      const mid = a.snapshot();
      assert.ok(5 + (1 - mid.particles[0].ttl / 0.45) * 70 > initialRadius);
      assert.deepEqual(combat(mid), combat(initial));
      a.frames(0.4, hz);
      assert.equal(a.snapshot().particles.length, 0);
      assert.equal(a.snapshot().pulseTime, 0);
      assert.equal(a.element("overlay").classList.contains("hidden"), false);
      assert.deepEqual(combat(a.snapshot()), combat(initial));
      const draws = a.stats.draws;
      a.frames(0.2, hz);
      assert.equal(a.stats.draws, draws);
      if (initial.supplyPending) a.element("supplyPulseButton").click();
      a.element("startButton").click();
      assert.equal(a.snapshot().level, level === 15 ? 1 : level + 1);
      assert.equal(a.snapshot().particles.length, 0);
      assert.equal(a.snapshot().pulseTime, 0);
      seen.add(`${mode}/${level}/${hz}`);
    }
  assert.equal(seen.size, 120);
});

test("final clear is recorded once while visuals drain and demand repaints remain safe", () => {
  const a = createShooter();
  defeat(a, 15);
  assert.equal(JSON.parse(a.run("JSON.stringify(records.normal)")).clears, 1);
  const initial = combat(a.snapshot());
  a.frames(0.6);
  for (const type of ["doc:themechange", "resize", "focus", "pageshow"]) {
    a.event(type);
    a.frames(0.1);
  }
  assert.equal(JSON.parse(a.run("JSON.stringify(records.normal)")).clears, 1);
  assert.deepEqual(combat(a.snapshot()), initial);
  assert.equal(a.snapshot().particles.length, 0);
});

test("CLEAR cancels a pending result effect and cannot resurrect it on foreground return", () => {
  const a = createShooter();
  defeat(a);
  a.event("game-data-clearing");
  const initial = a.snapshot(), writes = a.stats.storageWrites, draws = a.stats.draws;
  for (const type of ["focus", "pageshow", "doc:visibilitychange", "doc:themechange", "resize"]) a.event(type);
  a.element("startButton").click();
  a.frames(1);
  assert.equal(initial.state, "clearing");
  assert.deepEqual(a.snapshot(), initial);
  assert.equal(a.stats.draws, draws);
  assert.equal(a.stats.storageWrites, writes);
});

test("a concurrent pulse finishes before result presentation and is not carried into the next stage", () => {
  const a = createShooter();
  defeat(a);
  a.run("g.pulseTime=0.5;sync()");
  a.frames(0.47);
  assert.equal(a.snapshot().particles.length, 0);
  assert.ok(a.snapshot().pulseTime > 0);
  assert.equal(a.element("overlay").classList.contains("hidden"), true);
  a.frames(0.1);
  assert.equal(a.snapshot().pulseTime, 0);
  assert.equal(a.element("overlay").classList.contains("hidden"), false);
  a.element("startButton").click();
  assert.equal(a.snapshot().particles.length, 0);
  assert.equal(a.snapshot().pulseTime, 0);
});
