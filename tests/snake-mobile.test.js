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

test('Worm & Apple exposes the doodle garden brand and theme path', () => {
  const html=fs.readFileSync('snake/index.html','utf8');
  const js=fs.readFileSync('snake/game.js','utf8');
  assert.match(html,/WORM &amp; APPLE/);
  assert.match(html,/worm-apple-1/);
  assert.match(js,/function drawApple/);
  assert.match(js,/function drawWorm/);
});
