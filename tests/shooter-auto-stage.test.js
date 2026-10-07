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

test("boss explosions remain visible for 1.2 seconds with valid expanding ring geometry", () => {
  const a = createShooter();
  defeat(a);
  a.frames(0.8);
  const p = a.snapshot().particles.find(p => p.boss);
  assert.ok(p, "the old 0.45-second burst is too brief");
  assert.equal(p.duration, 1.2);
  assert.ok(p.ttl > 0);
  a.stats.commands.length = 0;
  a.run("draw()");
  const arc = a.stats.commands.find(c => c[0] === "arc" && c[1] === p.x && c[2] === p.y);
  assert.ok(arc && arc[3] > 5 && arc[3] <= 75);
  a.frames(0.5);
  assert.equal(a.snapshot().particles.length, 0);
  assert.equal(a.snapshot().level, 1, "hold the result before advancing");
});

test("challenge chapter supply waits indefinitely and proceeds automatically after a single choice", () => {
  const a = createShooter();
  defeat(a, 3, "challenge");
  a.frames(1.3);
  const frozen = a.snapshot();
  const draws = a.stats.draws;
  a.frames(20);
  assert.deepEqual(a.snapshot(), frozen);
  assert.equal(a.stats.draws, draws);
  assert.equal(a.element("startButton").hidden, true);
  a.element("supplyPulseButton").click();
  a.element("supplyLifeButton").click();
  assert.equal(a.snapshot().pulses, 2);
  assert.equal(a.snapshot().lives, 2);
  a.frames(1.3);
  assert.equal(a.snapshot().level, 4);
  assert.match(a.element("overlayTitle").textContent, /准备/);
  const ready = a.snapshot();
  a.frames(2.7);
  assert.deepEqual(a.snapshot(), ready);
  a.frames(.4);
  assert.equal(a.element("overlay").classList.contains("hidden"), true);
});

test("normal chapter supply remains capped and requires no click", () => {
  const a = createShooter();
  defeat(a, 3);
  assert.equal(a.snapshot().lives, 3);
  assert.equal(a.snapshot().pulses, 2);
  a.frames(2.7);
  assert.equal(a.snapshot().level, 4);
  assert.equal(a.snapshot().lives, 3);
  assert.equal(a.snapshot().pulses, 2);
});

test("ready input cannot shoot, spend a pulse, skip the timer or leak into combat", () => {
  const a = createShooter();
  defeat(a);
  a.frames(2.7);
  const initial = a.snapshot();
  for (const id of ["startButton", "normalButton", "challengeButton", "pulseButton"]) a.element(id).click();
  a.event("keydown", { key: "ArrowRight" });
  a.event("keydown", { key: " " });
  a.element("rightButton").dispatch("pointerdown");
  a.element("game").dispatch("pointerdown", { pointerId: 2 });
  a.element("game").dispatch("pointermove", { pointerId: 2, clientX: 300 });
  a.frames(.2);
  assert.deepEqual(a.snapshot(), initial);
  a.frames(3);
  assert.equal(a.snapshot().player.x, initial.player.x);
  assert.equal(a.snapshot().pulses, initial.pulses);
});

test("manual pause freezes explosion, result hold and ready countdown until explicit resume", () => {
  for (const seconds of [.2, 1.4, 2.7]) {
    const a = createShooter();
    defeat(a);
    a.frames(seconds);
    a.element("mobilePauseButton").click();
    const before = a.snapshot(), clock = a.run("JSON.stringify(transition)");
    a.frames(.1);
    const paints = a.stats.draws;
    a.frames(10);
    assert.deepEqual(a.snapshot(), before);
    assert.equal(a.run("JSON.stringify(transition)"), clock);
    assert.equal(a.stats.draws, paints);
    a.event("focus"); a.event("pageshow"); a.frames(.1);
    assert.equal(a.run("JSON.stringify(transition)"), clock, "foreground does not undo a manual pause");
    a.element("startButton").click();
    a.frames(6);
    assert.equal(a.snapshot().level, 2);
    assert.equal(a.element("overlay").classList.contains("hidden"), true);
  }
});

test("background and blur cannot consume result or ready time", () => {
  for (const seconds of [1.4, 2.7]) for (const type of ["blur", "pagehide", "doc:visibilitychange"]) {
    const a = createShooter();
    defeat(a); a.frames(seconds);
    const before = a.snapshot(), clock = a.run("JSON.stringify(transition)");
    if (type.startsWith("doc")) a.document.hidden = true;
    a.event(type); a.frames(.1);
    const paints = a.stats.draws;
    a.frames(30);
    assert.deepEqual(a.snapshot(), before);
    assert.equal(a.run("JSON.stringify(transition)"), clock);
    assert.equal(a.stats.draws, paints);
    a.document.hidden = false;
    a.event(type.startsWith("doc") ? type : "focus");
    a.frames(.2);
    assert.equal(a.snapshot().level, before.level);
    a.frames(6);
    assert.equal(a.snapshot().level, 2);
  }
});

test("CLEAR cancels automatic progression in the result and ready phases", () => {
  for (const seconds of [1.4, 2.7]) {
    const a = createShooter();
    defeat(a); a.frames(seconds);
    a.event("game-data-clearing");
    const before = a.snapshot(), writes = a.stats.storageWrites, paints = a.stats.draws;
    for (const type of ["focus", "pageshow", "doc:visibilitychange", "doc:themechange", "resize"]) a.event(type);
    a.element("startButton").click(); a.frames(10);
    assert.equal(a.run("transition"), null);
    assert.deepEqual(a.snapshot(), before);
    assert.equal(a.stats.storageWrites, writes);
    assert.equal(a.stats.draws, paints);
  }
});

test("final campaign clear stays terminal and never auto-restarts or records twice", () => {
  const a = createShooter();
  defeat(a, 15);
  const frozen = a.snapshot();
  a.frames(1.4);
  const afterEffects = a.snapshot();
  a.frames(20);
  assert.deepEqual(a.snapshot(), afterEffects);
  assert.equal(a.snapshot().level, 15);
  assert.equal(a.snapshot().score, frozen.score);
  assert.equal(JSON.parse(a.store.get("sky-patrol-records-v4")).normal.clears, 1);
  assert.equal(a.element("startButton").hidden, false);
  a.element("startButton").click();
  assert.equal(a.snapshot().level, 1);
});

test("both modes and all fifteen bosses retain automatic timing at 15/30/60/120Hz", () => {
  for (const mode of ["normal", "challenge"]) for (let level = 1; level <= 15; level++)
    for (const hz of [15, 30, 60, 120]) {
      const a = createShooter({ storage: { "play-lang": "en" }, noAudio: true });
      defeat(a, level, mode, hz);
      a.frames(1.3, hz);
      if (level === 15) {
        a.frames(6, hz);
        assert.equal(a.snapshot().state, "clear");
        continue;
      }
      if (a.snapshot().supplyPending) a.element("supplyPulseButton").click();
      a.frames(1.3, hz);
      assert.equal(a.snapshot().level, level + 1, `${mode}/${level}/${hz}`);
      assert.match(a.element("overlayTitle").textContent, /GET READY/);
      const ready = a.snapshot();
      a.frames(2.5, hz);
      assert.deepEqual(a.snapshot(), ready);
      a.frames(.6, hz);
      assert.equal(a.element("overlay").classList.contains("hidden"), true);
    }
});

test("ordinary clears automatically lead into a safe three-second ready countdown", () => {
  const a = createShooter();
  defeat(a);
  a.frames(2.7);
  assert.equal(a.snapshot().level, 2, "no NEXT click is needed");
  assert.match(a.element("overlayTitle").textContent, /准备/);
  assert.equal(a.element("startButton").hidden, true);
  const ready = a.snapshot();
  assert.equal(ready.particles.length, 0);
  assert.equal(ready.enemies.length, 0);
  assert.equal(ready.bullets.length, 0);
  a.frames(1.5);
  assert.deepEqual(a.snapshot(), ready, "the ready interval never advances combat");
  a.frames(1.6);
  assert.equal(a.element("overlay").classList.contains("hidden"), true);
  assert.ok(a.snapshot().time > ready.time, "combat starts only after readiness");
});
