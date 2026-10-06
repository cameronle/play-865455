"use strict";
const assert = require("node:assert/strict"),
  { Game } = require("../shooter/rules"),
  C = require("../shooter/content"),
  { decide } = require("./shooter-pilot");
function run({ seed = 1, mode = "normal", controller = decide } = {}) {
  const g = new Game({ seed, mode });
  g.start();
  const stages = [],
    events = [],
    stageRows = [],
    seen = new Set();
  const visible=e=>!e.dead&&e.x+e.w/2>0&&e.x-e.w/2<C.W&&e.y+e.h/2>0&&e.y-e.h/2<C.H;
  let previousLevel = 0;
  for (let i = 0; i < 20000 && !["clear", "gameover"].includes(g.state); i++) {
    if (g.level !== previousLevel) {
      previousLevel = g.level;
      stages.push({ level: g.level, start: g.time });
    }

    const s = g.snapshot(),
      before = JSON.stringify(s),
      action = controller(s);
    assert.equal(
      JSON.stringify(s),
      before,
      "pilot must not mutate observation",
    );
    if(g.state==="intermission"){if(g.supplyPending)g.chooseSupply(action.supply);g.nextStage();}
    let row=stageRows.at(-1);
    if(!row||row.level!==g.level){const stage=C.STAGES[g.level-1];row={level:g.level,boss:stage.boss,planned:stage.waves.flatMap(w=>w.groups).reduce((n,q)=>n+q.count,0),admitted:0,summoned:0,queued:0,escaped:0,seconds:0,aircraftEmpty:0,pressureIdle:0,maxPressureIdle:0,visiblePeak:0,bulletPeak:0,hazardOverlapSeconds:0,waveRows:[],player:{xMin:g.player.x,xMax:g.player.x,yMin:g.player.y,yMax:g.player.y},hits:0,shieldUsed:0,pulseUsed:0};stageRows.push(row);}
    const phase=g.phase,wave=g.wave,time=g.time,stats={...g.stats};
    let w;
    if(phase==="wave"){w=row.waveRows.find(w=>w.wave===wave);if(!w){w={wave,tactic:C.STAGES[g.level-1].waves[wave].tactic,planned:C.STAGES[g.level-1].waves[wave].groups.reduce((n,q)=>n+q.count,0),admitted:0,seconds:0,visiblePeak:0,aircraftEmpty:0};row.waveRows.push(w);}}
    if (action.pulse) g.pulse();
    g.step(0.1, { x: action.x, y: action.y });
    const dt=g.time-time,n=g.enemies.filter(visible).length;
    row.seconds+=dt;for(const key of ["admitted","summoned","queued","escaped","hits","shieldUsed","pulseUsed"])row[key]+=g.stats[key]-stats[key];
    row.visiblePeak=Math.max(row.visiblePeak,n);row.bulletPeak=Math.max(row.bulletPeak,g.enemyBullets.filter(visible).length);
    if(g.hazards.length>1)row.hazardOverlapSeconds+=dt;
    const p=row.player;p.xMin=Math.min(p.xMin,g.player.x);p.xMax=Math.max(p.xMax,g.player.x);p.yMin=Math.min(p.yMin,g.player.y);p.yMax=Math.max(p.yMax,g.player.y);
    if(w){w.seconds+=dt;w.visiblePeak=Math.max(w.visiblePeak,n);if(!n&&g.phase==="wave")w.aircraftEmpty+=dt;
      if(g.phase==="wave"){if(!n)row.aircraftEmpty+=dt;const pressure=n+g.enemyBullets.filter(visible).length+g.hazards.length;row.pressureIdle=pressure?0:row.pressureIdle+dt;row.maxPressureIdle=Math.max(row.maxPressureIdle,row.pressureIdle);}}

    for (const e of g.events) {
      const key = JSON.stringify(e);
      if (!seen.has(key)) {
        seen.add(key);
        events.push(e);
        if(e.type==="admission"&&!e.value.summoned){const stage=stageRows.find(r=>r.level===e.level),blueprint=C.STAGES[e.level-1].waves[e.value.wave];let w=stage.waveRows.find(w=>w.wave===e.value.wave);if(!w){w={wave:e.value.wave,tactic:blueprint.tactic,planned:blueprint.groups.reduce((n,q)=>n+q.count,0),admitted:0,seconds:0,visiblePeak:0,aircraftEmpty:0};stage.waveRows.push(w);}w.admitted+=e.value.count;}

      }
    }
  }
  for(const row of stageRows){const es=events.filter(e=>e.level===row.level),ready=es.find(e=>e.type==="boss-ready"),defeated=es.find(e=>e.type==="boss-defeated");row.bossSeconds=ready&&defeated?defeated.time-ready.time:null;row.attacks=[...new Set(es.filter(e=>e.type==="boss-attack").map(e=>e.value))];row.attackDetails=es.filter(e=>e.type==="attack-detail").map(e=>e.value);row.phases=es.filter(e=>e.type==="boss-phase").map(e=>e.value);row.resources=g.stats.stageResources.find(r=>r.level===row.level)||null;}
  return {
    seed,
    mode,
    controller: controller === decide ? "collision-aware" : "custom ordinary-input",
    state: g.state,
    time: g.time,
    score: g.score,
    lives: g.lives,
    stages,
    stageRows,
    stats: g.stats,
    events,
  };
}
function verify() {
  const rows = [1, 17, 99].map((seed) => run({ seed }));
  const challengeRows = [1,17,99].map(seed=>run({seed,mode:"challenge"}));
  const negative = run({ controller: () => ({ x: 0, y: 0 }) });
  const challengeNegative = run({mode:"challenge",controller:()=>({x:0,y:0})});
  const axisNegative = run({mode:"challenge",controller:s=>({x:Math.floor(s.time/1.2)%2?1:-1,y:0})});
  for (const r of [...rows,...challengeRows]) {
    assert.equal(
      r.state,
      "clear",
      JSON.stringify({
        state: r.state,
        time: r.time,
        level: r.stages.at(-1),
        hits: r.stats.hits,
      }),
    );
    assert.deepEqual(
      r.stages.map((s) => s.level),
      C.STAGES.map(s=>s.id),
    );
    assert.deepEqual(
      Object.keys(r.stats.encounters).sort(),
      Object.keys(C.ENEMIES).sort(),
    );
    assert.deepEqual(r.stats.bosses, C.STAGES.map(s=>s.boss));
    for (const key of ["enemies", "enemyBullets", "hazards"])
      assert.ok(r.stats.peaks[key] <= C.LIMITS[key]);
    assert.equal(r.events.filter((e) => e.type === "boss-defeated").length, C.STAGES.length);
    assert.deepEqual(r.events.filter(e=>e.type==="chapter-reward").map(e=>e.level),[3,6,9,12]);
    assert.ok(r.time>=1125 && r.time<=1500,"15-stage simulation stays within the approved 18.75–25 minute budget");
  }
  assert.equal(
    negative.state,
    "gameover",
    "shoot-only negative control must not clear",
  );
  assert.equal(challengeNegative.state,"gameover","challenge stationary control must fail");
  assert.equal(axisNegative.state,"gameover","simple single-axis oscillation must fail");
  return {
    kind: "accelerated deterministic simulation, not human play",
    note: "Authored rosters and quotas are fixed; seeds mirror entry lanes. All agreed seeds are retained. No retry, HP edit, jump or invulnerability.",
    rows,
    challengeRows,
    negative,
    challengeNegative,
    axisNegative,
  };
}
if (require.main === module) {
  const report = verify();
  console.log(JSON.stringify(report));
}
module.exports = { run, verify };
