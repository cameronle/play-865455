"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules"),D=require("../shooter/director"),B=require("../shooter/bosses"),C=require("../shooter/content");
test("side-entry warning cannot teleport an interceptor onto a ship at its spawn edge",()=>{
 const g=new Game();g.start();g.player.x=21;g.player.y=145;const e=g.spawn("interceptor",21,{lane:-1});g.updateEnemy(e,.01);assert.ok(Math.hypot(e.x-g.player.x,e.y-g.player.y)>100);
});
test("global reservations retain forecast of a locked moving-body attack, not just a numeric slot",()=>{
 const g=new Game();g.start();const e=g.spawn("interceptor",70,{lane:-1});g.updateEnemy(e,.01);
 assert.ok(g.threats.find(t=>t.source===e.id)?.specs.some(h=>h.kind==="route"));
});
test("an accepted future volley certificate replays through the actual collision loop without health injection",()=>{
 const g=new Game();g.start();g.enemies=[];const specs=[{kind:"volley",warning:1.4,ttl:3,source:77,bullets:[{x:160,y:140,vx:0,vy:155},{x:320,y:140,vx:0,vy:155}]}];
 const path=D.escapePath(g,specs);assert.ok(path);let index=0;
 for(const node of path){for(let t=0;t<.22-1e-8;t+=1/120){g.time+=1/120;if(index===Math.ceil(1.4/(1/120)))for(const b of specs[0].bullets)g.emit(b.x,b.y,b.vx,b.vy,77);
 const dt=Math.min(1/120,.22-t),dx=node.x-g.player.x,dy=node.y-g.player.y,n=Math.hypot(dx,dy),step=Math.min(n,285*dt);g.player.px=g.player.x;g.player.py=g.player.y;if(n){g.player.x+=dx/n*step;g.player.y+=dy/n*step;}for(const b of g.enemyBullets){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;}g.collisions();index++;}}
 assert.equal(g.lives,3);assert.equal(g.player.shield,false);
});
test("time-expanded reachability rejects static empty land that cannot be reached after reaction delay",()=>{
 const g=new Game();g.start();g.player.x=20;const beam={kind:"laser",source:1,x:180,y:324,w:330,h:648,beamW:300,duration:2,warning:.3,ttl:2};assert.equal(D.escapePath(g,[beam]),null);
});

test("diving body attacks reserve their full locked future route",()=>{
 const g=new Game();g.start();const e=g.spawn("diver",100,{y:120,age:2,cooldown:0});g.updateEnemy(e,.01);
 assert.ok(g.threats.find(t=>t.source===e.id)?.specs.some(h=>h.kind==="route"));
});
test("ordinary aircraft forecast is public, detached and matches real motion",()=>{
 const E=require("../shooter/enemies");assert.equal(typeof E.forecast,"function");
 for(const type of ["scout","formation","heavy","support","diver","sniper"]){
  const g=new Game({mode:"challenge"});g.start();const e=g.spawn(type,140,{y:160,groupId:1,age:2,cooldown:20});
  if(type==="diver"){e.phase="aim";e.warning=.7;e.target={x:300,y:530};}
  if(type==="sniper"){e.phase="aim";e.warning=.7;e.target={x:300,y:530};}
  const before=JSON.stringify(e),expected=E.forecast(e,1.3,g.mode);assert.equal(JSON.stringify(e),before);
  for(let i=0;i<130;i++)g.updateEnemy(e,.01);assert.ok(Math.hypot(e.x-expected.x,e.y-expected.y)<4,type);
 }
});

test("escape search includes aircraft occupying apparent beam exits",()=>{
 const g=new Game();g.start();g.enemies=[];
 for(const x of [30,450])g.spawn("heavy",x,{y:324,w:60,h:648,speed:0,age:0,cooldown:20});
 const beam={kind:"laser",source:77,x:240,y:324,w:320,h:648,beamW:300,duration:2,warning:1.4,ttl:2};assert.equal(D.escapePath(g,[beam]),null);
});
test("a route corner inside a search edge cannot be replaced by a harmless chord",()=>{
 const g=new Game();g.start();g.player={...g.player,x:200,y:300,w:2,h:2};
 const route={kind:"route",source:77,origin:{x:100,y:300},route:[{x:200,y:300},{x:200,y:200}],speed:320,w:2,h:2,warning:0,ttl:.7};assert.equal(D.escapePath(g,[route]),null);
});
