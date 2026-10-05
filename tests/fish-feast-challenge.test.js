'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../fish-feast/content.js'),R=require('../fish-feast/rules.js'),B=require('../fish-feast/behaviors.js'),S=require('../fish-feast/simulation.js');
function fixture(type='sprat',level=0){const s=S.create(760,520,17);S.start(s,level);s.player.x=180;s.player.y=220;s.player.invulnerable=0;const f={...C.species[type],type,id:999,x:250,y:220,vx:C.species[type].speed,vy:0,age:0,phase:0,warning:0,dead:false};B.initialize(s,f);f.fleeCooldown=0;s.fish=[f];return{s,f};}
test('ordinary prey flees away from the nearby player then returns to catchable patrol',()=>{
 const left=fixture(),right=fixture();right.s.player.x=320;
 B.move(left.s,left.f,C.step);B.move(right.s,right.f,C.step);
 assert.ok(left.f.vx>0);assert.ok(right.f.vx<0,'prey must react to player position, not merely animate');
 assert.ok(left.f.fleeTime>0&&left.f.fleeTime<=.7);
 left.s.player.x=700;for(let i=0;i<120;i++){left.f.age+=C.step;B.move(left.s,left.f,C.step);}
 assert.equal(left.f.fleeTime,0);assert.ok(Math.abs(left.f.vx)<=left.f.speed+1);
});
test('skipper bursts outrun ordinary swimming but end in a catchable recovery',()=>{
 const {s,f}=fixture('skipper',5);f.intent='burst';f.intentTime=.48;
 B.move(s,f,C.step);assert.ok(Math.hypot(f.vx,f.vy)>190&&Math.hypot(f.vx,f.vy)<=245);
 for(let i=0;i<65;i++){f.age+=C.step;B.move(s,f,C.step);}
 assert.equal(f.intent,'patrol');assert.ok(Math.abs(f.vx)<=f.speed+1);
});
test('a warned chaser is briefly faster than the player but cannot turn instantly',()=>{
 const {s,f}=fixture('pursuer',8);s.player.x=400;f.intent='chase';f.intentTime=1.35;f.chaseHeading=0;
 B.move(s,f,C.step);assert.ok(Math.hypot(f.vx,f.vy)>190&&Math.hypot(f.vx,f.vy)<=210);
 s.player.x=f.x;s.player.y=f.y+100;B.move(s,f,C.step);
 assert.ok(Math.abs(Math.atan2(f.vy,f.vx))<=2.1*C.step,'bounded turning permits sidestep escape');
 s.player.tier=4;B.move(s,f,C.step);assert.equal(f.intent,'patrol');
});
test('sample level has staged growth and requires a real revenge meal rather than a full growth bar',()=>{
 const s=S.create(760,520,17);S.start(s,0);
 assert.equal(s.level.goal,19,'tutorial ends growth at the final tier instead of safe grinding to 44');
 assert.equal(typeof S.objective,'function');assert.equal(S.objective(s).phase,'forage');
 const old=s.fish.map(f=>[f.id,f.tier]);s.player.growth=7;R.grow(s.player);S.step(s,{});
 assert.equal(S.objective(s).phase,'hunt');for(const [id,tier]of old){const f=s.fish.find(f=>f.id===id);if(f)assert.equal(f.tier,tier,'existing fish cannot auto-upgrade');}
 s.player.growth=19;R.grow(s.player);s.fish=[];S.step(s,{});assert.equal(s.mode,'playing');assert.equal(S.objective(s).phase,'reverse');
 const f={...C.species.perch,type:'perch',id:999,x:s.player.x,y:s.player.y,vx:0,vy:0,warning:0,age:0,phase:0};B.initialize(s,f);s.fish=[f];
 S.step(s,{});assert.equal(s.mode,'won');assert.equal(s.revengeCount,1);
});
test('food replenishment is paced and missing revenge targets are supplied safely',()=>{
 const s=S.create(760,520,71);S.start(s,0);s.fish=[];s.foodTimer=1;s.spawnTimer=99;s.objectiveTimer=99;
 S.step(s,{});assert.equal(s.fish.length,0,'no instant per-step refill');
 for(let i=0;i<125;i++)S.step(s,{});assert.ok(s.fish.length>0&&s.fish.length<=3);
 s.player.growth=19;R.grow(s.player);s.fish=[];s.foodTimer=99;s.objectiveTimer=0;S.step(s,{});
 const target=s.fish.find(f=>f.type==='perch'&&f.tier===2);assert.ok(target,'finite fallback, not random waiting');assert.ok(!R.hit(s.player,target));
 assert.equal(s.mode,'playing');
});
test('all twelve levels have finite stages and mechanically distinct objectives',()=>{
 assert.equal(C.levels.length,12);const kinds=new Set();
 for(const level of C.levels){assert.ok(level.stages?.length>=2);assert.ok(level.finish?.need>=1);assert.ok(level.goal<=61);assert.ok(level.finish.tier<C.thresholds.filter((g,i)=>i>0&&g<=level.goal).length);if(level.challenge)kinds.add(level.challenge.kind);}
 assert.deepEqual([...kinds].sort(),['catch','lanes','shoal']);
});
test('a special capture objective cannot be bypassed by grinding ordinary food',()=>{
 const s=S.create(760,520,92);S.start(s,4);s.player.growth=s.level.goal;R.grow(s.player);s.fish=[];
 S.step(s,{});assert.equal(s.mode,'playing');assert.equal(S.objective(s).kind,'catch');assert.equal(S.objective(s).type,'weaver');
 const required=s.level.challenge;for(let i=0;i<required.need;i++){
 const f={...C.species.weaver,type:'weaver',id:900+i,x:s.player.x,y:s.player.y,vx:0,vy:0,warning:0,age:0,phase:0};B.initialize(s,f);s.fish=[f];S.step(s,{});}
 assert.equal(S.objective(s).kind,'revenge');assert.equal(s.mode,'playing');
});
test('shoal and lane objectives count real meals and reset with a new swim',()=>{
 for(const index of [1,2]){const s=S.create(760,520,92);S.start(s,index);s.player.invulnerable=0;
 for(let i=0;i<3;i++){const f={...C.species.fry,type:'fry',id:900+i,x:s.player.x,y:s.player.y,vx:0,vy:0,warning:0,age:0,phase:0,schoolId:900,schoolSlot:i,schoolOffset:0,lane:i,baseY:s.player.y};B.initialize(s,f);s.fish=[f];S.step(s,{});}
 assert.equal(s.bestShoal,3);assert.deepEqual(s.lanesEaten,[0,1,2]);S.start(s,index);assert.equal(s.bestShoal,0);assert.deepEqual(s.lanesEaten,[]);
 }
});
test('an intermediate growth stage guarantees warned patrol pressure without resizing live fish',()=>{
 const s=S.create(760,520,71);S.start(s,1);s.fish=[];s.spawnTimer=s.foodTimer=s.objectiveTimer=99;s.player.growth=7;R.grow(s.player);S.step(s,{});
 const threats=s.fish.filter(f=>R.relation(s.player,f)==='danger');assert.ok(threats.length>=1,'stage pressure cannot wait for a random pool roll');assert.ok(threats.every(f=>f.warning>0&&!R.hit(s.player,f)));
});
test('short landscape permits a vertical bypass at every reachable threat tier, even at mid-water',()=>{
 const s=S.create(760,150,92);
 for(const [tier,obstacle]of [[2,{...C.species.hunter,tier:3}],[3,{...C.species.hunter,tier:4}],[4,{...C.species.hunter,tier:5}],[5,C.species.jelly]]){
 const pg=R.geometry({shape:'player',tier}),og=R.geometry(obstacle);
 assert.ok(s.height>=4*pg.ry+2*og.ry+48,'both top and bottom bypasses must not close at tier '+tier);
 }
});
test('short landscape keeps a proportional world with room to pass a jelly at final size',()=>{
 const s=S.create(760,150,92);assert.ok(s.height>=200);assert.ok(Math.abs(s.width/s.height-760/150)<1e-9);S.start(s,11);
 const ratio=s.width/s.height;S.resize(s,760,140);assert.ok(s.height>=200);assert.ok(Math.abs(s.width/s.height-760/140)<1e-9);assert.notEqual(s.width/s.height,ratio);
});
