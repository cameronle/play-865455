const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("Four-in-a-row retains native zoom and provides visible pause, resume and board inspection controls", () => {
  const html = fs.readFileSync("connect-four/index.html", "utf8");
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
  for (const id of [
    "pauseButton",
    "pauseOverlay",
    "resumeButton",
    "viewButton",
    "utilityDock",
  ])
    assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /aria-rowcount="6"/);
  assert.match(html, /aria-colcount="7"/);
  assert.match(html, /tabindex="0"/);
});

test("The original warm light palette remains distinct from the dark theme", () => {
  const css = fs.readFileSync("connect-four/style.css", "utf8");
  assert.match(css, /\[data-theme="light"\]/);
  assert.match(css, /--hole:#faf8ef/);
  assert.match(css, /--cyan:#4f9294/);
});

test("Warm light small text has at least 4.5:1 contrast on its panel", () => {
  const css = fs.readFileSync("connect-four/style.css", "utf8"),
    light = css.match(/\[data-theme="light"\]\{([^}]+)\}/)[1];
  const color = (key) => light.match(new RegExp(`--${key}:(#[0-9a-f]{6})`))[1];
  const lum = (c) => {
    const a = c
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };
  const ratio = (lum(color("panel")) + 0.05) / (lum(color("muted")) + 0.05);
  assert.ok(ratio >= 4.5, `contrast ${ratio}`);
});

test("Small teal record numbers have a separate readable light-theme ink", () => {
  const css = fs.readFileSync("connect-four/style.css", "utf8");
  assert.match(css, /--record-ink:#357477/);
  assert.match(css, /color:var\(--record-ink,var\(--cyan\)\)/);
});
