"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{run}=require("../scripts/verify-shooter-campaign");
test("campaign verifier reports actual wave visibility and preset versus summoned admissions even for a losing controller",()=>{
 const r=run({controller:()=>({x:0,y:0})});assert.equal(r.state,"gameover");assert.ok(r.stageRows?.length>0);const s=r.stageRows[0];assert.equal(s.planned,44);assert.ok(s.admitted>0);assert.ok(s.waveRows.length>0);assert.ok(s.waveRows[0].visiblePeak>0);assert.ok(s.maxPressureIdle>=0);assert.ok(s.player.xMax>=s.player.xMin);assert.ok(s.waveRows.every(w=>w.admitted<=w.planned));
});
