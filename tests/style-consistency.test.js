const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=path=>fs.readFileSync(path,'utf8');

test('Gomoku uses the collection compact header and flat panel language',()=>{
  const html=read('gomoku/index.html');
  const css=read('gomoku/app.css');
  assert.match(html,/<header class="topbar">/);
  assert.match(html,/<section class="settings">/);
  assert.doesNotMatch(html,/<header><div><span>GOMOKU/);
  assert.doesNotMatch(css,/ui-serif|repeating-linear-gradient|body:before/);
  assert.match(css,/font-family:ui-monospace/);
  assert.match(css,/\.game-shell\{[^}]*border:1px solid var\(--line\)/);
  assert.match(css,/\.board-box\{[^}]*box-shadow:0 15px 50px/);
});

test('Gomoku board keeps readable wood but drops ornamental frame effects',()=>{
  const css=read('gomoku/app.css');
  assert.match(css,/--wood:/);
  assert.doesNotMatch(css,/inset 0 0 0 5px|6px 8px 0/);
});

test('Sokoban uses flat neutral tiles and collection theme support',()=>{
  const html=read('sokoban/index.html');
  const css=read('sokoban/style.css');
  const js=read('sokoban/game.js');
  assert.match(html,/src="\/theme\.js\?v=[^"]+"/);
  assert.match(html,/class="theme-toggle"/);
  assert.match(css,/\[data-theme="light"\]/);
  assert.match(css,/\.frame\{[^}]*border:1px solid var\(--line\)/);
  assert.doesNotMatch(css,/box-shadow:5px 5px/);
  assert.match(js,/function palette\(/);
  assert.doesNotMatch(js,/roundedRect\(/);
  assert.doesNotMatch(js,/ctx\.arc\(px,py-s\*\.08/);
});
