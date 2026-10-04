const test = require('node:test');
const assert = require('node:assert/strict');
const {boot,enemy,shot} = require('./helpers/firefly-runtime');

const rules = require('../firefly-watch/rules');
for (const definition of rules.UPGRADES) test(`Firefly upgrade ${definition.id}: all ranks, cap, unique offers and immutable input`, () => {
 let stats=rules.createPlayerStats();const original=JSON.stringify(stats);
 for(let i=1;i<=definition.maxRank;i++) { const before=JSON.stringify(stats);const next=rules.applyUpgrade(stats,definition.id);assert.equal(JSON.stringify(stats),before);stats=next;assert.equal(stats.upgradeRanks[definition.id],i); }
 assert.notEqual(JSON.stringify(stats),original);assert.deepEqual(rules.applyUpgrade(stats,definition.id),stats);
 assert.ok(!rules.chooseUpgradeOffer(stats,[0]).some(u=>u.id===definition.id));
 const b=boot();b.nodes.startButton.click();b.test.set({stats});
 b.test.set({enemies:[enemy(b,{x:400})]});b.test.fireVolley();assert.equal(b.snapshot().shots.length,stats.projectiles);assert.equal(b.snapshot().shots[0].damage,stats.damage);assert.equal(b.snapshot().shots[0].pierceLeft,stats.pierce);
});

test('Firefly shield absorbs contact, terminal score is stable, and restart resets build',()=>{
 const b=boot();b.nodes.startButton.click();b.test.set({stats:rules.applyUpgrade(b.snapshot().stats,'leaf-shield'),enemies:[enemy(b,{x:360})]});b.test.updateEnemies(0);assert.equal(b.snapshot().stats.hp,3);assert.equal(b.snapshot().stats.shields,0);
 b.test.finishGame(false);const end=b.snapshot();b.advance(2);assert.equal(b.snapshot().score,end.score);assert.match(b.nodes.detail.textContent,new RegExp(String(end.score).padStart(6,'0')));
 b.nodes.startButton.click();assert.equal(b.snapshot().elapsed,0);assert.equal(b.snapshot().level,1);assert.equal(b.snapshot().stats.maxShields,0);
});

test('Firefly starts from a hidden title only after foreground return',()=>{
 const b=boot({initiallyHidden:true});b.nodes.startButton.click();assert.equal(b.snapshot().state,'title');
 b.document.hidden=false;b.emit('document','visibilitychange');b.nodes.startButton.click();assert.equal(b.snapshot().state,'playing');
 b.document.hidden=true;b.emit('document','visibilitychange');const s=b.snapshot();b.advance(15);assert.equal(b.snapshot().elapsed,s.elapsed);
 b.document.hidden=false;b.emit('document','visibilitychange');assert.equal(b.snapshot().state,'paused');
});

test('Firefly HUD is updated only on change and exposes readable hearts/shields', () => {
  const b=boot();assert.equal(b.nodes.pauseButton.disabled,true);b.nodes.startButton.click();b.test.set({spawnTimer:100});
  assert.match(b.nodes.vitals.textContent,/3.*3/);const count=b.writes();b.advance(.1);assert.equal(b.writes(),count,'unchanged HUD is not rewritten each simulation step');
  b.emit('window','resize');assert.ok(b.paints()>0);
});

test('Firefly idle combat does not bank fire/spawn debt and keeps the full hero in bounds', () => {
  const b=boot();b.nodes.startButton.click();b.test.set({spawnTimer:1000});b.advance(5);b.test.set({enemies:[enemy(b,{x:100,y:100})]});b.advance(.1);
  assert.equal(b.snapshot().shots.length,1,'no burst of banked shots');
  b.test.set({enemies:Array.from({length:100},(_,i)=>enemy(b,{id:i+1,x:100,y:100})),spawnTimer:0});b.advance(1);
  assert.ok(b.snapshot().spawnTimer>=0,'no spawn backlog at cap');
  b.test.get().player.x=1;b.test.get().player.y=1;b.test.updatePlayer(0);assert.ok(b.snapshot().player.x>=29&&b.snapshot().player.y>=29);
});

test('Firefly records are finite, saved during play and cannot reappear after CLEAR', () => {
  for(const value of ['Infinity','-1','1.5','NaN','9007199254740992'])assert.equal(boot({storage:{fireflyWatchBest:value}}).snapshot().best,0,value);
  const b=boot();b.nodes.startButton.click();b.test.resolveEnemyDeath(enemy(b));assert.equal(b.storage.get('fireflyWatchBest'),'24');
  b.emit('window','game-data-clearing');b.storage.delete('fireflyWatchBest');b.emit('window','pagehide');b.test.finishGame(false);assert.equal(b.storage.has('fireflyWatchBest'),false);assert.equal(b.rafCount(),0);
  const blocked=boot({storageThrows:true});blocked.nodes.startButton.click();blocked.test.resolveEnemyDeath(enemy(blocked));assert.equal(blocked.snapshot().score,24);
});

test('Firefly contact resolution cannot hit after orbiter death or mutate after final life', () => {
  const b=boot();b.nodes.startButton.click();b.test.get().stats.orbiters=1;
  const dead=enemy(b,{x:380,radius:30,hp:1});b.test.set({enemies:[dead]});b.test.updateEnemies(0);
  assert.equal(b.snapshot().stats.hp,3,'dead enemy cannot hurt player');assert.equal(dead.escaped,false);
  b.test.get().stats.orbiters=0;b.test.get().stats.hp=1;
  const untouched=enemy(b,{id:3,x:600,speed:100});b.test.set({enemies:[enemy(b,{x:360}),untouched]});b.test.updateEnemies(.1);
  assert.equal(b.snapshot().state,'over');assert.equal(untouched.x,600,'terminal transition ends processing');
});

test('Firefly projectiles sweep moving enemies and pierce in travel order', () => {
  const b=boot();b.nodes.startButton.click();
  const near=enemy(b,{id:1,x:130,radius:5}),far=enemy(b,{id:2,x:160,radius:5});
  b.test.set({enemies:[far,near],shots:[shot({vx:1000,pierceLeft:1})]});b.test.updateShots(.1);
  assert.equal(near.hp,88,'near target hit despite endpoint beyond it');assert.equal(far.hp,88,'pierces in same step');assert.equal(b.snapshot().shots.length,0);
  const moving=enemy(b,{x:110,y:390,previousX:110,previousY:330,radius:5});
  b.test.set({enemies:[moving],shots:[shot({vx:200})]});b.test.updateShots(.1);assert.equal(moving.hp,88,'relative sweep');
  const edge=enemy(b,{x:724,radius:5});b.test.set({enemies:[edge],shots:[shot({x:700,vx:1000})]});b.test.updateShots(.1);assert.equal(edge.hp,88,'collision precedes offscreen cleanup');
});

test('Firefly upgrade choices are single-use and chained offers freeze the loop', () => {
  const b=boot();b.nodes.startButton.click();b.test.gainXp(42);
  assert.equal(b.snapshot().state,'upgrade');assert.equal(b.rafCount(),0);assert.equal(b.nodes.pauseButton.disabled,true);
  const old=[...b.nodes.upgradeChoices.children];old[0].click();
  assert.equal(b.snapshot().level,3);assert.equal(b.snapshot().state,'upgrade');
  const ranks=JSON.stringify(b.snapshot().stats.upgradeRanks);old[1].click();assert.equal(JSON.stringify(b.snapshot().stats.upgradeRanks),ranks,'stale offer ignored');
  const second=b.nodes.upgradeChoices.children[0];b.document.hidden=true;second.click();assert.equal(b.snapshot().level,3,'hidden choice ignored');b.document.hidden=false;second.click();
  assert.equal(b.snapshot().level,4);b.nodes.upgradeChoices.children[0].click();assert.equal(b.snapshot().state,'playing');assert.equal(b.snapshot().xp,0);assert.equal(b.rafCount(),1);
  const x=b.snapshot().elapsed;b.advance(.1);assert.ok(b.snapshot().elapsed>x,'loop restarts after final choice');
  b.test.set({stats:require('../firefly-watch/rules').UPGRADES.reduce((s,u)=>{for(let i=0;i<u.maxRank;i++)s=require('../firefly-watch/rules').applyUpgrade(s,u.id);return s;},b.snapshot().stats)});
  b.test.gainXp(1000);assert.equal(b.snapshot().state,'playing');assert.ok(b.snapshot().xp<require('../firefly-watch/rules').xpNeeded(b.snapshot().level));
});

test('Firefly input owners survive unrelated releases, but not suspension', () => {
  const b=boot(); b.nodes.startButton.click();
  b.key('ArrowRight'); b.nodes.moveRight.dispatch('pointerdown',{pointerId:1}); b.nodes.moveRight.dispatch('pointerup',{pointerId:1});
  let x=b.snapshot().player.x;b.advance(.1);assert.ok(b.snapshot().player.x>x,'keyboard survives pointer release');
  b.emit('window','keyup',{code:'ArrowRight'});
  b.nodes.moveRight.dispatch('pointerdown',{pointerId:1});b.nodes.moveRight.dispatch('pointerdown',{pointerId:2});b.nodes.moveRight.dispatch('pointerup',{pointerId:1});
  x=b.snapshot().player.x;b.advance(.1);assert.ok(b.snapshot().player.x>x,'second finger survives');
  b.emit('window','blur');assert.equal(b.snapshot().state,'paused');assert.equal(b.rafCount(),0);
  b.nodes.startButton.click();x=b.snapshot().player.x;b.advance(.1);assert.equal(b.snapshot().player.x,x,'resume has no stuck input');
  b.key('KeyP',{repeat:true});assert.equal(b.snapshot().state,'playing');
  assert.equal(b.key('KeyP',{ctrlKey:true}).defaultPrevented,undefined);
  b.key('KeyP',{target:{isContentEditable:true}});assert.equal(b.snapshot().state,'playing');
  b.nodes.game.dispatch('pointerdown',{pointerId:4});b.nodes.game.dispatch('pointerdown',{pointerId:5,clientX:500});
  b.nodes.game.dispatch('pointermove',{pointerId:4,clientX:102});x=b.snapshot().player.x;b.advance(.1);assert.equal(b.snapshot().player.x,x,'tiny drag has dead zone');
  b.nodes.game.dispatch('pointermove',{pointerId:4,clientX:150});b.advance(.1);assert.ok(b.snapshot().player.x>x,'first drag owner retained');
  b.emit('window','pagehide');assert.equal(b.snapshot().state,'paused');
});


test('Firefly clock retains real play time at 15/30/60/120Hz and rests on title/pause/result', () => {
  for (const hz of [15,30,60,120]) {
    const b=boot(); const idle=b.paints(); b.advance(1,hz);
    assert.equal(b.paints(),idle,'title must not repaint');
    b.nodes.startButton.click(); b.advance(2,hz);
    assert.ok(Math.abs(b.snapshot().elapsed-2)<.02,`clock at ${hz}Hz: ${b.snapshot().elapsed}`);
    b.nodes.pauseButton.click(); const before=b.snapshot(), paints=b.paints(); b.advance(10,hz);
    assert.equal(b.snapshot().elapsed,before.elapsed); assert.equal(b.paints(),paints); assert.equal(b.rafCount(),0);
    b.nodes.startButton.click(); b.advance(.2,hz); assert.ok(b.snapshot().elapsed<2.22);
    b.test.finishGame(false); const end=b.paints();b.advance(1,hz);assert.equal(b.paints(),end);
  }
});
