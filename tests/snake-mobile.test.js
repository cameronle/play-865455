const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('mobile layout gives the snake board full available width', () => {
  const css=fs.readFileSync('snake/style.css','utf8');
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.game-layout\{flex-direction:column/);
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.board-wrap\{[^}]*width:min\(100%,400px\)/);
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.sidebar\{[^}]*width:100%/);
});

test('touch controls remain visible and large enough to use', () => {
  const css=fs.readFileSync('snake/style.css','utf8');
  assert.match(css,/\.touch-controls button\{[^}]*height:52px/);
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.touch-controls\{display:grid/);
});
