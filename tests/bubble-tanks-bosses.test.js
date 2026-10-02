'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
function bosses(){assert.ok(fs.existsSync('bubble-tanks/bosses.js'),'four distinct bosses exist');return require('../bubble-tanks/bosses.js');}
test('four bosses have separate mechanics, attack warnings and phase thresholds',()=>{
 const B=bosses();assert.equal(B.definitions.length,4);assert.equal(new Set(B.definitions.map(b=>b.mechanic)).size,4);
 for(let zone=0;zone<4;zone++) {
  const b=B.create(zone,'b'+zone),room={enemies:[b],effects:[],shots:[]},state={player:{x:520,y:430},nextId:0};
  const api={effect:(_r,k,x,y,o)=>room.effects.push({kind:k,x,y,...o}),shot:(_s,_r,x,y,a,o)=>room.shots.push({x,y,a,...o})};
  for(let i=0;i<100;i++) B.update(state,room,b,.04,api);
  assert.ok(room.effects.some(f=>f.kind==='aim'||f.kind==='hazard'),'telegraph precedes attack');assert.ok(room.shots.length>0);
  b.hp=b.maxHp*.4;B.update(state,room,b,.04,api);assert.equal(b.stage,2);assert.ok(b.phaseEvents>=1);
 }
});
test('ring guard takes substantially more damage through its visible gap',()=>{
 const B=bosses(),b=B.create(0,'ring');b.guardAngle=0;const room={enemies:[b]};
 assert.equal(B.damageMultiplier(b,room,{x:b.x+100,y:b.y}),1);
 assert.ok(B.damageMultiplier(b,room,{x:b.x-100,y:b.y})<.2);
 assert.equal(B.damageMultiplier(b,room,{unblockable:true}),1);
});
test('hive has finite rewardless nodes that protect the mother until destroyed',()=>{
 const B=bosses(),b=B.create(1,'hive'),room={enemies:[b],effects:[],shots:[]},state={player:{x:200,y:300},nextId:0};
 const api={effect(){},shot(){}};B.update(state,room,b,.04,api);const nodes=room.enemies.filter(e=>e.parent===b.id);
 assert.equal(nodes.length,3);assert.ok(nodes.every(e=>e.rewardless));assert.ok(B.damageMultiplier(b,room,{})<1);
 for(const node of nodes)node.hp=0;assert.equal(B.damageMultiplier(b,room,{}),1);
 for(let i=0;i<100;i++)B.update(state,room,b,.04,api);assert.equal(room.enemies.filter(e=>e.parent===b.id).length,3);
});
test('phase weaver warns and locks a target before jumping, leaving a bounded danger field',()=>{
 const B=bosses(),b=B.create(2,'weaver'),room={enemies:[b],effects:[],shots:[]},state={player:{x:250,y:400},nextId:0};
 const api={effect:(_r,k,x,y,o)=>room.effects.push({kind:k,x,y,...o}),shot(){}};b.cooldown=0;
 B.update(state,room,b,.04,api);assert.ok(b.warning>0);const x=b.x;state.player.x=300;
 for(let i=0;i<30;i++)B.update(state,room,b,.04,api);assert.notEqual(b.x,x);assert.equal(b.x,250);
 assert.ok(room.effects.some(e=>e.kind==='hazard'&&e.danger&&e.ttl<=2.5));
});
test('final aggregate changes fire patterns and creates only one bounded detached-core wave',()=>{
 const B=bosses(),b=B.create(3,'final'),room={enemies:[b],effects:[],shots:[]},state={player:{x:520,y:500},nextId:0};
 const api={effect(){},shot:(_s,_r,x,y,a,o)=>room.shots.push(o)};
 B.update(state,room,b,.04,api);assert.equal(room.enemies.length,1);b.hp=b.maxHp*.4;B.update(state,room,b,.04,api);
 assert.equal(room.enemies.filter(e=>e.kind==='core').length,3);for(let i=0;i<500;i++)B.update(state,room,b,.04,api);
 assert.equal(room.enemies.length,4);assert.ok(room.shots.some(e=>e.pattern==='aggregate'));
});
