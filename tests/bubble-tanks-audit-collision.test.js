'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../bubble-tanks/combat'),W=require('../bubble-tanks/world');
function scene(){const s=C.create('sweep');C.start(s);const r=W.current(s.world);r.drops=[];s.player.loadout=[];s.player.invulnerable=0;return{s,r};}
const enemy=(id,x,y=200)=>({id,kind:'grazer',x,y,r:7,hp:20,maxHp:20,cooldown:10,angle:0,phase:0,slow:0,hit:0});
test('fast projectile resolves the first swept target, not array order or final position',()=>{const {s,r}=scene();const near=enemy('near',230),far=enemy('far',255);r.enemies=[far,near];C.spawnShot(s,r,200,200,0,{speed:4800,damage:5,r:2});C.step(s,{},1/60);assert.equal(near.hp,15);assert.equal(far.hp,20);});
test('piercing projectile sweeps multiple targets exactly once',()=>{const {s,r}=scene();r.enemies=[enemy('far',255),enemy('near',230)];C.spawnShot(s,r,200,200,0,{speed:4800,damage:5,r:2,pierce:2});C.step(s,{},1/60);assert.deepEqual(r.enemies.map(e=>e.hp),[15,15]);assert.equal(r.shots.length,0);});
test('fast enemy projectile cannot tunnel through the player',()=>{const {s,r}=scene();const mass=s.player.mass;C.spawnShot(s,r,360,400,0,{owner:'enemy',speed:4800,damage:4,r:2});C.step(s,{},1/60);assert.ok(s.player.mass<mass);});
test('swept broad phase never hits a nearby nonintersecting target',()=>{const {s,r}=scene();r.enemies=[enemy('miss',230,220)];C.spawnShot(s,r,200,200,0,{speed:4800,damage:5,r:2});C.step(s,{},1/60);assert.equal(r.enemies[0].hp,20);});
