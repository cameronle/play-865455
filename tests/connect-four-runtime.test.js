const assert = require("node:assert/strict");
const test = require("node:test");
const { boot } = require("./helpers/connect-four-runtime.js");

test("one human column click creates one human disc and one AI reply", () => {
  const app = boot();
  app.cols[3].click();
  app.flush();
  const cells = app.cells();
  assert.equal(cells.filter((c) => c.className.includes("human")).length, 1);
  assert.equal(cells.filter((c) => c.className.includes("computer")).length, 1);
});
test("undo restores the board before the latest human and AI turn", () => {
  const app = boot();
  app.cols[3].click();
  app.flush();
  app.nodes.undoButton.click();
  assert.equal(
    app.cells().filter((c) => /human|computer/.test(c.className)).length,
    0,
  );
});
test("a completed game opens a clear result overlay with replay action", () => {
  const app = boot({ fixedAi: true });
  for (const col of [0, 1, 2]) {
    app.cols[col].click();
    app.flush();
  }
  app.cols[3].click();
  assert.equal(app.nodes.resultOverlay.classList.contains("show"), true);
  assert.equal(app.nodes.resultTitle.textContent, "YOU WIN");
  assert.equal(app.nodes.resultButton.textContent, "PLAY AGAIN");
});
