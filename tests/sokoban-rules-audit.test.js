const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../sokoban/rules.js');

test('level parser rejects ambiguous players and unsupported map symbols', () => {
  assert.throws(()=>R.parseLevel(['@@']), /one player/);
  assert.throws(()=>R.parseLevel(['@X']), /Invalid cell/);
  assert.throws(()=>R.parseLevel([null]), /rows/);
});


test('ragged map padding and board exterior are not walkable', () => {
  const s = R.parseLevel(['@  ', ' ']);
  assert.equal(R.move(s, -1, 0), false);
  assert.equal(R.move(s, 1, 0), true);
  assert.equal(R.move(s, 0, 1), false);
  assert.deepEqual(s.player, {x:1,y:0});
});
