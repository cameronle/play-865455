"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),{Game}=require("../shooter/rules"),{decide}=require("../scripts/shooter-pilot");
test("detached pilot targets the currently open alternating part rather than the sealed left part",()=>{
 const g=new Game();g.start();g.enterBoss("twin-armored");g.phase="boss";g.boss.y=110;g.boss.age=4.6;g.player.y=550;
 const s=g.snapshot(),before=JSON.stringify(s),action=decide(s);
 assert.equal(action.x,1,"right part is open during this window");assert.equal(JSON.stringify(s),before);
});
