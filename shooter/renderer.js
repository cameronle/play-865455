(function (root, factory) {
  "use strict";
  const renderer = factory();
  if (typeof module === "object") module.exports = renderer;
  else root.SkyPatrolRenderer = renderer;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SHAPES = {
    scout: [
      [0, 16],
      [-13, -12],
      [0, -6],
      [13, -12],
    ],
    formation: [
      [-14, -6],
      [-5, -13],
      [0, -8],
      [5, -13],
      [14, -6],
      [6, 10],
      [0, 13],
      [-6, 10],
    ],
    diver: [
      [0, 21],
      [-12, -18],
      [-4, -10],
      [0, -21],
      [4, -10],
      [12, -18],
    ],
    heavy: [
      [-22, -10],
      [-13, -18],
      [13, -18],
      [22, -10],
      [18, 18],
      [-18, 18],
    ],
    sniper: [
      [-8, -22],
      [8, -22],
      [12, 10],
      [3, 10],
      [3, 22],
      [-3, 22],
      [-3, 10],
      [-12, 10],
    ],
    bomber: [
      [-23, -10],
      [-12, -15],
      [-8, 6],
      [8, 6],
      [12, -15],
      [23, -10],
      [23, 15],
      [12, 15],
      [0, 8],
      [-12, 15],
      [-23, 15],
    ],
  };
  function polygon(ctx, points, x, y, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    points.forEach(([a, b], i) =>
      i ? ctx.lineTo(x + a, y + b) : ctx.moveTo(x + a, y + b),
    );
    ctx.closePath();
    ctx.fill();
  }
  function line(ctx, a, b, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function draw(ctx, s, { light = false, locale } = {}) {
    const bg = light ? "#f7f4ec" : "#080d15",
      ink = light ? "#3e3934" : "#e8f0f7",
      cyan = light ? "#0288d1" : "#64e6e0",
      red = light ? "#c62840" : "#ff6b7a",
      orange = light ? "#b95b00" : "#ffb45c";
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 480, 648);
    // Sparse, deterministic star field: independent from combat RNG.
    ctx.fillStyle = light ? "#a49d91" : "#364252";
    for (let i = 0; i < 40; i++)
      ctx.fillRect(
        (i * 127 + 23) % 480,
        (i * 193 + s.time * 24) % 648,
        1.5,
        1.5,
      );
    for (const h of s.hazards) {
      if (h.kind === "bomb") {
        ctx.strokeStyle = red;
        ctx.lineWidth = 2;
        ctx.setLineDash(h.active ? [] : [6, 4]);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (h.active) {
          ctx.globalAlpha = 0.24;
          ctx.fillStyle = red;
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          ctx.beginPath();
          ctx.moveTo(h.x - 8, h.y);
          ctx.lineTo(h.x + 8, h.y);
          ctx.moveTo(h.x, h.y - 8);
          ctx.lineTo(h.x, h.y + 8);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = red;
        ctx.globalAlpha = h.active ? 0.5 : 0.09;
        ctx.fillRect(
          (h.active ? (h.beamX ?? h.x) : h.x) -
            (h.active ? (h.beamW ?? h.w) : h.w) / 2,
          0,
          h.active ? (h.beamW ?? h.w) : h.w,
          648,
        );
        ctx.globalAlpha = 1;
        ctx.strokeStyle = red;
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x - h.w / 2, 0, h.w, 648);
        if (!h.active) {
          ctx.beginPath();
          for (let y = -h.w; y < 648; y += 26) {
            ctx.moveTo(h.x - h.w / 2, y);
            ctx.lineTo(h.x + h.w / 2, y + h.w);
          }
          ctx.stroke();
        }
      }
    }
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (e.phase === "aim" && e.target) line(ctx, e, e.target, red);
      polygon(
        ctx,
        SHAPES[e.type],
        e.x,
        e.y,
        e.shield ? (light ? "#706b83" : "#8e87bc") : orange,
      );
      ctx.fillStyle = bg;
      ctx.fillRect(e.x - 3, e.y - 5, 6, 8);
      if (e.leader && !e.broken) {
        polygon(
          ctx,
          [
            [0, -7],
            [-5, 1],
            [5, 1],
          ],
          e.x,
          e.y - 22,
          cyan,
        );
      }
      if (e.shield) {
        ctx.strokeStyle = cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 27, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.cooldown < 0.7 && e.phase !== "dive") {
        ctx.fillStyle = red;
        ctx.fillRect(e.x - 2, e.y + e.h / 2, 4, 6);
      }
      if (e.hp > 1) {
        ctx.fillStyle = red;
        ctx.fillRect(
          e.x - e.w / 2,
          e.y - e.h / 2 - 7,
          (e.w * e.hp) / e.maxHp,
          3,
        );
      }
    }
    if (s.boss) {
      const b = s.boss;
      if (b.attack?.target && b.attack.kind === "aim")
        line(ctx, b, b.attack.target, red);
      if (b.type === "iron-wing") {
        polygon(
          ctx,
          [
            [-80, -22],
            [-50, -37],
            [-15, -16],
            [0, 28],
            [15, -16],
            [50, -37],
            [80, -22],
            [65, 28],
            [18, 37],
            [-18, 37],
            [-65, 28],
          ],
          b.x,
          b.y,
          red,
        );
      } else if (b.type === "twin-core") {
        polygon(
          ctx,
          [
            [-84, -28],
            [-60, -44],
            [-30, -20],
            [30, -20],
            [60, -44],
            [84, -28],
            [75, 44],
            [35, 24],
            [-35, 24],
            [-75, 44],
          ],
          b.x,
          b.y,
          red,
        );
        for (const t of b.turrets || []) {
          const x = b.x + t.offset;
          ctx.fillStyle = t.hp > 0 ? orange : light ? "#cbc4b8" : "#354151";
          ctx.fillRect(x - 17, b.y - 10, 34, 32);
          if (t.hp > 0) {
            ctx.fillStyle = ink;
            ctx.fillRect(x - 16, b.y - 18, (32 * t.hp) / t.maxHp, 3);
            if (t.attack) line(ctx, { x, y: b.y + 20 }, t.attack.target, red);
          }
        }
      } else {
        polygon(
          ctx,
          [
            [-95, -24],
            [-62, -49],
            [-28, -35],
            [0, -12],
            [28, -35],
            [62, -49],
            [95, -24],
            [82, 37],
            [44, 49],
            [0, 29],
            [-44, 49],
            [-82, 37],
          ],
          b.x,
          b.y,
          red,
        );
        ctx.strokeStyle = orange;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = cyan;
      ctx.fillRect(b.x - 10, b.y - 12, 20, 18);
      if (b.attack?.kind === "fan") {
        ctx.strokeStyle = red;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y + b.h / 2, 32, 0.65, 2.5);
        ctx.stroke();
      }
    }
    for (const q of s.particles || []) {
      ctx.strokeStyle = q.boss ? red : orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        q.x,
        q.y,
        5 + (1 - q.ttl / 0.45) * (q.boss ? 70 : 20),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.fillStyle = cyan;
    for (const b of s.bullets)
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    ctx.fillStyle = red;
    for (const b of s.enemyBullets)
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    for (const q of s.powerups) {
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 2;
      ctx.strokeRect(q.x - 10, q.y - 10, 20, 20);
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = cyan;
      ctx.fillText(q.kind === "shield" ? "S" : "Ⅱ", q.x, q.y + 5);
    }
    const p = s.player;
    if (p && !(p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0)) {
      polygon(
        ctx,
        [
          [0, -22],
          [15, 15],
          [5, 12],
          [0, 22],
          [-5, 12],
          [-15, 15],
        ],
        p.x,
        p.y,
        cyan,
      );
      polygon(
        ctx,
        [
          [0, -12],
          [5, 4],
          [-5, 4],
        ],
        p.x,
        p.y,
        bg,
      );
      if (p.shield) {
        ctx.strokeStyle = cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (s.pulseTime > 0) {
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (1 - s.pulseTime / 0.5) * 600, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (s.phase === "boss-warning") {
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = red;
      ctx.fillText(locale?.t("warning") || "BOSS APPROACHING", 240, 300);
    }
    ctx.restore();
  }
  return { draw, SHAPES };
});
