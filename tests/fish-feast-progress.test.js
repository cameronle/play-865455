'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function progress(){assert.ok(fs.existsSync('fish-feast/progress.js'),'Sequential progress module is missing');return require('../fish-feast/progress.js');}
test('completion unlocks exactly one next level and cannot skip a locked stage',()=>{
 const P=progress();let p=P.read(null);assert.equal(p.unlocked,1);assert.equal(P.canPlay(p,1),true);assert.equal(P.canPlay(p,2),false);
 const unchanged=JSON.stringify(p);assert.equal(P.record(p,5,600,true),false);assert.equal(JSON.stringify(p),unchanged);
 for(let id=1;id<=12;id++){assert.ok(P.record(p,id,100+id,true));assert.equal(p.unlocked,Math.min(12,id+1));assert.equal(p.completed.includes(id),true);}
 assert.equal(p.completed.length,12);assert.ok(P.record(p,1,5,false));assert.equal(p.best[1],101);assert.equal(p.unlocked,12);
});
test('bad and legacy records are sanitized and last-level settings never unlock a locked level',()=>{
 const P=progress();
 const saved=P.read(JSON.stringify({version:1,unlocked:5,best:{1:88,2:-5,3:'99',4:123,12:999},completed:[1,2,2,4,12]}));
 assert.equal(saved.unlocked,5);assert.equal(saved.best[1],88);assert.equal(saved.best[4],123);assert.equal(saved.best[2],undefined);assert.equal(saved.best[3],undefined);assert.equal(saved.best[12],undefined);assert.ok(!saved.completed.includes(12));
 const legacy=P.read(JSON.stringify({version:1,unlocked:3,best:{1:40,2:55}}));assert.deepEqual(legacy.completed,[1,2]);
 for(const raw of ['{','null','[]',JSON.stringify({version:2,unlocked:12,best:{}}),JSON.stringify({version:1,unlocked:99,best:{}}),JSON.stringify({version:1,unlocked:5,best:[]})])assert.equal(P.read(raw).unlocked,1);
 assert.equal(P.settings(JSON.stringify({version:1,lastLevel:3}),saved).lastLevel,3);
 assert.equal(P.settings(JSON.stringify({version:1,lastLevel:12}),saved).lastLevel,5);
 assert.equal(P.settings('{',saved).lastLevel,5);
});
