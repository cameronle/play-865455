#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHopper}=require('../tests/helpers/doodle-harness.js');
const Rules=require('../sky-hopper/rules.js'),Progression=require('../sky-hopper/progression.js');
function argument(name,fallback,max){const i=process.argv.indexOf(name),n=i<0?fallback:Number(process.argv[i+1]);assert.ok(Number.isInteger(n)&&n>=1&&n<=max,'invalid '+name);return n;}
const count=argument('--seeds',2000,10000),pilotCount=argument('--pilots',64,500);
const out=process.env.HOPPER_QA_DIR||path.join(process.env.TMPDIR||require('node:os').tmpdir(),'hopper-playability-v2');
fs.mkdirSync(out,{recursive:true});const rowsPath=path.join(out,'routes.jsonl');fs.writeFileSync(rowsPath,'');
const game=createHopper();let batch=[];
for(let seed=1;seed<=count;seed++){
  game.seed(seed);game.run('reset();cameraY=-20000;generatePlatforms()');
  const s=game.snapshot(),main=s.platforms.filter(p=>p.safe),bonus=s.platforms.filter(p=>!p.safe),failures=[],branchFailures=[];
  for(let i=1;i<main.length;i++){
    const from=main[i-1],to=main[i],cap=to.segment==='start'?107:Progression.stage(Math.max(0,300-to.y)).gapMax;
    if(to.type!=='normal'||from.y-to.y>cap+1e-6||!Rules.hasSafeApproach(from,to))failures.push({i,from,to});
  }
  for(const p of bonus){
    const entry=s.platforms.find(q=>q.id===p.entryId),exit=s.platforms.find(q=>q.id===p.exitId),speed=p.type==='spring'?900:670;
    const poses=p.type==='moving'?[p.minX,p.x,p.maxX]:[p.x];
    if(!entry||!exit||!poses.every(x=>Rules.canReach(entry,{...p,x})&&[-330,0,330].every(vx=>Rules.canReach({...p,x},exit,{speed,vx}))))branchFailures.push({p,entry,exit});
  }
  batch.push({seed,mainPlatforms:main.length,edges:main.length-1,bonus:bonus.length,stages:[...new Set(main.map(p=>p.stage))],segments:[...new Set(main.map(p=>p.segment))],fallbacks:main.filter(p=>p.fallback).length,passed:failures.length===0&&branchFailures.length===0,failures,branchFailures});
  if(seed%100===0||seed===count){fs.appendFileSync(rowsPath,batch.map(row=>JSON.stringify(row)).join('\n')+'\n');batch=[];}
}
const rows=fs.readFileSync(rowsPath,'utf8').trim().split('\n').map(line=>JSON.parse(line));assert.equal(rows.length,count);
function pilot(seed,risk=false){
  game.seed(seed);
  return JSON.parse(game.run(`JSON.stringify((()=>{
    reset();let target=platforms.find(p=>p.safe&&p.y<568+1),landings=0,riskLandings=0,lastBounce=lastLandingId,tick=0,pausedOnce=false,reason='timeout';
    for(;tick<24000&&state==='playing'&&highest<10000;tick++){
      if(!target){reason='missing target';break;}
      const dir=Rules.steerTowards(player.x+player.w/2,player.vx,target.x+target.w/2);input.left=dir<0;input.right=dir>0;
      update(Rules.PHYSICS.step);
      if(lastLandingId!==lastBounce){
        lastBounce=lastLandingId;landings++;const landed=platforms.find(p=>p.id===lastLandingId),foot=player.y+player.h+cameraY;
        if(landed?.routeRole==='bonus')riskLandings++;
        target=${risk}?platforms.find(p=>p.entryId===lastLandingId&&!p.touched&&!p.broken):null;
        if(!target)target=platforms.find(p=>p.safe&&p.y<foot-1);
      }
      if(!pausedOnce&&highest>4000){const before=JSON.stringify({player,highest,score,combo,goal});togglePause();update(.5);if(JSON.stringify({player,highest,score,combo,goal})!==before)throw Error('pause mutated run');togglePause();pausedOnce=true;}
    }
    if(state!=='playing')reason='fall';else if(highest>=10000)reason='target reached';
    return {seed:${seed},policy:${JSON.stringify(risk?'bonus-choice':'main-route')},passed:state==='playing'&&highest>=10000,height:Math.floor(highest/10),landings,riskLandings,lastBounce,seconds:tick*Rules.PHYSICS.step,pausedOnce,state,reason};
  })())`));
}
const pilots=Array.from({length:pilotCount},(_,i)=>pilot(i+1));
const bonusPilots=Array.from({length:Math.min(16,pilotCount)},(_,i)=>pilot(i+1,true));
const summary={seedCount:rows.length,failedSeeds:rows.filter(row=>!row.passed).length,edges:rows.reduce((sum,row)=>sum+row.edges,0),entryStatesPerEdge:9,branchEdges:rows.reduce((sum,row)=>sum+row.bonus*2,0),branchFailures:rows.reduce((sum,row)=>sum+row.branchFailures.length,0),fallbacks:rows.reduce((sum,row)=>sum+row.fallbacks,0),stages:[...new Set(rows.flatMap(r=>r.stages))].sort(),segments:[...new Set(rows.flatMap(r=>r.segments))].sort(),pilotTargetMeters:1000,simulatedPilotRuns:pilots,pilotFailures:pilots.filter(p=>!p.passed).length,bonusPilotRuns:bonusPilots,bonusPilotFailures:bonusPilots.filter(p=>!p.passed).length,evidence:rowsPath};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
assert.equal(summary.failedSeeds,0,'unreachable route; inspect routes.jsonl');assert.equal(summary.pilotFailures,0,'actual-game main pilot failed');assert.equal(summary.bonusPilotFailures,0,'actual-game bonus pilot failed');
