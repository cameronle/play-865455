"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { verify } = require("../scripts/verify-shooter-campaign"),
  { decide } = require("../scripts/shooter-pilot"),
  { Game } = require("../shooter/rules");
test("a fresh ordinary-input campaign naturally reaches every prescribed stage, enemy and boss while the stationary negative fails", () => {
  const r = verify();
  assert.equal(r.rows.length, 3);
  assert.equal(r.challengeRows.length,3);
  for (const row of [...r.rows,...r.challengeRows]) assert.ok(row.time >= 1125 && row.time <= 1500);
  assert.equal(r.negative.state, "gameover");
  assert.equal(r.challengeNegative.state,"gameover");
});
test("the pilot accepts a deeply frozen observation and cannot mutate the live game", () => {
  const g = new Game();
  g.start();
  g.step(3);
  const before = JSON.stringify(g),
    s = g.snapshot();
  function freeze(o) {
    Object.freeze(o);
    for (const v of Object.values(o))
      if (v && typeof v === "object" && !Object.isFrozen(v)) freeze(v);
  }
  freeze(s);
  assert.doesNotThrow(() => decide(s));
  assert.equal(JSON.stringify(g), before);
});
