'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const C=require('../bubble-tanks/combat.js'),R=require('../bubble-tanks/rules.js'),A=require('../bubble-tanks/adventure.js'),S=require('../bubble-tanks/storage.js');
test('blueprints survive removal and can be re-mounted; upgrading a mirrored blueprint upgrades its instances together',()=>{
 const s=C.create('blueprints');C.start(s);s.player.mass=65;assert.ok(R.applyUpgrade(s.player,'scatter'));assert.equal(R.rank(s.player,'scatter'),1);
 assert.ok(A.open(s,'assembly'));assert.ok(A.edit(s,{type:'remove',slot:1}));assert.ok(A.edit(s,{type:'commit'}));
 assert.equal(R.rank(s.player,'scatter'),1,'removing a mount retains its blueprint');assert.ok(!s.player.loadout.some(g=>g.id==='scatter'));
 assert.ok(A.open(s,'assembly'));assert.ok(A.edit(s,{type:'add',id:'scatter'}));assert.ok(A.edit(s,{type:'mirror',slot:1}));assert.ok(A.edit(s,{type:'commit'}));
 assert.ok(R.applyUpgrade(s.player,'scatter'));assert.ok(s.player.loadout.filter(g=>g.id==='scatter').every(g=>g.level===2));
 const restored=S.restore(S.serialize(s));assert.equal(restored.error,null);assert.equal(R.rank(restored.state.player,'scatter'),2);
});
test('mirroring an axial mount creates separated physical mounts and pays for both',()=>{
 const s=C.create('mirror-axis');C.start(s);A.open(s,'assembly');assert.ok(A.edit(s,{type:'mirror',slot:0}));
 assert.ok(Math.abs(R.mount(s.draft[0]).y-R.mount(s.draft[1]).y)>=8);assert.equal(s.draft.reduce((n,g)=>n+g.cost,0),2);
});
