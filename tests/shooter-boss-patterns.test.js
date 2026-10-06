"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../shooter/content"),{Game}=require("../shooter/rules");
function ready(type,mode="normal") {const g=new Game({mode});g.start();g.level=C.STAGES.find(s=>s.boss===type).id;g.enterBoss(type);g.phase="boss";g.boss.y=110;return g;}
test("Spear locks a bounded dive route, has a recovery window and never chases the changed target",()=>{
 const g=ready("spear");g.boss.cooldown=0;g.updateBoss(.01);assert.equal(g.boss.attack.kind,"dash");
 const target={...g.boss.attack.target};assert.ok(target.y<=570);assert.ok(target.y>=550,"a dive must reach the normal lower flight lane while preserving an edge escape");g.player.x=450;g.player.y=620;
 for(let i=0,n=Math.ceil((g.boss.attack.timer+.02)/.01);i<n;i++)g.updateBoss(.01);
 assert.ok(g.boss.dash);assert.deepEqual(g.boss.dash.target,target);
 const phases=new Set();
 for(let i=0;i<600;i++){g.updateBoss(.01);if(g.boss.dash)phases.add(g.boss.dash.phase);assert.ok(g.boss.x>=g.boss.w/2&&g.boss.x<=C.W-g.boss.w/2);assert.ok(g.boss.y+g.boss.h/2<C.H);}
 assert.ok(phases.has("recover"));assert.ok(phases.has("return"));
 assert.ok(g.events.some(e=>e.type==="boss-recovery"));
});
test("Fortress and Blockade mark fixed bomb regions with reachable escape, live damage and bounded expiry",()=>{
 for(const type of ["fortress","blockade"]){
  const g=ready(type);g.boss.cooldown=0;g.updateBoss(.01);
  assert.ok(g.hazards.length>0);assert.ok(g.hazards.every(h=>h.kind==="bomb"&&!h.active&&h.warning>=1.3));
  const h=g.hazards[0],target={x:h.x,y:h.y},safeY=Math.max(22,h.y-h.radius-22-10);
  assert.ok(Math.abs(g.player.y-safeY)<g.player.speed*(h.warning-.25));
  g.player.x=430;g.player.y=480;g.updateBoss(.3);assert.deepEqual({x:h.x,y:h.y},target);
  g.player.x=h.x;g.player.y=h.y;g.player.invuln=0;g.updateHazards(1.5);g.collisions();assert.equal(g.stats.hits,1);
  g.updateHazards(2);assert.equal(g.hazards.length,0);
  if(type==="blockade")assert.ok(g.events.some(e=>e.type==="boss-attack"&&e.value==="bombLanes"));
 }
});
test("Hunter fires a narrow locked burst and Iron variants use alternating gaps with a delayed second volley",()=>{
 const g=ready("hunter");g.boss.pattern=1;g.boss.cooldown=0;g.updateBoss(.01);assert.equal(g.boss.attack.kind,"burst");const target={...g.boss.attack.target};g.player.x=450;
 for(let i=0;i<100;i++)g.updateBoss(.01);
 assert.equal(g.enemyBullets.length,3);assert.ok(g.enemyBullets.every(b=>b.vy>0));assert.deepEqual(target,{x:240,y:592});
 const iron=ready("iron-mk2");iron.boss.cooldown=0;iron.updateBoss(.01);
 for(let i=0;i<100;i++)iron.updateBoss(.01);
 assert.equal(iron.enemyBullets.length,6);assert.ok(iron.boss.followup);
 const first=iron.enemyBullets.map(b=>b.vx);for(let i=0;i<60;i++)iron.updateBoss(.01);
 assert.equal(iron.enemyBullets.length,12);assert.notDeepEqual(first,iron.enemyBullets.slice(6).map(b=>b.vx));
 const wing=ready("iron-wing");wing.hitBoss(wing.boss.maxHp*.6);wing.updateBoss(.01);wing.boss.cooldown=0;wing.updateBoss(.01);assert.equal(wing.boss.attack.kind,"gap");
});
test("Swarm variants summon bounded genuine formations/divers rather than recolored scouts and keep the hull vulnerable",()=>{
 for(const [type,mode,enemy] of [["swarm","normal","scout"],["swarm","challenge","formation"],["swarm-carrier","normal","formation"],["swarm-carrier","challenge","diver"]]){
  const g=ready(type,mode);g.boss.cooldown=0;
  for(let i=0;i<101;i++)g.updateBoss(.01);
  assert.equal(g.enemies.length,2);assert.ok(g.enemies.some(e=>e.type===enemy));assert.ok(g.enemies.every(e=>e.summoned));
  if(enemy==="formation")assert.ok(g.enemies.some(e=>e.leader&&e.groupId));
  const hp=g.boss.hp;assert.equal(g.hitBoss(),true);assert.equal(g.boss.hp,hp-1);
  for(let i=0;i<2000;i++)g.updateBoss(.02);assert.ok(g.enemies.length<=4);
 }
});
test("Armored Twins alternate attackable parts without a sealed deadlock; Aurora loses its real beam source when destroyed",()=>{
 const B=require("../shooter/bosses"),g=ready("twin-armored");
 assert.equal(g.hitBoss(1,"right"),false);assert.equal(g.hitBoss(1,"left"),true);
 g.boss.age=4.6;assert.equal(g.hitBoss(1,"left"),false);assert.equal(g.hitBoss(1,"right"),true);
 g.boss.age=0;g.hitBoss(999,"left");assert.equal(B.partOpen(g.boss,g.boss.turrets[1]),true);assert.equal(g.hitBoss(999,"right"),true);assert.equal(B.protectedCore(g.boss),false);
 const a=ready("aurora");for(let i=0;i<140;i++)a.updateBoss(.01);
 const dead=a.boss.turrets[0].id;assert.ok(a.hazards.some(h=>h.source===dead&&h.kind==="laser"));a.hitBoss(999,"left");assert.equal(a.hazards.filter(h=>h.source===dead).length,0);
 const sources=new Set();for(let i=0;i<1000;i++){a.updateHazards(.02);a.updateBoss(.02);for(const h of a.hazards)sources.add(h.source);assert.ok(a.hazards.filter(h=>h.kind==="laser").length<=1);}
 assert.ok(!sources.has(dead));assert.ok(sources.has(a.boss.turrets[1].id));
});
test("Skybreaker cannot skip its real second-stage parts, then switches to a third-stage combined sequence",()=>{
 const B=require("../shooter/bosses");
 for(const mode of ["normal","challenge"]){
  const g=ready("skybreaker",mode),max=g.boss.maxHp;
  assert.equal(g.hitBoss(999,"left"),false);assert.equal(g.hitBoss(999),true);
  assert.ok(g.boss,"phase boundary must not clear the boss");assert.equal(g.boss.phase,2);assert.ok(g.boss.hp>=max*.65);assert.ok(B.protectedCore(g.boss));
  const hp=g.boss.hp;assert.equal(g.hitBoss(999),false);g.pulse();assert.equal(g.boss.hp,hp);assert.equal(g.boss.phase,2);
  g.hitBoss(999,"left");g.hitBoss(999,"right");assert.equal(g.boss.phase,3);assert.equal(B.protectedCore(g.boss),false);
  g.boss.cooldown=0;g.updateBoss(.01);assert.equal(g.boss.attack.kind,"laser");
  assert.deepEqual(g.events.filter(e=>e.type==="boss-phase").map(e=>e.value),[2,3]);
  g.hitBoss(999);assert.equal(g.state,"clear");assert.equal(g.stats.bosses.at(-1),"skybreaker");
 }
 const g=ready("blockade");g.hitBoss(g.boss.maxHp*.6);g.updateBoss(.01);assert.equal(g.boss.phase,2);
});
module.exports={ready};
