'use strict';
// Executable, non-injecting balance evidence. Not human win rates or phone timings.
const fs=require('node:fs'),path=require('node:path');
const C=require('../fish-feast/content.js'),R=require('../fish-feast/rules.js'),S=require('../fish-feast/simulation.js'),P=require('./fish-pilot.js');
const out=path.resolve(process.env.FISH_CHALLENGE_OUT||'../artifacts/game-qa/fish-challenge-v1'),limit=180;
const seedCount=Number(process.env.FISH_CHALLENGE_SEEDS||10),heights=(process.env.FISH_CHALLENGE_HEIGHTS||'150,520,1040').split(',').map(Number),policies=(process.env.FISH_CHALLENGE_POLICIES||'nearest,aware').split(',');
if(!process.env.FISH_CHALLENGE_SEED_IDS&&(!Number.isInteger(seedCount)||seedCount<1||seedCount>1000))throw Error('Invalid challenge sampling matrix: seed count must be 1..1000');
const seedIds=process.env.FISH_CHALLENGE_SEED_IDS?process.env.FISH_CHALLENGE_SEED_IDS.split(',').map(Number):Array.from({length:seedCount},(_,i)=>i+1),seeds=seedIds.length;
if(!seeds||seedIds.some(n=>!Number.isInteger(n)||n<1||n>4294967295)||heights.some(n=>!Number.isFinite(n)||n<=0)||policies.some(p=>!['nearest','aware'].includes(p))||[seedIds,heights,policies].some(a=>new Set(a).size!==a.length))throw Error('Invalid challenge sampling matrix');
fs.mkdirSync(out,{recursive:true});const file=path.join(out,'runs.jsonl');fs.writeFileSync(file,'');
const rows=[];
for(const height of heights)for(let index=0;index<C.levels.length;index++)for(const seed of seedIds)for(const policy of policies){
 const s=S.create(760,height,seed);S.start(s,index);let dashCount=0,firstHit=null,reverseAt=null,growthAt=null,noThreat=0,steps=0,peak=0,command;
 for(let frame=0;frame<limit/C.step&&s.mode==='playing';frame++){
  let target;
  if(policy==='aware'){if(frame%6===0){command=P.decide(s);if(command.dash&&S.dash(s))dashCount++;}target=command.target;}
  else target=s.fish.filter(f=>!f.dead&&!f.warning&&R.relation(s.player,f)==='food').sort((a,b)=>Math.hypot(a.x-s.player.x,a.y-s.player.y)-Math.hypot(b.x-s.player.x,b.y-s.player.y))[0];
  S.step(s,target?{target:{x:target.x,y:target.y}}:{});steps++;peak=Math.max(peak,s.fish.length);
  if(firstHit===null&&s.hits>0)firstHit=s.time;
  if(growthAt===null&&s.player.growth>=s.level.goal)growthAt=s.time;
  if(reverseAt===null&&S.objective(s).phase==='reverse')reverseAt=s.time;
  if(!s.fish.some(f=>!f.dead&&R.relation(s.player,f)==='danger'))noThreat++;
  if(s.fish.length>C.maxEntities||s.player.lives<0)throw Error('runtime invariant');
 }
 const row={policy,requestedHeight:height,width:s.width,height:s.height,level:index+1,seed,mode:s.mode,seconds:s.time,growth:s.player.growth,eaten:s.eaten,hits:s.hits,lives:s.player.lives,dashCount,firstHit,growthAt,reverseAt,revengeSeconds:s.mode==='won'&&reverseAt!==null?s.time-reverseAt:null,noThreatFraction:noThreat/steps,peak,objective:S.objective(s)};rows.push(row);fs.appendFileSync(file,JSON.stringify(row)+'\n');
}
if(rows.length!==heights.length*C.levels.length*seeds*policies.length)throw Error('case count mismatch');
const summary=[];
for(const height of heights)for(const level of C.levels)for(const policy of policies){const cases=rows.filter(r=>r.requestedHeight===height&&r.level===level.id&&r.policy===policy);summary.push({height,level:level.id,policy,total:cases.length,wins:cases.filter(r=>r.mode==='won').length,grown:cases.filter(r=>r.growthAt!==null).length,lost:cases.filter(r=>r.mode==='lost').length,waiting:cases.filter(r=>r.mode==='playing').length});}
const sourceHashes=Object.fromEntries(['content.js','rules.js','behaviors.js','simulation.js'].map(file=>[file,require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../fish-feast',file))).digest('hex')]));
const report={method:'Unmodified game loop; fixed step; aware policy observes at 20Hz, ordinary movement and optional real dash; nearest policy observes at every physics step, never avoids or dashes; same seeds per policy. No food/life/state injection. Simulated seconds, not human completion time or physical-phone performance.',cases:rows.length,seeds,seedIds,heights,policies,limit,sourceHashes,summary,rows};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,cases:rows.length,summary}));
