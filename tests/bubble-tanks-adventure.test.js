'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../bubble-tanks/world.js');
const R = require('../bubble-tanks/rules.js');
const C = require('../bubble-tanks/combat.js');
const fs = require('node:fs');
function adventure() {assert.ok(fs.existsSync('bubble-tanks/adventure.js'),'adventure rules exist'); return require('../bubble-tanks/adventure.js');}
function fresh() {const s=C.create('adventure'); C.start(s); return s;}
test('every seeded region has a reachable boss and workshop, with eight distinct encounter types', () => {
  for(let seed=0;seed<20;seed++) {
    const w=W.create(seed), types=new Set();
    assert.equal(w.bosses,0);
    for(let zone=0;zone<4;zone++) {
      const boss=W.roomAt(w,3+zone*3,0), workshop=W.roomAt(w,1+zone*3,-1);
      assert.equal(boss.type,'boss'); assert.equal(boss.zone,zone);
      assert.equal(workshop.type,'workshop'); assert.equal(workshop.zone,zone);
      assert.equal(W.roomAt(w,1+zone*3,1).type,'event');
      assert.equal(W.roomAt(w,2+zone*3,-1).type,'challenge');
      assert.equal(W.roomAt(w,2+zone*3,1).type,'elite');
      assert.equal(W.roomAt(w,1+zone*3,2).type,'hive');
      assert.equal(W.roomAt(w,zone*3,2).type,'cache');
      w.bosses=zone;
      const queue=[[zone*3,0]], seen=new Set();
      while(queue.length) {const [x,y]=queue.shift(),id=W.key(x,y); if(seen.has(id)||!W.canEnter(w,x,y)) continue; seen.add(id);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push([x+dx,y+dy]);}
      assert.ok(seen.has(boss.id) && seen.has(workshop.id));
    }
    for(let x=-3;x<=12;x++) for(let y=-3;y<=3;y++) {const room=W.roomAt(w,x,y);if(room.type!=='start') types.add(room.type);}
    assert.equal(types.size,8);
  }
});
test('region gates cannot be bypassed by another direction, and uncleared bosses seal escape',()=>{
  const s=fresh(),w=s.world,p=s.player;
  for(const [x,y] of [[4,0],[0,4],[-4,0],[2,-2]]) assert.equal(W.canEnter(w,x,y),false);
  w.position={x:2,y:0}; const old={...w.position}; const boss=W.travel(w,1,0,p); assert.equal(boss.type,'boss');
  const pos={...w.position}; assert.strictEqual(W.travel(w,-1,0,p),boss); assert.deepEqual(w.position,pos);
  boss.cleared=true; assert.ok(W.completeBoss(w,boss)); assert.equal(w.bosses,1);
  assert.equal(W.completeBoss(w,boss),false); assert.ok(W.canEnter(w,4,0)); assert.ok(W.travel(w,-1,0,p)); assert.deepEqual(w.position,old);
});
test('combat clears grant salvage once; four sequential bosses produce a single victory',()=>{
  const A=adventure(),s=fresh(),room=W.roomAt(s.world,1,0); s.world.position={x:1,y:0};
  for(const e of room.enemies) e.hp=0;
  C.step(s,{},.02); assert.equal(room.cleared,true); assert.ok(s.salvage>0);
  const cash=s.salvage; C.step(s,{},.02); assert.equal(s.salvage,cash); assert.equal(A.clear(s,room),false);
  for(let zone=0;zone<4;zone++) {
    const b=W.roomAt(s.world,3+zone*3,0); s.world.position={x:b.x,y:b.y};s.mode='running';
    for(const e of b.enemies) e.hp=0;C.step(s,{},.02);assert.equal(s.world.bosses,zone+1);
  }
  assert.equal(s.mode,'won'); const score=s.score; assert.equal(A.clear(s,W.current(s.world)),false); assert.equal(s.score,score);
});
test('normal difficulty rescues once to a safe room without deleting learned modules; hard mode does not',()=>{
  const s=fresh();s.player.loadout.push({id:'scatter',level:1,cost:3,slot:1,angle:0});
  s.world.position={x:1,y:0};C.hurtPlayer(s,W.current(s.world),1000);
  assert.equal(s.rescueLeft,0);assert.equal(s.mode,'paused');assert.deepEqual(s.world.position,{x:0,y:0});assert.ok(s.player.mass>0);
  assert.equal(s.player.loadout.length,2);s.player.invulnerable=0;C.resume(s);C.hurtPlayer(s,W.current(s.world),1000);assert.equal(s.mode,'over');
  const hard=C.create('hard','balanced','hard');C.start(hard);C.hurtPlayer(hard,W.current(hard.world),1000);assert.equal(hard.mode,'over');
});
test('workshop repairs do not farm growth; seeded stock purchases are unique and affordable',()=>{
  const A=adventure(),s=fresh();s.world.position={x:1,y:-1};s.salvage=20;s.player.mass=40;
  const before=s.player.growth;assert.equal(A.open(s,'workshop'),true);assert.equal(s.mode,'workshop');
  assert.equal(A.buy(s,'repair'),true);assert.equal(s.player.growth,before);assert.equal(s.salvage,17);assert.equal(s.player.mass,58);
  const room=W.current(s.world),id=room.stock.find(id=>R.canUpgrade(s.player,require('../bubble-tanks/content.js').upgrades.find(u=>u.id===id)));
  assert.ok(id);assert.equal(A.buy(s,id),true);const cash=s.salvage;assert.equal(A.buy(s,id),false);assert.equal(s.salvage,cash);
  s.salvage=0;assert.equal(A.buy(s,'repair'),false);assert.equal(s.player.growth,before);
});
test('events and challenges cannot reroll or repeatedly grant rewards',()=>{
  const A=adventure(),s=fresh();s.world.position={x:1,y:1};const room=W.current(s.world);assert.ok(A.open(s,'event'));
  const growth=s.player.growth;assert.ok(A.resolve(s,'leave'));assert.equal(s.player.growth,growth);assert.equal(A.resolve(s,'salvage'),false);
  const challenge=W.roomAt(s.world,2,-1);challenge.challengeHits=1;s.world.position={x:2,y:-1};const cash=s.salvage;
  for(const e of challenge.enemies)e.hp=0;A.clear(s,challenge);assert.equal(challenge.challengeWon,false);assert.equal(s.salvage,cash+2);
  const cash2=s.salvage;A.clear(s,challenge);assert.equal(s.salvage,cash2);assert.equal(room.eventResolved,true);
});
test('assembly is an isolated transaction: mounts, power, mirror cost, undo and cancel',()=>{
  const A=adventure(),s=fresh();s.player.mass=65;s.player.loadout.push({id:'scatter',cost:3,level:1,slot:1,angle:0});
  const original=structuredClone(s.player.loadout);assert.ok(A.open(s,'assembly'));assert.equal(s.mode,'assembly');
  assert.ok(A.edit(s,{type:'move',slot:1,x:20,y:18}));assert.deepEqual(s.player.loadout,original);
  assert.equal(A.edit(s,{type:'move',slot:1,x:500,y:0}),false);
  assert.ok(A.edit(s,{type:'mirror',slot:1}));assert.equal(s.draft.length,3);assert.ok(A.edit(s,{type:'undo'}));assert.equal(s.draft.length,2);
  assert.ok(A.edit(s,{type:'cancel'}));assert.deepEqual(s.player.loadout,original);assert.equal(s.mode,'running');
  assert.ok(A.open(s,'assembly'));assert.ok(A.edit(s,{type:'move',slot:1,x:20,y:18}));assert.ok(A.edit(s,{type:'commit'}));
  assert.equal(s.player.loadout[1].x,20);assert.equal(s.player.loadout[1].y,18);
  const room=W.current(s.world);s.player.angle=0;C.fireWeapon(s,room,s.player.loadout[1],null);
  assert.equal(room.shots[0].x,s.player.x+20);assert.equal(room.shots[0].y,s.player.y+18);
  assert.ok(C.playerCircles(s.player).some(c=>c.x===s.player.x+20&&c.y===s.player.y+18));
});
test('unsafe rooms and overlay states cannot open assembly or spend workshop resources',()=>{
  const A=adventure(),s=fresh();s.world.position={x:1,y:0};assert.equal(A.open(s,'assembly'),false);
  s.mode='upgrade';s.world.position={x:0,y:0};assert.equal(A.open(s,'assembly'),false);assert.equal(A.buy(s,'repair'),false);
});
