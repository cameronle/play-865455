"use strict";
// Detached observation only. Returns ordinary direction and resource inputs;
// never changes lives, entities, clocks, stage, damage or difficulty.
const B=require("../shooter/bosses"),E=require("../shooter/enemies"),D=require("../shooter/director");
function decide(s) {
  if(s.state==="intermission")return {x:0,y:0,supply:s.lives<3?"life":"pulse"};
  const p = s.player;
  const pending=(s.threats||[]).filter(t=>t.until>s.time).flatMap(t=>(t.specs||[]).map(h=>({...h,warning:h.warning-(s.time-t.start)})));
  let target = { x: 240, y: 500 };
  if (s.boss && s.phase === "boss") {
    const b = s.boss,
      travel = Math.max(0, (p.y - b.y) / 520);
    target.x = B.forecast(b,travel).x;
    const partsActive = !b.stagedParts || b.phase === 2;
    const liveParts = partsActive ? (b.turrets || []).filter(t=>t.hp>0) : [];
    const openSide = Math.floor((b.age+travel) / b.partWindow) % 2 ? "right" : "left";
    const t = liveParts.find(t=>!b.alternating || liveParts.length===1 || t.part===openSide);
    if (t) target.x += t.offset;
  } else {
    const candidates = s.enemies.filter(
      (e) => !e.dead && e.y > 0 && e.y < p.y - 55 && !e.shield,
    );
    candidates.sort(
      (a, b) =>
        (a.type==="support" ? -180 : a.leader ? -100 : 0) +
        Math.abs(a.x - p.x) -
        (b.type==="support" ? -180 : b.leader ? -100 : 0) -
        Math.abs(b.x - p.x),
    );
    if (candidates[0]) target.x = candidates[0].x;
  }
  const pickup = s.powerups.find(
    (q) =>
      !q.dead &&
      q.y > 270 &&
      (q.kind === "shield" ? !p.shield : p.fireLevel < 2),
  );
  if (pickup && !s.hazards.length)
    target = { x: pickup.x, y: Math.min(510, pickup.y + 40) };
  let best;
  for (const y of [-1, 0, 1])
    for (const x of [-1, 0, 1]) {
      const n = Math.hypot(x, y) || 1;
      let risk = 0;
      for (let t = 0.1; t <= 1.6; t += 0.1) {
        const px = Math.max(15, Math.min(465, p.x + (x / n) * p.speed * t)),
          py = Math.max(22, Math.min(626, p.y + (y / n) * p.speed * t));
        const previous={x:Math.max(15,Math.min(465,p.x+x/n*p.speed*(t-.1))),y:Math.max(22,Math.min(626,p.y+y/n*p.speed*(t-.1)))};
        for (const b of s.enemyBullets) {
          const bx = b.x + b.vx * t,
            by = b.y + b.vy * t;
          const dx = Math.abs(px - bx) - 24,
            dy = Math.abs(py - by) - 35;
          if (D.contact(previous,{x:px,y:py},{x:b.x+b.vx*(t-.1),y:b.y+b.vy*(t-.1)},{x:bx,y:by},(p.w+b.w)/2+6,(p.h+b.h)/2+7)) risk += 2000 / (t + 0.25);
          else if (dx < 12 && dy < 18) risk += 40 / (t + 0.25);
        }
        for (const e of s.enemies) {
          const {x:ex,y:ey}=E.forecast(e,t,s.mode);
          if (
            !e.dead && D.contact(previous,{x:px,y:py},E.forecast(e,t-.1,s.mode),{x:ex,y:ey},(p.w+e.w)/2+8,(p.h+e.h)/2+8)
          )
            risk += 2000 / (t + 0.25);
        }
        for (const h of s.hazards) {
          if (!h.active && t < h.warning) continue;
          if (h.kind === "bomb" || h.kind==="mine") {
            if (Math.hypot(px - h.x, py - h.y) < h.radius + 35)
              risk += 2500 / (t + 0.25);
          } else {
            const start=h.active?0:Math.max(0,h.warning),end=start+h.ttl;
            if(t<start||t-.1>end)continue;
            const from=Math.max(t-.1,start),to=Math.min(t,end);
            const at=k=>({x:Math.max(15,Math.min(465,p.x+x/n*p.speed*k)),y:Math.max(22,Math.min(626,p.y+y/n*p.speed*k))});
            if(D.contact(at(from),at(to),{x:D.beam(h,from),y:324},{x:D.beam(h,to),y:324},(h.beamW+p.w)/2+1,648))
              risk += 3000 / (t + 0.25);
          }
        }
        for(const h of pending)if(!D.hazardSafe(h,previous,{x:px,y:py},t-.1,t,p))risk+=3000/(t+.25);
        const futureBoss=s.boss?B.forecast(s.boss,t):null;
        if (
          s.boss &&
          D.contact(previous,{x:px,y:py},B.forecast(s.boss,t-.1),futureBoss,(s.boss.w+p.w)/2+8,(s.boss.h+p.h)/2+8)
        )
          risk += 4000;
      }
      const endX = Math.max(15, Math.min(465, p.x + (x / n) * p.speed * 0.22)),
        endY = Math.max(22, Math.min(626, p.y + (y / n) * p.speed * 0.22));
      const value =
        risk +
        Math.abs(endX - target.x) * 0.8 +
        Math.abs(endY - target.y) * 0.5 +
        (x || y ? 1 : 0);
      if (!best || value < best.value) best = { x, y, value, risk };
    }
  if(best.risk>100){
    const route=D.escapePath(s,[],0);
    if(route){const q=route[0];best={...best,x:Math.sign(q.x-p.x),y:Math.sign(q.y-p.y),route:true};}
  }
  // Resource remains finite. Use only when the best reachable short trajectory
  // is threatened and a pulse can actually remove that threat.
  best.pulse = s.pulses > 0 && best.risk > 2000 && s.enemyBullets.length > 0;
  return best;
}
module.exports = { decide };
