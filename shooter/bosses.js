(function (root, factory) {
  "use strict";
  const bosses = factory(typeof module === "object" ? require("./content") : root.SkyPatrolContent);
  if (typeof module === "object") module.exports = bosses;
  else root.SkyPatrolBosses = bosses;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function initialize(g, type) {
    const d = C.BOSSES[type], scale = C.MODES[g.mode].hpScale;
    const b = { ...d, type, id: ++g.serial, x: 240, y: -d.h,
      hp: Math.ceil(d.hp * scale), maxHp: Math.ceil(d.hp * scale),
      age: 0, cooldown: 2, phase: 1, pattern: 0, hitFlash: 0, blockFlash: 0,
      partWindow: g.mode === "challenge" ? 3.6 : 4.5 };
    if (d.turretHp) b.turrets = ["left", "right"].map((part, i) => ({
      part, id: b.id + "-" + part, offset: i ? 56 : -56,
      hp: Math.ceil(d.turretHp * scale), maxHp: Math.ceil(d.turretHp * scale),
      cooldown: 1.2 + i, w: 34, h: 36, hitFlash: 0,
    }));
    return b;
  }
  function partsActive(b) { return !!b.turrets && (!b.stagedParts || b.phase === 2); }
  function protectedCore(b) { return partsActive(b) && b.turrets.some(t => t.hp > 0); }
  function partOpen(b, t) {
    return partsActive(b) && t.hp > 0 && (!b.alternating || b.turrets.filter(t=>t.hp>0).length===1 ||
      t.part === (Math.floor(b.age / b.partWindow)%2 ? "right" : "left"));
  }
  function progress(b) {
    return { max: b.maxHp + (b.turrets || []).reduce((n,t) => n + t.maxHp, 0),
      value: Math.max(0,b.hp) + (b.turrets || []).reduce((n,t) => n + t.hp, 0) };
  }
  function targets(b) {
    const core = { ...b, w: protectedCore(b) ? 40 : b.w, h: protectedCore(b) ? 40 : b.h };
    return [{ body: core, part: null }, ...(partsActive(b) ? b.turrets.filter(t => t.hp > 0).map(t => ({
      body: { x: b.x + t.offset, y: b.y + 6, px: (b.px ?? b.x) + t.offset, py: (b.py ?? b.y) + 6, w: t.w, h: t.h }, part: t.part,
    })) : [])];
  }
  function hit(g, amount, part) {
    const b = g.boss;
    if (part) {
      const t = b.turrets?.find(t => t.part === part);
      if (!t || !partOpen(b,t)) { b.blockFlash = .12; return false; }
      t.hp = Math.max(0,t.hp - amount); t.hitFlash = .12;
      if (!t.hp) {
        t.attack = null;
        g.hazards = g.hazards.filter(h => h.source !== t.id);
        g.score += 200; g.event("turret-defeated",part);
        if (b.turrets.every(t => t.hp === 0)) {
          b.phase = b.stagedParts ? 3 : 2; b.cooldown = 1.5; b.attack = null;
          g.event("core-open",b.type);
          g.event("boss-phase",b.phase);
        }
      }
      return true;
    }
    if (protectedCore(b)) { b.blockFlash = .12; return false; }
    b.hitFlash = .12;
    const nextHp = Math.max(0,b.hp-amount);
    if(b.stagedParts && b.phase===1 && nextHp <= Math.ceil(b.maxHp*.65)) {
      b.hp=Math.ceil(b.maxHp*.65); b.phase=2; b.attack=null; b.followup=null; b.cooldown=1.5;
      g.enemyBullets=[]; g.hazards=[]; g.event("boss-phase",2); return true;
    }
    b.hp = nextHp;
    if (!b.hp) {
      g.burst(b.x,b.y,true); g.score += 1200 * g.level;
      g.event("boss-defeated",b.type); g.finishStage();
    }
    return true;
  }
  function turrets(g,dt) {
    const b = g.boss;
    for (const t of b.turrets) {
      if (t.hp <= 0) continue;
      t.cooldown -= dt;
      if (t.attack) {
        t.attack.timer -= dt;
        if (t.attack.timer <= 0) {
          if(t.attack.kind !== "laser") g.aim({ ...t, x: b.x + t.offset, y: b.y + 6 },t.attack.target,155);
          t.attack = null; t.cooldown = 2.6 / C.MODES[g.mode].fireScale;
        }
      } else if (t.cooldown <= 0) {
        if(b.partLaser) {
          if(g.hazards.some(h=>h.kind==="laser")) continue;
          const center = clamp(g.player.x + (t.offset<0 ? -60 : 60),90,390);
          t.attack = { kind:"laser",target:{x:center,y:C.H},timer:1.4 };
          g.addHazard({kind:"laser",x:center,y:C.H/2,w:140,h:C.H,beamW:26,beamX:center-57,
            warning:1.4,ttl:1.3,duration:1.3,source:t.id});
          g.event("boss-attack","partLaser");
        } else t.attack = { kind:"aim",target:{x:g.player.x,y:g.player.y},timer:1.1 };
      }
    }
  }
  function patterns(b, mode) {
    if (b.phase === 3 && b.final) return mode === "challenge" ? [...b.final,"burst"] : b.final;
    if (b.phase === 2 && b.later) return mode === "challenge" ? [...b.later,"burst"] : b.later;
    if (mode === "challenge") return b.challenge;
    return b.patterns;
  }
  function arm(g, kind) {
    const b = g.boss;
    b.attack = { kind, timer: .9, target: { x: g.player.x, y: g.player.y } };
    if (kind === "gap" || kind === "doubleFan") {
      b.gapSide = -(b.gapSide || 1); b.attack.gapSide = b.gapSide;
    }
    if (kind === "dash") {
      b.attack.timer = 1.1;
      b.attack.target = { x: clamp(g.player.x,b.w/2+16,C.W-b.w/2-16), y: clamp(g.player.y,170,570) };
    }
    if (kind === "bomb" || kind === "bombLanes") {
      b.attack.timer = 1.4;
      const xs = kind === "bombLanes" ? [clamp(g.player.x-110,48,432),clamp(g.player.x+110,48,432)] : [g.player.x];
      for (const x of xs) g.addHazard({kind:"bomb",x,y:clamp(g.player.y,60,C.H-48),radius:46,w:92,h:92,warning:1.4,ttl:.65,source:b.id});
    }
    if (kind === "laser") {
      b.attack.timer = 1.4;
      const center = clamp(g.player.x,100,380);
      g.addHazard({ kind: "laser", x: center, y: C.H / 2, w: 180, h: C.H, beamW: 32,
        beamX: center - 74, warning: 1.4, ttl: 1.5, duration: 1.5, source: b.id });
    }
    g.event("boss-attack",kind);
  }
  function gapVolley(g, side, origin) {
    const b = g.boss;
    for(const angle of [-.8,-.5,-.23,0,.23,.5,.8].filter(v => Math.abs(v-side*.23)>.01))
      g.emit(origin.x,origin.y,Math.sin(angle)*155,Math.cos(angle)*155,b.id);
    g.event("boss-volley",{kind:"gap",side});
  }
  function fireAttack(g, a) {
    const b = g.boss;
    if (a.kind === "fan") {
      for (const angle of [-.75,-.38,0,.38,.75])
        g.emit(b.x,b.y+b.h/2,Math.sin(angle)*155,Math.cos(angle)*155,b.id);
    } else if (a.kind === "gap" || a.kind === "doubleFan") {
      const origin = { x:b.x, y:b.y+b.h/2 };
      gapVolley(g,a.gapSide,origin);
      if(a.kind === "doubleFan") b.followup = { timer:.45, side:-a.gapSide, origin };
    } else if (a.kind === "burst") {
      const angle = Math.atan2(a.target.x-b.x,a.target.y-b.y);
      for(const delta of [-.09,0,.09]) g.emit(b.x,b.y+b.h/2,Math.sin(angle+delta)*175,Math.cos(angle+delta)*175,b.id);
    } else if (a.kind === "dash") {
      b.dash = { phase: "out", target: { ...a.target }, home: { x: b.x, y: 110 } };
    } else if (a.kind === "aim") g.aim(b,a.target,175);
    else if (["summon","summonFormation","summonDiver"].includes(a.kind)) {
      const count = Math.min(2,Math.max(0,4-g.enemies.filter(e => !e.dead).length)), groupId = ++g.serial;
      for (let i=0;i<count;i++) {
        const type = a.kind === "summonDiver" && i === 1 ? "diver" : a.kind !== "summon" ? "formation" : b.phase===3 && i===1 ? "diver" : "scout";
        g.spawn(type,i ? 410 : 70,{summoned:true,groupId,leader:type==="formation" && i===0});
      }
      g.event("summon",count);
    }
  }
  function update(g,dt) {
    if (g.phase !== "boss" || !g.boss) return;
    const b = g.boss;
    b.age += dt; b.cooldown -= dt;
    b.hitFlash = Math.max(0,b.hitFlash-dt); b.blockFlash = Math.max(0,b.blockFlash-dt);
    for(const t of b.turrets || []) t.hitFlash = Math.max(0,t.hitFlash-dt);
    if (b.followup) {
      b.followup.timer -= dt;
      if(b.followup.timer <= 0) { gapVolley(g,b.followup.side,b.followup.origin); b.followup=null; }
    }
    if (b.dash) {
      const d = b.dash;
      if (d.phase === "recover") {
        d.timer -= dt;
        if (d.timer <= 0) d.phase = "return";
      } else {
        const target = d.phase === "out" ? d.target : d.home,
          dx = target.x - b.x, dy = target.y - b.y, distance = Math.hypot(dx,dy), step = 320*dt;
        if (distance <= step) {
          b.x = target.x; b.y = target.y;
          if (d.phase === "out") { d.phase="recover"; d.timer=1.4; g.event("boss-recovery",b.type); }
          else { b.dash=null; b.cooldown=1.8; }
        } else { b.x += dx/distance*step; b.y += dy/distance*step; }
      }
      return;
    }
    if (b.attack?.kind !== "dash") b.x = 240 + Math.sin(b.age * .6) * 95;
    if (protectedCore(b)) { turrets(g,dt); return; }
    if (b.type === "storm-carrier") {
      const phase = b.hp <= b.maxHp * .35 ? 3 : b.hp <= b.maxHp * .7 ? 2 : 1;
      if (phase > b.phase) { b.phase++; g.event("boss-phase",b.phase); }
    }
    if (b.type === "blockade" && b.phase===1 && b.hp<=b.maxHp*.5) {
      b.phase=2; b.attack=null; b.pattern=0; g.event("boss-phase",2);
    }
    if (b.type === "iron-wing" && b.phase === 1 && b.hp <= b.maxHp * .45) {
      b.phase = 2; g.event("boss-phase",2);
    }
    if (b.attack) {
      b.attack.timer -= dt;
      if (b.attack.timer <= 0) {
        fireAttack(g,b.attack); b.attack = null;
        b.cooldown = (b.phase===2 ? 1.3 : 2.4) / C.MODES[g.mode].fireScale;
      }
      return;
    }
    if (b.cooldown <= 0) {
      const seq = patterns(b,g.mode); arm(g,seq[b.pattern++ % seq.length]);
    }
  }
  return { initialize, update, hit, targets, progress, protectedCore, partOpen, partsActive };
});
