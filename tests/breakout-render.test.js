const test = require("node:test"),
  assert = require("node:assert/strict");
const { createBreakout } = require("./helpers/breakout-runtime");
test("playfield draws targets and outlined firefly without misleading background lights", () => {
  const a = createBreakout({ record: true });
  a.stats.commands.length = 0;
  a.run("draw()");
  const arcs = a.stats.commands.filter((c) => c[0] === "arc");
  assert.equal(arcs.length, a.snapshot().bricks.length + 1);
  assert.equal(
    a.stats.commands.filter((c) => c[0] === "quadraticCurveTo").length,
    0,
  );
  const last = a.stats.commands.map((c) => c[0]).lastIndexOf("arc");
  assert.deepEqual(
    a.stats.commands.slice(last + 1, last + 3).map((c) => c[0]),
    ["fill", "stroke"],
  );
  assert.equal(arcs.at(-1)[3], 7.5);
});
