"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { createRunner } = require("./helpers/runner-runtime.js");
test("eight seeded six-minute runner controllers traverse every stage and hazard family", () => {
  const reports = [];
  for (const seed of [1, 2, 3, 4, 17, 42, 987, 2026]) {
    const g = createRunner({ seed });
    g.element("startButton").click();
    const r = g.run(
      `(()=>{let held=0,jumps=0,maxHazards=0,maxCoins=0,maxParticles=0;const types=new Set(),stages=new Set();for(let i=0;i<120*360&&state==="playing";i++){let h=hazards.filter(h=>h.x+h.w>player.x+5).sort((a,b)=>a.x-b.x)[0];if(h&&h.x-(player.x+player.w)<scrollSpeed*.12&&player.onGround){jump("pilot");held=0;jumps++}if(jumpHeld&&(held+=1/120)>Math.max(.08,Math.min(.18,.18-(scrollSpeed-500)/4000)))releaseJump("pilot");setFastFall(!jumpHeld&&player.vy>0,"pilot");update(1/120);stages.add(currentStage(travelDistance).id);for(const h of hazards)types.add(h.type);maxHazards=Math.max(maxHazards,hazards.length);maxCoins=Math.max(maxCoins,coins.length);maxParticles=Math.max(maxParticles,particles.length)}return {state,travelDistance,scrollSpeed,jumps,maxHazards,maxCoins,maxParticles,stages:[...stages],types:[...types],stickers:stickerCount}})()`,
    );
    assert.equal(r.state, "playing", JSON.stringify({ seed, ...r }));
    assert.equal(r.scrollSpeed, 1325);
    assert.ok(r.travelDistance > 15000);
    assert.deepEqual(Array.from(r.stages), [1, 2, 3, 4]);
    for (const type of ["spike", "crate", "pencil", "ruler", "ink", "gap"])
      assert.ok(r.types.includes(type));
    assert.ok(r.maxHazards <= 12);
    assert.ok(r.maxCoins <= 50);
    assert.ok(r.maxParticles <= 150);
    reports.push({ seed, ...r });
  }
  console.log("RUNNER_FLIGHT_REPORT " + JSON.stringify(reports));
});
