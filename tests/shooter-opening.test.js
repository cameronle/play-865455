"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  C = require("../shooter/content"),
  { Game } = require("../shooter/rules"),
  { decide } = require("../scripts/shooter-pilot");

test("the opening has four ten-enemy waves with regular three-second admissions", () => {
  const first = C.STAGES[0];
  assert.equal(first.waves.length, 4);
  assert.equal(first.boss, null);
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
      const visible = game.enemies.filter(enemy => enemy.y + enemy.h / 2 > 0 && enemy.y - enemy.h / 2 < C.H).length;
      peak = Math.max(peak, visible);
      idle = visible ? 0 : idle + 0.1;
      maxIdle = Math.max(maxIdle, idle);
    }
    const evidence = JSON.stringify({ mode, state: game.state, time: game.time, encounters: game.stats.encounters, peak, maxIdle, lives: game.lives });
    assert.equal(game.state, "intermission", evidence);
    assert.equal(Object.values(game.stats.encounters).reduce((sum, n) => sum + n, 0), 40, evidence);
    assert.ok(peak >= 5, evidence);
    assert.ok(maxIdle <= 4, evidence);
    assert.ok(game.time < 70, evidence);
    assert.ok(game.stats.peaks.enemies <= C.LIMITS.enemies, evidence);
    assert.ok(game.lives > 0, evidence);
  });
}

test("campaign density tuning preserves the opening, enemy stats, boss stats and mode scales", () => {
  const hash = crypto.createHash("sha256").update(JSON.stringify({
    opening: C.STAGES[0], enemies: C.ENEMIES, bosses: C.BOSSES,
    modes: C.MODES, limits: C.LIMITS,
  })).digest("hex");
  assert.equal(hash, "4efdcf4d0e2cf12b9f51726b8c412d67aacc5e5dc11139f5efe7d9bebee95fe6");
});
