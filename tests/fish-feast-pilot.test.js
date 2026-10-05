'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fish-feast/content.js'),S=require('../fish-feast/simulation.js'),R=require('../fish-feast/rules.js'),P=require('../scripts/fish-pilot.js');
test('revenge controller follows the required fish instead of farming nearer irrelevant meals',()=>{
 const s=S.create(1723,340,92);S.start(s,11);s.player.growth=61;R.grow(s.player);s.player.x=200;s.player.y=180;
 s.fish=[{...C.species.fry,type:'fry',x:230,y:180,warning:0,dead:false},{...C.species.leviathan,type:'leviathan',x:1550,y:180,warning:0,dead:false}];s.caught.skipper=4;
 const before=JSON.stringify(s),c=P.decide(s);assert.equal(JSON.stringify(s),before);assert.equal(c.target.x,1550);
});
