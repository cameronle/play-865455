'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../bubble-tanks/combat.js'),W=require('../bubble-tanks/world.js'),A=require('../bubble-tanks/adventure.js');
function storage(){assert.ok(fs.existsSync('bubble-tanks/storage.js'),'versioned persistence exists');return require('../bubble-tanks/storage.js');}
function memory(){const data=new Map();return{data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('save/restore detaches the room graph, resumes RNG exactly, and retains unique reward claims',()=>{
 const S=storage(),s=C.create('saved');C.start(s);s.rng();s.rng();s.salvage=9;s.world.position={x:1,y:0};const room=W.current(s.world);room.enemies[0].hp=0;room.claims.test=true;
 const raw=S.serialize(s),expected=s.rng(),restored=S.restore(raw);assert.equal(restored.error,null);const r=restored.state;
 assert.equal(r.mode,'paused');assert.equal(r.salvage,9);assert.equal(r.rng(),expected);assert.equal(W.current(r.world).enemies[0].hp,0);assert.equal(W.current(r.world).claims.test,true);
 W.current(r.world).enemies[1].hp=0;assert.ok(room.enemies[1].hp>0,'restored graph is detached');
});
test('upgrade cards survive reload without reroll; incomplete assembly is cancelled',()=>{
 const S=storage(),s=C.create('cards');C.start(s);s.player.mass=65;s.player.growth=13;C.step(s,{},.01);assert.equal(s.mode,'upgrade');
 const r=S.restore(S.serialize(s)).state;assert.equal(r.mode,'upgrade');assert.deepEqual(r.offers.map(x=>x.id),s.offers.map(x=>x.id));
 C.choose(s,s.offers[0].id);s.mode='running';A.open(s,'assembly');A.edit(s,{type:'move',slot:0,x:22,y:1});
 const restored=S.restore(S.serialize(s)).state;assert.equal(restored.mode,'paused');assert.equal(restored.draft,undefined);assert.equal(restored.player.loadout[0].x,undefined);
});
test('malformed, oversized and unknown-version saves are rejected without deleting data',()=>{
 const S=storage(),m=memory(),store=S.create(m);m.setItem(S.SAVE_KEY,'bad json');const r=store.load();assert.ok(r.error);assert.equal(m.getItem(S.SAVE_KEY),'bad json');
 for(const value of ['{',JSON.stringify({version:1}),JSON.stringify({version:99}),JSON.stringify({version:2}), ' '.repeat(2000001)])assert.ok(S.restore(value).error);
 const s=C.create('bad'),raw=JSON.parse(S.serialize(s));raw.player.mass=null;assert.ok(S.restore(JSON.stringify(raw)).error);
 const proto=JSON.parse(S.serialize(s));proto.player.passives.constructor=1;assert.ok(S.restore(JSON.stringify(proto)).error);
});
test('failed localStorage produces an explicit warning without breaking gameplay',()=>{
 const S=storage(),store=S.create({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}}),s=C.create('quota');
 assert.ok(store.load().error);assert.equal(store.save(s).ok,false);assert.ok(store.status());assert.equal(s.mode,'title');
});
test('terminal expeditions count once across reload; best score and discoveries are local, not stat buffs',()=>{
 const S=storage(),m=memory(),store=S.create(m),s=C.create('one-run');s.mode='won';s.score=999;s.world.bosses=4;
 assert.equal(store.finish(s).ok,true);assert.equal(store.finish(s).ok,true);let stats=store.records();assert.equal(stats.runs,1);assert.equal(stats.wins,1);assert.equal(stats.best,999);
 const resumed=S.restore(S.serialize(s)).state;store.finish(resumed);stats=store.records();assert.equal(stats.runs,1);assert.ok(stats.chassis.includes('balanced'));
 assert.equal(C.create('new').player.mass,22,'no permanent attack or mass buff');
});
