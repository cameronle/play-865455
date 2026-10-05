'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../fish-feast/content.js'),R=require('../fish-feast/rules.js');
function sim(){assert.ok(fs.existsSync('fish-feast/simulation.js'),'Playable simulation is not implemented');return require('../fish-feast/simulation.js');}
test('fixed-step first level supports movement, one-shot dash and completely frozen pause',()=>{
 const S=sim(),s=S.create(760,520,12);assert.equal(s.mode,'title');S.start(s);assert.equal(s.mode,'playing');
 const x=s.player.x;S.advance(s,.1,{x:1,y:0});assert.ok(s.player.x>x);assert.ok(S.dash(s));assert.equal(S.dash(s),false);
 S.pause(s);const paused=S.snapshot(s);S.advance(s,.4,{x:1,y:1});assert.deepEqual(S.snapshot(s),paused);S.resume(s);const px=s.player.x;S.advance(s,.1,{});assert.equal(s.player.x,px);
 const twin=S.create(760,520,12);S.start(twin);S.advance(twin,.05,{x:1,y:0});S.advance(twin,.05,{x:1,y:0});assert.ok(Math.abs(twin.player.x-(x+19))<.001);
});
test('the start-of-step threat wins over an overlapping meal that would otherwise upgrade',()=>{
 const S=sim(),s=S.create(760,520,1);S.start(s);s.fish=[];s.player.invulnerable=0;s.player.growth=6;
 s.fish=[{...C.species.sprat,type:'sprat',id:1,x:s.player.x,y:s.player.y,vx:0,vy:0,age:0,phase:0,warning:0},{...C.species.perch,type:'perch',id:2,x:s.player.x,y:s.player.y,vx:0,vy:0,age:0,phase:0,warning:0}];
 S.step(s);assert.equal(s.player.lives,2);assert.equal(s.player.growth,6);assert.equal(s.eaten,0);
});
test('same contact never eats twice or drains multiple lives and final damage leaves a visible fish',()=>{
 const S=sim(),s=S.create(760,520,3);S.start(s);s.player.invulnerable=0;s.player.lives=1;s.fish=[];
 for(let i=0;i<3;i++)s.fish.push({...C.species.hunter,type:'hunter',id:i+1,x:s.player.x,y:s.player.y,vx:0,vy:0,age:0,phase:0,warning:0});
 S.step(s);assert.equal(s.player.lives,0);assert.equal(s.mode,'lost');assert.equal(s.hits,1);const g=R.geometry(s.player);assert.ok(s.player.x>=g.rx&&s.player.y<=s.height-g.ry);
 const frozen=S.snapshot(s);S.advance(s,1,{x:1});assert.deepEqual(S.snapshot(s),frozen);S.start(s);assert.equal(s.player.growth,0);assert.equal(s.player.lives,3);
});
test('ordinary seeded pursuit can complete the first level without immortality or forced meals',()=>{
 const S=sim(),s=S.create(760,520,72);S.start(s);let peak=0;
 for(let i=0;i<120*210&&s.mode==='playing';i++){
  const p=s.player,food=s.fish.filter(f=>f.tier<p.tier&&!f.warning),threats=s.fish.filter(f=>f.tier>p.tier&&!f.warning);
  food.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));let target=food[0];
  if(p.invulnerable<=0){const danger=threats.find(f=>Math.hypot(f.x-p.x,f.y-p.y)<R.geometry(f).rx+R.geometry(p).rx+55);if(danger)target={x:p.x+(p.x-danger.x)*2,y:p.y+(p.y-danger.y)*2};}
  S.step(s,target?{target}:{});peak=Math.max(peak,s.fish.length);
 }
 assert.equal(s.mode,'won');assert.ok(s.player.lives>0);assert.ok(s.player.growth>=s.level.goal);assert.ok(peak<=C.maxEntities);assert.ok(s.time>5);
 const before=S.snapshot(s);before.player.x=-999;assert.notEqual(S.snapshot(s).player.x,-999);
});
test('bounded danger spawn is telegraphed and cannot overlap the player',()=>{
 const S=sim();for(let seed=1;seed<=40;seed++){
  const s=S.create(760,520,seed);S.start(s);for(const f of s.fish.filter(f=>f.tier>1)){assert.ok(f.warning>0);assert.ok(!R.hit(s.player,f));assert.ok(Math.hypot(f.x-s.player.x,f.y-s.player.y)>R.geometry(f).rx+R.geometry(s.player).rx+70);}
  for(let i=0;i<200;i++)S.spawn(s,'hunter');assert.ok(s.fish.filter(f=>f.tier>1).length<=s.level.maxThreats);assert.ok(s.fish.length<=C.maxEntities);
 }
});

