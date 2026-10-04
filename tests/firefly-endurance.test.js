const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./helpers/firefly-runtime');
const rules=require('../firefly-watch/rules');

test('Firefly full six-minute simulation spawns exactly three bosses and ends once',()=>{
 const b=boot({seed:193});b.nodes.startButton.click();
 // Invulnerability is an explicit endurance fixture, not a natural win claim.
 b.test.get().player.invulnerable=10000;
 const bosses=new Set();let maxEnemies=0,maxDrops=0;
 for(let frame=0;frame<360*120;frame++){
  if(b.test.get().state==='upgrade')b.nodes.upgradeChoices.children[0].click();
  b.test.update(1/120);
  const s=b.test.get();for(const e of s.enemies)if(e.type.boss)bosses.add(e.id);
  maxEnemies=Math.max(maxEnemies,s.enemies.length);maxDrops=Math.max(maxDrops,s.glowDrops.length);
  assert.ok(Number.isFinite(s.score)&&s.stats.hp>=0&&s.player.x>=30&&s.player.y>=30);
 }
 const s=b.snapshot();assert.equal(s.state,'won');assert.equal(s.elapsed,360);assert.equal(s.nextBossIndex,3);assert.equal(bosses.size,3);assert.ok(maxEnemies<=103);assert.ok(maxDrops<1500);assert.equal(b.nodes.time.textContent,'00:00');assert.equal(b.rafCount(),0);
 console.log(JSON.stringify({fixture:'invulnerable seeded six-minute endurance',bosses:bosses.size,maxEnemies,maxDrops,score:s.score,level:s.level}));
});

test('Firefly difficulty chapters change at the exact quarter boundary',()=>{
 for(const t of [90,180,270]){assert.equal(rules.difficultyAt(t-.001).tier,t/90-1);assert.equal(rules.difficultyAt(t).tier,t/90);}
});

test('Firefly exact boss milestones do not spawn duplicates',()=>{
 for(const seconds of [90,180,270]){
  const b=boot();b.nodes.startButton.click();b.test.set({elapsed:seconds-.004,nextBossIndex:seconds/90-1,spawnTimer:100});b.test.update(1/120);b.test.update(1/120);
  assert.equal(b.test.get().enemies.filter(e=>e.type.boss).length,1);
 }
});

test('Firefly all upgraded movement and weapon effects remain bounded',()=>{
 const b=boot();b.nodes.startButton.click();let stats=rules.createPlayerStats();for(const u of rules.UPGRADES)for(let i=0;i<u.maxRank;i++)stats=rules.applyUpgrade(stats,u.id);b.test.set({stats});
 b.key('ArrowRight');b.key('ArrowDown');b.advance(.2);const s=b.snapshot();assert.ok(Math.abs(Math.hypot(s.player.x-360,s.player.y-360)-stats.speed*.2)<.1);
 assert.equal(stats.hp,6);assert.equal(stats.maxShields,3);assert.equal(stats.orbiters,3);assert.equal(stats.pickupRadius,174);
});
