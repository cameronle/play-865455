'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fish-feast/content.js'),R=require('../fish-feast/rules.js'),S=require('../fish-feast/simulation.js'),I=require('../fish-feast/input.js');
function element(){const handlers={};return{handlers,disabled:false,addEventListener(type,fn){handlers[type]=fn;},getBoundingClientRect(){return{left:0,top:0,width:380,height:540};},setPointerCapture(){},releasePointerCapture(){}};}
function pointer(id,x,y=120){return{pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,preventDefault(){}};}
function water(){const s=S.create(760,1080,92);s.mode='playing';s.foodTimer=s.spawnTimer=s.objectiveTimer=1000;return s;}
function controls(s){const canvas=element(),dash=element(),host=element(),input=I.create(canvas,dash,{root:host,active:()=>s.mode==='playing',player:()=>s.player,world:()=>s,dash:()=>S.dash(s)});return{canvas,dash,host,input};}
test('relative press does not jump and fast travel is bounded while micro reversal stays exact',()=>{
 const s=water(),{canvas,input}=controls(s),start=s.player.x;
 canvas.handlers.pointerdown(pointer(1,40));S.advance(s,1/60,input.sample());assert.equal(s.player.x,start);
 canvas.handlers.pointermove(pointer(1,140));S.advance(s,1/60,input.sample());assert.ok(Math.abs(s.player.x-start-C.dragSpeed/60)<1e-8);
 const before=s.player.x;canvas.handlers.pointermove(pointer(1,139.5));S.advance(s,1/60,input.sample());assert.ok(Math.abs(s.player.x-before+1)<1e-8);
 S.advance(s,1/60,input.sample());assert.equal(s.player.x,before-1);
});
test('continuous held travel hits an intervening dangerous fish instead of tunnelling',()=>{
 const s=water();s.player.x=200;s.player.y=400;s.player.invulnerable=0;
 s.fish=[{...C.species.hunter,type:'hunter',id:1,x:350,y:400,vx:37,vy:0,age:0,phase:0,warning:0}];
 S.advance(s,1/60,{drag:[{x:300,y:0}]});assert.equal(s.hits,0,'untravelled cursor geometry must not count as a hit');
 for(let i=0;i<60&&!s.hits;i++)S.advance(s,1/60,{drag:[]});assert.equal(s.hits,1);assert.equal(s.player.lives,2);
});
test('resize drops a drag waiting for its first physics step',()=>{
 const s=water(),x=s.player.x;S.advance(s,C.step/2,{drag:[{x:40,y:0}]});assert.equal(s.player.x,x);
 S.resize(s,760,1080);S.advance(s,C.step,{drag:[]});assert.equal(s.player.x,x);
});
test('slow distance is conserved at 30, 60, 120 and 240 Hz without replaying a command',()=>{
 for(const fps of [30,60,120,240]){const s=water(),{canvas,input}=controls(s),x=s.player.x;canvas.handlers.pointerdown(pointer(1,20));
  for(let i=1;i<=fps/2;i++){canvas.handlers.pointermove(pointer(1,20+40*i/fps));const command=input.sample(),before=JSON.stringify(command);S.advance(s,1/fps,command);assert.equal(JSON.stringify(command),before);}
  assert.ok(Math.abs(s.player.x-x-40)<1e-8);const settled=s.player.x;S.advance(s,1/30,input.sample());assert.equal(s.player.x,settled);
 }
});
test('coalesced fast reversal follows the latest leg without hitting an untravelled outward path',()=>{
 const s=water(),{canvas,input}=controls(s);s.player.x=200;s.player.y=400;s.player.invulnerable=0;
 s.fish=[{...C.species.hunter,type:'hunter',id:1,x:350,y:400,vx:37,vy:0,age:0,phase:0,warning:0}];
 canvas.handlers.pointerdown(pointer(1,100,200));const move=pointer(1,100,200);move.getCoalescedEvents=()=>[pointer(1,210,200),pointer(1,100,200)];canvas.handlers.pointermove(move);
 const command=input.sample();assert.equal(command.drag.length,2);S.advance(s,1/60,command);assert.equal(s.hits,0);assert.ok(s.player.x<200);
});
test('actual bent swimming does not collide with an enemy lying only on the endpoint chord',()=>{
 const s=water();s.player.x=200;s.player.y=300;s.player.invulnerable=0;
 s.fish=[{...C.species.hunter,type:'hunter',id:1,x:350,y:400,vx:37,vy:0,age:0,phase:0,warning:0}];
 S.advance(s,.25,{drag:[{x:0,y:200}]});for(let i=0;i<3;i++)S.advance(s,.25,{drag:[]});assert.ok(Math.abs(s.player.y-500)<1e-8);
 S.advance(s,.25,{drag:[{x:300,y:0}]});for(let i=0;i<4;i++)S.advance(s,.25,{drag:[]});
 assert.equal(s.hits,0);assert.ok(Math.abs(s.player.x-500)<1e-8);assert.ok(Math.abs(s.player.y-500)<1e-8);
});
test('continuous swimming eventually catches intervening prey exactly once',()=>{
 const s=water();s.player.x=200;s.player.y=400;s.fish=[{...C.species.fry,type:'fry',id:1,x:300,y:400,vx:45,vy:0,age:0,phase:0,warning:0}];
 S.advance(s,1/60,{drag:[{x:400,y:0}]});assert.equal(s.eaten,0);
 for(let i=0;i<120&&!s.eaten;i++)S.advance(s,1/60,{drag:[]});assert.equal(s.eaten,1);assert.equal(s.caught.fry,1);assert.ok(s.player.growth>0);
 S.advance(s,.25,{drag:[]});assert.equal(s.eaten,1);
});
test('release, pause and keyboard discard a delta queued before a physics tick',()=>{
 for(const lifecycle of ['release','pause','keyboard']){const s=water(),{canvas,host,input}=controls(s),x=s.player.x;canvas.handlers.pointerdown(pointer(1,40));canvas.handlers.pointermove(pointer(1,140));S.advance(s,C.step/2,input.sample());assert.equal(s.player.x,x);
  if(lifecycle==='release')canvas.handlers.pointerup(pointer(1,140));if(lifecycle==='pause'){input.clear();S.pause(s);S.resume(s);}if(lifecycle==='keyboard')host.handlers.keydown({code:'KeyW',target:{tagName:'CANVAS'},preventDefault(){}});
  S.advance(s,C.step,input.sample());assert.equal(s.player.x,x);
 }
});
test('independent dash retains its 480 speed without adding an outstanding drag',()=>{
 const s=water(),{canvas,dash,input}=controls(s);canvas.handlers.pointerdown(pointer(1,40));canvas.handlers.pointermove(pointer(1,60));S.advance(s,1/60,input.sample());const x=s.player.x;
 dash.handlers.pointerdown(pointer(2,0));S.advance(s,.1,input.sample());assert.ok(Math.abs(s.player.x-x-48)<1e-8);assert.equal(s.player.vx,480);assert.equal(s.player.headingX,1);assert.equal(input.snapshot().moveOwner,1);assert.ok(s.player.cooldown>0);
});
