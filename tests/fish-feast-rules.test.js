'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const file='fish-feast/content.js';
function rules(){assert.ok(fs.existsSync('fish-feast/rules.js'),'Food-chain rules are not implemented');return require('../fish-feast/rules.js');}
test('twelve sequential levels form three chapters with real pools and distinct encounter recipes',()=>{
  assert.ok(fs.existsSync(file),'Level content is not implemented');
  const C=require('../fish-feast/content.js');
  assert.equal(C.levels.length,12);
  assert.deepEqual(C.levels.map(l=>l.id),Array.from({length:12},(_,i)=>i+1));
  assert.deepEqual([...new Set(C.levels.map(l=>l.chapterId))],['shallows','reef','deep']);
  for(const chapter of ['shallows','reef','deep'])assert.equal(C.levels.filter(l=>l.chapterId===chapter).length,4);
  assert.equal(new Set(C.levels.map(l=>JSON.stringify([l.pool,l.schoolSize,l.lanes,l.maxJellies,l.maxChasers,l.goal]))).size,12);
  for(const level of C.levels){assert.ok(level.name.zh&&level.name.en&&level.brief.zh&&level.brief.en);assert.ok(level.pool.every(id=>C.species[id]));assert.ok(level.pool.some(id=>!C.species[id].hazard&&C.species[id].tier===0));assert.ok(level.foodMinimum>=6&&level.maxThreats<=5);}
  assert.ok(C.levels[0].goal>C.thresholds[2]);
  assert.ok(C.levels[0].pool.some(id=>C.species[id].tier>1));
  assert.ok(new Set(Object.values(C.species).map(x=>x.shape)).size>=5);
  assert.ok(C.maxEntities<=40);
  for(const s of Object.values(C.species))assert.ok(s.name.zh&&s.name.en&&s.speed>0&&(s.hazard?s.nutrition===0:s.nutrition>0));
});
test('eating upgrades the food chain once while combo score does not grant extra growth',()=>{
  const R=rules(),p=R.player(760,500);
  assert.equal(R.relation(p,{tier:0}),'food');assert.equal(R.relation(p,{tier:1}),'neutral');assert.equal(R.relation(p,{tier:2}),'danger');
  const prey={tier:0,nutrition:1,dead:false};assert.ok(R.eat(p,prey,1));assert.equal(p.growth,1);assert.equal(R.eat(p,prey,1),false);
  for(let i=0;i<6;i++)R.eat(p,{tier:0,nutrition:1,dead:false},1+i*.15);
  assert.equal(p.growth,7);assert.equal(p.tier,2);assert.equal(R.relation(p,{tier:2}),'neutral');
  for(let i=0;i<6;i++)R.eat(p,{tier:1,nutrition:2,dead:false},2+i*.15);
  assert.equal(p.growth,19);assert.equal(p.tier,3);assert.equal(R.relation(p,{tier:2}),'food');assert.ok(p.score>p.growth*10);
});
test('damage consumes only one life, preserves growth and respawns even on the final life',()=>{
  const R=rules(),p=R.player(760,500);p.growth=19;R.grow(p);p.invulnerable=0;
  assert.ok(R.hurt(p,150,180));assert.equal(p.lives,2);assert.equal(p.growth,19);assert.ok(!R.hurt(p,0,0));
  p.invulnerable=0;p.lives=1;p.y=999;assert.ok(R.hurt(p,120,130));assert.equal(p.lives,0);assert.equal(p.y,130);
});
test('visible body geometry bounds and swept contacts agree, excluding tail decoration',()=>{
  const R=rules();const a={x:100,y:100,tier:1,shape:'player'},b={x:100,y:100,tier:0,shape:'slender'};
  assert.ok(R.hit(a,b));b.x=200;assert.ok(!R.hit(a,b));a.x=300;
  assert.ok(R.swept(a,b,{x:0,y:100},{x:200,y:100}));
  assert.ok(!R.swept(a,b,{x:0,y:260},{x:200,y:100}));
  a.x=-50;a.y=1000;R.bound(a,200,160);const g=R.geometry(a);assert.ok(a.x>=g.rx&&a.y<=160-g.ry);
});

