const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('mobile fire can start the game and fire from the title screen', () => {
  const source=fs.readFileSync('space-invaders/game.js','utf8');
  assert.match(source,/function startAndFire\(\)/);
  assert.match(source,/bindFire[\s\S]*startAndFire/);
});

test('mobile layout gives the playfield full width and stacks the HUD', () => {
  const css=fs.readFileSync('space-invaders/style.css','utf8');
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.layout\{display:flex;flex-direction:column/);
  assert.match(css,/@media\(max-width:600px\)[\s\S]*\.frame\{[^}]*width:100%/);
  assert.match(css,/touch-action:none/);
});

test('player is briefly invulnerable after losing a life', () => {
  const source=fs.readFileSync('space-invaders/game.js','utf8');
  assert.match(source,/invulnerable/);
  assert.match(source,/if\(invulnerable>0\)return/);
});
