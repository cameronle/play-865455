"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const html = fs.readFileSync("bubble-shooter/index.html", "utf8"),
  js = fs.readFileSync("bubble-shooter/game.js", "utf8");
test("every fixed runtime element exists in the owning HTML", () => {
  for (const [, id] of js.matchAll(/\$\(['"]([^'"]+)['"]\)/g))
    assert.ok(html.includes(`id="${id}"`), id);
});
test("native zoom and focusable keyboard board are preserved", () => {
  assert.ok(!html.includes("user-scalable=no"));
  assert.match(html, /<canvas[^>]*tabindex="0"/);
});
