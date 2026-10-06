"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../shooter/content"),R=require("../shooter/rules");
test("v4 uses isolated records while explicitly reading v3 and v2 at original bounds",()=>{
 assert.equal(C.RECORD_KEY,"sky-patrol-records-v4");assert.equal(C.PREVIOUS_RECORD_KEY,"sky-patrol-records-v3");assert.equal(C.LEGACY_RECORD_KEY,"sky-patrol-records-v2");
 const old=JSON.stringify({version:3,normal:{best:202075,farthest:15,clears:1}});
 assert.equal(R.readRecords(old).normal.best,0);assert.equal(R.readRecords(old,{version:3,totalStages:15}).normal.best,202075);assert.equal(R.readRecords(null).version,4);
});
