'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../fish-feast/content.js'),R=require('../fish-feast/rules.js');
function behavior(){assert.ok(fs.existsSync('fish-feast/behaviors.js'),'Real encounter behavior is missing');return require('../fish-feast/behaviors.js');}
test('weavers actually change vertical direction and skippers wind up before a bounded faster burst',()=>{
 const B=behavior(),s={width:760,height:520,level:C.levels[5],player:R.player(760,520),fish:[]};
 const a={...C.species.weaver,x:100,y:200,vx:55,vy:0,age:0,phase:0,id:1},b={...C.species.skipper,x:200,y:220,vx:48,vy:0,age:0,phase:0,id:2};B.initialize(s,a);B.initialize(s,b);s.fish=[a,b];
 const signs=new Set(),states=new Set();let high=0,burst=0;
 for(let i=0;i<120*12;i++){a.age+=C.step;b.age+=C.step;B.move(s,a,C.step);B.move(s,b,C.step);signs.add(Math.sign(a.vy));states.add(b.intent);high=Math.max(high,Math.hypot(b.vx,b.vy));if(b.intent==='burst')burst++;}
 assert.ok(signs.has(-1)&&signs.has(1));assert.ok(states.has('coil')&&states.has('burst')&&states.has('patrol'));assert.ok(high>b.speed*1.7&&high<190);assert.ok(burst>0&&burst<120*4);
});
test('predators telegraph before a time-and-range-bounded pursuit and never hunt a bigger player',()=>{
 const B=behavior(),s={width:760,height:520,level:C.levels[8],player:R.player(760,520),fish:[]};s.player.invulnerable=0;
 const f={...C.species.pursuer,x:200,y:220,vx:42,vy:0,age:0,phase:0,id:1};B.initialize(s,f);s.fish=[f];
 let windup=0,chase=0,longest=0,run=0;for(let i=0;i<120*15;i++){f.age+=C.step;B.move(s,f,C.step);if(f.intent==='windup')windup++;if(f.intent==='chase'){chase++;longest=Math.max(longest,++run);}else run=0;assert.ok(Math.hypot(f.vx,f.vy)<=110.01);}
 assert.ok(windup>=70);assert.ok(chase>0);assert.ok(longest<=163);
 f.intent='chase';f.intentTime=1;s.player.x=-1000;B.move(s,f,C.step);assert.equal(f.intent,'patrol');assert.ok(f.aiCooldown>3);
 s.player.x=380;s.player.tier=5;f.aiCooldown=0;f.intent='chase';f.intentTime=1;B.move(s,f,C.step);assert.equal(f.intent,'patrol');
});
test('real spawning builds shoals and lanes and reserves capped hazards with safe warning distance',()=>{
 const S=require('../fish-feast/simulation.js'),s=S.create(760,520,92);S.start(s,1);
 const groups=new Map();for(const f of s.fish.filter(f=>f.motion==='school'))groups.set(f.schoolId,(groups.get(f.schoolId)||0)+1);assert.ok([...groups].some(([id,count])=>Number.isInteger(id)&&count>=2),'no actual formation');
 S.start(s,2);assert.ok(s.fish.length>=10);for(const f of s.fish)assert.ok(Number.isInteger(f.lane)&&f.lane>=0&&f.lane<s.level.lanes);
 S.start(s,11);assert.equal(s.fish.filter(f=>f.hazard).length,2);assert.equal(s.fish.filter(f=>f.motion==='chase').length,2);assert.equal(s.fish.filter(f=>f.type==='leviathan').length,1);
 for(const f of s.fish.filter(f=>R.relation(s.player,f)==='danger')){assert.ok(f.warning>0);assert.ok(Math.hypot(f.x-s.player.x,f.y-s.player.y)>R.geometry(f).rx+R.geometry(s.player).rx+88);}
 s.fish=s.fish.filter(f=>f.hazard);s.player.growth=61;R.grow(s.player);for(let i=0;i<300;i++)S.step(s,{});assert.ok(s.fish.filter(f=>f.hazard).length<=2);assert.ok(s.fish.some(f=>R.relation(s.player,f)==='food'),'food stopped replenishing');
});
