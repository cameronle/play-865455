const test = require("node:test"),
  assert = require("node:assert/strict");
const R = require("../flow/rules.js");
const { levels } = require("../flow/levels.js");
const { solve } = require("./helpers/flow-solver.js");
const { boot } = require("./helpers/flow-runtime.js");
test("Flow rejects fractional cells masquerading as a complete board", () => {
  const level = {
    size: 2,
    endpoints: [{ color: 0, start: [0, 0], end: [1, 0] }],
  };
  assert.equal(
    R.isLevelComplete(level, {
      0: [
        { r: 0, c: 0 },
        { r: 0.5, c: 0.5 },
        { r: 1, c: 1 },
        { r: 1, c: 0 },
      ],
    }),
    false,
  );
});
test("Flow connected status rejects jumps and self-repeated cells", () => {
  const ep = { color: 0, start: [0, 0], end: [0, 3] };
  assert.equal(
    R.isPathConnected(ep, [
      { r: 0, c: 0 },
      { r: 0, c: 3 },
    ]),
    false,
  );
  assert.equal(
    R.isPathConnected(ep, [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
    ]),
    false,
  );
  assert.equal(
    R.isPathConnected(ep, [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
    ]),
    true,
  );
});
test("Flow progress trusts only known true completions and positive integer records", () => {
  const h = boot({
    storage: {
      "flow-progress-v1": JSON.stringify({
        completed: { "5x5:0": true, "5x5:1": "yes", "alien:0": true },
        bestTimes: { "5x5:0": "<img onerror=boom>", "5x5:1": -7, "5x5:2": 12 },
      }),
    },
  });
  assert.deepEqual(h.snapshot().progress.completed, { "5x5:0": true });
  assert.deepEqual(h.snapshot().progress.bestTimes, { "5x5:2": 12 });
});
test("Flow drag belongs exclusively to its primary left-button pointer", () => {
  const h = boot(),
    ep = levels["5x5"][0].endpoints[0];
  h.pointer("pointerdown", ...ep.start, { button: 2 });
  assert.equal(h.snapshot().activeDrag, null);
  h.pointer("pointerdown", ...ep.start, { pointerId: 4 });
  const before = h.snapshot();
  h.pointer("pointerdown", ...levels["5x5"][0].endpoints[1].start, {
    pointerId: 5,
    isPrimary: false,
  });
  assert.deepEqual(h.snapshot().paths, before.paths);
  h.pointer("pointerup", 0, 0, { pointerId: 5 });
  assert.equal(h.snapshot().activeDrag.pointerId, 4);
  h.pointer("pointerup", 0, 0, { pointerId: 4 });
  assert.equal(h.snapshot().activeDrag, null);
});
test("Flow quick straight drags visit skipped cells without inventing diagonal turns", () => {
  const h = boot();
  h.pointer("pointerdown", 0, 2);
  h.pointer("pointermove", 0, 4);
  assert.deepEqual(h.snapshot().paths[0], [
    { r: 0, c: 2 },
    { r: 0, c: 3 },
    { r: 0, c: 4 },
  ]);
  const h2 = boot();
  h2.pointer("pointerdown", 0, 2);
  h2.pointer("pointermove", 1, 3);
  assert.deepEqual(h2.snapshot().paths[0], [{ r: 0, c: 2 }]);
});
test("Flow public observation follows resets and cannot mutate live paths", () => {
  const h = boot();
  h.pointer("pointerdown", 0, 2);
  h.pointer("pointermove", 0, 3);
  h.pointer("pointerup");
  assert.equal(h.window.FlowGame.getSnapshot().paths[0].length, 2);
  h.window.FlowGame.getSnapshot().paths[0].pop();
  assert.equal(h.snapshot().paths[0].length, 2);
  h.nodes.resetButton.click();
  assert.equal(Object.keys(h.window.FlowGame.paths).length, 0);
});
test("Flow reset replays a completed card instead of advancing from its old win", () => {
  const h = boot();
  h.solve(solve(levels["5x5"][0]).solution);
  assert.equal(h.nodes.winOverlay.classList.contains("hide"), false);
  h.advance(1000);
  h.nodes.resetButton.click();
  assert.equal(h.nodes.winOverlay.classList.contains("hide"), true);
  assert.equal(h.snapshot().autoNextTimer, 0);
  h.advance(5000);
  assert.equal(h.snapshot().levelIndex, 0);
  assert.equal(h.snapshot().startTime, 101000);
  assert.equal(h.snapshot().activeDrag, null);
});
test("Flow hidden-tab suspension freezes auto-next until an explicit resume", () => {
  const h = boot();
  h.solve(solve(levels["5x5"][0]).solution);
  h.advance(1000);
  h.document.hidden = true;
  h.emit("document", "visibilitychange");
  const remaining = h.snapshot().autoNextTimer;
  h.advance(5000);
  assert.equal(h.snapshot().levelIndex, 0);
  assert.equal(h.snapshot().autoNextTimer, remaining);
  h.document.hidden = false;
  h.emit("document", "visibilitychange");
  h.advance(4000);
  assert.equal(h.snapshot().levelIndex, 0);
  h.nodes.resumeButton.click();
  h.advance(2100);
  assert.equal(h.snapshot().levelIndex, 1);
  assert.equal(h.frameCount(), 0);
});
test("Flow resumes valid partial ribbons with saved play time and rejects corrupt drafts", () => {
  const h = boot();
  h.advance(2200);
  h.pointer("pointerdown", 0, 2);
  h.pointer("pointermove", 0, 3);
  h.pointer("pointerup");
  const saved = Object.fromEntries(h.storage),
    h2 = boot({ storage: saved });
  assert.deepEqual(h2.snapshot().paths[0], [
    { r: 0, c: 2 },
    { r: 0, c: 3 },
  ]);
  assert.ok(h2.window.FlowGame.getSnapshot().elapsedSeconds >= 2);
  h2.nodes.resetButton.click();
  assert.deepEqual(h2.snapshot().paths, {});
  assert.deepEqual(
    boot({ storage: Object.fromEntries(h2.storage) }).snapshot().paths,
    {},
  );
  const p = JSON.parse(saved["flow-progress-v1"]);
  p.drafts["5x5:0"].paths[0].push({ r: 0, c: 0 });
  assert.deepEqual(
    boot({ storage: { "flow-progress-v1": JSON.stringify(p) } }).snapshot()
      .paths,
    {},
  );
  assert.doesNotThrow(() => boot({ storageThrows: true }));
});
test("Flow restores the last validated pack and ignores invalid route requests", () => {
  const h = boot();
  h.changePack("8x8");
  h.changeLevel(7);
  const h2 = boot({ storage: Object.fromEntries(h.storage) });
  assert.equal(h2.snapshot().currentPack, "8x8");
  assert.equal(h2.snapshot().levelIndex, 7);
  const before = h2.snapshot();
  assert.doesNotThrow(() => h2.window.FlowGame.loadLevel("__proto__", 0));
  h2.window.FlowGame.loadLevel("5x5", 0.5);
  assert.deepEqual(h2.snapshot(), before);
});
test("Flow canvas keyboard controls draw the same ribbons without hijacking selects", () => {
  const h = boot();
  h.nodes.board.dispatch("keydown", { key: " " });
  h.nodes.board.dispatch("keydown", { key: "ArrowRight" });
  assert.deepEqual(h.snapshot().paths[0], [
    { r: 0, c: 2 },
    { r: 0, c: 3 },
  ]);
  h.nodes.board.dispatch("keydown", { key: "ArrowRight" });
  assert.equal(h.nodes.flowStat.textContent, "1 / 4");
  const before = h.snapshot().paths;
  h.key("ArrowDown", { target: h.nodes.packSelect });
  assert.deepEqual(h.snapshot().paths, before);
});
test("Flow album traps focus, restores focus and offers the same cards as its selector", () => {
  const h = boot();
  h.nodes.levelsButton.click();
  assert.equal(h.document.activeElement, h.nodes.closeLevels);
  assert.ok(h.nodes.levelGrid.children.every((c) => !c.disabled));
  h.nodes.levelsOverlay.dispatch("keydown", {
    key: "Tab",
    shiftKey: true,
    target: h.nodes.closeLevels,
  });
  assert.equal(h.document.activeElement, h.nodes.levelGrid.children.at(-1));
  h.nodes.levelsOverlay.dispatch("keydown", { key: "Escape" });
  assert.equal(h.nodes.levelsOverlay.classList.contains("show"), false);
  assert.equal(h.document.activeElement, h.nodes.levelsButton);
});
for (const [pack, ls] of Object.entries(levels))
  for (const [i, level] of ls.entries())
    test(`Flow ${pack} card ${i + 1} is solvable through runtime dragging in both directions`, () => {
      const result = solve(level);
      assert.ok(result.solution);
      assert.equal(R.isLevelComplete(level, result.solution), true);
      for (const reverse of [false, true]) {
        const h = boot();
        h.window.FlowGame.loadLevel(pack, i, true);
        h.solve(
          Object.fromEntries(
            Object.entries(result.solution).map(([k, p]) => [
              k,
              reverse ? [...p].reverse() : p,
            ]),
          ),
        );
        assert.equal(h.nodes.coverStat.textContent, "100%");
        assert.equal(h.nodes.winOverlay.classList.contains("hide"), false);
        assert.equal(h.snapshot().progress.completed[`${pack}:${i}`], true);
      }
    });
test("Flow page permits zoom and exposes keyboard and explicit pause controls", () => {
  const fs = require("node:fs"),
    html = fs.readFileSync("flow/index.html", "utf8");
  assert.doesNotMatch(html, /user-scalable=no/);
  assert.match(html, /id="board"[^>]*tabindex="0"/);
  for (const id of [
    "pauseButton",
    "pauseOverlay",
    "resumeButton",
    "utilityDock",
    "statusText",
  ])
    assert.ok(html.includes(`id="${id}"`));
});
test("Flow endpoints have non-color numbered cues on the actual canvas", () => {
  const h = boot(),
    numbers = h.paintOps
      .filter((op) => op.name === "fillText")
      .map((op) => op.args[0]);
  assert.deepEqual(numbers, ["1", "1", "2", "2", "3", "3", "4", "4"]);
});
test("Flow light and dark HUD and filled-button text meet AA contrast", () => {
  const fs = require("node:fs"),
    css = fs.readFileSync("flow/style.css", "utf8");
  const tokens = (block) =>
    Object.fromEntries(
      [...block.matchAll(/(--[\w-]+):([^;}]+)/g)].map((m) => [
        m[1],
        m[2].trim(),
      ]),
    );
  const light = tokens(css.match(/:root\s*\{([^}]+)}/)[1]),
    dark = {
      ...light,
      ...tokens(css.match(/\[data-theme="dark"\]\s*\{([^}]+)}/)[1]),
    };
  const lum = (x) =>
    [1, 3, 5]
      .map((i) => parseInt(x.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (const vars of [light, dark])
    for (const [fg, bg] of [
      ["--stat-rose", "--panel"],
      ["--stat-mint", "--panel"],
      ["--button-ink", "--yellow"],
    ]) {
      const a = lum(vars[fg] || vars["--ink"]),
        b = lum(vars[bg]);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, fg);
    }
});
test("Flow completion cannot accept an extraneous path or an empty invalid level", () => {
  const level = levels["5x5"][0],
    paths = solve(level).solution;
  paths[99] = [{ r: 9, c: 9 }];
  assert.equal(R.isLevelComplete(level, paths), false);
  assert.equal(R.isLevelComplete({ size: 0, endpoints: [] }, {}), false);
});
test("Flow an already running game cannot discard clock time through a stale resume", () => {
  const h = boot();
  h.advance(2500);
  const t = h.window.FlowGame.getSnapshot().elapsedSeconds;
  h.nodes.resumeButton.click();
  assert.equal(h.window.FlowGame.getSnapshot().elapsedSeconds, t);
});
test("Flow clearing data cannot resurrect the deleted save during pagehide", () => {
  const h = boot();
  h.pointer("pointerdown", 0, 2);
  h.pointer("pointermove", 0, 3);
  h.pointer("pointerup");
  h.emit("window", "game-data-clearing");
  h.storage.delete("flow-progress-v1");
  h.emit("window", "pagehide");
  assert.equal(h.storage.has("flow-progress-v1"), false);
});
