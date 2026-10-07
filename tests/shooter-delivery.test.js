"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
test("campaign dependency order and pulse/boss/mode controls are shipped together", () => {
  const html = fs.readFileSync("shooter/index.html", "utf8");
  const modules = ["content", "bosses", "enemies", "director", "rules", "locale", "renderer", "game"];
  let previous = -1;
  for (const name of modules) {
    const resource = html.match(new RegExp(`${name}\\.js\\?v=[a-z0-9-]+`));
    assert.ok(resource, `${name} has a versioned asset URL`);
    const index = html.indexOf(resource[0]);
    assert.ok(index > previous, `${name} loads in dependency order`);
    previous = index;
  }
  for (const id of [
    "pulseButton",
    "bossHud",
    "bossName",
    "bossHealth",
    "normalButton",
    "challengeButton",
  ])
    assert.ok(html.includes(`id="${id}"`), id);
});
const luminance = (hex) => {
  const rgb = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
test("small light-theme labels meet 4.5:1 text contrast", () => {
  const css = fs.readFileSync("shooter/style.css", "utf8"),
    theme = css.match(/\[data-theme="light"\]\s*\{([^}]+)\}/)[1];
  const ink = theme.match(/--muted:\s*#([a-f0-9]+)/)[1],
    panel = theme.match(/--panel:\s*#([a-f0-9]+)/)[1];
  assert.ok((luminance(panel) + 0.05) / (luminance(ink) + 0.05) >= 4.5);
});

test("Sky Patrol exposes accessible controls and cache-busted runtime assets", () => {
  const html = fs.readFileSync("shooter/index.html", "utf8");
  for (const [id, label] of [
    ["leftButton", "Move left"],
    ["rightButton", "Move right"],
    ["upButton", "Move up"],
    ["downButton", "Move down"],
  ])
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-label="${label}"`));
  assert.match(html, /rel="icon"[^>]*favicon\.svg/);
  assert.match(html, /role="status"[^>]*id="flightStatus"/);
  assert.match(html, /Drag to move/);
  for (const name of ["rules", "game"])
    assert.match(html, new RegExp(`${name}\\.js\\?v=boss-fx-1`));
});
test("portrait and landscape layouts reserve the utility dock and keep the flight area proportional", () => {
  const css = fs.readFileSync("shooter/style.css", "utf8");
  assert.match(css, /100svh - var\(--flight-ui-height\)/);
  assert.doesNotMatch(css, /100svh - 374px/);
  assert.match(css, /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\) 190px/);
  assert.match(css, /body \.theme-toggle/);
  assert.match(css, /bottom:\s*max\(10px,\s*env\(safe-area-inset-bottom\)\)/);
});
