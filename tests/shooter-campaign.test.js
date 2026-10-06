"use strict";
const { createShooter } = require("./helpers/shooter-runtime");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("campaign records validate a versioned schema and persist modes separately without altering legacy data", () => {
  const R = require("../shooter/rules");
  assert.equal(typeof R.readRecords, "function");
  for (const value of [
    "bad",
    "null",
    "[]",
    '{"version":1}',
    '{"version":2,"normal":{"best":-1}}',
  ])
    assert.equal(R.readRecords(value).normal.best, 0);
  const a = createShooter({ storage: { "sky-patrol-best": "900" } });
  a.element("startButton").click();
  a.run("g.score=300;update(.01)");
  const first = JSON.parse(a.store.get("sky-patrol-records-v4"));
  assert.equal(first.version, 4);
  assert.equal(first.normal.best, 300);
  assert.equal(first.challenge.best, 0);
  assert.equal(a.store.get("sky-patrol-best"), "900");
  a.run("g.state='gameover';sync()");
  a.element("challengeButton").click();
  assert.equal(a.snapshot().best, 0);
  a.element("startButton").click();
  a.run("g.score=200;update(.01)");
  const second = JSON.parse(a.store.get("sky-patrol-records-v4"));
  assert.equal(second.normal.best, 300);
  assert.equal(second.challenge.best, 200);
  const writes = a.stats.storageWrites;
  a.event("game-data-clearing");
  a.run("g.score=800;update(.01)");
  assert.equal(a.stats.storageWrites, writes);
});
test("the browser integration starts a normal campaign and routes mobile pulse to its resource", () => {
  const app = createShooter();
  app.element("startButton").click();
  assert.equal(app.snapshot().pulses, 2);
  app.element("pulseButton").click();
  assert.equal(app.snapshot().pulses, 1);
  app.frames(0.1);
  assert.equal(app.snapshot().state, "playing");
});
test("new campaign starts at the first prescribed wave and resolves enemies before advancing", () => {
  assert.ok(fs.existsSync("shooter/rules.js"), "rules module exists");
  const { Game, swept } = require("../shooter/rules");
  const g = new Game({ seed: 7 });
  g.start();
  g.step(0.01, { x: 0, y: 0 });
  assert.equal(g.level, 1);
  assert.equal(g.wave, 0);
  assert.equal(g.state, "playing");
  assert.ok(g.enemies.length > 0);
  g.step(19, {});
  assert.equal(g.level, 1);
  assert.ok(
    swept(
      { x: 100, y: 100, px: 0, py: 0, w: 2, h: 2 },
      { x: 50, y: 50, w: 10, h: 10 },
    ) < 1,
  );
  assert.equal(
    swept(
      { x: 100, y: 0, px: 0, py: 0, w: 2, h: 2 },
      { x: 50, y: 50, w: 10, h: 10 },
    ),
    null,
  );
  g.pause();
  const s = g.snapshot();
  g.step(5, { x: 1 });
  assert.deepEqual(g.snapshot(), s);
  const detached = g.snapshot();
  detached.player.x = 0;
  assert.notEqual(g.player.x, 0);
});
