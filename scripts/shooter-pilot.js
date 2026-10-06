"use strict";
// Detached observation only. Returns ordinary direction and resource inputs;
// never changes lives, entities, clocks, stage, damage or difficulty.
function decide(s) {
  const p = s.player;
  let target = { x: 240, y: 550 };
  if (s.boss && s.phase === "boss") {
    const b = s.boss,
      travel = Math.max(0, (p.y - b.y) / 520);
    target.x = 240 + Math.sin((b.age + travel) * 0.6) * 95;
    const t = b.turrets?.find((t) => t.hp > 0);
    if (t) target.x += t.offset;
  } else {
    const candidates = s.enemies.filter(
      (e) => !e.dead && e.y > 0 && e.y < p.y - 55 && !e.shield,
    );
    candidates.sort(
      (a, b) =>
        (a.leader ? -100 : 0) +
        Math.abs(a.x - p.x) -
        (b.leader ? -100 : 0) -
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
    target = { x: pickup.x, y: Math.min(560, pickup.y + 40) };
  let best;
  for (const y of [-1, 0, 1])
    for (const x of [-1, 0, 1]) {
      const n = Math.hypot(x, y) || 1;
      let risk = 0;
      for (let t = 0.1; t <= 1; t += 0.1) {
        const px = Math.max(15, Math.min(465, p.x + (x / n) * p.speed * t)),
          py = Math.max(22, Math.min(626, p.y + (y / n) * p.speed * t));
        for (const b of s.enemyBullets) {
          const bx = b.x + b.vx * t,
            by = b.y + b.vy * t;
          const dx = Math.abs(px - bx) - 24,
            dy = Math.abs(py - by) - 35;
          if (dx < 0 && dy < 0) risk += 2000 / (t + 0.25);
          else if (dx < 12 && dy < 18) risk += 40 / (t + 0.25);
        }
        for (const e of s.enemies) {
          let ex = e.x + (e.vx || 0) * t,
            ey = e.y + (e.vy || (e.phase === "aim" ? 0 : e.speed)) * t;
          if (e.phase === "aim" && e.type === "diver" && t > e.warning) {
            const d = Math.hypot(e.target.x - e.x, e.target.y - e.y);
            ex += ((e.target.x - e.x) / d) * 260 * (t - e.warning);
            ey += ((e.target.y - e.y) / d) * 260 * (t - e.warning);
          }
          if (
            Math.abs(px - ex) < (p.w + e.w) / 2 + 8 &&
            Math.abs(py - ey) < (p.h + e.h) / 2 + 8
          )
            risk += 2000 / (t + 0.25);
        }
        for (const h of s.hazards) {
          if (!h.active && t < h.warning) continue;
          if (h.kind === "bomb") {
            if (Math.hypot(px - h.x, py - h.y) < h.radius + 35)
              risk += 2500 / (t + 0.25);
          } else if (Math.abs(px - h.x) < h.w / 2 + p.w / 2 + 12)
            risk += 3000 / (t + 0.25);
        }
        if (
          s.boss &&
          Math.abs(px - s.boss.x) < s.boss.w / 2 + 30 &&
          py < s.boss.y + s.boss.h / 2 + 40
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
  // Resource remains finite. Use only when the best reachable short trajectory
  // is threatened and a pulse can actually remove that threat.
  best.pulse = s.pulses > 0 && best.risk > 2000 && s.enemyBullets.length > 0;
  return best;
}
module.exports = { decide };
