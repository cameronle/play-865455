'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
function run(env,mode='smoke'){return spawnSync(process.execPath,['scripts/qa-fish-feast.mjs','http://127.0.0.1:1','invalid-fixture',mode],{env:{...process.env,FISH_CDP_URL:'http://127.0.0.1:1',...env},encoding:'utf8',timeout:5000});}
test('native QA rejects malformed seeds before touching a browser',()=>{
 for(const seed of ['0','-1','1.5','hello','4294967296']){const r=run({FISH_QA_SEED:seed});assert.equal(r.error,undefined);assert.notEqual(r.status,0);assert.match(r.stderr,/Invalid native QA seed/);}
});
test('endgame QA requires earned progress rather than silently unlocking levels',()=>{
 const r=run({FISH_QA_SEED:'92',FISH_QA_PROGRESS:''},'endgame');assert.equal(r.error,undefined);assert.notEqual(r.status,0);assert.match(r.stderr,/Endgame QA requires an earned progress file/);
});
