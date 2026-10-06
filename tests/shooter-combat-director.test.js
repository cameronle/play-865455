"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules"),C=require("../shooter/content");
test("wave admission waits for capacity instead of losing scheduled groups",()=>{
 const g=new Game();g.start();for(let i=0;i<C.LIMITS.enemies;i++)g.spawn("scout",40);
 g.director(.01);assert.equal(g.group,0);assert.equal(g.stats.admitted,0);
 g.enemies=[];g.director(.01);assert.equal(g.group,1);assert.equal(g.stats.admitted,C.STAGES[0].waves[0].groups[0].count);
});
test("a normal wave preserves in-flight danger but boss warning safely clears it",()=>{
 const g=new Game();g.start();const w=C.STAGES[0].waves[0];g.group=w.groups.length;g.waveTime=100;
 g.emit(30,100,0,130,1);g.director(.01);assert.equal(g.wave,1);assert.equal(g.enemyBullets.length,1);
 g.wave=C.STAGES[0].waves.length-1;g.group=C.STAGES[0].waves[g.wave].groups.length;g.waveTime=100;
 g.director(.01);assert.equal(g.phase,"boss-warning");assert.equal(g.enemyBullets.length,0);
});
test("hazard admission rejects a full-width beam with no reachable escape and accepts a marked bomb",()=>{
 const g=new Game();g.start();assert.equal(g.addHazard({kind:"laser",x:240,y:324,w:480,beamW:480,beamX:240,warning:.9,ttl:2,duration:2,source:1}),null);
 assert.ok(g.addHazard({kind:"bomb",x:240,y:592,radius:46,w:92,h:92,warning:1.4,ttl:.5,source:2}));
});
