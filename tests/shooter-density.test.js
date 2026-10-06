"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  C = require("../shooter/content"),
  { Game } = require("../shooter/rules"),
  { decide } = require("../scripts/shooter-pilot");

const targets = new Map([[2, 40], [3, 10], [4, 44], [5, 40], [6, 12], [7, 44], [8, 48], [9, 12]]);
const total = groups => groups.reduce((n, group) => n + group.count, 0);
const visible = enemy => !enemy.dead && enemy.x + enemy.w / 2 > 0 && enemy.x - enemy.w / 2 < C.W && enemy.y + enemy.h / 2 > 0 && enemy.y - enemy.h / 2 < C.H;

test("later stages supply four substantial waves or one short substantial boss prelude", () => {
  for (const [level, count] of targets) {
    const stage = C.STAGES[level - 1];
    assert.equal(stage.waves.length, stage.boss ? 1 : 4, `stage ${level} wave count`);
    assert.equal(total(stage.waves.flatMap(wave => wave.groups)), count, `stage ${level} enemy count`);
    for (const wave of stage.waves) {
      assert.ok(wave.minSeconds <= (stage.boss ? 10 : 14), `stage ${level} minimum must not pad idle time`);
      assert.equal(wave.groups[0].at, 0);
      assert.ok(wave.groups.some(group => ["scout", "formation"].includes(group.type)), `stage ${level} has light-aircraft coverage`);
      for (let i = 0; i < wave.groups.length; i++) {
        const group = wave.groups[i];
        assert.ok(group.count > 0 && group.count <= 4);
        assert.ok(group.x - (group.count - 1) * 24 - C.ENEMIES[group.type].w / 2 >= 0);
        assert.ok(group.x + (group.count - 1) * 24 + C.ENEMIES[group.type].w / 2 <= C.W);
        if (i) assert.ok(group.at - wave.groups[i - 1].at > 0 && group.at - wave.groups[i - 1].at <= 3, `stage ${level} admission interval`);
      }
    }
  }
});

test("the denser itinerary is delivered with a fresh content key", () => {
  assert.match(fs.readFileSync("shooter/index.html", "utf8"), /content\.js\?v=density-3/);
});

function replay(mode) {
  const game = new Game({ mode, seed: 17 }), rows = [];
  game.start();
  let current;
  for (let i = 0; i < 20000 && !["clear", "gameover"].includes(game.state); i++) {
    if (!current) current = { level: game.level, seconds: 0, admitted: 0, empty: 0, idle: 0, maxIdle: 0, pressureIdle: 0, maxPressureIdle: 0, peak: 0, waves: new Set() };
    const phase = game.phase, wave = game.wave, before = game.time;
    const admittedBefore = Object.values(game.stats.encounters).reduce((sum, n) => sum + n, 0);
    const observation = game.snapshot(), encoded = JSON.stringify(observation);
    const action = decide(observation);
    assert.equal(JSON.stringify(observation), encoded, "pilot must not mutate observation");
    if (action.pulse) game.pulse();
    game.step(0.1, { x: action.x, y: action.y });
    if (phase === "wave") {
      const dt = game.time - before, n = game.enemies.filter(visible).length;
      current.seconds += dt;
      current.waves.add(wave);
      current.admitted += Object.values(game.stats.encounters).reduce((sum, n) => sum + n, 0) - admittedBefore;
      current.peak = Math.max(current.peak, n);
      if (game.state === "playing" && game.phase === "wave") {
        if (!n) current.empty += dt;
        current.idle = n ? 0 : current.idle + dt;
        current.maxIdle = Math.max(current.maxIdle, current.idle);
        const pressure = n + game.enemyBullets.filter(visible).length + game.hazards.length;
        current.pressureIdle = pressure ? 0 : current.pressureIdle + dt;
        current.maxPressureIdle = Math.max(current.maxPressureIdle, current.pressureIdle);
      }
    }
    if (["intermission", "clear", "gameover"].includes(game.state)) {
      rows.push(current); current = null;
      if (game.state === "intermission") game.nextStage();
    }
  }
  return { game, rows };
}

for (const mode of ["normal", "challenge"]) {
  test(`${mode} fresh campaign admits every group without long empty stretches or object-cap losses`, () => {
    const { game, rows } = replay(mode);
    assert.equal(game.state, "clear", JSON.stringify({ mode, level: game.level, state: game.state }));
    assert.deepEqual(rows.map(row => row.level), [1,2,3,4,5,6,7,8,9]);
    for (const row of rows) {
      const stage = C.STAGES[row.level - 1], evidence = JSON.stringify({ mode, ...row, waves: [...row.waves] });
      assert.equal(row.admitted, total(stage.waves.flatMap(wave => wave.groups)), evidence);
      assert.equal(row.waves.size, stage.waves.length, evidence);
      if (row.level > 1) {
        assert.ok(row.maxIdle <= (stage.boss ? 2.5 : 3), evidence);
        assert.ok(row.maxPressureIdle <= 2, evidence);
        if (!stage.boss) {
          assert.ok(row.empty / row.seconds <= 0.25, evidence);
          assert.ok(row.peak >= 4, evidence);
        }
      }
    }
    for (const key of ["enemies", "enemyBullets", "hazards"]) assert.ok(game.stats.peaks[key] <= C.LIMITS[key]);
    assert.deepEqual(game.stats.bosses, Object.keys(C.BOSSES));
  });
}
