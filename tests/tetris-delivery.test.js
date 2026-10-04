"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("the game exposes complete labelled controls and status with fresh assets", () => {
  const html = fs.readFileSync("tetris/index.html", "utf8");
  assert.match(html, /role="status"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /game\.js\?v=paper-blocks-3/);
  assert.match(html, /style\.css\?v=thin-ui-1/);
  for (const action of ["left", "rotate", "right", "down", "drop"])
    assert.match(
      html,
      new RegExp(`data-action="${action}"[^>]*[\\s\\S]*?<small>`),
    );
});
test("short portrait and landscape layouts reserve a separate utility dock", () => {
  const css = fs.readFileSync("tetris/style.css", "utf8");
  assert.match(css, /100svh - 292px/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /body \.theme-toggle/);
  assert.match(
    css,
    /body \.theme-toggle,\s*body \.clear-data-toggle\s*\{[^}]*transform:\s*none/,
  );
  assert.match(css, /min-height:\s*44px/);
});
const luminance = (hex) => {
  const a = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};
test("small light-theme HUD values and labels meet 4.5:1 contrast", () => {
  const css = fs.readFileSync("tetris/style.css", "utf8"),
    theme = css.match(/\[data-theme="light"\]\s*\{([^}]+)\}/)[1];
  const color = (k) => theme.match(new RegExp(`--${k}:\\s*#([a-f0-9]+)`))?.[1];
  const panel = color("panel");
  for (const k of [
    "muted",
    "score-ink",
    "best-ink",
    "level-ink",
    "lines-ink",
  ]) {
    assert.ok(color(k), k + " defined");
    assert.ok(
      (luminance(panel) + 0.05) / (luminance(color(k)) + 0.05) >= 4.5,
      k + " contrast",
    );
  }
});
