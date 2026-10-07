(function (root, factory) {
  "use strict";
  const renderer = factory();
  if (typeof module === "object") module.exports = renderer;
  else root.SkyPatrolRenderer = renderer;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SHAPES = {
    interceptor: [[-21,-7],[-8,-12],[21,0],[-8,12],[-21,7],[-4,0]],
    minelayer: [[0,-17],[17,-3],[10,13],[0,17],[-10,13],[-17,-3]],
    support: [[-20,-8],[-12,-16],[-4,-7],[4,-7],[12,-16],[20,-8],[15,16],[7,10],[-7,10],[-15,16]],
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
  const BOSS_SHAPES = {
    fan: [[-.5,-.3],[-.31,-.5],[-.09,-.22],[0,.38],[.09,-.22],[.31,-.5],[.5,-.3],[.41,.38],[.11,.5],[-.11,.5],[-.41,.38]],
    dash: [[0,.5],[-.5,-.25],[-.2,-.16],[0,-.5],[.2,-.16],[.5,-.25]],
    bomb: [[-.5,-.25],[-.3,-.5],[-.19,.15],[.19,.15],[.3,-.5],[.5,-.25],[.5,.5],[.25,.5],[0,.26],[-.25,.5],[-.5,.5]],
    aim: [[-.18,-.5],[.18,-.5],[.5,.06],[.16,.18],[.16,.5],[-.16,.5],[-.16,.18],[-.5,.06]],
    parts: [[-.5,-.32],[-.36,-.5],[-.18,-.23],[.18,-.23],[.36,-.5],[.5,-.32],[.45,.5],[.21,.27],[-.21,.27],[-.45,.5]],
    summon: [[-.5,-.3],[-.34,-.5],[-.15,-.18],[.15,-.18],[.34,-.5],[.5,-.3],[.5,.4],[.24,.5],[.14,.28],[-.14,.28],[-.24,.5],[-.5,.4]],
    laser: [[0,-.5],[.5,-.06],[.28,.22],[.2,.5],[-.2,.5],[-.28,.22],[-.5,-.06]],
    combined: [[-.5,-.25],[-.33,-.5],[-.15,-.36],[0,-.12],[.15,-.36],[.33,-.5],[.5,-.25],[.43,.38],[.23,.5],[0,.3],[-.23,.5],[-.43,.38]],
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
      if (h.kind === "bomb" || h.kind === "mine") {
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
        if(h.kind==="mine"){
          polygon(ctx,[[0,-7],[7,0],[0,7],[-7,0]],h.x,h.y,orange);
          ctx.strokeStyle=orange;ctx.lineWidth=3;ctx.beginPath();
          ctx.arc(h.x,h.y,h.radius+4,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,h.active?h.ttl/(h.maxTtl||3.2):1)));ctx.stroke();
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
    for(const e of s.enemies)if(e.supportedBy&&!e.dead){
      const src=s.enemies.find(q=>q.id===e.supportedBy&&!q.dead);if(src)line(ctx,src,e,cyan);
    }
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (e.phase === "aim" && e.target) line(ctx, e, e.target, red);
      polygon(
        ctx,
        e.type==="interceptor"&&e.lane===1?SHAPES[e.type].map(([x,y])=>[-x,y]):SHAPES[e.type],
        e.x,
        e.y,
        e.shield ? (light ? "#706b83" : "#8e87bc") : orange,
      );
      ctx.fillStyle = bg;
      ctx.fillRect(e.x - 3, e.y - 5, 6, 8);
      if(e.elite||e.key){
        ctx.strokeStyle=red;ctx.lineWidth=2;ctx.strokeRect(e.x-e.w/2-3,e.y-e.h/2-3,e.w+6,e.h+6);
        if(e.key){ctx.fillStyle=ink;ctx.fillRect(e.x-2,e.y-e.h/2-13,4,7);}
      }
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
      const b = s.boss,
        partsActive = !!b.turrets && (!b.stagedParts || b.phase === 2),
        locked = partsActive && b.turrets.some(t => t.hp > 0);
      for(const a of [b.attack,b.side].filter(Boolean)){
        if(a.route){let origin=b;for(const target of a.route){line(ctx,origin,target,red);origin=target;}}
        else if(["aim","burst","lockChain"].includes(a.kind))line(ctx,a.origin,a.target,red);
        else for(const q of a.bullets||[]){const speed=Math.hypot(q.vx,q.vy);line(ctx,a.origin,{x:q.x+q.vx/speed*70,y:q.y+q.vy/speed*70},red);}
      }
      polygon(ctx,BOSS_SHAPES[b.kind].map(([x,y]) => [x*b.w,y*b.h]),b.x,b.y,b.hitFlash>0 ? ink : red);
      if (b.kind === "summon") {
        ctx.fillStyle = bg;
        for(const sign of [-1,1]) ctx.fillRect(b.x+sign*b.w*.3-9,b.y-6,18,23);
      }
      if (b.kind === "laser" || b.kind === "combined") {
        ctx.strokeStyle = orange; ctx.lineWidth = 3; ctx.beginPath();
        ctx.arc(b.x,b.y,25,0,Math.PI*2); ctx.stroke();
      }
      for (const t of partsActive ? b.turrets : []) {
        const x = b.x+t.offset,
          open = t.hp>0 && (!b.alternating || b.turrets.filter(t=>t.hp>0).length===1 ||
            t.part === (Math.floor(b.age / b.partWindow)%2 ? "right" : "left"));
        ctx.fillStyle = t.hitFlash>0 ? ink : t.hp<=0 ? (light ? "#cbc4b8" : "#354151") : open ? orange : (light ? "#706b83" : "#8e87bc");
        ctx.fillRect(x-17,b.y-12,34,36);
        if (t.hp>0) {
          ctx.strokeStyle = open ? ink : red; ctx.lineWidth = 2;
          ctx.setLineDash(open ? [] : [4,3]); ctx.strokeRect(x-19,b.y-14,38,40); ctx.setLineDash([]);
          ctx.fillStyle = ink; ctx.fillRect(x-16,b.y-20,32*t.hp/t.maxHp,3);
          if(!open){ctx.beginPath();ctx.moveTo(x-8,b.y-6);ctx.lineTo(x+8,b.y+10);ctx.moveTo(x+8,b.y-6);ctx.lineTo(x-8,b.y+10);ctx.stroke();}
          if (t.attack) line(ctx,t.attack.origin,t.attack.target,red);
        }
      }
      ctx.fillStyle = locked ? orange : cyan;
      ctx.fillRect(b.x-10,b.y-12,20,18);
      if (locked || b.blockFlash>0) {
        ctx.strokeStyle = b.blockFlash>0 ? ink : orange; ctx.lineWidth = 2;
        ctx.strokeRect(b.x-14,b.y-17,28,27);
        ctx.beginPath(); ctx.moveTo(b.x-8,b.y-10); ctx.lineTo(b.x+8,b.y+4);
        ctx.moveTo(b.x+8,b.y-10); ctx.lineTo(b.x-8,b.y+4); ctx.stroke();
      }
      if (b.attack && ["fan","gap","doubleFan"].includes(b.attack.kind)) {
        ctx.strokeStyle = red; ctx.lineWidth = 2; ctx.beginPath();
        ctx.arc(b.x,b.y+b.h/2,32,.65,2.5); ctx.stroke();
      }
      if (b.type === "iron-mk2") for(const sign of [-1,1]) {
        ctx.strokeStyle=ink; ctx.beginPath(); ctx.moveTo(b.x+sign*35,b.y-13);
        ctx.lineTo(b.x+sign*48,b.y+7); ctx.lineTo(b.x+sign*61,b.y-13); ctx.stroke();
      }
    }
    for (const q of s.particles || []) {
      ctx.strokeStyle = q.boss ? red : orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        q.x,
        q.y,
        5 + Math.max(0, Math.min(1, 1 - q.ttl / (q.duration || 0.45))) * (q.boss ? 70 : 20),
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
  return { draw, SHAPES, BOSS_SHAPES };
});
