const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("runner retains native zoom and an in-flow utility dock", () => {
  const html = fs.readFileSync("endless-runner/index.html", "utf8");
  assert.doesNotMatch(html, /user-scalable=no/);
  assert.match(html, /id="utilityDock"/);
});

test("playfield is keyboard focusable and controls are named", () => {
  const html = fs.readFileSync("endless-runner/index.html", "utf8");
  assert.match(html, /<canvas[\s\S]*?tabindex="0"/);
  assert.match(html, /aria-label="Runner controls"/);
});

test("pixel action labels share a dark foreground on colored surfaces", () => {
  const css = fs.readFileSync("endless-runner/style.css", "utf8");
  assert.match(css, /\.controls button:last-child\s*\{\s*color:\s*var\(--action-ink\)/);
  assert.match(css, /\.overlay button\s*\{\s*color:\s*var\(--action-ink\)/);
});

test("dark distance text has normal-text AA contrast against its HUD panel", () => {
  const css = fs.readFileSync("endless-runner/style.css", "utf8");
  const block = css.match(/\[data-theme="dark"\]\s*\{([^}]+)\}/)[1];
  const base = block.match(/--coral:\s*(#[0-9a-f]+)/i)[1];
  const bg = block.match(/--panel:\s*(#[0-9a-f]+)/i)[1];
  const fg =
    css.match(
      /\[data-theme="dark"\] \.hud div:first-child b\s*\{\s*color:\s*(#[0-9a-f]+)/i,
    )?.[1] || base;
  const luminance = (h) => {
    const rgb = h
      .slice(1)
      .match(/../g)
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return rgb.reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const a = luminance(fg),
    b = luminance(bg);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(
    ratio >= 4.5,
    `Dark distance contrast ${ratio.toFixed(3)} is below 4.5`,
  );
});
