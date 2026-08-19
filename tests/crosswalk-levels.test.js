const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { levels } = require('../crosswalk/levels.js');
const rules = require('../crosswalk/rules.js');

const level = id => levels.find(item => item.id === id);

test('Crosswalk ships 20 ordered levels across five chapters', () => {
  assert.equal(levels.length, 20);
  assert.deepEqual(levels.map(item => item.id), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.deepEqual(levels.map(item => item.chapter), [
    1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
  ]);
  assert.equal(level(1).name, 'FIRST CROSSING');
  assert.equal(level(20).name, 'CITY LOOP');
  assert.ok(level(3).lanes.some(lane => lane.vehicles.some(vehicle => ['bus', 'truck'].includes(vehicle.kind))));
  assert.ok(level(5).lanes.some(lane => lane.signal));
  assert.ok(level(7).lanes.some(lane => lane.pattern === 'convoy'));
  assert.ok(level(9).safeRows.some(row => row.blocks.length > 0));
  assert.ok(level(12).safeRows.some(row => row.moving));
  assert.ok(level(14).lanes.some(lane => lane.vehicles.some(vehicle => vehicle.kind === 'emergency')));
});

test('every level has finite lanes and a traversable static safe-row layout', () => {
  for (const item of levels) {
    assert.ok(item.lanes.length > 0);
    assert.ok(item.lanes.every(lane => lane.row >= 2 && lane.row <= 9));
    assert.ok(item.lanes.every(lane => lane.vehicles.length >= 2));
    assert.ok(item.safeRows.every(row => row.row >= 1 && row.row <= 11));
    assert.ok(item.safeRows.every(row => row.blocks.every(col => col >= 0 && col < 9)));
    assert.equal(rules.hasTraversableSafeRows(item, 9), true, `level ${item.id} blocks every safe option`);
  }
});

test('signals alternate deterministically and emergency vehicles ignore red phases', () => {
  const signal = { cycle: 6, go: 3, phase: 0 };
  assert.equal(rules.signalState(signal, 1), 'go');
  assert.equal(rules.signalState(signal, 4), 'stop');
  assert.equal(rules.signalState(signal, 7), 'go');
  assert.equal(rules.vehicleMotionFactor({ signal }, 1), 1);
  assert.equal(rules.vehicleMotionFactor({ signal }, 4), 0);
  assert.equal(rules.vehicleMotionFactor({ signal }, 4, { kind: 'emergency' }), 1);
});

test('moving crosswalk positions are bounded and expose a contiguous safe strip', () => {
  const moving = { width: 3, speed: 1.2, start: 1 };
  assert.deepEqual(rules.movingSafeColumns(moving, 9, 0), [1, 2, 3]);
  assert.deepEqual(rules.movingSafeColumns(moving, 9, 10), [1, 2, 3]);
  assert.equal(rules.isMovingSafe(moving, 9, 4, 0), false);
  assert.equal(rules.isMovingSafe(moving, 9, 1, 0), true);
});

test('wrapped distance and vehicle collision handle toroidal screen boundaries', () => {
  assert.equal(rules.wrappedDistance(20, 590, 600), 30);
  assert.equal(rules.wrappedDistance(590, 20, 600), 30);
  assert.equal(rules.wrappedDistance(300, 300, 600), 0);
  assert.equal(rules.wrappedDistance(100, 400, 600), 300);
  const player = { x: 20, r: 17 };
  const enteringCar = { x: 590, w: 80 };
  assert.equal(rules.collides(player, enteringCar, 600), true);
  const farCar = { x: 400, w: 80 };
  assert.equal(rules.collides(player, farCar, 600), false);
});

test('level unlocks advance one level at a time and completion count is stable', () => {
  const completed = Array(20).fill(false);
  assert.equal(rules.isLevelUnlocked(0, completed), true);
  assert.equal(rules.isLevelUnlocked(1, completed), false);
  completed[0] = true;
  assert.equal(rules.isLevelUnlocked(1, completed), true);
  assert.equal(rules.isLevelUnlocked(2, completed), false);
  completed[1] = true;
  assert.equal(rules.completionCount(completed), 2);
});

test('Crosswalk page exposes level selector and versioned rules asset', () => {
  const html = fs.readFileSync('crosswalk/index.html', 'utf8');
  assert.match(html, /id="levelsButton"/);
  assert.match(html, /id="levelsOverlay"/);
  assert.match(html, /id="levelGrid"/);
  assert.match(html, /levels\.js\?v=/);
  assert.match(html, /rules\.js\?v=/);
  assert.match(fs.readFileSync('crosswalk/game.js', 'utf8'), /renderLevelGrid/);
});
