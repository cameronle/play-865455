const test=require('node:test'),assert=require('node:assert/strict');
const {boot,fruit}=require('./helpers/melon-runtime');
test('a landing guide previews the first obstruction without spawning',()=>{
 const b=boot();b.test.start();b.nodes.game.dispatch('pointerdown',{clientX:300});const empty=b.window.MelonLab.getSnapshot();assert.equal(empty.landingY,657-fruit(0,0,0).boundaryR);b.test.set({fruits:[fruit(4,300,500)]});const s=b.window.MelonLab.getSnapshot();assert.equal(s.landingY,500-fruit(4,0,0).collisionR-fruit(0,0,0).collisionR);assert.equal(s.dropCount,0);assert.equal(s.score,0);
});
test('current drop and independent future sample remain promised through a committed drop',()=>{
 const rolls=[.1,.8,.4,.3];const b=boot({rng:()=>rolls.shift()??.1});b.test.start();assert.equal(b.nodes.currentFruit.textContent,'KIWI');assert.equal(b.nodes.nextFruit.textContent,'PEACH');const future=b.window.MelonLab.getSnapshot().queuedLevel;
 b.nodes.game.dispatch('pointerdown',{clientX:260});assert.equal(b.nodes.nextFruit.textContent,'PEACH');assert.equal(b.test.get().fruits.length,0);b.nodes.game.dispatch('pointerup',{clientX:260});assert.equal(b.test.get().fruits[0].level,0);assert.equal(b.test.get().nextLevel,future);assert.equal(b.nodes.currentFruit.textContent,'PEACH');assert.equal(b.nodes.nextFruit.textContent,'LEMON');
});
