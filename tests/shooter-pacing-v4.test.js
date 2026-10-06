"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../shooter/content");
test("middle and late mixed waves close authored admission gaps rather than padding longer clears",()=>{
 for(const s of C.STAGES.filter(s=>s.id>=4))for(const w of s.waves)for(let i=1;i<w.groups.length;i++)assert.ok(w.groups[i].at-w.groups[i-1].at<=(s.chapter>=4?1.13:1.31),`stage ${s.id} ${w.tactic}`);
});
test("mixed-wave minimum follows its final admission instead of a fixed nine-second padding floor",()=>{
 for(const s of C.STAGES.filter(s=>s.id>=4))for(const w of s.waves)assert.ok(w.minSeconds<=w.groups.at(-1).at+1.81,`stage ${s.id} ${w.tactic}`);
});
