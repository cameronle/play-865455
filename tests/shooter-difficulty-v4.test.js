"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules");
test("challenge chapter supply is a once-only choice, not automatic healing and ammunition",()=>{
 const g=new Game({mode:"challenge"});g.start();g.level=3;g.lives=1;g.pulses=0;g.finishStage();
 assert.equal(g.lives,1);assert.equal(g.pulses,0);assert.equal(g.supplyPending,true);assert.equal(g.nextStage(),false);
 assert.equal(g.chooseSupply("life"),true);assert.equal(g.lives,2);assert.equal(g.pulses,0);assert.equal(g.chooseSupply("pulse"),false);assert.equal(g.nextStage(),true);
});
test("final clear does not restore resources and records the true battle-ending snapshot",()=>{
 const g=new Game();g.start();g.level=15;g.lives=1;g.pulses=0;g.finishStage();
 assert.equal(g.state,"clear");assert.equal(g.lives,1);assert.equal(g.pulses,0);assert.equal(g.stats.stageResources.at(-1).battle.lives,1);
});
test("shield supply is authored and chapter-bounded rather than automatically every twelve kills",()=>{
 const g=new Game();g.start();for(let i=0;i<30;i++){g.kill(g.spawn("scout",240));g.enemies=g.enemies.filter(e=>!e.dead);}assert.equal(g.powerups.filter(q=>q.kind==="shield").length,0);
 const e=g.spawn("formation",380,{leader:true,supply:true});g.kill(e);assert.equal(g.powerups.filter(q=>q.kind==="shield").length,1);
 g.kill(g.spawn("formation",100,{leader:true,supply:true}));assert.equal(g.powerups.filter(q=>q.kind==="shield").length,1);
});
