"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const read = (p) => fs.readFileSync(p, "utf8");
test("cave utilities stay in flow and viewport keeps native zoom", () => {
  const html = read("helicopter-cave/index.html"),
    css = read("helicopter-cave/style.css");
  assert.doesNotMatch(html, /user-scalable=no/);
  assert.match(html, /id="utilityDock"/);
  assert.match(css, /\.utility-dock[\s\S]*position:\s*static\s*!important/);
  assert.match(css, /max-height:\s*500px/);
  assert.match(css, /100svh/);
  for (const asset of [
    "/theme.js",
    "/clear-game-data.js",
    "/theme.css",
    "style.css",
    "game.js",
    "favicon.svg",
  ])
    assert.ok(html.includes(asset));
});

test("dark hover keeps rise-button text readable on its mint background", () => {
  const css = read("helicopter-cave/style.css");
  assert.match(css, /\.thrust:hover\s*\{\s*color:\s*#132633/);
});
