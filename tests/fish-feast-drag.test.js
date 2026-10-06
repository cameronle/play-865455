'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fish-feast/content.js'),S=require('../fish-feast/simulation.js'),I=require('../fish-feast/input.js');
function element(){const handlers={};return{handlers,disabled:false,addEventListener(type,fn){handlers[type]=fn;},getBoundingClientRect(){return{left:0,top:0,width:380,height:540};},setPointerCapture(){},releasePointerCapture(){}};}
function pointer(id,x,y){return{pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,preventDefault(){}};}
function controls(s){const canvas=element(),dash=element(),host=element(),input=I.create(canvas,dash,{root:host,active:()=>s.mode==='playing',player:()=>s.player,world:()=>s,dash:()=>S.dash(s)});return{canvas,dash,host,input};}
function water(){const s=S.create(760,1080,92);s.mode='playing';s.foodTimer=s.spawnTimer=s.objectiveTimer=1000;return s;}
test('subpixel pointer targets move immediately and arrive exactly without a dead zone',()=>{
 const s=water(),target={x:s.player.x+.5,y:s.player.y+.4};
 S.step(s,{target});
 assert.ok(s.player.vx>0&&s.player.vy>0,'a small drag must move in the first physics step');
 assert.ok(Math.abs(s.player.x-target.x)<1e-9&&Math.abs(s.player.y-target.y)<1e-9,'nearby targets must not overshoot');
 const arrived={x:s.player.x,y:s.player.y};S.step(s,{target});
 assert.equal(s.player.x,arrived.x);assert.equal(s.player.y,arrived.y);assert.equal(s.player.vx,0);assert.equal(s.player.vy,0);
});
test('reversing a fast relative drag responds next frame instead of chasing an old target',()=>{
 const s=water(),{canvas,input}=controls(s);
 canvas.handlers.pointerdown(pointer(1,40,50));canvas.handlers.pointermove(pointer(1,140,50));
 S.advance(s,1/60,input.sample());const before=s.player.x;
 canvas.handlers.pointermove(pointer(1,135,50));const sample=input.sample();
 assert.ok(sample.target.x<before,'reverse input must discard the old forward target');
 S.advance(s,1/60,sample);assert.ok(s.player.x<before,'fish must move back immediately');
 assert.ok(Math.abs(s.player.vx)<=190,'normal drag keeps the existing swimming speed cap');
});
test('slow relative dragging moves on every input frame at portrait and landscape scales',()=>{
 for(const width of [760,1120]){
  const s=water();S.resize(s,width,540);const {canvas,input}=controls(s),x0=s.player.x;
  canvas.handlers.pointerdown(pointer(1,30,120));
  for(let frame=1;frame<=90;frame++){
   const before=s.player.x;canvas.handlers.pointermove(pointer(1,30+frame*.2,120));S.advance(s,1/60,input.sample());
   assert.ok(s.player.x>before,'small input must not alternate between stopped and moving frames');
   assert.ok(Math.abs(s.player.x-(x0+frame*.2*s.width/380))<1e-8);
  }
 }
});
test('multiple pointer events are batched once without lost subpixel motion or repeated consumption',()=>{
 const s=water(),{canvas,input}=controls(s),start=s.player.x;
 canvas.handlers.pointerdown(pointer(1,30,120));
 for(let i=1;i<=8;i++)canvas.handlers.pointermove(pointer(1,30+i*.1,120));
 const sample=input.sample();assert.ok(Math.abs(sample.target.x-start-1.6)<1e-9);
 S.advance(s,1/60,sample);assert.ok(Math.abs(s.player.x-start-1.6)<1e-9);
 const settled=s.player.x;S.advance(s,1/60,input.sample());assert.equal(s.player.x,settled);
});
test('normal target travel keeps the 190 speed cap and does not depend on frame cadence',()=>{
 for(const fps of [30,60,120]){
  const s=water(),start={x:s.player.x,y:s.player.y},target={x:start.x+200,y:start.y+200};
  for(let frame=0;frame<fps/2;frame++)S.advance(s,1/fps,{target});
  assert.ok(Math.abs(Math.hypot(s.player.x-start.x,s.player.y-start.y)-95)<1e-8);
  assert.ok(Math.abs(Math.hypot(s.player.vx,s.player.vy)-190)<1e-8);
 }
});
test('wall contact discards blocked drag debt on a fresh inward movement',()=>{
 const s=water(),{canvas,input}=controls(s);s.player.x=s.width-20;
 canvas.handlers.pointerdown(pointer(1,100,120));canvas.handlers.pointermove(pointer(1,300,120));
 S.advance(s,.1,input.sample());const edge=s.player.x;
 canvas.handlers.pointermove(pointer(1,299.5,120));S.advance(s,1/60,input.sample());
 assert.ok(s.player.x<edge,'tiny inward drag must leave the wall immediately');
});
test('releasing or canceling clears queued drag motion while foreign fingers cannot stop it',()=>{
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  const s=water(),{canvas,input}=controls(s),x=s.player.x;
  canvas.handlers.pointerdown(pointer(1,40,120));canvas.handlers.pointermove(pointer(1,140,120));
  canvas.handlers[type](pointer(2,140,120));assert.equal(input.snapshot().moveOwner,1);
  canvas.handlers[type](pointer(1,140,120));S.advance(s,1/60,input.sample());
  assert.equal(s.player.x,x);assert.equal(input.snapshot().moveOwner,null);assert.equal(input.sample().target,null);
 }
});
test('keyboard precedence discards concurrent drag deltas without a stale target or null dereference',()=>{
 const s=water(),{canvas,host,input}=controls(s);canvas.handlers.pointerdown(pointer(1,40,120));
 host.handlers.keydown({code:'KeyD',target:{tagName:'CANVAS'},preventDefault(){}});
 canvas.handlers.pointermove(pointer(1,140,120));S.advance(s,1/60,input.sample());
 host.handlers.keyup({code:'KeyD'});assert.equal(input.sample().target,null);
 const before=s.player.x;canvas.handlers.pointermove(pointer(1,139.5,120));S.advance(s,1/60,input.sample());assert.ok(s.player.x<before);
});
test('independent dash keeps its duration, cooldown and speed while movement release remains scoped',()=>{
 const s=water(),{canvas,dash,input}=controls(s);
 canvas.handlers.pointerdown(pointer(1,40,120));canvas.handlers.pointermove(pointer(1,140,120));S.advance(s,1/60,input.sample());
 dash.handlers.pointerdown(pointer(2,0,0));assert.equal(s.player.cooldown,C.dashCooldown);assert.equal(s.player.dashTime,C.dashDuration);
 S.step(s,input.sample());assert.ok(Math.abs(Math.hypot(s.player.vx,s.player.vy)-480)<1e-8);
 dash.handlers.pointerup(pointer(2,0,0));assert.equal(input.snapshot().moveOwner,1);assert.equal(input.snapshot().dashOwner,null);
 input.clear();assert.equal(input.sample().target,null);assert.equal(input.snapshot().moveOwner,null);
});
