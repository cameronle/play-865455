"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules");
test("interceptors warn and follow a fixed side-entry route rather than chase later movement",()=>{
 const g=new Game();g.start();const e=g.spawn("interceptor",80,{lane:-1});g.updateEnemy(e,.01);
 assert.equal(e.phase,"aim");assert.ok(e.warning>=.9);const target={...e.target},x=e.x;
 g.player.x=420;g.player.y=300;for(let i=0;i<150;i++)g.updateEnemy(e,.01);
 assert.deepEqual(e.target,target);assert.ok(e.x>x+20);assert.equal(e.phase,"cross");
});
test("mines are real bounded fixed circular hazards, expire, and are not erased by pulse",()=>{
 const g=new Game();g.start();const e=g.spawn("minelayer",240);e.y=90;e.cooldown=0;g.updateEnemy(e,.01);
 assert.equal(g.hazards[0]?.kind,"mine");const h=g.hazards[0],point={x:h.x,y:h.y};g.player.x=430;g.updateHazards(.5);assert.deepEqual({x:h.x,y:h.y},point);
 g.pulse();assert.ok(g.hazards.includes(h));g.updateHazards(1);g.player.x=h.x;g.player.y=h.y;g.player.invuln=0;g.collisions();assert.equal(g.stats.hits,1);
 for(let i=0;i<50;i++)g.updateHazards(.1);assert.equal(g.hazards.length,0);
});
test("support protects at most two nearby ordinary allies and destruction immediately exposes them",()=>{
 const g=new Game();g.start();const s=g.spawn("support",240);s.y=140;
 const a=g.spawn("scout",220),b=g.spawn("formation",250),c=g.spawn("scout",300);for(const e of [a,b,c])e.y=220;
 g.updateEnemy(s,.01);assert.equal([a,b,c].filter(e=>e.supportedBy===s.id).length,2);
 assert.equal(g.hitEnemy(a),false);g.kill(s);assert.equal(g.hitEnemy(a),true);assert.equal(a.hp,1);
});
test("a marked escaped enemy schedules only one bounded challenge pursuit, never an unannounced life loss",()=>{
 const g=new Game({mode:"challenge"});g.start();g.level=4;g.spawn("bomber",240,{key:true,y:800});g.step(.01);
 assert.equal(g.lives,3);assert.equal(g.chaseUsed,true);assert.equal(g.stats.summoned,2);
 g.spawn("minelayer",240,{key:true,y:800});g.step(.01);assert.equal(g.stats.summoned,2);
});
