"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");

const css = fs.readFileSync("tetris/style.css", "utf8");

test("board canvas keeps every edge cell square rather than clipping it with a CSS radius", () => {
  const board = css.match(/#board\s*\{([^}]+)\}/)?.[1];
  assert.ok(board, "canvas style exists");
  assert.match(board, /border-radius:\s*0(?:px)?\s*;/);
  assert.match(board, /aspect-ratio:\s*1\s*\/\s*2\s*;/);
});

test("portrait board is wider without stretching the logical grid or shrinking touch controls", () => {
  const portrait = css.slice(css.indexOf("@media (max-width: 560px)"));
  const board = portrait.match(/\.board-wrap\s*\{([^}]+)\}/)?.[1];
  assert.ok(board, "portrait board constraint exists");
  assert.match(board, /340px/);
  assert.match(board, /100svh - 248px - env\(safe-area-inset-bottom\)/);
  assert.match(portrait, /\.touch-controls button\s*\{[^}]*min-height:\s*44px/);
  assert.match(css, /\.board-wrap\s*\{[^}]*width:\s*min\(340px,/);
});
