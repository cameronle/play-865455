"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../shooter/content"),
  { Game } = require("../shooter/rules"),
  { decide } = require("../scripts/shooter-pilot");

test("the opening has four ten-enemy waves with regular three-second admissions", () => {
  const first = C.STAGES[0];
  assert.equal(first.waves.length, 4);
  assert.equal(first.boss, "outpost");
  for (const wave of first.waves) {
    assert.equal(wave.groups.reduce((n, group) => n + group.count, 0), 10);
    assert.deepEqual(wave.groups.map(group => group.at), [0, 3, 6]);
    assert.equal(wave.minSeconds, 10);
    assert.deepEqual(wave.groups.map(group => group.type), ["scout", "formation", "scout"]);
    assert.ok(wave.groups.every(group => group.count >= 3));
  }
});

for (const mode of ["normal", "challenge"]) {
  test(`${mode} opening admits all forty enemies naturally and avoids long empty stretches`, () => {
    const game = new Game({ mode, seed: 17 });
    game.start();
    let idle = 0, maxIdle = 0, peak = 0;
    for (let i = 0; i < 1500 && game.state === "playing"; i++) {
      const action = decide(game.snapshot());
      if (action.pulse) game.pulse();
      game.step(0.1, { x: action.x, y: action.y });
      if (game.state !== "playing") break;
      const visible = (game.phase === "boss" || game.phase === "boss-warning" || game.phase === "boss-enter" ? 1 : 0) + game.enemies.filter(enemy => enemy.y + enemy.h / 2 > 0 && enemy.y - enemy.h / 2 < C.H).length;
      peak = Math.max(peak, visible);
      idle = visible ? 0 : idle + 0.1;
      maxIdle = Math.max(maxIdle, idle);
    }
    const evidence = JSON.stringify({ mode, state: game.state, time: game.time, encounters: game.stats.encounters, peak, maxIdle, lives: game.lives });
    assert.equal(game.state, "intermission", evidence);
    assert.equal(Object.values(game.stats.encounters).reduce((sum, n) => sum + n, 0), 40, evidence);
    assert.ok(peak >= 5, evidence);
    assert.ok(maxIdle <= 4, evidence);
    assert.ok(game.time < 100, evidence);
    assert.deepEqual(game.stats.bosses,["outpost"],evidence);
    assert.ok(game.stats.peaks.enemies <= C.LIMITS.enemies, evidence);
    assert.ok(game.lives > 0, evidence);
  });
}

test("boss expansion preserves all original nine-stage waves, enemy stats, original boss stats and mode scales", () => {
  const original = require("./fixtures/shooter-original-balance.json");
  assert.deepEqual(C.STAGES.slice(0,9).map(s=>s.waves),original.waves);
  assert.deepEqual(C.ENEMIES,original.enemies);
  assert.deepEqual(C.MODES,original.modes);
  assert.deepEqual(C.LIMITS,original.limits);
  for(const [type, boss] of Object.entries(original.bosses))
    for(const [key,value] of Object.entries(boss))
      assert.deepEqual(C.BOSSES[type][key],value,`${type} ${key} original value`);
});
