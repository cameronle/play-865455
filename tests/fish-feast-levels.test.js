'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../fish-feast/content.js'),S=require('../fish-feast/simulation.js'),R=require('../fish-feast/rules.js');
test('all twelve levels have legal collision-aware completions in desktop, portrait and short landscape worlds',()=>{
 assert.ok(fs.existsSync('scripts/fish-pilot.js'),'legal all-level pilot is missing');const {decide}=require('../scripts/fish-pilot.js');
 const results=[];
 for(const height of [150,440,1040])for(let index=0;index<C.levels.length;index++)for(const seed of [1,17,92]){
  const s=S.create(760,height,seed);S.start(s,index);let peak=0,command;
  for(let frame=0;frame<120*110&&s.mode==='playing';frame++){if(frame%6===0){const before=JSON.stringify(s);command=decide(s);assert.equal(JSON.stringify(s),before,'QA observation must not mutate gameplay');if(command.dash)S.dash(s);}S.step(s,{target:command.target});peak=Math.max(peak,s.fish.length);assert.ok(s.player.lives>=0);assert.ok(s.fish.length<=C.maxEntities);for(const f of [s.player,...s.fish]){const g=R.geometry(f);assert.ok(f.x>=g.rx-1e-8&&f.x<=s.width-g.rx+1e-8);assert.ok(f.y>=g.ry-1e-8&&f.y<=s.height-g.ry+1e-8);}}
  results.push({level:index+1,seed,requestedHeight:height,width:s.width,height:s.height,mode:s.mode,time:s.time,growth:s.player.growth,lives:s.player.lives,eaten:s.eaten,peak});
 }
 if(process.env.FISH_LEVEL_REPORT)fs.writeFileSync(process.env.FISH_LEVEL_REPORT,JSON.stringify({cadenceHz:20,retries:0,results},null,2));
 assert.equal(results.length,108);assert.deepEqual(results.filter(s=>s.mode!=='won'||s.eaten<=0||s.lives<=0),[],'every original seed must have a legal completion; no retries or replaced seeds');
});
