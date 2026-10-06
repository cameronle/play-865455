"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  Renderer = require("../shooter/renderer"),
  { Game } = require("../shooter/rules");
test("active laser draws the moving collision beam, not the whole warned strip, from an immutable snapshot", () => {
  const g = new Game();
  g.start();
  g.hazards = [
    {
      kind: "laser",
      x: 240,
      y: 324,
      w: 180,
      h: 648,
      beamW: 32,
      beamX: 175,
      active: true,
      ttl: 1,
    },
  ];
  const s = g.snapshot(),
    before = JSON.stringify(s),
    calls = [];
  const ctx = new Proxy(
    {},
    {
      get: (o, k) => o[k] ?? ((...a) => calls.push([k, ...a])),
      set: (o, k, v) => ((o[k] = v), true),
    },
  );
  Renderer.draw(ctx, s, { light: true });
  assert.ok(
    calls.some(
      (c) =>
        JSON.stringify(c) === JSON.stringify(["fillRect", 159, 0, 32, 648]),
    ),
  );
  assert.equal(JSON.stringify(s), before);
});
