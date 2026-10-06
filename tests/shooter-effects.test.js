"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { Game } = require("../shooter/rules"),
  { createShooter } = require("./helpers/shooter-runtime");
test("pulse has bounded visual feedback that freezes on pause and expires", () => {
  const g = new Game();
  g.start();
  g.pulse();
  assert.equal(g.pulseTime, 0.5);
  g.pause();
  g.step(0.2);
  assert.equal(g.pulseTime, 0.5);
  g.resume();
  g.step(0.7);
  assert.equal(g.pulseTime, 0);
});
test("enemy defeat and chapter defeat produce short local effects without reopening the result loop", () => {
  const g = new Game();
  g.start();
  const e = g.spawn("scout", 240, { y: 100 });
  g.hitEnemy(e, 100);
  assert.ok(g.particles.length > 0);
  g.step(1);
  assert.equal(g.particles.length, 0);
  g.level = 3;
  g.enterBoss("iron-wing");
  g.phase = "boss";
  g.boss.y = 110;
  g.hitBoss(g.boss.hp);
  assert.equal(g.state, "intermission");
  assert.ok(g.particles.length > 0);
  assert.equal(g.particles[0].boss, true);
});
test("sound and game sections receive localized accessible names", () => {
  const a = createShooter();
  assert.equal(a.element("soundButton").getAttribute("aria-label"), "切换声音");
  assert.equal(
    a.element("gameSection").getAttribute("aria-label"),
    "星空巡航游戏",
  );
  assert.equal(
    a.element("touchControls").getAttribute("aria-label"),
    "触控操作",
  );
});
