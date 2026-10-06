"use strict";
const assert = require("node:assert/strict"),
  { Game } = require("../shooter/rules"),
  C = require("../shooter/content"),
  { decide } = require("./shooter-pilot");
function run({ seed = 1, mode = "normal", controller = decide } = {}) {
  const g = new Game({ seed, mode });
  g.start();
  const stages = [],
    events = [],
    seen = new Set();
  let previousLevel = 0,
    previousEvents = 0;
  for (let i = 0; i < 20000 && !["clear", "gameover"].includes(g.state); i++) {
    if (g.level !== previousLevel) {
      previousLevel = g.level;
      stages.push({ level: g.level, start: g.time });
    }
    if (g.state === "intermission") g.nextStage();
    const s = g.snapshot(),
      before = JSON.stringify(s),
      action = controller(s);
    assert.equal(
      JSON.stringify(s),
      before,
      "pilot must not mutate observation",
    );
    if (action.pulse) g.pulse();
    g.step(0.1, { x: action.x, y: action.y });
    for (const e of g.events) {
      const key = JSON.stringify(e);
      if (!seen.has(key)) {
        seen.add(key);
        events.push(e);
      }
    }
  }
  return {
    seed,
    mode,
    controller: controller === decide ? "collision-aware" : "stationary",
    state: g.state,
    time: g.time,
    score: g.score,
    lives: g.lives,
    stages,
    stats: g.stats,
    events,
  };
}
function verify() {
  const rows = [1, 17, 99].map((seed) => run({ seed }));
  const challengeRows = [1,17,99].map(seed=>run({seed,mode:"challenge"}));
  const negative = run({ controller: () => ({ x: 0, y: 0 }) });
  const challengeNegative = run({mode:"challenge",controller:()=>({x:0,y:0})});
  for (const r of [...rows,...challengeRows]) {
    assert.equal(
      r.state,
      "clear",
      JSON.stringify({
        state: r.state,
        time: r.time,
        level: r.stages.at(-1),
        hits: r.stats.hits,
      }),
    );
    assert.deepEqual(
      r.stages.map((s) => s.level),
      C.STAGES.map(s=>s.id),
    );
    assert.deepEqual(
      Object.keys(r.stats.encounters).sort(),
      Object.keys(C.ENEMIES).sort(),
    );
    assert.deepEqual(r.stats.bosses, C.STAGES.map(s=>s.boss));
    for (const key of ["enemies", "enemyBullets", "hazards"])
      assert.ok(r.stats.peaks[key] <= C.LIMITS[key]);
    assert.equal(r.events.filter((e) => e.type === "boss-defeated").length, C.STAGES.length);
    assert.deepEqual(r.events.filter(e=>e.type==="chapter-reward").map(e=>e.level),[3,6,9,12,15]);
    assert.ok(r.time>=1125 && r.time<=1500,"15-stage simulation stays within the approved 18.75–25 minute budget");
  }
  assert.equal(
    negative.state,
    "gameover",
    "shoot-only negative control must not clear",
  );
  assert.equal(challengeNegative.state,"gameover","challenge stationary control must fail");
  return {
    kind: "accelerated deterministic simulation, not human play",
    note: "The wave itinerary is fixed; these seeds must produce the same legal route. No retry, HP edit, jump or invulnerability.",
    rows,
    challengeRows,
    negative,
    challengeNegative,
  };
}
if (require.main === module) {
  const report = verify();
  console.log(JSON.stringify(report));
}
module.exports = { run, verify };
