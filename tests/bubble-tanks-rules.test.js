'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
function rules() {
  assert.ok(fs.existsSync('bubble-tanks/rules.js'), 'bubble tank growth rules must exist');
  return require('../bubble-tanks/rules.js');
}
test('enemy bubbles grow the real body while recovered self-bubbles grant no new growth', () => {
  const R = rules();
  const p = R.createPlayer();
  assert.equal(R.tier(p.mass), 0);
  R.absorb(p, {value: 15, source: 'enemy'});
  assert.equal(p.mass, 37);
  assert.equal(p.growth, 15);
  assert.equal(R.tier(p.mass), 1);
  const shape = R.bodyCircles(p);
  assert.ok(shape.length > 1, 'larger tank must grow actual bubble nodes');
  R.absorb(p, {value: 5, source: 'self'});
  assert.equal(p.growth, 15);
  assert.equal(p.mass, 42);
});
test('damage shrinks the body and suspends costly guns without deleting the acquired build', () => {
  const R = rules();
  const p = R.createPlayer();
  p.mass = 100;
  p.loadout.push({id: 'arc', cost: 6, level: 1, slot: 1, angle: 0});
  assert.equal(R.activeLoadout(p).length, 2);
  const acquired = JSON.stringify(p.loadout);
  const hit = R.damage(p, 80);
  assert.equal(hit.after, 0);
  assert.equal(p.mass, 20);
  assert.equal(R.activeLoadout(p).length, 2, "capacitor bridges the immediate drop");
  p.powerGrace=0;
  assert.equal(R.activeLoadout(p).length, 1);
  assert.equal(JSON.stringify(p.loadout), acquired);
  assert.equal(R.damage(p, 10).lost, 0, 'overlapping hits must respect hit protection');
  R.absorb(p, {value: 80, source: 'self'});
  assert.equal(R.activeLoadout(p).length, 2);
  assert.equal(p.growth, 0);
});
test('upgrade offers are unique, exclude capped and incompatible modules, and install real weapons', () => {
  const R = rules();
  const p = R.createPlayer(); p.mass = 80;
  R.applyUpgrade(p, 'scatter');
  assert.ok(p.loadout.some(g => g.id === 'scatter'));
  R.applyUpgrade(p, 'split');
  assert.equal(p.passives.split, 1);
  for (let i = 0; i < 10; i++) R.applyUpgrade(p, 'pulse');
  const offered = R.offers(p, () => 0.5);
  assert.equal(offered.length, 3);
  assert.equal(new Set(offered.map(u => u.id)).size, 3);
  assert.ok(!offered.some(u => u.id === 'pulse'));
  const starter = R.createPlayer();
  for (let i = 0; i < 12; i++) assert.ok(!R.offers(starter, () => i / 12).some(u => u.id === 'split'), 'split is only relevant when scatter is owned');
});
test('branch chassis have different actual bubble contours and protection rather than just recolors', () => {
  const R = rules(); const shapes = [];
  const losses = [];
  for (const id of ['balanced', 'scout', 'bulwark']) {
    const p = R.createPlayer(id); p.mass = 100;
    shapes.push(JSON.stringify(R.bodyCircles(p)));
    losses.push(R.damage(p, 10).lost);
  }
  assert.equal(new Set(shapes).size, 3);
  assert.ok(losses[1] > losses[0]);
  assert.ok(losses[2] < losses[0]);
});
test('mobile starter core stays legible and shares its geometry with combat hit circles', () => {
  const R = rules(), C = require('../bubble-tanks/combat.js'), p = R.createPlayer();
  assert.ok(R.bodyCircles(p)[0].r >= 16);
  p.mass = 34; p.angle = Math.PI / 4;
  assert.ok(R.bodyCircles(p)[0].r >= 19);
  assert.deepEqual(C.playerCircles(p).map(c => c.r), R.bodyCircles(p).map(c => c.r));
});
