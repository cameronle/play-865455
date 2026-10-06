"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules"),D=require("../shooter/director");
test("each independent mine occupies its own global slot, even for one emitter",()=>{
 const g=new Game();g.start();for(const x of [100,400])assert.ok(g.addHazard({kind:"mine",x,y:400,radius:25,w:50,h:50,warning:1.4,ttl:3,source:7}));
 assert.equal(D.sources(g).size,2);assert.equal(g.reserveAttack(8,2),false);
});
test("elite diver emits a bounded separately warned cover volley, ordinary diver does not",()=>{
 for(const elite of [false,true]){const g=new Game();g.start();const e=g.spawn("diver",120,{y:140,age:2,cooldown:0,elite});g.updateEnemy(e,.01);assert.equal(e.phase,"aim");
  const lease=g.threats.find(t=>t.source===e.id);assert.equal(lease.specs.filter(h=>h.kind==="volley").length,elite?1:0);
  for(let i=0;i<190;i++)g.updateEnemy(e,.01);assert.equal(g.enemyBullets.length,elite?2:0);
 }
});
