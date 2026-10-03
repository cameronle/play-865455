const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("mobile garden board uses available width constrained by the remaining height budget", () => {
  const css = fs.readFileSync("snake/style.css", "utf8");
  assert.match(css, /width:\s*min\(\s*100%,\s*400px,\s*calc\(100svh - 350px/);
  assert.match(css, /grid-template-areas:\s*"sidebar" "board" "controls"/);
  assert.match(css, /\.sidebar\s*\{[^}]*width:\s*100%/);
});
test("touch arrows retain large targets and a short-landscape path", () => {
  const css = fs.readFileSync("snake/style.css", "utf8");
  assert.match(css, /\.touch-controls button\s*\{[^}]*height:\s*52px/);
  assert.match(css, /grid-template-areas:\s*"board sidebar" "board controls"/);
  assert.match(css, /height:\s*48px/);
});
test("Worm & Apple preserves its garden artwork and refreshed theme path", () => {
  const html = fs.readFileSync("snake/index.html", "utf8"),
    js = fs.readFileSync("snake/game.js", "utf8");
  assert.match(html, /WORM &amp; APPLE/);
  assert.match(html, /worm-apple-2/);
  assert.match(js, /function drawApple/);
  assert.match(js, /function drawWorm/);
});
