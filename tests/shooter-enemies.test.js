"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { Game } = require("../shooter/rules");
test("offscreen bombers cannot create a damage region", () => {
  const g = new Game();
  g.start();
  const e = g.spawn("bomber", 240, { y: 700, cooldown: 0 });
  g.updateEnemy(e, 0.01);
  assert.equal(g.hazards.length, 0);
});
test("bomber leaves a fixed visible delayed blast rather than a tracking projectile", () => {
  const g = new Game();
  g.start();
  const e = g.spawn("bomber", 160, { y: 100, age: 2, cooldown: 0 });
  g.updateEnemy(e, 0.01);
  assert.equal(g.hazards.length, 1);
  const h = g.hazards[0];
  assert.equal(h.kind, "bomb");
  assert.equal(h.active, false);
  assert.ok(h.warning >= 1.3);
  const position = [h.x, h.y];
  g.player.x = 440;
  g.updateHazards(0.7);
  assert.equal(h.active, false);
  assert.deepEqual([h.x, h.y], position);
  g.updateHazards(0.8);
  assert.equal(h.active, true);
  g.player.x = h.x;
  g.player.y = h.y;
  g.collisions();
  assert.equal(g.lives, 2);
  g.collisions();
  assert.equal(g.lives, 2);
});
test("sniper holds a fixed aim during its warning and fires once before departing", () => {
  const g = new Game();
  g.start();
  const e = g.spawn("sniper", 180, { y: 125, age: 2, cooldown:0 });
  g.updateEnemy(e, 0.01);
  assert.equal(e.phase, "aim");
  assert.ok(e.warning >= 0.9);
  const target = JSON.stringify(e.target);
  g.player.x = 450;
  for (let i = 0; i < 140; i++) g.updateEnemy(e, 1 / 120);
  assert.equal(JSON.stringify(e.target), target);
  assert.equal(g.enemyBullets.length, 1);
  assert.equal(g.enemyBullets[0].source, e.id);
  g.updateEnemy(e, 0.1);
  assert.equal(g.enemyBullets.length, 1);
});
test("armored enemies block shots during their shield cycle and expose a damage window", () => {
  const g = new Game();
  g.start();
  const e = g.spawn("heavy", 200, { y: 100, age: 0.5 });
  g.updateEnemy(e, 0.01);
  assert.equal(e.shield, true);
  const hp = e.hp;
  assert.equal(g.hitEnemy(e), false);
  assert.equal(e.hp, hp);
  e.age = 2.5;
  g.updateEnemy(e, 0.01);
  assert.equal(e.shield, false);
  assert.equal(g.hitEnemy(e), true);
  assert.equal(e.hp, hp - 1);
});
test("diver visibly warns, locks one target, and does not retarget a moving player", () => {
  const g = new Game();
  g.start();
  const e = g.spawn("diver", 140, { y: 100, age: 1.8, cooldown:0 });
  g.updateEnemy(e, 0.01);
  assert.equal(e.phase, "aim");
  const target = JSON.stringify(e.target);
  g.player.x = 440;
  for (let i = 0; i < 120; i++) g.updateEnemy(e, 1 / 120);
  assert.equal(e.phase, "dive");
  assert.equal(JSON.stringify(e.target), target);
  const vx = e.vx,
    vy = e.vy;
  g.player.x = 20;
  g.updateEnemy(e, 0.1);
  assert.equal(e.vx, vx);
  assert.equal(e.vy, vy);
  assert.ok(Math.hypot(vx, vy) > 200);
});
test("destroying the formation leader breaks the surviving formation and pays one bonus", () => {
  const g = new Game();
  g.start();
  g.spawnGroup({ type: "formation", x: 240, count: 3 });
  const leader = g.enemies.find((e) => e.leader),
    followers = g.enemies.filter((e) => !e.leader);
  g.kill(leader);
  assert.ok(followers.every((e) => e.broken));
  assert.equal(g.score, leader.score + 80);
  const score = g.score;
  g.kill(leader);
  assert.equal(g.score, score);
});
