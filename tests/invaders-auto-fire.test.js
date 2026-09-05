const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('space-invaders/game.js', 'utf8');
const html = fs.readFileSync('space-invaders/index.html', 'utf8');

test('Alien Formation fires automatically during active play', () => {
  assert.match(source, /function update\(dt\)[\s\S]*fire\(\)/);
});

test('manual fire controls and instructions are removed', () => {
  assert.doesNotMatch(html, /id="fireButton"/);
  assert.doesNotMatch(html, /SPACE FIRE/);
  assert.doesNotMatch(source, /function startAndFire/);
  assert.doesNotMatch(source, /bindFire/);
});

test('start and new-game actions begin play without requiring a shot input', () => {
  assert.match(source, /\$\('start'\)\.onclick=start/);
  assert.match(source, /\$\('new'\)\.onclick=start/);
  assert.match(html, />(?:START|OPEN THE DOME)</);
});
