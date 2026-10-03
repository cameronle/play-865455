"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { createCave } = require("./helpers/cave-runtime.js");
test("eight seeded six-minute controller flights traverse capped-speed caves and many crystals", () => {
  const reports = [];
  for (const seed of [1, 2, 3, 4, 17, 42, 987, 2026]) {
    const g = createCave({ seed });
    g.element("startButton").click();
    const result =
      g.run(`(()=>{let spawned=0,maxCave=0,maxObstacles=0,minGap=245,violations=0;for(let i=0;i<120*360 && state==="playing";i++){
   const b=caveBoundsFor(helicopter.x-24,helicopter.x+scrollSpeed*.4+24);let top=b.top+25,bottom=b.bottom-25;
   for(const o of obstacles)if(o.x+o.w>helicopter.x-24&&o.x<helicopter.x+scrollSpeed*.65+24){if(o.fromTop)top=Math.max(top,o.y+o.h+25);else bottom=Math.min(bottom,o.y-25);}
   const target=(top+bottom)/2;setThrust((helicopter.y-target)*8+helicopter.vy>-20,null,"pilot");
   const prev=obstacles.length;update(1/120);if(obstacles.length>prev)spawned++;maxCave=Math.max(maxCave,cave.length);maxObstacles=Math.max(maxObstacles,obstacles.length);
   for(const s of cave){minGap=Math.min(minGap,s.gap);if(s.gap<150-1e-7||s.gap>245+1e-7||s.center-s.gap/2<28-1e-7||s.center+s.gap/2>452+1e-7)violations++;}
  }return{state,distance,scrollSpeed,spawned,maxCave,maxObstacles,minGap,violations};})()`);
    assert.equal(result.state, "playing", JSON.stringify({ seed, ...result }));
    assert.equal(result.scrollSpeed, 390);
    assert.ok(result.distance > 9000);
    assert.ok(result.spawned > 100);
    assert.ok(result.maxCave <= 26);
    assert.ok(result.maxObstacles <= 3);
    assert.equal(result.violations, 0);
    reports.push({ seed, ...result });
  }
  console.log("CAVE_FLIGHT_REPORT " + JSON.stringify(reports));
});
