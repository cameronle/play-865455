'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../fish-feast/content.js'),S=require('../fish-feast/simulation.js'),R=require('../fish-feast/rules.js');
test('all twelve levels have legal collision-aware completions in desktop, portrait and short landscape worlds',()=>{
 assert.ok(fs.existsSync('scripts/fish-pilot.js'),'legal all-level pilot is missing');const {aim}=require('../scripts/fish-pilot.js');
 for(const height of [150,440,1040])for(let index=0;index<C.levels.length;index++)for(const seed of [1,17,92]){
  const s=S.create(760,height,seed);S.start(s,index);let peak=0;
  for(let frame=0;frame<120*110&&s.mode==='playing';frame++){const target=aim(s);S.step(s,{target});peak=Math.max(peak,s.fish.length);assert.ok(s.player.lives>=0);assert.ok(s.fish.length<=C.maxEntities);for(const f of [s.player,...s.fish]){const g=R.geometry(f);assert.ok(f.x>=g.rx-1e-8&&f.x<=s.width-g.rx+1e-8);assert.ok(f.y>=g.ry-1e-8&&f.y<=s.height-g.ry+1e-8);}}
  assert.equal(s.mode,'won',JSON.stringify({level:index+1,seed,height,time:s.time,growth:s.player.growth,lives:s.player.lives,peak}));assert.ok(s.eaten>0&&s.player.lives>0);
 }
});
