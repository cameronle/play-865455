'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fish-feast/content.js'),S=require('../fish-feast/simulation.js'),B=require('../fish-feast/behaviors.js'),R=require('../fish-feast/rules.js');
function water(){const s=S.create(760,1080,92);s.mode='playing';s.player.x=100;s.player.y=400;s.player.invulnerable=0;s.foodTimer=s.spawnTimer=s.objectiveTimer=1000;return s;}
test('a long drag cannot relocate through multiple prey in one physics step',()=>{
 const s=water();s.fish=[240,350,460,570].map((x,i)=>{const f={...C.species.sprat,type:'sprat',id:i+1,x,y:400,vx:53,vy:0,age:0,phase:0,warning:0,dead:false};B.initialize(s,f);return f;});
 S.step(s,{drag:[{x:550,y:0}]});
 assert.ok(s.player.x-100<=260*C.step+1e-8,'ordinary dragging must obey a continuous swimming cap');
 assert.equal(s.eaten,0,'untravelled cursor paths must not harvest fish');
});
test('a held long stroke advances over each physics tick, not only its first tick',()=>{
 const s=water();S.advance(s,1/60,{drag:[{x:550,y:0}]});assert.ok(Math.abs(s.player.x-100-C.dragSpeed/60)<1e-8);
 for(let i=0;i<29;i++)S.advance(s,1/60,{drag:[]});assert.ok(Math.abs(s.player.x-100-C.dragSpeed*.5)<1e-8,'holding a long stroke must continue bounded swimming');
 const before=s.player.x;S.advance(s,1/60,{drag:[{x:-.5,y:0}]});assert.ok(Math.abs(s.player.x-before+.5)<1e-8,'a fresh reverse must discard unreachable old debt');
 S.advance(s,.1,{drag:[]});assert.ok(Math.abs(s.player.x-before+.5)<1e-8,'completed micro adjustment must not drift');
});
test('a reversed coalesced fast stroke follows its latest direction instead of replaying the old leg',()=>{
 const s=water();S.advance(s,1/60,{drag:[{x:550,y:0},{x:-5,y:0}]});assert.ok(s.player.x<100,'latest reverse must respond on the first physical frame');
});
test('dash is the only fast tier and never stacks ordinary drag on its 480 speed',()=>{
 const s=water();S.dash(s);S.advance(s,.1,{drag:[{x:550,y:0}]});assert.ok(Math.abs(s.player.x-100-48)<1e-8);assert.ok(Math.abs(s.player.vx-480)<1e-8);
});
test('dash consumes actual travelled intent instead of leaving extra target debt',()=>{
 const s=water();S.dash(s);S.advance(s,.1,{drag:[{x:55,y:0}]});const remaining=s.pendingDrag.reduce((n,d)=>n+Math.hypot(d.x,d.y),0);assert.ok(Math.abs(remaining-7)<1e-8);
});
test('a dash pinned against a wall still detects an overlapping dangerous fish',()=>{
 const s=water();s.player.x=s.width-R.geometry(s.player).rx;s.fish=[{...C.species.hunter,type:'hunter',id:1,x:s.width-C.sizes[3],y:400,vx:37,vy:0,age:0,phase:0,warning:0}];B.initialize(s,s.fish[0]);R.bound(s.fish[0],s.width,s.height);S.dash(s);S.step(s,{drag:[{x:50,y:0}]});assert.equal(s.hits,1,'heading-only input must not create a zero-length swept path');
});
test('damage respawn clears the untravelled stroke',()=>{
 const s=water();s.fish=[{...C.species.hunter,type:'hunter',id:1,x:210,y:400,vx:37,vy:0,age:0,phase:0,warning:0}];B.initialize(s,s.fish[0]);
 S.advance(s,.25,{drag:[{x:550,y:0}]});assert.equal(s.hits,1);const safe={x:s.player.x,y:s.player.y};S.advance(s,.1,{drag:[]});assert.deepEqual({x:s.player.x,y:s.player.y},safe,'old stroke must not propel a respawn');
});
test('continuous speed and slow exact distance are independent of 30/60/120/240 Hz sampling',()=>{
 for(const fps of [30,60,120,240]){const fast=water(),slow=water();
  for(let i=0;i<fps/2;i++){S.advance(fast,1/fps,{drag:[{x:100,y:0}]});const input={drag:[{x:40/fps,y:0}]},before=JSON.stringify(input);S.advance(slow,1/fps,input);assert.equal(JSON.stringify(input),before);}
  assert.ok(Math.abs(fast.player.x-100-130)<1e-8);assert.ok(Math.abs(slow.player.x-120)<1e-8);
 }
});
