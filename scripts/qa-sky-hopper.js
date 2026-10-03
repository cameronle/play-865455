#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHopper}=require('../tests/helpers/doodle-harness.js');
const Rules=require('../sky-hopper/rules.js');
const flag=process.argv.indexOf('--seeds');
const count=flag<0?2000:Number(process.argv[flag+1]);
assert.ok(Number.isInteger(count)&&count>=1&&count<=10000,'invalid seed count');
const out=process.env.HOPPER_QA_DIR||path.join(process.env.TMPDIR||require('node:os').tmpdir(),'doodle-hop-qa');
fs.mkdirSync(out,{recursive:true});const rowsPath=path.join(out,'routes.jsonl');fs.writeFileSync(rowsPath,'');
const game=createHopper();let batch=[];
for(let seed=1;seed<=count;seed++){
  game.seed(seed);game.run('reset();cameraY=-20000;generatePlatforms()');
  const s=game.snapshot(),main=s.platforms.filter(p=>p.safe),failures=[];
  for(let i=1;i<main.length;i++){
    const from=main[i-1],to=main[i];
    if(to.type!=='normal'||from.y-to.y>120||!Rules.hasSafeApproach(from,to))failures.push({i,from,to});
  }
  batch.push({seed,mainPlatforms:main.length,edges:main.length-1,bonus:s.platforms.length-main.length,passed:failures.length===0,failures});
  if(seed%100===0||seed===count){fs.appendFileSync(rowsPath,batch.map(row=>JSON.stringify(row)).join('\n')+'\n');batch=[];}
}
const rows=fs.readFileSync(rowsPath,'utf8').trim().split('\n').map(line=>JSON.parse(line));
assert.equal(rows.length,count);
const routeFailures=rows.filter(row=>!row.passed);
const pilots=[];
for(const seed of [1,2,3,7,17,29,51,101,341,999,1407,2000]){
  game.seed(seed);
  const result=JSON.parse(game.run(`JSON.stringify((()=>{
    reset();let target=platforms.find(p=>p.safe&&p.y<568+1),landings=0;
    for(let tick=0;tick<15000&&state==='playing'&&highest<2500;tick++){
      // A spring can skip an intended waypoint; follow the actual landing, not a stale target.
      if(!target)return {seed:${seed},passed:false,reason:'missing target'};
      const dir=Rules.steerTowards(player.x+player.w/2,player.vx,target.x+target.w/2);
      input.left=dir<0;input.right=dir>0;const wasFalling=player.vy>0;update(Rules.PHYSICS.step);
      if(wasFalling&&player.vy<0){landings++;const foot=player.y+player.h+cameraY;target=platforms.find(p=>p.safe&&p.y<foot-1);}
    }
    return {seed:${seed},passed:state==='playing'&&highest>=2500,height:Math.floor(highest/10),landings,state};
  })())`));
  pilots.push(result);
}
const summary={seedCount:rows.length,failedSeeds:routeFailures.length,edges:rows.reduce((sum,row)=>sum+row.edges,0),entryStatesPerEdge:9,simulatedPilotRuns:pilots,pilotFailures:pilots.filter(p=>!p.passed).length,evidence:rowsPath};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
assert.equal(routeFailures.length,0,'unreachable main route; inspect routes.jsonl');assert.equal(summary.pilotFailures,0,'actual-game pilot failed');
