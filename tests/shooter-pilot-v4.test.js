"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules"),{decide}=require("../scripts/shooter-pilot");
test("pilot rejects a between-sample scout corner contact from the original failed seed",()=>{
 const g=new Game();g.start();Object.assign(g,structuredClone(require("./fixtures/shooter-corner-contact-v4.json")));const s=g.snapshot(),before=JSON.stringify(s),a=decide(s);assert.equal(JSON.stringify(s),before);g.step(.1,a);assert.equal(g.stats.shieldUsed,0);assert.equal(g.stats.hits,0);
});
test("pilot sweeps the warning-to-active laser boundary from the failed natural campaign",()=>{
 const g=new Game();g.start();Object.assign(g,structuredClone(require("./fixtures/shooter-laser-contact-v4.json")));const s=g.snapshot(),before=JSON.stringify(s),a=decide(s);assert.equal(JSON.stringify(s),before);g.step(.1,a);assert.equal(g.stats.shieldUsed,0);assert.equal(g.stats.hits,0);
});
test("pilot labels the too-late laser snapshots as threatened instead of manufacturing zero risk",()=>{
 for(const fixture of require("./fixtures/shooter-laser-late-v4.json")){const g=new Game();g.start();Object.assign(g,structuredClone(fixture));const s=g.snapshot(),before=JSON.stringify(s),a=decide(s);assert.equal(JSON.stringify(s),before);assert.ok(a.risk>2000);for(const y of [-1,0,1])for(const x of [-1,0,1]){const q=new Game();q.start();Object.assign(q,structuredClone(fixture));q.step(.1,{x,y});assert.equal(q.stats.hits,1,"this already-late state is unavoidable with any ordinary direction");}}
});
test("idle pilot retains forward and backward evasion room rather than camping near the bottom boundary",()=>{
 const g=new Game();g.start();g.player.y=550;const s=g.snapshot(),before=JSON.stringify(s),a=decide(s);assert.equal(a.y,-1);assert.equal(JSON.stringify(s),before);
});
test("pilot aims at actual frozen multipart weak points rather than the obsolete shared sine",()=>{
 const g=new Game();g.start();g.level=6;g.enterBoss("twin-core");g.phase="boss";Object.assign(g.boss,{x:350,y:110,age:100,attack:{kind:"aim",timer:1,target:{x:240,y:592}}});const s=g.snapshot(),before=JSON.stringify(g.snapshot());
 assert.equal(decide(s).x,1);assert.equal(JSON.stringify(g.snapshot()),before);
});
test("pilot makes a legal finite challenge supply decision using detached state",()=>{
 const g=new Game({mode:"challenge"});g.start();g.level=3;g.lives=1;g.pulses=0;g.finishStage();const s=g.snapshot(),before=JSON.stringify(s);assert.equal(decide(s).supply,"life");assert.equal(JSON.stringify(s),before);
});

test("dash predictor matches executable movement through route, recovery and return",()=>{
 const B=require("../shooter/bosses");assert.equal(typeof B.forecast,"function");
 for(const t of [.5,1.3,2.6,3.3]){const g=new Game();g.start();g.level=2;g.enterBoss("spear");g.phase="boss";const b=g.boss;Object.assign(b,{x:150,y:110,cooldown:20,dash:{phase:"out",route:[{x:330,y:560},{x:150,y:530}],index:0,home:{x:150,y:110}}});
  const before=JSON.stringify(b),p=B.forecast(b,t);assert.equal(JSON.stringify(b),before);for(let i=0;i<t*100;i++)g.updateBoss(.01);assert.ok(Math.hypot(b.x-p.x,b.y-p.y)<7,String(t));
 }
});

test("observation-only route planning can react immediately while game admission retains its delay",()=>{
 const D=require("../shooter/director"),g=new Game();g.start();g.player={...g.player,x:200,y:300,w:2,h:2};const h={kind:"route",origin:{x:100,y:300},route:[{x:200,y:300},{x:200,y:200}],speed:320,w:2,h:2,warning:0,ttl:.7};
 assert.equal(D.escapePath(g,[h]),null);assert.ok(D.escapePath(g,[h],0));
});
