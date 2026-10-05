'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fish-feast/content.js'),S=require('../fish-feast/simulation.js'),R=require('../fish-feast/rules.js'),P=require('../scripts/fish-pilot.js');
const B=require('../fish-feast/behaviors.js');
test('controller takes a collision-free detour when a jelly blocks the preferred meal',()=>{
 const s=S.create(760,1080,92);S.start(s,11);Object.assign(s.player,{x:290,y:500,growth:46,invulnerable:0});R.grow(s.player);s.caught.skipper=4;
 s.fish=[{...C.species.jelly,type:'jelly',id:1,x:400,y:500,vx:0,vy:0,warning:0,age:0,phase:0,dead:false},{...C.species.hunter,type:'hunter',id:2,x:650,y:500,vx:37,vy:0,warning:0,age:0,phase:0,dead:false}];
 for(const f of s.fish)B.initialize(s,f);
 const before=JSON.stringify(s),c=P.decide(s),end={...s.player,...c.target};
 assert.equal(JSON.stringify(s),before,'planning must not change the live game');
 assert.ok(Math.hypot(c.target.x-s.player.x,c.target.y-s.player.y)>20,'pilot must not park at the safe edge indefinitely');
 assert.ok(Math.abs(c.target.y-500)>60,'the route needs a vertical bypass, not a direct charge');
 assert.equal(R.swept(end,s.fish[0],s.player,s.fish[0]),false,'first detour leg crosses the jelly');
});
test('revenge controller follows the required fish instead of farming nearer irrelevant meals',()=>{
 const s=S.create(1723,340,92);S.start(s,11);s.player.growth=61;R.grow(s.player);s.player.x=200;s.player.y=180;
 s.fish=[{...C.species.fry,type:'fry',x:230,y:180,warning:0,dead:false},{...C.species.leviathan,type:'leviathan',x:1550,y:180,warning:0,dead:false}];s.caught.skipper=4;
 const before=JSON.stringify(s),c=P.decide(s);assert.equal(JSON.stringify(s),before);assert.equal(c.target.x,1550);
});
