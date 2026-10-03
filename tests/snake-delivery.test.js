"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("garden has keyboard-focusable board and live result status with refreshed route assets", () => {
  const html = fs.readFileSync("snake/index.html", "utf8");
  assert.match(html, /id="board"[^>]*tabindex="0"/);
  assert.match(html, /id="message"[^>]*role="status"/);
  assert.match(html, /game\.js\?v=worm-apple-2/);
  assert.match(html, /style\.css\?v=worm-apple-2/);
  assert.match(html, /SWIPE/);
});
test("board box model scales square canvas inside the border and budgets short screens", () => {
  const css = fs.readFileSync("snake/style.css", "utf8");
  assert.match(css, /#board\s*\{[^}]*width:\s*100%/);
  assert.match(css, /100svh - 350px/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(
    css,
    /body \.theme-toggle,\s*body \.clear-data-toggle\s*\{[^}]*transform:\s*none/,
  );
  assert.match(css, /min-height:\s*44px/);
});
const lum = (hex) =>
  hex
    .match(/../g)
    .map((s) => parseInt(s, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
test("small light-theme HUD labels and values meet 4.5:1 contrast", () => {
  const css = fs.readFileSync("snake/style.css", "utf8"),
    color = (k) => css.match(new RegExp(`--${k}:\\s*#([a-f0-9]+)`))?.[1],
    bg = lum(color("panel"));
  for (const k of [
    "muted",
    "score-ink",
    "best-ink",
    "speed-ink",
    "walls-ink",
  ]) {
    assert.ok(color(k), k);
    assert.ok((bg + 0.05) / (lum(color(k)) + 0.05) >= 4.5, k);
  }
});
