'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function element(){const handlers={};return{handlers,addEventListener(type,fn){handlers[type]=fn},getBoundingClientRect(){return{left:0,top:0,width:380,height:260}},setPointerCapture(){},releasePointerCapture(){},disabled:false};}
function event(id,x=0,y=0,type='touch'){return{pointerId:id,clientX:x,clientY:y,pointerType:type,preventDefault(){},target:{tagName:'CANVAS'}};}
test('relative drag does not teleport, ignores foreign release and coexists with a separate dash finger',()=>{
 assert.ok(fs.existsSync('fish-feast/input.js'),'Native input controller is not implemented');const I=require('../fish-feast/input.js'),canvas=element(),dash=element(),keys=element();let hits=0;
 const input=I.create(canvas,dash,{root:keys,active:()=>true,player:()=>({x:200,y:180}),world:()=>({width:760,height:520}),dash:()=>hits++});
 canvas.handlers.pointerdown(event(1,40,50));assert.deepEqual(input.sample().drag,[]);canvas.handlers.pointermove(event(1,70,80));assert.deepEqual(input.sample().drag,[{x:60,y:60}]);
 dash.handlers.pointerdown(event(2));assert.equal(hits,1);dash.handlers.pointerup(event(2));assert.equal(input.snapshot().moveOwner,1);
 canvas.handlers.pointerup(event(99));assert.equal(input.snapshot().moveOwner,1);canvas.handlers.pointercancel(event(1));assert.equal(input.sample().target,null);
 keys.handlers.keydown({code:'KeyD',repeat:false,target:{tagName:'CANVAS'},preventDefault(){}});assert.equal(input.sample().x,1);input.clear();assert.equal(input.sample().x,0);assert.equal(input.snapshot().moveOwner,null);
});
