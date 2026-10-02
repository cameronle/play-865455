'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),D=require('../bubble-tanks/content.js'),R=require('../bubble-tanks/rules.js');
test('the approved roster has unique, bilingual, bounded records and twelve real weapon branches',()=>{
 for(const[key,count]of Object.entries({chassis:6,guns:12,skills:8,passives:24,relics:12,synergies:18,enemies:20,branches:12})){
  assert.equal(D[key]?.length,count,key);assert.equal(new Set(D[key].map(x=>x.id)).size,count,key+' ids');
  for(const item of D[key]){assert.equal(item.name.length,2,item.id);assert.ok(item.description.every(x=>typeof x==='string'&&x.length>8),item.id);}
 }
 for(const gun of D.guns){assert.ok(gun.cost>0&&gun.cooldown>0);assert.ok(D.branches.some(b=>b.gun===gun.id));}
 assert.equal(new Set(D.upgrades.map(x=>x.id)).size,D.upgrades.length);
});
test('new skills replace one equipped slot and irrelevant swarm/beam cards stay out of a starter draft',()=>{
 const p=R.createPlayer();assert.equal(p.skill,'overload');assert.equal(R.applyUpgrade(p,'swarm'),true);assert.equal(p.skill,'swarm');assert.equal(R.applyUpgrade(p,'emp'),true);assert.equal(p.skill,'emp');assert.ok(p.skills.includes('swarm'));
 assert.equal(R.canUpgrade(R.createPlayer(),D.upgrades.find(x=>x.id==='swarm_expand')),false);
 assert.equal(R.canUpgrade(R.createPlayer(),D.upgrades.find(x=>x.id==='beam_branch')),false);
});
test('all six chassis retain distinct geometry and shell differs from mass retention',()=>{
 const shapes=D.chassis.map(c=>JSON.stringify(R.bodyShape(R.createPlayer(c.id))));assert.equal(new Set(shapes).size,6);
 const base=R.createPlayer(),shell=R.createPlayer(),conserve=R.createPlayer();for(const p of [base,shell,conserve]){p.mass=100;p.shield=4;}shell.passives.shell=2;conserve.passives.conserve=2;
 R.damage(base,10);R.damage(shell,10);R.damage(conserve,10);assert.ok(shell.mass>base.mass);assert.ok(conserve.mass>base.mass);
 const p=R.createPlayer();p.mass=65;assert.equal(R.applyUpgrade(p,'pierce'),true);assert.equal(R.applyUpgrade(p,'pierce_branch'),true);assert.equal(p.branches.pierce,true);assert.equal(R.applyUpgrade(p,'glass_core'),true);assert.equal(p.relics.glass_core,1);
});
