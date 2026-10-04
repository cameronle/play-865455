'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../bubble-tanks/combat'),W=require('../bubble-tanks/world'),S=require('../bubble-tanks/storage');
const source=()=>{const s=C.create('malformed-boundary');C.start(s);C.spawnShot(s,W.current(s.world),400,400,0);return JSON.parse(S.serialize(s));};
for(const [name,alter]of Object.entries({
 'null module':s=>s.player.loadout[0]=null,'null room':s=>s.world.rooms['0,0']=null,
 'array passives':s=>s.player.passives=[],'null cooldowns':s=>s.cooldowns=null,
 'non-numeric cooldown':s=>s.cooldowns={0:'stalled'},'missing hit ids':s=>delete s.world.rooms['0,0'].shots[0].hitIds,
 'invalid hit ids':s=>s.world.rooms['0,0'].shots[0].hitIds={},'bad zone':s=>s.world.rooms['0,0'].zone='bad',
 'invalid shop stock':s=>s.world.rooms['0,0'].stock={},'invalid bought claims':s=>s.world.rooms['0,0'].bought={},
 'half specified mount':s=>s.player.loadout[0].y='bad','fractional pending':s=>s.pending=.5
}))test('save validation rejects '+name+' without throwing or modifying input',()=>{const s=source();alter(s);const raw=JSON.stringify(s);let result;assert.doesNotThrow(()=>result=S.restore(raw));assert.ok(result.error,name);assert.equal(result.state,null);});
test('valid late-room weapon states restore and execute, including terminal records',()=>{for(const weapon of ['pulse','mine','orbit','vortex','missile']){const s=C.create('roundtrip-'+weapon);C.start(s);s.player.mass=285;s.world.position={x:1,y:0};const room=W.current(s.world);C.fireWeapon(s,room,{id:weapon,cost:1,level:1,slot:0,angle:0},room.enemies[0]);const r=S.restore(S.serialize(s));assert.equal(r.error,null,weapon);C.resume(r.state);assert.doesNotThrow(()=>C.step(r.state,{},1/60));assert.ok(Number.isFinite(r.state.player.mass));}});
