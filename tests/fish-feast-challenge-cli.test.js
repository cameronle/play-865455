'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('challenge balance CLI rejects an empty sampling matrix rather than reporting success',()=>{
 const out=fs.mkdtempSync(path.join(process.env.TMPDIR||os.tmpdir(),'fish-balance-cli-'));
 try{
  const r=spawnSync(process.execPath,['scripts/verify-fish-challenge.js'],{env:{...process.env,FISH_CHALLENGE_OUT:out,FISH_CHALLENGE_SEEDS:'0'},encoding:'utf8',timeout:5000});
  assert.equal(r.error,undefined);assert.notEqual(r.status,0);assert.match(r.stderr,/Invalid challenge sampling matrix/);
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});
