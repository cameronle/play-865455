"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../shooter/content"),{Game}=require("../shooter/rules");
test("planned roster and repeated queue deferrals are counted separately without duplicate admissions",()=>{
 const g=new Game();g.start();assert.equal(g.stats.planned,C.STAGES.flatMap(s=>s.waves).flatMap(w=>w.groups).reduce((n,q)=>n+q.count,0));
 for(let i=0;i<18;i++)g.spawn("scout",60,{y:200});g.director(.01);const queued=g.stats.queued;assert.ok(queued>0);g.director(.1);assert.equal(g.stats.queued,queued);assert.equal(g.stats.admitted,0);
 g.enemies=[];g.director(.01);assert.equal(g.stats.admitted,C.STAGES[0].waves[0].groups[0].count);
});
test("single aircraft starts immediately outside its real silhouette rather than padding an empty admission",()=>{
 const g=new Game();g.start();g.spawnGroup({type:"bomber",count:1,x:240});assert.equal(g.enemies[0].y+g.enemies[0].h/2,0);
});
test("summoning into dead occupied slots waits instead of claiming invisible admissions",()=>{
 const g=new Game();g.start();g.enterBoss("swarm");g.phase="boss";g.boss.y=110;g.boss.cooldown=0;for(let i=0;i<18;i++)g.spawn("scout",60,{dead:true});
 for(let i=0;i<120;i++)g.updateBoss(.01);assert.equal(g.stats.summoned,0);g.enemies=[];g.updateBoss(.01);assert.equal(g.stats.summoned,2);assert.equal(g.enemies.length,2);
});
