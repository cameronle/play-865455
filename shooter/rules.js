(function (root, factory) {
  "use strict";
  const rules = factory(
    typeof module === "object" ? require("./content") : root.SkyPatrolContent,
  );
  if (typeof module === "object") module.exports = rules;
  else root.SkyPatrolRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
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
      if (this.state !== "intermission") return false;
      this.level++;
      this.wave = 0;
      this.waveTime = 0;
      this.group = 0;
      this.waveEscapes = 0;
      this.phase = "wave";
      this.clearField();
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
    }
    finishStage() {
      if (this.state !== "playing") return;
      this.score += 200 * this.level;
      this.player.invuln = 1.5;
      if (STAGES[this.level - 1].boss) {
        this.lives = Math.min(3, this.lives + 1);
        this.pulses = Math.min(2, this.pulses + 1);
        this.stats.bosses.push(STAGES[this.level - 1].boss);
        this.event("chapter-reward", this.level);
      }
      this.clearField();
      this.state = this.level === 9 ? "clear" : "intermission";
      this.event(this.state, this.level);
    }
    hurt() {
      if (this.state !== "playing" || this.player.invuln > 0) return false;
      if (this.player.shield) {
        this.player.shield = false;
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
      const groupId = ++this.serial;
      for (let i = 0; i < g.count; i++)
        this.spawn(g.type, g.x + (i - (g.count - 1) / 2) * 48, {
          groupId,
          leader: i === Math.floor(g.count / 2),
          y: -28 - Math.abs(i - (g.count - 1) / 2) * 24,
        });
    }
    emit(x, y, vx, vy, source) {
      if (this.enemyBullets.length >= LIMITS.enemyBullets || y < 0 || y > H)
        return;
      this.enemyBullets.push({ x, y, vx, vy, w: 6, h: 12, source });
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
    updateEnemy(e, dt) {
      e.age += dt;
      e.cooldown -= dt;
      if (e.type === "diver" || e.type === "sniper") {
        if (e.phase === "entry" && e.age >= 1.6 && e.y > 30) {
          e.phase = "aim";
          e.target = { x: this.player.x, y: this.player.y };
          e.warning = e.type === "sniper" ? 1.1 : 0.9;
          this.event(e.type + "-warning", e.id);
        } else if (e.phase === "aim") {
          e.warning -= dt;
          if (e.warning <= 0) {
            if (e.type === "sniper") {
              this.aim(e, e.target, 220);
              e.phase = "exit";
            } else {
              e.phase = "dive";
              const dx = e.target.x - e.x,
                dy = e.target.y - e.y,
                n = Math.hypot(dx, dy) || 1;
              e.vx = (dx / n) * 260;
              e.vy = (dy / n) * 260;
              e.diveTime = 0;
            }
          }
        }
        if (e.phase === "exit") {
          e.y += 80 * dt;
          return;
        }
        if (e.phase === "dive") {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.diveTime += dt;
          if (e.diveTime > 3.5) e.escaped = true;
          return;
        }
        if (e.phase === "aim") return;
      }
      if (e.type === "bomber" && e.y > 30 && e.y < H - 90 && e.cooldown <= 0) {
        this.addHazard({
          kind: "bomb",
          x: this.player.x,
          y: clamp(this.player.y, 60, H - 48),
          radius: 42,
          w: 84,
          h: 84,
          warning: 1.4,
          ttl: 0.5,
          source: e.id,
        });
        e.cooldown = 3.6 / MODES[this.mode].fireScale;
      }
      e.y += e.speed * MODES[this.mode].speedScale * dt;
      if (e.type === "heavy") e.shield = e.age % 4 < 2.3;
      e.x = clamp(
        e.broken
          ? e.x + (e.id % 2 ? 1 : -1) * 40 * dt
          : e.baseX +
              Math.sin(
                e.age * 1.5 + (e.type === "formation" ? e.groupId : e.id),
              ) *
                12,
        e.w / 2,
        W - e.w / 2,
      );
      if (
        e.type !== "bomber" &&
        e.y > e.h / 2 &&
        e.y < H - 90 &&
        e.cooldown <= 0 &&
        !e.shield
      ) {
        if (e.type === "heavy")
          for (const vx of [-42, 0, 42])
            this.emit(e.x, e.y + e.h / 2, vx, 140, e.id);
        else this.emit(e.x, e.y + e.h / 2, 0, 130, e.id);
        e.cooldown = 3 / MODES[this.mode].fireScale;
      }
    }
    addHazard(spec) {
      if (this.hazards.length >= LIMITS.hazards) return null;
      const h = { id: ++this.serial, active: false, ...spec };
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
          h.beamX =
            h.x -
            h.w / 2 +
            h.beamW / 2 +
            (1 - h.ttl / h.duration) * (h.w - h.beamW);
      }
      this.hazards = this.hazards.filter((h) => h.ttl > 0);
    }
    director(dt) {
      const stage = STAGES[this.level - 1];
      if (this.phase === "wave") {
        this.waveTime += dt;
        const w = stage.waves[this.wave];
        while (
          this.group < w.groups.length &&
          this.waveTime >= w.groups[this.group].at
        ) {
          this.spawnGroup(w.groups[this.group++]);
        }
        if (
          this.group === w.groups.length &&
          this.waveTime >= w.minSeconds &&
          !this.enemies.length
        ) {
          if (this.waveEscapes === 0) {
            this.score += 100;
            this.event("wave-bonus", this.wave);
          }
          this.waveEscapes = 0;
          this.wave++;
          this.group = 0;
          this.waveTime = 0;
          this.enemyBullets = [];
          this.hazards = [];
          if (this.wave >= stage.waves.length) {
            if (stage.boss) {
              this.phase = "boss-warning";
              this.phaseTimer = 2;
              this.event("boss-warning", stage.boss);
            } else this.finishStage();
          }
        }
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
      const d = BOSSES[type];
      this.clearField();
      this.boss = {
        ...d,
        type,
        id: ++this.serial,
        x: 240,
        y: -d.h,
        hp: Math.ceil(d.hp * MODES[this.mode].hpScale),
        maxHp: Math.ceil(d.hp * MODES[this.mode].hpScale),
        age: 0,
        cooldown: 2,
        phase: 1,
        pattern: 0,
      };
      if (type === "twin-core")
        this.boss.turrets = ["left", "right"].map((part, i) => ({
          part,
          id: this.boss.id + "-" + part,
          offset: i === 0 ? -56 : 56,
          hp: Math.ceil(d.turretHp * MODES[this.mode].hpScale),
          maxHp: Math.ceil(d.turretHp * MODES[this.mode].hpScale),
          cooldown: 1.2 + i,
          w: 34,
          h: 36,
        }));
      this.phase = "boss-enter";
      this.event("boss-enter", type);
    }
    updateTurrets(dt) {
      const b = this.boss;
      for (const t of b.turrets) {
        if (t.hp <= 0) continue;
        t.cooldown -= dt;
        if (t.attack) {
          t.attack.timer -= dt;
          if (t.attack.timer <= 0) {
            this.aim(
              { ...t, x: b.x + t.offset, y: b.y + 6 },
              t.attack.target,
              155,
            );
            t.attack = null;
            t.cooldown = 2.6 / MODES[this.mode].fireScale;
          }
        } else if (t.cooldown <= 0)
          t.attack = {
            target: { x: this.player.x, y: this.player.y },
            timer: 1.1,
          };
      }
    }
    updateBoss(dt) {
      if (this.phase !== "boss" || !this.boss) return;
      const b = this.boss;
      b.age += dt;
      b.cooldown -= dt;
      b.x = 240 + Math.sin(b.age * 0.6) * 95;
      if (b.type === "twin-core" && b.turrets.some((t) => t.hp > 0)) {
        this.updateTurrets(dt);
        return;
      }
      if (b.type === "storm-carrier") {
        const phase =
          b.hp <= b.maxHp * 0.35 ? 3 : b.hp <= b.maxHp * 0.7 ? 2 : 1;
        if (phase > b.phase) {
          b.phase++;
          this.event("boss-phase", b.phase);
        }
      }
      if (b.type === "iron-wing" && b.phase === 1 && b.hp <= b.maxHp * 0.45) {
        b.phase = 2;
        this.event("boss-phase", 2);
      }
      if (b.attack) {
        b.attack.timer -= dt;
        if (b.attack.timer <= 0) {
          if (b.attack.kind === "fan") {
            for (const angle of b.type === "storm-carrier" && b.phase === 3
              ? [-0.85, -0.55, -0.28, 0, 0.28, 0.55, 0.85]
              : [-0.75, -0.38, 0, 0.38, 0.75])
              this.emit(
                b.x,
                b.y + b.h / 2,
                Math.sin(angle) * 155,
                Math.cos(angle) * 155,
                b.id,
              );
          } else if (b.attack.kind === "aim") this.aim(b, b.attack.target, 175);
          else if (b.attack.kind === "summon") {
            const count = Math.min(
              2,
              Math.max(0, 4 - this.enemies.filter((e) => !e.dead).length),
            );
            for (let i = 0; i < count; i++)
              this.spawn(
                b.phase === 3 && i === 1 ? "diver" : "scout",
                i === 0 ? 70 : 410,
                { summoned: true },
              );
            this.event("summon", count);
          }
          b.attack = null;
          b.cooldown = (b.phase === 2 ? 1.3 : 2.4) / MODES[this.mode].fireScale;
        }
        return;
      }
      if (b.cooldown <= 0) {
        b.attack = {
          kind:
            b.type === "storm-carrier"
              ? ["laser", "fan", "summon"][b.pattern++ % 3]
              : b.pattern++ % 2 === 0
                ? "fan"
                : "aim",
          timer: 0.9,
          target: { x: this.player.x, y: this.player.y },
        };
        if (b.attack.kind === "laser") {
          b.attack.timer = 1.4;
          const center = clamp(this.player.x, 100, 380);
          this.addHazard({
            kind: "laser",
            x: center,
            y: H / 2,
            w: 180,
            h: H,
            beamW: 32,
            beamX: center - 74,
            warning: 1.4,
            ttl: 1.5,
            duration: 1.5,
            source: b.id,
          });
        }
        this.event("boss-attack", b.attack.kind);
      }
    }
    hitEnemy(e, amount = 1) {
      if (this.state !== "playing" || e.dead || e.shield) return false;
      e.hp -= amount;
      if (e.hp <= 0) this.kill(e);
      return true;
    }
    kill(e) {
      if (this.state !== "playing" || e.dead) return;
      e.dead = true;
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
      if (this.stats.kills === 2 || this.stats.kills % 6 === 0) {
        const kind =
          this.stats.kills === 2
            ? "double"
            : this.stats.kills % 12 === 0
              ? "shield"
              : "double";
        if (this.powerups.length < LIMITS.powerups)
          this.powerups.push({ x: e.x, y: e.y, w: 18, h: 18, vy: 90, kind });
      }
    }
    hitBoss(amount = 1, part = null) {
      if (this.state !== "playing" || this.phase !== "boss" || !this.boss)
        return false;
      const boss = this.boss;
      if (boss.type === "twin-core") {
        if (part) {
          const t = boss.turrets.find((t) => t.part === part);
          if (!t || t.hp <= 0) return false;
          t.hp = Math.max(0, t.hp - amount);
          if (t.hp === 0) {
            t.attack = null;
            this.score += 200;
            this.event("turret-defeated", part);
            if (boss.turrets.every((t) => t.hp === 0)) {
              boss.phase = 2;
              boss.cooldown = 1.5;
              this.event("core-open", boss.type);
            }
          }
          return true;
        }
        if (boss.turrets.some((t) => t.hp > 0)) return false;
      }
      this.boss.hp -= amount;
      if (this.boss.hp <= 0) {
        this.burst(this.boss.x, this.boss.y, true);
        this.score += 1200 * this.level;
        this.event("boss-defeated", this.boss.type);
        this.finishStage();
      }
      return true;
    }
    pulse() {
      if (this.state !== "playing" || this.pulses <= 0) return false;
      this.pulses--;
      this.pulseTime = 0.5;
      this.enemyBullets = [];
      for (const e of this.enemies) this.hitEnemy(e, 2);
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.event("pulse", this.pulses);
      return true;
    }
    burst(x, y, boss = false) {
      if (this.particles.length < LIMITS.particles)
        this.particles.push({ x, y, boss, ttl: 0.45 });
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
    tick(dt, input) {
      this.time += dt;
      this.pulseTime = Math.max(0, this.pulseTime - dt);
      for (const q of this.particles) q.ttl -= dt;
      this.particles = this.particles.filter((q) => q.ttl > 0);
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
          this.escapeCount++;
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
          const boss = this.boss,
            core = boss.type === "twin-core" ? { ...boss, w: 40, h: 40 } : boss;
          add(b, core, 1, () => {
            if (!b.dead) {
              b.dead = true;
              this.hitBoss();
            }
          });
          for (const t of boss.turrets || [])
            if (t.hp > 0)
              add(
                b,
                {
                  x: boss.x + t.offset,
                  y: boss.y + 6,
                  px: (boss.px ?? boss.x) + t.offset,
                  py: (boss.py ?? boss.y) + 6,
                  w: t.w,
                  h: t.h,
                },
                1,
                () => {
                  if (!b.dead && t.hp > 0) {
                    b.dead = true;
                    this.hitBoss(1, t.part);
                  }
                },
              );
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
          if (h.kind === "bomb") {
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
  function readRecords(raw) {
    const result = {
      version: 2,
      normal: { best: 0, farthest: 0, clears: 0 },
      challenge: { best: 0, farthest: 0, clears: 0 },
    };
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 2 || Array.isArray(parsed))
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
          r.farthest <= 9 &&
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
