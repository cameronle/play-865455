'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
function world() {
  assert.ok(fs.existsSync('bubble-tanks/world.js'), 'persistent bubble rooms must exist');
  return require('../bubble-tanks/world.js');
}
test('seeded adjacent rooms remain the same room after retreat and never respawn killed enemies', () => {
  const W = world();
  const a = W.create('test-seed'), b = W.create('test-seed');
  assert.deepEqual(W.roomAt(a, 1, 0), W.roomAt(b, 1, 0));
  const p = {x: 400, y: 400};
  W.travel(a, 1, 0, p);
  const room = W.current(a);
  const victim = room.enemies[0];
  assert.ok(victim);
  victim.hp = 0;
  room.drops.push({id: 'reward-1', x: 200, y: 200, value: 5, source: 'enemy'});
  W.travel(a, -1, 0, p);
  W.travel(a, 1, 0, p);
  assert.strictEqual(W.current(a), room);
  assert.equal(W.current(a).enemies[0].hp, 0);
  assert.equal(W.current(a).drops.filter(x => x.id === 'reward-1').length, 1);
  assert.deepEqual(a.position, {x: 1, y: 0});
  assert.ok(p.x > 0 && p.x < 400, 'enter from the left when going right');
});
