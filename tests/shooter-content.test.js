"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("campaign content defines fifteen stages, fifteen boss encounters and nine enemy behaviors", () => {
  assert.ok(
    fs.existsSync("shooter/content.js"),
    "campaign content module exists",
  );
  const C = require("../shooter/content");
  assert.deepEqual(Object.keys(C.ENEMIES).sort(), [
    "bomber",
    "diver",
    "formation",
    "heavy",
    "interceptor",
    "minelayer",
    "scout",
    "sniper",
    "support",
  ]);
  assert.deepEqual(
    C.STAGES.map((s) => s.id),
    Array.from({length:15},(_,i)=>i+1),
  );
  assert.deepEqual(
    C.STAGES.filter((s) => s.boss).map((s) => s.boss),
    ["outpost","spear","iron-wing","fortress","hunter","twin-core","swarm","sentinel","storm-carrier","iron-mk2","twin-armored","blockade","swarm-carrier","aurora","skybreaker"],
  );
  assert.equal(new Set(Object.values(C.ENEMIES).map((e) => e.shape)).size, 9);
  for (const stage of C.STAGES) {
    assert.ok(stage.waves.length);
    for (const w of stage.waves)
      for (const g of w.groups) assert.ok(C.ENEMIES[g.type]);
  }
  assert.ok(C.MODES.challenge.fireScale > C.MODES.normal.fireScale);
  assert.ok(C.MODES.challenge.speedScale <= 1.2);
});
