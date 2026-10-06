"use strict";
const test=require("node:test"), assert=require("node:assert/strict"), crypto=require("node:crypto");
const C=require("../shooter/content"), {Game}=require("../shooter/rules");
const hash=v=>crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
test("15-stage pack supplies a boss every stage and five explicit chapter ends with distinct upgraded waves",()=>{
 assert.equal(C.STAGES.length,15);
 assert.deepEqual(C.STAGES.map(s=>s.id),Array.from({length:15},(_,i)=>i+1));
 assert.equal(new Set(C.STAGES.map(s=>s.boss)).size,15);
 assert.deepEqual(C.STAGES.filter(s=>s.chapterEnd).map(s=>s.id),[3,6,9,12,15]);
 for(const s of C.STAGES){assert.ok(C.BOSSES[s.boss]);assert.equal(s.chapter,Math.ceil(s.id/3));}
 assert.ok(C.STAGES.every(s=>new Set(s.waves.map(w=>w.tactic)).size===s.waves.length));
 assert.equal(hash(Object.fromEntries(["scout","formation","diver","heavy","sniper","bomber"].map(k=>[k,C.ENEMIES[k]]))),"17c2872ecec642681766e14726b2692c63ace0222b97a018f0c1bb1d7a5eb36a");
 assert.equal(hash(C.MODES),"7dbc734eba4083fd5839391ab8c65052357adabb7722f398336e152ec7145cac");
 assert.equal(hash(C.LIMITS),"81dfb71b4c2cc051fe51519acf0e640801f5ed511e798717e5985f26668eed2b");
 assert.equal(new Set(Object.values(C.BOSSES).map(b=>b.kind)).size,8);
});
test("only chapter ends grant bounded single-use supply; stage 9 continues and stage 15 alone clears",()=>{
 for(const s of C.STAGES){
  const g=new Game();g.start();g.level=s.id;g.lives=1;g.pulses=0;
  g.finishStage();
  assert.equal(g.lives,s.chapterEnd&&s.id<15?2:1,`stage ${s.id} lives`);
  assert.equal(g.pulses,s.chapterEnd&&s.id<15?1:0,`stage ${s.id} pulses`);
  const ended=g.snapshot();g.finishStage();assert.deepEqual(g.snapshot(),ended);
  assert.deepEqual(g.stats.bosses,[s.boss]);
  assert.equal(g.events.filter(e=>e.type==="chapter-reward").length,s.chapterEnd&&s.id<15?1:0);
  assert.equal(g.state,s.id===C.STAGES.length?"clear":"intermission");
  assert.equal(g.nextStage(),s.id<C.STAGES.length);
  assert.ok(g.level<=C.STAGES.length);
 }
});
