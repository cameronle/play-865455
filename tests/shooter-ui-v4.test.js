"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),{createShooter}=require("./helpers/shooter-runtime"),C=require("../shooter/content"),Renderer=require("../shooter/renderer");
test("all nine aircraft have distinct self-drawn silhouettes",()=>{
 const shapes=Object.keys(C.ENEMIES).map(type=>{assert.ok(Array.isArray(Renderer.SHAPES[type]),type);return JSON.stringify(Renderer.SHAPES[type]);});assert.equal(new Set(shapes).size,9);
});
test("HTML loads every extracted simulation dependency before rules",()=>{
 const html=fs.readFileSync("shooter/index.html","utf8");for(const name of ["director","enemies"])assert.ok(html.indexOf(name+".js")>=0&&html.indexOf(name+".js")<html.indexOf("rules.js"));
});
test("v4 displays v3 score 202075 read-only and offers finite chapter supply through real button handlers",()=>{
 const old=JSON.stringify({version:3,normal:{best:0,farthest:0,clears:0},challenge:{best:202075,farthest:15,clears:1}}),a=createShooter({storage:{"sky-patrol-records-v3":old}});
 a.element("challengeButton").click();assert.match(a.element("legacyBest").textContent,/202075/);assert.equal(a.snapshot().best,0);
 a.element("startButton").click();a.run('g.level=3;g.lives=1;g.pulses=0;g.finishStage();sync()');
 assert.equal(a.element("supplySelect").hidden,false);assert.equal(a.element("startButton").disabled,true);
 a.element("supplyPulseButton").click();assert.equal(a.snapshot().pulses,1);assert.equal(a.snapshot().lives,1);assert.equal(a.element("startButton").hidden,false);assert.match(a.element("startButton").textContent,/下一关.*3/);
 a.element("supplyLifeButton").click();assert.equal(a.snapshot().lives,1);a.frames(1.3);assert.equal(a.snapshot().level,3);a.frames(1.8);assert.equal(a.snapshot().level,4);
 assert.equal(a.store.get("sky-patrol-records-v3"),old);assert.equal(JSON.parse(a.store.get(C.RECORD_KEY)).version,4);
});
