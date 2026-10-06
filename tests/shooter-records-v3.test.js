"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),C=require("../shooter/content"),R=require("../shooter/rules"),{createShooter}=require("./helpers/shooter-runtime");
test("15-stage records are independent v3 and old nine-stage clears stay visible/read-only",()=>{
 assert.equal(C.RECORD_KEY,"sky-patrol-records-v3");
 const old=JSON.stringify({version:2,normal:{best:1234,farthest:9,clears:2},challenge:{best:48665,farthest:9,clears:1}}),a=createShooter({storage:{"sky-patrol-records-v2":old,"sky-patrol-best":"17200"}});
 assert.equal(a.snapshot().best,0);assert.match(a.element("record").textContent,/0 \/ 15/);assert.match(a.element("legacyBest").textContent,/1234/);
 a.element("challengeButton").click();assert.match(a.element("legacyBest").textContent,/048665/);
 a.element("startButton").click();a.run('g.level=15;g.state="clear";g.score=50000;updateRecords();sync();updateRecords()');
 const r=JSON.parse(a.store.get(C.RECORD_KEY));assert.equal(r.version,3);assert.equal(r.challenge.farthest,15);assert.equal(r.challenge.clears,1);assert.equal(r.normal.clears,0);
 assert.equal(a.store.get("sky-patrol-records-v2"),old);assert.equal(a.store.get("sky-patrol-best"),"17200");
 assert.equal(R.readRecords(old).challenge.best,0);assert.equal(R.readRecords(JSON.stringify(r)).challenge.farthest,15);
 r.challenge.farthest=16;assert.equal(R.readRecords(JSON.stringify(r)).challenge.best,0);
});
test("every boss warning/tip has both languages and scoped CLEAR includes only the explicit shooter versions",()=>{
 const {TEXT}=require("../shooter/locale");
 for(const b of Object.values(C.BOSSES))for(const key of [...b.patterns,...b.challenge,...(b.final||[]),...(b.later||[]),"tip-"+b.tip])assert.ok(TEXT[key]?.every(v=>typeof v==="string"&&v.length>0),key);
 assert.match(fs.readFileSync("clear-game-data.js","utf8"),/shooter: \['sky-patrol-best', 'sky-patrol-records-v2', 'sky-patrol-records-v3'\]/);
});
