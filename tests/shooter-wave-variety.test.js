"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../shooter/content");
test("v4 blueprints retain 15 bosses but contain distinct per-wave tactics and prescribed quotas",()=>{
 const counts=[44,48,26,52,56,30,56,60,34,64,68,42,68,72,48], waves=[4,4,2,4,4,2,4,4,2,5,5,3,5,5,3];
 assert.equal(C.STAGES.length,15);
 for(const [i,s] of C.STAGES.entries()){
  assert.ok(C.BOSSES[s.boss]);assert.equal(s.waves.length,waves[i]);
  assert.equal(s.waves.flatMap(w=>w.groups).reduce((n,g)=>n+g.count,0),counts[i],`stage ${s.id}`);
  const roster=s.waves.map(w=>JSON.stringify(w.groups.map(g=>[g.type,g.count,g.at])));
  assert.equal(new Set(roster).size,s.waves.length,`stage ${s.id} must not copy its wave recipe`);
  assert.equal(new Set(s.waves.map(w=>w.tactic)).size,s.waves.length);
 }
});
test("new enemy roles are introduced in order instead of randomly overwhelming the opening",()=>{
 assert.equal(Object.keys(C.ENEMIES).length,9);
 for(const [type,intro] of [["interceptor",4],["minelayer",7],["support",10]]){
  assert.equal(C.STAGES.find(s=>s.waves.some(w=>w.groups.some(g=>g.type===type))).id,intro);
 }
 for(const s of C.STAGES)for(const w of s.waves)for(const g of w.groups){assert.ok(C.ENEMIES[g.type]);assert.ok(g.count>0&&g.count<=5);assert.ok(g.at>=0&&g.at<w.minSeconds);}
});
