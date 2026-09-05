const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rules = require('../flappy/rules.js');

test('Flappy Wings physics updates gravity and flaps upward', () => {
  const bird = { y: 200, vy: 0 };
  const fell = rules.updatePhysics(bird, 0.1, 1000);
  assert.equal(fell.vy, 100);
  assert.ok(fell.y > 200);

  const flapped = rules.flap(fell, -320);
  assert.equal(flapped.vy, -320);
});

test('Flappy Wings collision accurately checks pipe bounds and gap clearance', () => {
  const pipe = { x: 100, width: 50, topY: 150, bottomY: 280 }; // gap between y=150 and y=280

  // Bird inside gap -> safe
  const insideBird = { x: 125, y: 215, r: 12 };
  assert.equal(rules.checkPipeCollision(insideBird, pipe), false);

  // Bird hitting top pipe
  const topHitBird = { x: 125, y: 140, r: 12 };
  assert.equal(rules.checkPipeCollision(topHitBird, pipe), true);

  // Bird hitting bottom pipe
  const bottomHitBird = { x: 125, y: 290, r: 12 };
  assert.equal(rules.checkPipeCollision(bottomHitBird, pipe), true);

  // Bird before pipe
  const beforeBird = { x: 40, y: 140, r: 12 };
  assert.equal(rules.checkPipeCollision(beforeBird, pipe), false);
});

test('Flappy Wings page is a complete themed mobile static entrypoint', () => {
  const html = fs.readFileSync('flappy/index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /id="game"/);
  assert.match(html, /BIRDIE POST/);
  assert.match(html, /rules\.js\?v=/);
  assert.match(html, /game\.js\?v=/);
  assert.match(fs.readFileSync('flappy/style.css', 'utf8'), /touch-action:\s*none/);
});
