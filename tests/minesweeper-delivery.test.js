const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("large Minesweeper boards have a contained panning viewport and readable minimum cells", () => {
  const html = fs.readFileSync("minesweeper/index.html", "utf8"),
    css = fs.readFileSync("minesweeper/style.css", "utf8");
  assert.match(html, /id="boardScroll"/);
  assert.doesNotMatch(html, /user-scalable=no/);
  assert.match(css, /--cell-min:\s*32px/);
  assert.match(css, /--cell-min:\s*44px/);
  assert.match(css, /touch-action:\s*pan-x pan-y/);
  assert.match(css, /overflow:\s*auto/);
  assert.match(html, /class="stats"/);
});
test("bright action surfaces keep dark labels in both themes", () => {
  const css = fs.readFileSync("minesweeper/style.css", "utf8");
  assert.match(css, /\.level-button\.complete small\s*\{\s*color:\s*inherit;/);
  assert.match(
    css,
    /\.message button,\s*\.levels-head button\s*\{[^}]*color:\s*#3d3832;/,
  );
  assert.match(css, /\.difficulty-heading\s*\{[^}]*color:\s*var\(--number3\)/);
});
