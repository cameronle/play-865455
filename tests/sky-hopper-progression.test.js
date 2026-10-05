'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createHopper}=require('./helpers/doodle-harness');
const Rules=require('../sky-hopper/rules');
const os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('height progression changes at 100 300 and 600 meters and is capped',()=>{
  assert.ok(fs.existsSync('sky-hopper/progression.js'),'height progression module is missing');
  const P=require('../sky-hopper/progression');
  assert.deepEqual([0,999,1000,2999,3000,5999,6000].map(h=>P.stage(h).id),[0,0,1,1,2,2,3]);
  const early=P.stage(0),late=P.stage(6000);
  assert.ok(late.widthMax<early.widthMin);assert.ok(late.gapMin>early.gapMax);
  assert.deepEqual(P.stage(1e9),late);
  for(const h of [NaN,Infinity,-10,undefined])assert.equal(P.stage(h).id,0);
});

test('segment sequence avoids repeats and adds a recovery after two challenges',()=>{
  const P=require('../sky-hopper/progression');assert.equal(typeof P.segment,'function','segment planner is missing');
  const seen=new Set();let route={};
  for(let n=0;n<120;n++){const s=P.segment(6000,route,()=>((n*17)%97)/97);
    assert.notEqual(s.kind,route.kind,'repeated adjacent segments');
    if(route.streak===2)assert.equal(s.kind,'recovery');
    seen.add(s.kind);route=s;
  }
  for(const kind of ['stairs','switchback','span','moving','fragile','spring','recovery'])assert.ok(seen.has(kind),kind);
  for(let n=0;n<10;n++)assert.ok(['stairs','switchback','recovery'].includes(P.segment(0,{},()=>n/10).kind));
});
test('baseline source can run through the same VM harness for difficulty comparisons',()=>{
  const g=createHopper(1,{source:'(()=>{const baselineMarker=17;})();'});assert.equal(g.run('baselineMarker'),17);
});
test('same random seed reproduces the complete route and rewards',()=>{
  const states=[0,1].map(()=>{const g=createHopper(123);g.run('reset();cameraY=-12000;generatePlatforms()');return g.snapshot();});
  assert.deepEqual(states[0],states[1]);
});
test('generated routes use distinct segments, phase bounds and reachable seams',()=>{
  const g=createHopper(17);g.run('reset();cameraY=-12000;generatePlatforms()');
  const main=g.snapshot().platforms.filter(p=>p.safe);
  assert.ok(main.every(p=>Number.isInteger(p.id)),'stable platform ids are missing');
  assert.equal(new Set(main.map(p=>p.id)).size,main.length);
  const seen=new Set(main.map(p=>p.segment));
  for(const kind of ['stairs','switchback','span','moving','fragile','spring','recovery'])assert.ok(seen.has(kind),kind);
  for(let i=1;i<main.length;i++){
    const p=main[i],prev=main[i-1];assert.equal(p.type,'normal');
    assert.ok(prev.y-p.y<=128,'vertical reserve');assert.ok(Rules.hasSafeApproach(prev,p),'unsafe seam '+i);
  }
  const first=main.find(p=>p.stage===0&&p.w<180),late=main.find(p=>p.stage===3);
  assert.ok(late.w<first.w,'late platforms should be narrower');
});
test('reward branches have explicit entries and exits and moving stars follow their platform',()=>{
  const g=createHopper(17);g.run('reset();cameraY=-12000;generatePlatforms()');
  const s=g.snapshot(),bonus=s.platforms.filter(p=>!p.safe);
  assert.ok(bonus.length>5);
  for(const p of bonus){
    const entry=s.platforms.find(q=>q.id===p.entryId),exit=s.platforms.find(q=>q.id===p.exitId);
    assert.ok(entry&&exit,'branch entrance or exit missing');
    assert.ok(Rules.canReach(entry,p),'unreachable branch');
    assert.ok(Rules.canReach(p,exit,{speed:p.type==='spring'?900:670}),'no branch exit');
  }
  const moving=bonus.find(p=>p.type==='moving');assert.ok(moving,'moving branch missing');
  const star=s.stars.find(q=>q.platformId===moving.id);assert.ok(star,'moving reward is not attached');
  g.run(`cameraY=0;platforms=platforms.filter(p=>p.id===${moving.id});stars=stars.filter(s=>s.platformId===${moving.id});nextPlatformY=-1e6;player.y=500;player.vy=-100;update(1/120)`);
  const after=g.snapshot();assert.equal(after.stars[0].x,after.platforms[0].x+star.offsetX);
  g.run('for(let n=0;n<240;n++){player.y=500;player.vy=-100;update(1/120)}');
  const p=g.snapshot().platforms[0];assert.ok(Number.isFinite(p.minX)&&p.x>=p.minX&&p.x<=p.maxX,'moving reward escapes its readable lane');
});
test('route audit records phase coverage, branch exits and sustained runtime pilots',()=>{
  const out=fs.mkdtempSync(path.join(process.env.TMPDIR||os.tmpdir(),'hop-v2-test-'));
  try{
    const run=spawnSync(process.execPath,['scripts/qa-sky-hopper.js','--seeds','2','--pilots','2'],{env:{...process.env,HOPPER_QA_DIR:out},encoding:'utf8'});
    assert.equal(run.status,0,run.stderr+run.stdout.slice(-2000));
    const s=JSON.parse(fs.readFileSync(path.join(out,'summary.json'),'utf8'));
    assert.equal(s.seedCount,2);assert.equal(s.simulatedPilotRuns.length,2);
    assert.deepEqual(s.stages,[0,1,2,3]);assert.equal(s.branchFailures,0);assert.ok(s.branchEdges>0);
    assert.equal(s.pilotTargetMeters,1000);assert.equal(s.pilotFailures,0);
  }finally{fs.rmSync(out,{recursive:true,force:true});}
});
