'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const R = require('../bubble-tanks/rules.js');
const W = require('../bubble-tanks/world.js');
function combat() {assert.ok(fs.existsSync('bubble-tanks/combat.js'), 'real bubble shooting loop must exist'); return require('../bubble-tanks/combat.js');}
test('auto-fire really kills a tank, drops bubbles, and clear-room attraction absorbs them once', () => {
  const C = combat();
  const s = C.create('combat-test');
  C.start(s);
  W.travel(s.world, 1, 0, s.player);
  s.player.x = 400; s.player.y = 400;
  const room = W.current(s.world);
  room.enemies = [{id: 'victim', kind: 'grazer', x: 485, y: 400, r: 14, hp: 3, maxHp: 3, cooldown: 10, phase: 0, angle: 0, slow: 0, hit: 0, rewarded: false}];
  for (let i = 0; i < 240; i++) C.step(s, {x: 0, y: 0}, 1 / 60);
  assert.equal(room.enemies.filter(e => e.hp > 0).length, 0);
  assert.equal(room.kills, 1);
  assert.equal(room.cleared, true);
  assert.ok(s.player.mass > 22);
  const growth = s.player.growth;
  for (let i = 0; i < 120; i++) C.step(s, {x: 0, y: 0}, 1 / 60);
  assert.equal(s.player.growth, growth, 'already absorbed drops cannot grant resources again');
  assert.equal(s.world.cleared, 1);
});
test('movement is diagonal-normalized, crosses the circular boundary, and pauses the simulation', () => {
  const C = combat();
  const a = C.create('move'), b = C.create('move'); C.start(a); C.start(b);
  C.step(a, {x: 1, y: 0}, 0.04); C.step(b, {x: 1, y: 1}, 0.04);
  assert.ok(a.player.x > 400);
  assert.ok(Math.abs(Math.hypot(a.player.x - 400, a.player.y - 400) - Math.hypot(b.player.x - 400, b.player.y - 400)) < 1e-6);
  a.player.x = 748; a.player.y = 400;
  C.step(a, {x: 1, y: 0}, 0.04);
  assert.equal(a.world.position.x, 1);
  assert.equal(a.transition.dx, 1);
  assert.ok(a.player.x < 400);
  C.pause(a);
  const before = JSON.stringify(a);
  C.step(a, {x: 1, y: 0}, 0.04);
  assert.equal(JSON.stringify(a), before);
  C.resume(a);
  assert.equal(a.mode, 'running');
});
test('hostile tanks telegraph and fire actual enemy bubbles that damage the multi-bubble body', () => {
  const C = combat();
  const s = C.create('hostiles'); C.start(s); W.travel(s.world, 1, 0, s.player);
  const p = s.player; p.x = 400; p.y = 400; p.mass = 100; p.invulnerable = 0;
  const room = W.current(s.world);
  room.enemies = [{id: 'shooter', kind: 'shooter', x: 550, y: 400, r: 18, hp: 500, maxHp: 500, cooldown: 0.05, phase: 0, angle: 0, slow: 0, hit: 0}];
  let enemyShot = false, warning = false;
  for (let i = 0; i < 160; i++) {
    C.step(s, {x: 0, y: 0}, 1 / 60);
    enemyShot ||= room.shots.some(b => b.owner === 'enemy');
    warning ||= room.effects.some(fx => fx.kind === 'aim');
  }
  assert.ok(enemyShot, 'hostile fire is not merely a decorative effect');
  assert.ok(warning, 'a hostile shot needs a readable warning');
  assert.ok(p.mass < 100, 'hostile shot must cause bubble loss');
  assert.ok(room.drops.every(b => b.source !== 'enemy'), 'damage alone must not create kill rewards');
});
test('scatter plus split creates real single-generation fragments on impact', () => {
  const C = combat(); const s = C.create('split'); C.start(s);
  const p = s.player; p.mass = 80; R.applyUpgrade(p, 'scatter'); R.applyUpgrade(p, 'split');
  const room = W.current(s.world); room.drops = []; room.cleared = false;
  room.enemies = [{id: 'target', kind: 'grazer', x: 460, y: 400, r: 22, hp: 500, maxHp: 500, cooldown: 20, phase: 0, angle: 0, slow: 0, hit: 0}];
  p.angle = 0;
  C.fireWeapon(s, room, p.loadout.find(g => g.id === 'scatter'), room.enemies[0]);
  assert.equal(room.shots.length, 5);
  for (const gun of p.loadout) s.cooldowns[gun.slot] = 99;
  let fragments = false;
  for (let i = 0; i < 60; i++) {
    C.step(s, {x: 0, y: 0}, 1 / 60);
    fragments ||= room.shots.some(b => b.generation === 1);
    assert.ok(room.shots.every(b => (b.generation || 0) <= 1));
  }
  assert.ok(fragments);
  assert.ok(room.enemies[0].hp < 500);
});
test('chain arc damages distinct neighboring enemies and conductive film extends its actual reach', () => {
  const C = combat(); const s = C.create('arc'); C.start(s);
  s.player.mass = 200; R.applyUpgrade(s.player, 'arc'); R.applyUpgrade(s.player, 'conductive');
  const room = W.current(s.world);
  room.enemies = [450, 580, 710].map((x, i) => ({id: `e${i}`, x, y: 400, r: 14, hp: 50, maxHp: 50, kind: 'grazer'}));
  C.fireWeapon(s, room, s.player.loadout.find(g => g.id === 'arc'), room.enemies[0]);
  assert.equal(room.enemies.filter(e => e.hp < 50).length, 3);
  assert.equal(room.effects.filter(fx => fx.kind === 'arc').length, 3);
  assert.equal(new Set(room.effects.filter(fx => fx.kind === 'arc').map(fx => fx.targetId)).size, 3);
});
test('earned growth opens a valid choice and freezes combat until that choice is accepted', () => {
  const C = combat(); const s = C.create('choices'); C.start(s);
  for (let i = 0; i < 120; i++) C.step(s, {x: 0, y: 0}, 1 / 60);
  assert.equal(s.mode, 'upgrade');
  assert.equal(s.offers.length, 3);
  const before = JSON.stringify(s);
  C.step(s, {x: 1, y: 1}, 0.04);
  assert.equal(JSON.stringify(s), before);
  assert.equal(C.choose(s, 'not-offered'), false);
  assert.equal(C.choose(s, s.offers[0].id), true);
  assert.equal(s.mode, 'running');
  assert.equal(s.level, 2);
});
test('utility upgrades change movement, attraction, shield regeneration and bounded dash behavior', () => {
  const C = combat(); const a = C.create('utility'), b = C.create('utility'); C.start(a); C.start(b);
  for (const s of [a, b]) W.current(s.world).drops = [];
  R.applyUpgrade(b.player, 'thruster'); R.applyUpgrade(b.player, 'shield'); R.applyUpgrade(b.player, 'magnet'); b.player.shield = 0;
  C.step(a, {x: 1, y: 0}, 0.04); C.step(b, {x: 1, y: 0}, 0.04);
  assert.ok(b.player.x > a.player.x);
  assert.ok(b.player.shield > 0);
  const room = W.current(b.world);
  room.cleared = false; room.enemies = [{id: 'idle', kind: 'grazer', x: 680, y: 400, r: 12, hp: 999, maxHp: 999, phase: 0, cooldown: 10, hit: 0}];
  room.drops = [{id: 'far', x: b.player.x + 105, y: b.player.y, value: 2, source: 'room'}];
  const oldDropX = room.drops[0].x; C.step(b, {x: 0, y: 0}, 0.04);
  assert.ok(room.drops[0].x < oldDropX);
  assert.equal(C.dash(b, {x: 1, y: 0}), true);
  const oldX = b.player.x; C.step(b, {x: 0, y: 0}, 0.04);
  assert.ok(b.player.x - oldX > 10);
  assert.equal(C.dash(b, {x: 1, y: 0}), false);
  assert.equal(C.useSkill(b), true);
  assert.ok(b.player.shield >= 18);
  assert.equal(C.useSkill(b), false);
});
test('assisted targeting holds a living target through small distance changes and immediately drops dead locks', () => {
  const C = combat(), s = C.create('stable-target'); const room = W.current(s.world);
  room.enemies = [{id:'a',x:500,y:400,hp:20},{id:'b',x:510,y:400,hp:20}];
  assert.equal(C.selectTarget(s,room,0.016).id,'a');
  room.enemies[1].x = 498;
  assert.equal(C.selectTarget(s,room,0.016).id,'a');
  room.enemies[0].hp = 0;
  assert.equal(C.selectTarget(s,room,0.016).id,'b');
  room.enemies[1].hp = 0;
  assert.equal(C.selectTarget(s,room,0.016),null);
});
