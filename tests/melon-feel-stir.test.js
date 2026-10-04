const test=require('node:test'),assert=require('node:assert/strict');
const {boot,fruit}=require('./helpers/melon-runtime');
test('stir alternates the whole-pool direction without changing energy rules',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,450,400),fruit(3,550,500)]});b.test.stirPool();const first=b.window.MelonLab.getSnapshot().stirDirection;b.test.stirPool();assert.equal(b.window.MelonLab.getSnapshot().stirDirection,-first);assert.ok(b.test.get().fruits.every(f=>f.stirDirection===-first));assert.equal(b.test.get().energy,40);b.test.stirPool();assert.equal(b.test.get().energy,10);b.test.stirPool();assert.equal(b.test.get().energy,10);
});
test('larger fruit responds more gently to the same progressive field',()=>{
 const result=level=>{const b=boot();b.test.start();b.test.set({fruits:[fruit(level,500,350)]});b.test.stirPool();for(let i=0;i<30;i++)b.test.update(1/120);return b.test.get().fruits[0]};assert.ok(result(0).vx>result(10).vx);
});
test('one stir starts a coherent field without an instantaneous random kick',()=>{
 const rolls=[.1,.1,.1,.2,.9,.2];const b=boot({rng:()=>rolls.shift()??.1});b.test.start();b.test.set({fruits:[fruit(0,400,350),fruit(10,550,500)]});b.test.stirPool();const s=b.test.get();assert.equal(s.energy,70);assert.ok(s.fruits.every(f=>f.vx===0&&f.vy===0));assert.equal(s.fruits[0].stirDirection,s.fruits[1].stirDirection);b.test.update(1/120);assert.ok(s.fruits.every(f=>f.stirTime>0&&f.stirTime<1.35));
});
