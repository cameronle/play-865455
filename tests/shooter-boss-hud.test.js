"use strict";
const test=require("node:test"),assert=require("node:assert/strict"), {createShooter}=require("./helpers/shooter-runtime"),{Game}=require("../shooter/rules");
const C=require("../shooter/content");
test("multipart HUD exposes total progress and actual weak points through swept bullet hits",()=>{
 const a=createShooter();a.run('g.start();g.level=6;g.enterBoss("twin-core");g.phase="boss";g.boss.y=110;sync()');
 assert.equal(a.element("bossHealth").max,480);
 assert.match(a.element("bossDetails").textContent,/核心受保护/);
 assert.match(a.element("combatHint").textContent,/炮台/);
 a.run('g.bullets=[{x:g.boss.x-56,y:116,w:3,h:14}];g.collisions();sync()');
 assert.equal(a.element("bossHealth").value,479);
 assert.match(a.element("bossDetails").textContent,/109/);
 assert.ok(a.snapshot().boss.turrets[0].hitFlash>0);
 a.run('g.hitBoss(1);sync()');assert.equal(a.element("bossHealth").value,479);assert.ok(a.snapshot().boss.blockFlash>0);
 a.run('g.hitBoss(999,"left");g.hitBoss(999,"right");sync()');
 assert.match(a.element("bossDetails").textContent,/核心已暴露/);
 assert.equal(a.element("bossHealth").value,260);
 a.run('g.bullets=[{x:g.boss.x,y:110,w:3,h:14}];g.collisions();sync()');assert.equal(a.element("bossHealth").value,259);
});
test("final boss HUD distinguishes undeployed parts from the real protected second phase",()=>{
 const a=createShooter();a.run('g.start();g.level=15;g.enterBoss("skybreaker");g.phase="boss";g.boss.y=110;sync()');
 assert.match(a.element("bossDetails").textContent,/部件尚未部署/);
 assert.doesNotMatch(a.element("bossDetails").textContent,/左部件|右部件/);
 a.run('g.hitBoss(999);sync()');
 assert.match(a.element("bossDetails").textContent,/左部件 60.*右部件 60.*核心受保护/);
});
test("outpost mixes introductory fan and warned point-lock in normal mode",()=>{
 const g=new Game();g.start();g.enterBoss("outpost");g.phase="boss";g.boss.y=110;
 for(let i=0;i<200;i++)g.updateBoss(.1);
 assert.ok(g.events.some(e=>e.type==="boss-attack"&&e.value==="fan"));
 assert.ok(g.events.some(e=>e.type==="boss-attack"&&e.value==="aim"));
});
