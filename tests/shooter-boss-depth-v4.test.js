"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../shooter/content"),B=require("../shooter/bosses"),{Game}=require("../shooter/rules");
function ready(id,mode="normal"){const g=new Game({mode});g.start();g.level=id;g.enterBoss(C.STAGES[id-1].boss);g.phase="boss";g.boss.y=110;return g;}
for(const s of C.STAGES)test(`stage ${s.id} has a distinct tactical profile, real phases and multiple attack forms`,()=>{
 const d=C.BOSSES[s.boss],moves=new Set([...d.patterns,...d.later||[],...d.final||[],...d.challenge]);
 assert.ok(moves.size>=3);assert.equal(d.phaseCount,s.chapterEnd?3:2);assert.ok(d.motion);
 const g=ready(s.id),b=g.boss;b.cooldown=0;g.updateBoss(.01);assert.ok(b.attack||b.turrets?.some(t=>t.attack));
 if(b.stagedParts){g.hitBoss(b.maxHp*.4);g.hitBoss(999,"left");g.hitBoss(999,"right");}else if(b.turrets){g.hitBoss(999,"left");g.hitBoss(999,"right");}
 b.hp=b.maxHp*.25;g.updateBoss(.01);assert.equal(b.phase,d.phaseCount);
});
test("staged-parts transition cancels all old-phase attacks and reservations",()=>{
 const g=ready(15),b=g.boss;b.side={kind:"aim",timer:1,source:b.id+":side"};b.echo={timer:.1,bullets:[{x:200,y:150,vx:0,vy:160}],source:b.id};b.followups=[{timer:.1,kind:"burst"}];b.summonPending="summonFlank";g.threats=[{source:b.id,until:100,start:0,specs:[]}];
 g.hitBoss(b.maxHp*.4);assert.equal(b.phase,2);assert.equal(b.side,null);assert.equal(b.echo,null);assert.deepEqual(b.followups,[]);assert.equal(b.summonPending,null);assert.deepEqual(g.threats,[]);
});
test("theme trajectories are bounded, continuous, and not one shared sine path",()=>{
 assert.equal(typeof B.pose,"function");const trajectories=[];
 for(const s of C.STAGES){const g=ready(s.id),b=g.boss;let last;
  const row=[];for(let t=0;t<20;t+=.05){const p=B.pose(b,t);assert.ok(p.x>=b.w/2&&p.x<=480-b.w/2);assert.ok(p.y>=b.h/2&&p.y<220);if(last)assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<20);last=p;if(t<2)row.push(Math.round(p.x));}trajectories.push(JSON.stringify(row));
 }assert.ok(new Set(trajectories).size>=5);
});
test("second-phase Spear announces both fixed dash segments before movement",()=>{
 const g=ready(2);g.boss.hp=30;g.boss.cooldown=0;g.updateBoss(.01);const a=g.boss.attack;
 assert.equal(a.kind,"doubleDash");assert.equal(a.route.length,2);const route=JSON.parse(JSON.stringify(a.route));g.player.x=450;g.player.y=350;
 for(let i=0;i<160;i++)g.updateBoss(.01);assert.deepEqual(g.boss.dash.route,route);
});
test("protected multipart bosses retain warned hull pressure and destroyed emitters stay dead",()=>{
 const g=ready(6);for(let i=0;i<500;i++){g.time+=.01;g.updateBoss(.01);g.updateHazards(.01);}
 assert.ok(g.events.some(e=>e.type==="boss-attack"&&e.value==="aim"));assert.ok(g.enemyBullets.some(b=>b.source===g.boss.id));
 const a=ready(14);a.boss.turrets[0].cooldown=0;a.updateBoss(.01);const id=a.boss.turrets[0].id;a.hitBoss(999,"left");assert.ok(!a.hazards.some(h=>h.source===id));
});
