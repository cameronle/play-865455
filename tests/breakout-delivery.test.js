const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");

test("Firelight budgets short portrait and landscape with a protected utility dock", () => {
  const css = fs.readFileSync("breakout/style.css", "utf8");
  assert.match(css, /100svh - 304px/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /grid-template-areas:\s*"sidebar" "frame" "actions"/);
  assert.match(
    css,
    /body \.theme-toggle,\s*body \.clear-data-toggle\s*\{[^}]*transform:\s*none/,
  );
  assert.doesNotMatch(css, /font:\s*\d+ \d+px inherit/);
});
const lum = (hex) =>
  hex
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
test("small light HUD labels and all four values maintain 4.5:1 contrast", () => {
  const css = fs.readFileSync("breakout/style.css", "utf8"),
    get = (k) => css.match(new RegExp("--" + k + ":\\s*#([a-f0-9]+)"))?.[1],
    bg = lum(get("panel"));
  for (const k of [
    "muted",
    "score-ink",
    "best-ink",
    "level-ink",
    "lives-ink",
  ]) {
    assert.ok(get(k), k);
    assert.ok((bg + 0.05) / (lum(get(k)) + 0.05) >= 4.5, k);
  }
});

test("Firelight ships an accessible playfield, live result and mobile restart", () => {
  const h = fs.readFileSync("breakout/index.html", "utf8");
  assert.match(h, /id="mobileNew"/);
  assert.match(h, /id="game"[^>]*tabindex="0"/);
  assert.match(h, /id="overlay"[^>]*role="status"/);
  assert.match(h, /game\.js\?v=firelight-2/);
  assert.match(h, /style\.css\?v=firelight-2/);
});
