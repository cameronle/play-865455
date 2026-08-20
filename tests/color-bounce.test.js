const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rules = require('../color-bounce/rules.js');

test('Color Bounce physics updates velocity with gravity and handles jump impulses', () => {
  const state = { y: 200, vy: 0 };
  const updated = rules.updatePhysics(state, 0.1, 1000);
  assert.equal(updated.vy, 100);
  assert.ok(updated.y > 200);

  const jumped = rules.applyJump(updated, -400);
  assert.equal(jumped.vy, -400);
});

test('Color Bounce circle obstacle collision validates matching color and detects wrong color', () => {
  const obstacle = {
    type: 'circle',
    y: 300,
    radius: 80,
    thickness: 16,
    angle: 0, // 4 segments: 0..90 (color 0), 90..180 (color 1), 180..270 (color 2), 270..360 (color 3)
    colors: [0, 1, 2, 3]
  };

  // Ball at bottom edge of circle: angle around 90 degrees (Math.PI/2) -> color 1
  const bottomBallMatch = { x: 240, y: 380, r: 8, color: 1 };
  assert.equal(rules.checkObstacleCollision(bottomBallMatch, 240, obstacle), 'safe');

  const bottomBallMismatch = { x: 240, y: 380, r: 8, color: 0 };
  assert.equal(rules.checkObstacleCollision(bottomBallMismatch, 240, obstacle), 'hit');

  // Ball far away
  const farBall = { x: 240, y: 100, r: 8, color: 0 };
  assert.equal(rules.checkObstacleCollision(farBall, 240, obstacle), 'none');
});

test('Color Bounce page is a complete themed mobile static entrypoint', () => {
  const html = fs.readFileSync('color-bounce/index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /id="game"/);
  assert.match(html, /rules\.js\?v=/);
  assert.match(html, /game\.js\?v=/);
  assert.match(fs.readFileSync('color-bounce/style.css', 'utf8'), /touch-action:\s*none/);
});
