"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  C = require("../shooter/content"),
  { Game } = require("../shooter/rules"),
  { decide } = require("../scripts/shooter-pilot");

const targets = new Map([[2,48],[3,26],[4,52],[5,56],[6,30],[7,56],[8,60],[9,34],[10,64],[11,68],[12,42],[13,68],[14,72],[15,48]]);
const total = groups => groups.reduce((n, group) => n + group.count, 0);
const visible = enemy => !enemy.dead && enemy.x + enemy.w / 2 > 0 && enemy.x - enemy.w / 2 < C.W && enemy.y + enemy.h / 2 > 0 && enemy.y - enemy.h / 2 < C.H;

test("later stages supply varied substantial waves and distinct chapter-end preludes", () => {
  for (const [level, count] of targets) {
    const stage = C.STAGES[level - 1];
    assert.equal(stage.waves.length, [3,6,9].includes(level) ? 2 : [12,15].includes(level) ? 3 : level>=10?5:4, `stage ${level} wave count`);
    assert.equal(total(stage.waves.flatMap(wave => wave.groups)), count, `stage ${level} enemy count`);
    for (const wave of stage.waves) {
      assert.ok(wave.minSeconds <= 14, `stage ${level} minimum must not pad idle time`);
      assert.equal(wave.groups[0].at, 0);
      assert.ok(wave.groups.some(group => ["scout", "formation"].includes(group.type)), `stage ${level} has light-aircraft coverage`);
      for (let i = 0; i < wave.groups.length; i++) {
        const group = wave.groups[i];
        assert.ok(group.count > 0 && group.count <= 5);
        const probe = new Game(); probe.start(); assert.equal(probe.spawnGroup(group), true);
        for (const e of probe.enemies) { assert.ok(e.x-e.w/2>=0); assert.ok(e.x+e.w/2<=C.W); }
        if (i) assert.ok(group.at - wave.groups[i - 1].at > 0 && group.at - wave.groups[i - 1].at <= 3, `stage ${level} admission interval`);
      }
    }
  }
});

test("the denser itinerary is delivered with a fresh content key", () => {
  assert.match(fs.readFileSync("shooter/index.html", "utf8"), /content\.js\?v=combat-v4-1/);
});

function replay(mode) {
  const game = new Game({ mode, seed: 17 }), rows = [];
  game.start();
  let current;
  for (let i = 0; i < 20000 && !["clear", "gameover"].includes(game.state); i++) {
    if (!current) current = { level: game.level, seconds: 0, admitted: 0, empty: 0, idle: 0, maxIdle: 0, pressureIdle: 0, maxPressureIdle: 0, peak: 0, waves: new Set() };
    const phase = game.phase, wave = game.wave, before = game.time;
    const admittedBefore = game.stats.admitted;
    const observation = game.snapshot(), encoded = JSON.stringify(observation);
    const action = decide(observation);
    assert.equal(JSON.stringify(observation), encoded, "pilot must not mutate observation");
    if (action.pulse) game.pulse();
    game.step(0.1, { x: action.x, y: action.y });
    if (phase === "wave") {
      const dt = game.time - before, n = game.enemies.filter(visible).length;
      current.seconds += dt;
      current.waves.add(wave);
      current.admitted += game.stats.admitted - admittedBefore;
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
      if (game.state === "intermission") {if(game.supplyPending)game.chooseSupply(decide(game.snapshot()).supply);game.nextStage();}
    }
  }
  return { game, rows };
}

for (const mode of ["normal", "challenge"]) {
  test(`${mode} fresh campaign admits every group without long empty stretches or object-cap losses`, () => {
    const { game, rows } = replay(mode);
    assert.equal(game.state, "clear", JSON.stringify({ mode, level: game.level, state: game.state }));
    assert.deepEqual(rows.map(row => row.level), C.STAGES.map(s=>s.id));
    for (const row of rows) {
      const stage = C.STAGES[row.level - 1], evidence = JSON.stringify({ mode, ...row, waves: [...row.waves] });
      assert.equal(row.admitted, total(stage.waves.flatMap(wave => wave.groups)), evidence);
      assert.equal(row.waves.size, stage.waves.length, evidence);
      if (row.level > 1) {
        assert.ok(row.maxIdle <= (stage.boss ? 2.5 : 3), evidence);
        assert.ok(row.maxPressureIdle <= 2, evidence);
        if (stage.waves.length === 4) {
          assert.ok(row.empty / row.seconds <= 0.25, evidence);
          assert.ok(row.peak >= 4, evidence);
        }
      }
    }
    for (const key of ["enemies", "enemyBullets", "hazards"]) assert.ok(game.stats.peaks[key] <= C.LIMITS[key]);
    assert.deepEqual(game.stats.bosses, C.STAGES.map(s=>s.boss));
  });
}
