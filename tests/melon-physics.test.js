const test=require('node:test'),assert=require('node:assert/strict');
const {boot,fruit}=require('./helpers/melon-runtime');
function assertBounds(f){assert.ok(f.x>=75+f.boundaryR-1e-6,'left boundary');assert.ok(f.x<=645-f.boundaryR+1e-6,'right boundary');assert.ok(f.y<=657-f.boundaryR+1e-6,'floor boundary')}
test('collision resolution cannot push a fruit through a side or floor',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(1,104,600),fruit(10,205,600)]});b.test.physics(1/120);for(const f of b.test.get().fruits)assertBounds(f);
});
test('newborn equal fruits that settle in touching contact merge after their birth grace',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,320,635,{age:0}),fruit(0,364,635,{age:0})]});for(let i=0;i<20;i++)b.test.update(1/120);assert.equal(b.test.get().fruits.length,1);assert.equal(b.test.get().fruits[0].level,1);assert.equal(b.test.get().score,20);
});
test('newly merged larger fruit is bounded in its creation frame',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,635),fruit(0,360,635)]});b.test.physics(1/120);const s=b.test.get();assert.equal(s.fruits.length,1);assert.equal(s.fruits[0].level,1);assert.equal(s.score,20);assertBounds(s.fruits[0]);
});
test('a supported tall stack overloads only after the danger grace period',()=>{
 const b=boot();b.test.start();let y=557,previous=10;const stack=[fruit(10,360,y)];for(const level of [9,8,7,6]){y-=fruit(previous,0,0).collisionR+fruit(level,0,0).collisionR;stack.push(fruit(level,360,y));previous=level}b.test.set({fruits:stack,currentProfileIndex:2});for(let i=0;i<48;i++)b.test.update(1/120);assert.equal(b.test.get().state,'playing');for(let i=0;i<720;i++)b.test.update(1/120);assert.equal(b.test.get().state,'over');assert.ok(b.test.get().dangerTimer>=1.4);
});
test('a newly dropped fruit passing the line cannot overload an otherwise empty pool',()=>{
 const b=boot();b.test.start();b.test.spawnFruit(360,3);for(let i=0;i<600;i++)b.test.update(1/120);assert.equal(b.test.get().state,'playing');assert.equal(b.test.get().dangerTimer,0);
});
test('different tiers at exactly coincident centers separate without NaN',()=>{
 const b=boot();b.test.start();b.test.set({fruits:[fruit(0,360,400),fruit(1,360,400)]});b.test.physics(1/120);const [a,c]=b.test.get().fruits;assert.ok([a.x,a.y,c.x,c.y].every(Number.isFinite));assert.ok(Math.hypot(a.x-c.x,a.y-c.y)>50);
});
