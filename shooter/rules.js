(function (root, factory) {
  "use strict";
  const rules = factory(
    typeof module === "object" ? require("./content") : root.SkyPatrolContent,
    typeof module === "object" ? require("./bosses") : root.SkyPatrolBosses,
    typeof module === "object" ? require("./director") : root.SkyPatrolDirector,
    typeof module === "object" ? require("./enemies") : root.SkyPatrolEnemies,
  );
  if (typeof module === "object") module.exports = rules;
  else root.SkyPatrolRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C, B, D, E) {
  "use strict";
  const { W, H, ENEMIES, BOSSES, STAGES, MODES, LIMITS } = C,
    STEP = 1 / 120;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  // Relative two-dimensional segment/slab intersection. Returns first contact.
  function swept(a, b) {
    const ax = a.px ?? a.x,
      ay = a.py ?? a.y,
      bx = b.px ?? b.x,
      by = b.py ?? b.y;
    let enter = 0,
      exit = 1;
    for (const [p, v, r] of [
      [ax - bx, a.x - ax - (b.x - bx), (a.w + b.w) / 2],
      [ay - by, a.y - ay - (b.y - by), (a.h + b.h) / 2],
    ]) {
      if (Math.abs(v) < 1e-12) {
        if (Math.abs(p) > r) return null;
      } else {
        const t1 = (-r - p) / v,
          t2 = (r - p) / v;
        enter = Math.max(enter, Math.min(t1, t2));
        exit = Math.min(exit, Math.max(t1, t2));
        if (enter > exit) return null;
      }
    }
    return enter >= 0 && enter <= 1 ? enter : null;
  }
  class Game {
    constructor({ mode = "normal", seed = 1 } = {}) {
      this.mode = MODES[mode] ? mode : "normal";
      this.seed = seed >>> 0;
      this.reset();
    }
    random() {
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
      return this.seed / 4294967296;
    }
    reset() {
      this.state = "title";
      this.phase = "wave";
      this.level = 1;
      this.wave = 0;
      this.time = 0;
      this.waveTime = 0;
      this.group = 0;
      this.serial = 0;
      this.score = 0;
      this.lives = 3;
      this.pulses = 2;
      this.fireTimer = 0;
      this.escapeCount = 0;
      this.waveEscapes = 0;
      this.layout = null;
      this.supplyPending = false;
      this.shieldChapters = [];
      this.chasePending = false;
      this.chaseUsed = false;
      this.threats = [];
      this.enemies = [];
      this.bullets = [];
      this.enemyBullets = [];
      this.hazards = [];
      this.powerups = [];
      this.particles = [];
      this.pulseTime = 0;
      this.boss = null;
      this.events = [];
      this.stats = {
        planned:STAGES.flatMap(s=>s.waves).flatMap(w=>w.groups).reduce((n,q)=>n+q.count,0), admitted: 0, summoned: 0, queued: 0, escaped: 0, shieldUsed: 0, pulseUsed: 0, stageResources: [],
        kills: 0,
        shots: 0,
        hits: 0,
        encounters: {},
        bosses: [],
        peaks: { enemies: 0, enemyBullets: 0, hazards: 0 },
      };
      this.player = {
        x: W / 2,
        y: H - 56,
        w: 30,
        h: 44,
        speed: 285,
        invuln: 0,
        fireLevel: 1,
        shield: false,
      };
    }
    start() {
      this.reset();
      this.state = "playing";
      this.event("stage", 1);
    }
    event(type, value) {
      this.events.push({ type, value, time: this.time, level: this.level });
      if (this.events.length > 500) this.events.shift();
    }
    snapshot() {
      return JSON.parse(JSON.stringify(this));
    }
    pause() {
      if (this.state === "playing") {
        this.state = "paused";
        return true;
      }
      return false;
    }
    resume() {
      if (this.state === "paused") {
        this.state = "playing";
        return true;
      }
      return false;
    }
    nextStage() {
      if (this.state !== "intermission" || this.level >= STAGES.length || this.supplyPending) return false;
      this.level++;
      this.layout = null; this.deferredGroup=null; this.chaseUsed = false; this.chasePending = false;
      this.wave = 0;
      this.waveTime = 0;
      this.group = 0;
      this.waveEscapes = 0;
      this.phase = "wave";
      this.clearField();
      this.particles = [];
      this.pulseTime = 0;
      this.state = "playing";
      this.event("stage", this.level);
      return true;
    }
    clearField() {
      this.enemies = [];
      this.bullets = [];
      this.enemyBullets = [];
      this.hazards = [];
      this.powerups = [];
      this.boss = null;
      this.threats = [];
    }
    finishStage() {
      if (this.state !== "playing") return;
      this.score += 200 * this.level;
      this.player.invuln = 1.5;
      const stage = STAGES[this.level - 1];
      if (stage.boss) this.stats.bosses.push(stage.boss);
      const battle={lives:this.lives,pulses:this.pulses,shield:this.player.shield};
      this.stats.stageResources.push({level:this.level,battle,before:{...battle},after:{...battle}});
      if(stage.chapterEnd&&this.level<STAGES.length){
        if(this.mode==="challenge"){
          this.supplyPending=this.lives<3||this.pulses<2;
          if(!this.supplyPending)this.event("chapter-reward",{choice:"full",...battle});
        }else{
          this.lives=Math.min(3,this.lives+1);this.pulses=Math.min(2,this.pulses+1);
          this.stats.stageResources.at(-1).after={lives:this.lives,pulses:this.pulses,shield:this.player.shield};
          this.event("chapter-reward",{choice:"both",lives:this.lives,pulses:this.pulses});
        }
      }
      this.clearField();
      this.state = this.level === STAGES.length ? "clear" : "intermission";
      this.event(this.state, this.level);
    }
    chooseSupply(kind) {
      if(this.state!=="intermission"||!this.supplyPending||!["life","pulse"].includes(kind)||
        (kind==="life"?this.lives>=3:this.pulses>=2))return false;
      if(kind==="life")this.lives++;else this.pulses++;
      this.supplyPending=false;
      this.stats.stageResources.at(-1).after={lives:this.lives,pulses:this.pulses,shield:this.player.shield};
      this.event("chapter-reward",{choice:kind,lives:this.lives,pulses:this.pulses});return true;
    }
    hurt() {
      if (this.state !== "playing" || this.player.invuln > 0) return false;
      if (this.player.shield) {
        this.player.shield = false;
        this.stats.shieldUsed++;
        this.player.invuln = 1;
        this.event("shield-used", 1);
        return true;
      }
      this.lives--;
      this.stats.hits++;
      this.player.invuln = 1.5;
      this.event("hurt", this.lives);
      if (this.lives <= 0) {
        this.state = "gameover";
        this.event("gameover", this.score);
      }
      return true;
    }
    spawn(type, x = 240, options = {}) {
      if (this.enemies.length >= LIMITS.enemies || !ENEMIES[type]) return null;
      const d = ENEMIES[type],
        e = {
          ...d,
          type,
          id: ++this.serial,
          x: clamp(x, d.w / 2, W - d.w / 2),
          y: -d.h / 2,
          hp: Math.ceil(d.hp * MODES[this.mode].hpScale),
          maxHp: Math.ceil(d.hp * MODES[this.mode].hpScale),
          age: 0,
          cooldown: 1.8,
          baseX: x,
          phase: "entry",
          shield: false,
          ...options,
        };
      this.enemies.push(e);
      this.stats.encounters[type] = (this.stats.encounters[type] || 0) + 1;
      return e;
    }
    spawnGroup(g) {
      if (this.enemies.length + g.count > LIMITS.enemies ||
          (g.type === "support" && this.enemies.some(e=>!e.dead&&e.type==="support"))) return false;
      const groupId = ++this.serial;
      for (let i=0;i<g.count;i++) {
        const x=g.x+(i-(g.count-1)/2)*48;
        this.spawn(g.type,this.layout===-1?W-x:x,{
          groupId,leader:g.type==="formation"&&i===Math.floor(g.count/2),elite:["sniper","diver"].includes(g.type)&&(!!g.elite||(this.mode==="challenge"&&this.level>=4&&i===0)),
          key:!!g.key,chase:!!g.chase,summoned:!!g.summoned,supply:!!g.supply&&i===Math.floor(g.count/2),lane:i%2?1:-1,
          y:-ENEMIES[g.type].h/2-Math.abs(i-(g.count-1)/2)*24,
        });
      }
      if(g.summoned)this.stats.summoned+=g.count;else this.stats.admitted+=g.count;
      this.event("admission",{wave:this.wave,type:g.type,count:g.count,summoned:!!g.summoned});return true;
    }
    reserveAttack(source,duration=2,specs=[]) { return D.reserve(this,source,duration,specs); }
    attackAllowed(specs) { return D.allowed(this,specs); }
    emit(x, y, vx, vy, source, light=true) {
      if (this.enemyBullets.length >= LIMITS.enemyBullets || y < 0 || y > H)
        return;
      this.enemyBullets.push({ x, y, vx, vy, w: 6, h: 12, source, light });
    }
    aim(e, target = this.player, speed = 145) {
      const dx = target.x - e.x,
        dy = target.y - e.y,
        length = Math.hypot(dx, dy) || 1;
      this.emit(
        e.x,
        e.y + e.h / 2,
        (dx / length) * speed,
        (dy / length) * speed,
        e.id,
      );
    }
    updateEnemy(e, dt) { E.update(this,e,dt); }
    addHazard(spec) {
      if (!this.attackAllowed([spec])) return null;
      const h = { id: ++this.serial, active: false, maxTtl:spec.ttl, ...spec };
      this.hazards.push(h);
      this.event("hazard-warning", h.kind);
      return h;
    }
    updateHazards(dt) {
      for (const h of this.hazards) {
        h.previousBeamX = h.beamX;
        if (!h.active) {
          h.warning -= dt;
          if (h.warning <= 0) {
            h.active = true;
            this.event("hazard-active", h.kind);
          }
        } else h.ttl -= dt;
        if (h.kind === "laser" && h.active)
          h.beamX = D.beam(h,0);
      }
      this.hazards = this.hazards.filter((h) => h.ttl > 0);
    }
    director(dt) {
      const stage = STAGES[this.level - 1];
      if (this.phase === "wave") {
        D.wave(this,dt);
      } else if (this.phase === "boss-warning") {
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) this.enterBoss(stage.boss);
      } else if (this.phase === "boss-enter") {
        this.boss.y += 70 * dt;
        if (this.boss.y >= 110) {
          this.boss.y = 110;
          this.phase = "boss";
          this.event("boss-ready", this.boss.type);
        }
      }
    }
    enterBoss(type) {
      this.clearField();
      this.boss = B.initialize(this, type);
      this.phase = "boss-enter";
      this.event("boss-enter",type);
    }
    updateBoss(dt) { B.update(this,dt); }
    hitEnemy(e, amount = 1) {
      if (this.state !== "playing" || e.dead || e.shield) return false;
      e.hp -= amount;
      if (e.hp <= 0) this.kill(e);
      return true;
    }
    kill(e) {
      if (this.state !== "playing" || e.dead) return;
      e.dead = true;
      this.threats=this.threats.filter(t=>t.source!==e.id);
      if(e.type==="support")E.links(this);
      this.burst(e.x, e.y);
      if (e.type === "formation" && e.leader) {
        for (const follower of this.enemies)
          if (follower.groupId === e.groupId && !follower.dead) {
            follower.broken = true;
            follower.baseX = follower.x;
            follower.cooldown = 4;
          }
        this.score += 80;
        this.event("formation-broken", e.groupId);
      }
      this.score += e.score;
      this.stats.kills++;
      this.event("kill", e.type);
      const chapter=STAGES[this.level-1].chapter;
      const supply=e.supply&&!this.shieldChapters.includes(chapter)&&(this.mode==="normal"||[1,3,5].includes(chapter));
      const double=this.player.fireLevel<2&&(this.stats.kills===2||this.stats.kills%6===0);
      if((supply||double)&&this.powerups.length<LIMITS.powerups){
        const kind=supply?"shield":"double";
        if(supply)this.shieldChapters.push(chapter);
        this.powerups.push({x:e.x,y:e.y,w:18,h:18,vy:90,kind});this.event("drop",kind);
      }
    }
    hitBoss(amount = 1, part = null) {
      if (this.state !== "playing" || this.phase !== "boss" || !this.boss)
        return false;
      return B.hit(this,amount,part);
    }
    pulse() {
      if (this.state !== "playing" || this.pulses <= 0) return false;
      this.pulses--;
      this.stats.pulseUsed++;
      this.pulseTime = 0.5;
      this.enemyBullets = [];
      for (const e of this.enemies) this.hitEnemy(e, 2);
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.event("pulse", this.pulses);
      return true;
    }
    burst(x, y, boss = false) {
      const duration = boss ? 1.2 : 0.45;
      if (this.particles.length < LIMITS.particles)
        this.particles.push({ x, y, boss, ttl: duration, duration });
    }
    fire(dt) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer += 0.18;
        for (const offset of this.player.fireLevel === 2 ? [-7, 7] : [0]) {
          if (this.bullets.length < LIMITS.bullets) {
            this.bullets.push({
              x: this.player.x + offset,
              y: this.player.y - 22,
              w: 3,
              h: 14,
              vx: 0,
              vy: -520,
            });
            this.stats.shots++;
          }
        }
      }
    }
    step(seconds, input = {}) {
      if (this.state !== "playing") return;
      let remaining = Math.min(Math.max(seconds, 0), 30);
      while (remaining > 1e-9 && this.state === "playing") {
        const dt = Math.min(STEP, remaining);
        this.tick(dt, input);
        remaining -= dt;
      }
    }
    updateEffects(dt) {
      this.pulseTime = Math.max(0, this.pulseTime - dt);
      for (const q of this.particles) q.ttl -= dt;
      this.particles = this.particles.filter((q) => q.ttl > 0);
    }
    tick(dt, input) {
      this.time += dt;
      this.updateEffects(dt);
      const p = this.player;
      p.px = p.x;
      p.py = p.y;
      p.invuln = Math.max(0, p.invuln - dt);
      const dx = input.x || 0,
        dy = input.y || 0,
        n = Math.hypot(dx, dy) || 1;
      p.x = clamp(p.x + (dx / n) * p.speed * dt, p.w / 2, W - p.w / 2);
      p.y = clamp(p.y + (dy / n) * p.speed * dt, p.h / 2, H - p.h / 2);
      this.fire(dt);
      this.updateHazards(dt);
      E.links(this);
      for (const e of this.enemies) {
        e.px = e.x;
        e.py = e.y;
        this.updateEnemy(e, dt);
      }
      if (this.boss) {
        this.boss.px = this.boss.x;
        this.boss.py = this.boss.y;
        this.updateBoss(dt);
      }
      for (const b of [...this.bullets, ...this.enemyBullets]) {
        b.px = b.x;
        b.py = b.y;
        b.x += (b.vx || 0) * dt;
        b.y += (b.vy || 0) * dt;
      }
      for (const q of this.powerups) {
        q.px = q.x;
        q.py = q.y;
        q.y += q.vy * dt;
      }
      for (const e of this.enemies) {
        if (
          e.y > H + e.h ||
          e.escaped ||
          e.x < -e.w ||
          e.x > W + e.w ||
          (e.y < -100 && e.phase === "dive")
        ) {
          e.dead = true;
          this.waveEscapes++;
          this.escapeCount++;this.stats.escaped++;
          if(this.mode==="challenge"&&this.phase==="wave"&&e.key&&!e.chase&&!this.chaseUsed){this.chaseUsed=true;this.chasePending=true;this.event("chase-warning",2);}
          this.event("escape", e.type);
        }
      }
      this.collisions();
      if (this.state !== "playing") return;
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.bullets = this.bullets.filter(
        (b) => !b.dead && b.y > -30 && b.y < H + 30,
      );
      this.enemyBullets = this.enemyBullets.filter(
        (b) =>
          !b.dead && b.y > -30 && b.y < H + 30 && b.x > -30 && b.x < W + 30,
      );
      this.powerups = this.powerups.filter((p) => !p.dead && p.y < H + 30);
      for (const key of ["enemies", "enemyBullets", "hazards"])
        this.stats.peaks[key] = Math.max(
          this.stats.peaks[key],
          this[key].length,
        );
      this.director(dt);
    }
    collisions() {
      const contacts = [];
      const add = (a, b, priority, fn) => {
        const t = swept(a, b);
        if (t !== null) contacts.push({ t, priority, fn });
      };
      for (const b of this.enemyBullets)
        add(b, this.player, 0, () => {
          if (!b.dead) {
            b.dead = true;
            this.hurt();
          }
        });
      for (const e of this.enemies)
        if (!e.dead)
          add(e, this.player, 0, () => {
            if (!e.dead) {
              e.dead = true;
              this.waveEscapes++;
              this.hurt();
            }
          });
      if (this.boss) add(this.boss, this.player, 0, () => this.hurt());
      for (const b of this.bullets) {
        for (const e of this.enemies)
          if (!e.dead)
            add(b, e, 1, () => {
              if (!b.dead && !e.dead) {
                b.dead = true;
                this.hitEnemy(e);
              }
            });
        if (this.boss && this.phase === "boss") {
          for (const target of B.targets(this.boss)) add(b,target.body,1,() => {
            if (!b.dead && this.boss) { b.dead = true; this.hitBoss(1,target.part); }
          });
        }
      }
      for (const q of this.powerups)
        add(q, this.player, 2, () => {
          if (!q.dead) {
            q.dead = true;
            if (q.kind === "shield") this.player.shield = true;
            else this.player.fireLevel = 2;
            this.score += 15;
            this.event("pickup", q.kind);
          }
        });
      for (const h of this.hazards)
        if (h.active) {
          const p = this.player;
          if (h.kind === "bomb" || h.kind === "mine") {
            const dx = Math.max(0, Math.abs(p.x - h.x) - p.w / 2),
              dy = Math.max(0, Math.abs(p.y - h.y) - p.h / 2);
            if (Math.hypot(dx, dy) <= h.radius)
              contacts.push({ t: 0, priority: 0, fn: () => this.hurt() });
          } else
            add(
              {
                x: h.beamX ?? h.x,
                px: h.previousBeamX ?? h.beamX ?? h.x,
                y: H / 2,
                w: h.beamW ?? h.w,
                h: H,
              },
              p,
              0,
              () => this.hurt(),
            );
        }
      contacts.sort((a, b) => a.t - b.t || a.priority - b.priority);
      for (const c of contacts) {
        if (this.state !== "playing") break;
        c.fn();
      }
    }
  }
  function readRecords(raw, { version = 4, totalStages = STAGES.length } = {}) {
    const result = {
      version,
      normal: { best: 0, farthest: 0, clears: 0 },
      challenge: { best: 0, farthest: 0, clears: 0 },
    };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== version || Array.isArray(parsed))
        return result;
      for (const mode of ["normal", "challenge"]) {
        const r = parsed[mode];
        if (
          r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          Number.isSafeInteger(r.best) &&
          r.best >= 0 &&
          r.best <= 999999999 &&
          Number.isInteger(r.farthest) &&
          r.farthest >= 0 &&
          r.farthest <= totalStages &&
          Number.isSafeInteger(r.clears) &&
          r.clears >= 0 &&
          r.clears <= 999999
        )
          result[mode] = {
            best: r.best,
            farthest: r.farthest,
            clears: r.clears,
          };
      }
    } catch {}
    return result;
  }
  return { Game, swept, clamp, STEP, readRecords };
});
