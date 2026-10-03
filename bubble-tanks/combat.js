(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./rules.js') : root.BubbleFrontier.Rules, node ? require('./world.js') : root.BubbleFrontier.World, node ? require('./content.js') : root.BubbleFrontier.Content, node ? require('./bosses.js') : root.BubbleFrontier.Bosses, node ? require('./adventure.js') : root.BubbleFrontier.Adventure,node?require('./weapons.js'):root.BubbleFrontier.Weapons,node?require('./skills.js'):root.BubbleFrontier.Skills,node?require('./enemies.js'):root.BubbleFrontier.Enemies,node?require('./modifiers.js'):root.BubbleFrontier.Modifiers);
  if (node) module.exports = api;
  else (root.BubbleFrontier ||= {}).Combat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (R, W, Data, Bosses, A, Weapons, Skills, Enemies, Modifiers) {
  'use strict';
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function create(seed, chassis = 'balanced', difficulty = 'normal') {
    const player = R.createPlayer(chassis);
    Object.assign(player, {dashClock: 0, dashTime: 0, dashX: 0, dashY: 0, skillClock: 0});
    return {version: 2, mode: 'title', difficulty, rescueLeft: difficulty === 'hard' ? 0 : 1, safeRoom: '0,0', salvage: 0, runId: String(seed), player, world: W.create(seed), time: 0,
      rng: W.random(seed + ':combat'), nextId: 0, cooldowns: {}, target: null, targetClock: 0,
      score: 0, level: 1, nextGrowth: 12, pending: 0, rerolls: 2, notice: '', noticeTime: 0, transition: null};
  }
  function start(state) {if (state.mode === 'title') state.mode = 'running';}
  function pause(state) {if (state.mode === 'running') state.mode = 'paused';}
  function resume(state) {if (state.mode === 'paused') state.mode = 'running';}
  function dash(state, input = {}) {
    const p = state.player;
    if (state.mode !== 'running' || p.dashClock > 0) return false;
    const length = Math.hypot(input.x || 0, input.y || 0);
    p.dashX = length ? input.x / length : Math.cos(p.angle);
    p.dashY = length ? input.y / length : Math.sin(p.angle);
    p.dashTime = 0.18; p.dashClock = 3.2 / (1 + (p.passives.thruster || 0) * 0.15 + (p.passives.cooling || 0) * .12) + (p.relics.turbulent_tail ? 1 : 0);
    p.invulnerable = Math.max(p.invulnerable, p.chassis==='phase' ? .48 : .3);
    Modifiers.onDash(state,W.current(state.world),{effect});
    effect(W.current(state.world), 'dash', p.x, p.y, {r: 25, ttl: 0.3, duration: 0.3});
    return true;
  }
  function useSkill(state) {
    const p = state.player;
    if (state.mode !== 'running' || p.skillClock > 0) return false;
    if(Skills.activate(state,W.current(state.world),{shot:spawnShot,hurt:hurtEnemy,effect})){p.skillClock=Data.skills.find(s=>s.id===p.skill).cooldown/(1+(p.passives.cooling||0)*.12);return true;}
    p.shield = Math.max(p.shield, 18 + (p.passives.shield || 0) * 10);
    p.skillClock = 12/(1+(p.passives.cooling||0)*.12);
    effect(W.current(state.world), 'shield', p.x, p.y, {r: 50, ttl: 0.6, duration: 0.6});
    return true;
  }
  function choose(state, id) {
    if (state.mode !== 'upgrade' || !state.offers.some(u => u.id === id)) return false;
    if (!R.applyUpgrade(state.player, id)) return false;
    state.pending--; state.level++;
    state.offers = state.pending > 0 ? R.offers(state.player, state.rng) : [];
    state.mode = state.pending > 0 ? 'upgrade' : 'running';
    return true;
  }
  function reroll(state){if(state.mode!=='upgrade'||state.rerolls<=0)return false;const old=new Set(state.offers.map(u=>u.id)),pool=Data.upgrades.filter(u=>R.canUpgrade(state.player,u)&&!old.has(u.id));if(!pool.length)return false;state.rerolls--;state.offers=[];while(pool.length&&state.offers.length<3)state.offers.push(pool.splice(Math.min(pool.length-1,Math.floor(state.rng()*pool.length)),1)[0]);return true;}
  function skip(state){if(state.mode!=='upgrade')return false;state.pending--;state.level++;state.salvage++;state.offers=state.pending>0?R.offers(state.player,state.rng):[];state.mode=state.offers.length?'upgrade':'running';return true;}
  function effect(room, kind, x, y, extra = {}) {
    room.effects.push({kind, x, y, ttl: 0.45, duration: 0.45, ...extra});
  }
  function targetable(room,e){return e.hp>0&&!(e.kind==='boss'&&[1,3].includes(e.zone)&&room.enemies.some(n=>n.parent===e.id&&n.hp>0));}
  function nearest(room, player) {
    return room.enemies.filter(e => targetable(room,e)).sort((a, b) => distance(a, player) - distance(b, player))[0] || null;
  }
  function selectTarget(state, room, dt) {
    const closest = nearest(room, state.player), current = room.enemies.find(e => e.id === state.target && targetable(room,e));
    state.targetClock = Math.max(0, state.targetClock - dt);
    if (!current || state.targetClock <= 0 && closest && distance(closest, state.player) < distance(current, state.player) * 0.85) {
      state.target = closest?.id || null; state.targetClock = 0.3;
      return closest;
    }
    return current;
  }
  function spawnShot(state, room, x, y, angle, opts = {}) {
    if (room.shots.filter(s => s.owner === (opts.owner || 'player')).length >= (opts.owner === 'enemy' ? 240 : 180)) return;
    opts=Modifiers.shot(state,opts);
    const speed = opts.speed || 380;
    room.shots.push({id: ++state.nextId, x, y, px: x, py: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: 4, damage: 5, ttl: 1.8, owner: 'player', hitIds: [], ...opts});
    if(opts.echoCopy)spawnShot(state,room,x,y,angle+.06,{...opts,echoCopy:false,echo:true,damage:(opts.damage??5)*.65,delay:(opts.delay||0)+.16,hitIds:[]});
  }
  function fireWeapon(state, room, gun, target) {
    Modifiers.beforeVolley(state,gun);
    if(Weapons.fire(state,room,gun,target,{shot:spawnShot,hurt:hurtEnemy,effect}))return;
    const p = state.player, angle = p.angle + (gun.angle || 0);
    const damage = R.baseDamage(gun);
    const mount = R.mount(gun);
    const x = p.x + Math.cos(p.angle) * mount.x - Math.sin(p.angle) * mount.y;
    const y = p.y + Math.sin(p.angle) * mount.x + Math.cos(p.angle) * mount.y;
    if (gun.id === 'arc') {
      const hitIds = new Set();
      let at = {x, y}, next = target;
      for (let jump = 0; next && jump < 3+(p.relics.conductive_sea?1:0); jump++) {
        if (distance(at, next) > (jump === 0 ? 330 : 115 + (p.passives.conductive || 0) * 50)) break;
        const hit = next;
        hitIds.add(hit.id);
        effect(room, 'arc', at.x, at.y, {toX: hit.x, toY: hit.y, targetId: hit.id, ttl: 0.2, duration: 0.2});
        hurtEnemy(state, room, hit, damage * (1 - jump * 0.15 + (p.passives.conductive || 0) * jump * 0.1),{weapon:'arc',x:at.x,y:at.y});
        at = hit;
        next = room.enemies.filter(e => e.hp > 0 && !hitIds.has(e.id)).sort((a, b) => distance(a, at) - distance(b, at))[0];
      }
      return;
    }
    const count = gun.id === 'scatter' ? 5 : 1;
    for (let i = 0; i < count; i++) spawnShot(state, room, x, y, angle + (i - (count - 1) / 2) * 0.16,
      {weapon: gun.id,mount:gun.slot, damage, r: gun.id === 'scatter' ? 4.5 : 4,
        speed: gun.id === 'scatter' ? 330 : 380, canSplit: gun.id === 'scatter' && !!p.passives.split, generation: 0});
    effect(room, 'muzzle', x, y, {r: 9, ttl: 0.14, duration: 0.14});
  }
  function hurtEnemy(state, room, enemy, amount, hit = {}) {
    if (enemy.hp <= 0) return;
    amount=Modifiers.damage(state,room,enemy,amount,hit);
    amount*=Enemies.damageMultiplier(enemy,room,{x:state.player.x,y:state.player.y,...hit});
    if (enemy.kind === 'boss') amount *= Bosses.damageMultiplier(enemy, room, {x: state.player.x, y: state.player.y, ...hit});
    if(enemy.kind==='boss'&&enemy.stage===1)amount=Math.min(amount,Math.max(0,enemy.hp-enemy.maxHp*.55));
    const actual=Math.min(enemy.hp,Math.max(0,amount));
    enemy.hp -= amount;
    Modifiers.afterDamage(state,room,enemy,actual,hit,{effect,shot:spawnShot,hurt:hurtEnemy});
    enemy.hit = 0.12;
    if (enemy.hp > 0 || enemy.rewarded) return;
    enemy.rewarded = true;
    Enemies.onDeath(state,room,enemy,{shot:spawnShot,effect,hurtPlayer});
    room.kills++;
    effect(room, 'burst', enemy.x, enemy.y, {r: enemy.r, color: 'enemy'});
    if (enemy.rewardless) return;
    state.score += 10;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      room.drops.push({id: `drop:${++state.nextId}`, x: enemy.x + Math.cos(a) * 14, y: enemy.y + Math.sin(a) * 14,
        value: 2, r: 5, source: 'enemy', collected: false});
    }
  }
  function playerCircles(player) {
    const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
    return R.bodyCircles(player).map(c => ({x: player.x + c.x * cos - c.y * sin, y: player.y + c.x * sin + c.y * cos, r: c.r}));
  }
  function hurtPlayer(state, room, amount) {
    const p = state.player, hit = R.damage(p, amount);
    if (!hit.lost && !hit.absorbed) return;
    room.challengeHits = (room.challengeHits || 0) + 1;
    if (!hit.lost) return;
    effect(room, 'burst', p.x, p.y, {r: 26, color: 'player'});
    state.notice = hit.after < hit.before ? 'shrink' : 'hit'; state.noticeTime = 1.5;
    Modifiers.afterPlayerDamage(state,room,hit,{effect});
    const retained = hit.lost * Math.min(.8,.35+(p.passives.recycler||0)*.12);
    for (let i = 0; i < 3; i++) {
      const a = state.rng() * Math.PI * 2;
      room.drops.push({id: `self:${++state.nextId}`, x: p.x + Math.cos(a) * 45, y: p.y + Math.sin(a) * 45, value: retained / 3, r: 4, source: 'self', collected: false});
    }
    if (hit.dead && !A.rescue(state)) {state.mode = 'over'; state.notice = 'over';}
  }
  function updateEnemy(state, room, enemy, dt) {
    if (enemy.hp <= 0) return;
    if(enemy.frozen>0){enemy.frozen=Math.max(0,enemy.frozen-dt);return;}
    if (enemy.kind === 'boss') {const pace=enemy.slow>0?.8:1;enemy.slow=Math.max(0,(enemy.slow||0)-dt);Bosses.update(state, room, enemy, dt*pace, {effect, shot: spawnShot});
      if (playerCircles(state.player).some(c => distance(c, enemy) < c.r + enemy.r)) hurtPlayer(state, room, 10);
      return;
    }
    if(Enemies.update(state,room,enemy,dt,{shot:spawnShot,effect,hurtPlayer,circles:playerCircles})){if(playerCircles(state.player).some(c=>distance(c,enemy)<c.r+enemy.r))hurtPlayer(state,room,7);return;}
    const p = state.player;
    const aim=room.effects.find(f=>f.kind==='decoy'&&f.ttl>0)||p;
    const a = Math.atan2(aim.y - enemy.y, aim.x - enemy.x), d = distance(enemy, p);
    enemy.phase += dt; enemy.angle = a;
    const slow = enemy.slow > 0 ? 0.45 : 1;
    enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
    let vx = 0, vy = 0;
    if (enemy.kind === 'chaser') {vx = Math.cos(a) * 56; vy = Math.sin(a) * 56;}
    if (enemy.kind === 'grazer') {vx = Math.cos(enemy.phase + 1) * 18; vy = Math.sin(enemy.phase + 1) * 18;}
    if (enemy.kind === 'shooter') {
      const approach = d > 230 ? 28 : d < 135 ? -30 : 0;
      vx = Math.cos(a) * approach + Math.cos(a + Math.PI / 2) * 19;
      vy = Math.sin(a) * approach + Math.sin(a + Math.PI / 2) * 19;
    }
    enemy.x += vx * dt * slow; enemy.y += vy * dt * slow;
    const edge = Math.hypot(enemy.x - 400, enemy.y - 400);
    if (edge > 300) {enemy.x = 400 + (enemy.x - 400) / edge * 300; enemy.y = 400 + (enemy.y - 400) / edge * 300;}
    if (enemy.kind !== 'grazer' && enemy.kind !== 'chaser') {
      enemy.cooldown -= dt;
      if (enemy.cooldown <= 0 && !enemy.warning) {
        enemy.warning = enemy.kind === 'sniper' ? 0.7 : 0.32;
        enemy.fireAngle = a;
        effect(room, 'aim', enemy.x, enemy.y, {angle: a, length: enemy.kind === 'sniper' ? 650 : 75, ttl: enemy.warning, duration: enemy.warning});
      }
      if (enemy.warning) {
        enemy.warning -= dt;
        if (enemy.warning <= 0) {
          const count = enemy.kind === 'spinner' ? 8 : 1;
          for (let i = 0; i < count; i++) {
            const angle = count > 1 ? enemy.phase + i * Math.PI * 2 / count : enemy.fireAngle;
            spawnShot(state, room, enemy.x, enemy.y, angle, {owner: 'enemy', r: enemy.kind === 'sniper' ? 4 : 6, speed: enemy.kind === 'sniper' ? 225 : 140, damage: enemy.kind === 'sniper' ? 9 : 6, ttl: 4.5});
          }
          enemy.warning = 0; enemy.cooldown = enemy.kind === 'sniper' ? 3.5 : enemy.kind === 'spinner' ? 2.9 : 2.1;
        }
      }
    }
    if (playerCircles(p).some(c => distance(c, enemy) < c.r + enemy.r)) hurtPlayer(state, room, 7);
  }
  function step(state, input, dt) {
    if (state.mode !== 'running') return;
    dt = R.clamp(dt, 0, 0.04);
    let room = W.current(state.world);
    const p = state.player;
    state.time += dt; room.time += dt;
    p.powerGrace=Math.max(0,(p.powerGrace||0)-dt);
    if(p.passives.sonar&&!room.claims.sonar){room.claims.sonar=true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(W.canEnter(state.world,room.x+dx,room.y+dy))W.roomAt(state.world,room.x+dx,room.y+dy).scanned=true;}
    Modifiers.tick(state,room,dt,{effect,shot:spawnShot,hurt:hurtEnemy});
    Skills.tick(state,room,dt,{shot:spawnShot,hurt:hurtEnemy,effect});
    Enemies.tick(state,room,dt,{shot:spawnShot,effect,hurtPlayer,circles:playerCircles});
    if (state.transition) {
      state.transition.ttl -= dt;
      if (state.transition.ttl <= 0) state.transition = null;
    }
    const length = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
    const speed = Modifiers.speed(p,(180 - R.tier(p.mass) * 6) * (Data.chassis.find(c => c.id === p.chassis)?.speed || 1) * (1 + (p.passives.thruster || 0) * 0.1));
    p.moveX=(input.x||0)/length*speed;p.moveY=(input.y||0)/length*speed;
    p.x += (input.x || 0) / length * speed * dt;
    p.y += (input.y || 0) / length * speed * dt;
    if (p.dashTime > 0) {p.x += p.dashX * 450 * dt; p.y += p.dashY * 450 * dt;}
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.dashClock = Math.max(0, p.dashClock - dt);
    p.skillClock = Math.max(0, p.skillClock - dt);
    const shieldMax = (p.passives.shield || 0) * 10;
    if (p.invulnerable <= 0 && p.shield < shieldMax) p.shield = Math.min(shieldMax, p.shield + dt * (p.passives.shield || 0) * 0.9);
    if (!state.transition && Math.hypot(p.x - 400, p.y - 400) > R.ROOM_RADIUS) {
      const dx = Math.abs(p.x - 400) >= Math.abs(p.y - 400) ? Math.sign(p.x - 400) : 0;
      const dy = dx ? 0 : Math.sign(p.y - 400);
      const from = room;
      room = W.travel(state.world, dx, dy, p);
      if (room !== from) {state.transition = {from, dx, dy, ttl: 0.38, duration: 0.38}; state.target = null; A.enter(state, room);}
      else {const d = Math.hypot(p.x - 400, p.y - 400); p.x = 400 + (p.x - 400) / d * 335; p.y = 400 + (p.y - 400) / d * 335; state.notice = 'seal'; state.noticeTime = 2;}
    }
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    state.noticeTime = Math.max(0, state.noticeTime - dt);
    for (const fx of room.effects) fx.ttl -= dt;
    room.effects = room.effects.filter(fx => fx.ttl > 0);
    for (const e of room.enemies){e.hit=Math.max(0,(e.hit||0)-dt);e.mark=Math.max(0,(e.mark||0)-dt);e.charge=Math.max(0,(e.charge||0)-dt);}
    for (const e of room.enemies) {updateEnemy(state, room, e, dt); if (state.mode !== 'running') return;}
    for (const f of room.effects) if (f.danger && playerCircles(p).some(c => distance(c, f) < c.r + f.r)) hurtPlayer(state, room, f.damage);
    if (state.mode !== 'running') return;
    const target = selectTarget(state, room, dt);
    if (input.aim) {p.angle = Math.atan2(input.aim.y - p.y, input.aim.x - p.x);
      if(p.passives.steering){const e=room.enemies.filter(e=>e.hp>0&&distance(e,input.aim)<35+p.passives.steering*8).sort((a,b)=>distance(a,input.aim)-distance(b,input.aim))[0];if(e){const a=Math.atan2(e.y-p.y,e.x-p.x),delta=Math.atan2(Math.sin(a-p.angle),Math.cos(a-p.angle));p.angle+=delta*.15*p.passives.steering;}}}
    else if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    for (const gun of R.activeLoadout(p)) {
      const slot = gun.slot;
      state.cooldowns[slot] = (state.cooldowns[slot] ?? 0) - dt;
      if(!target&&!input.aim){state.cooldowns[slot]=0;continue;}
      if(state.cooldowns[slot]>0)continue;
      fireWeapon(state, room, gun, target);
      state.cooldowns[slot] += Modifiers.interval(p,(Data.guns.find(g => g.id === gun.id)?.cooldown || 0.38) / (1 + (p.passives.rapid || 0) * 0.16)*(p.overdriveTime>0?.6:1));
    }
    for (const shot of room.shots) {
      if(shot.delay>0){shot.delay=Math.max(0,shot.delay-dt);continue;}
      shot.ttl -= dt;
      if(shot.ttl<=0)continue;
      if(Weapons.updateShot(state,room,shot,dt,{shot:spawnShot,hurt:hurtEnemy,effect,hurtPlayer}))continue;
      shot.px = shot.x; shot.py = shot.y;
      shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      Weapons.reflectShot(shot);
      if (shot.ttl <= 0) continue;
      if (shot.owner === 'enemy') {
        if (playerCircles(p).some(c => distance(c, shot) < c.r + shot.r)) {if(shot.shieldBreak&&p.invulnerable<=0)p.shield=Math.max(0,p.shield-12);hurtPlayer(state, room, shot.damage); shot.ttl = 0;}
        continue;
      }
      for (const enemy of room.enemies) {
        if (enemy.hp <= 0 || shot.hitIds.includes(enemy.id) || distance(shot, enemy) >= enemy.r + shot.r) continue;
        if(Enemies.reflect(enemy,{x:shot.px,y:shot.py})){shot.owner='enemy';shot.damage=Math.min(6,shot.damage);shot.vx=-shot.vx;shot.vy=-shot.vy;shot.ttl=Math.min(1,shot.ttl);shot.hitIds=[enemy.id];break;}
        shot.hitIds.push(enemy.id);
        hurtEnemy(state, room, enemy, shot.damage, {x: shot.px, y: shot.py,weapon:shot.weapon,focusBoost:shot.focusBoost});
        if (shot.canSplit && shot.generation === 0&&!shot.hasSplit) {
          shot.hasSplit=true;
          const a = Math.atan2(shot.vy, shot.vx), power = 1 + (p.passives.split || 0) * 0.15;
          for (const offset of [-0.5, 0.5]) spawnShot(state, room, shot.x, shot.y, a + offset,
            {weapon: 'fragment', generation: 1, damage: shot.damage * 0.55 * power, r: 3, ttl: 0.7, speed: 280, hitIds: [enemy.id], canSplit: false});
          effect(room, 'split', shot.x, shot.y, {r: 18, ttl: 0.25, duration: 0.25});
        }
        shot.pierce=(shot.pierce||1)-1;
        if(shot.pierce<=0){shot.ttl=0;break;}
      }
    }
    room.shots=room.shots.filter(b=>{const keep=b.ttl>0&&Math.hypot(b.x-400,b.y-400)<360;if(!keep)Modifiers.miss(state,b);return keep;});
    if (!room.cleared && room.enemies.every(e => e.hp <= 0)) {
      A.clear(state, room);
      state.notice = 'clear'; state.noticeTime = 2;
      effect(room, 'clear', 400, 400, {ttl: 0.8, duration: 0.8, r: 90});
    }
    if (state.mode !== 'running') return;
    for (const drop of room.drops) {
      if (drop.collected) continue;
      const d = distance(drop, p), reach = room.cleared ? 900 : 70 + (p.passives.magnet || 0) * 50;
      if (d < reach && d > 0) {
        const speed = room.cleared ? 300 : 170;
        const move = Math.min(d, speed * dt);
        drop.x += (p.x - drop.x) / d * move; drop.y += (p.y - drop.y) / d * move;
      }
      if (distance(drop, p) < 15) {
        drop.collected = true;
        const before = R.tier(p.mass);
        R.absorb(p, drop);
        if (R.tier(p.mass) > before) {state.notice = 'grow'; state.noticeTime = 2; effect(room, 'grow', p.x, p.y, {r: 25, ttl: 0.7, duration: 0.7});}
      }
    }
    room.drops = room.drops.filter(b => !b.collected);
    while (p.growth >= state.nextGrowth) {
      state.pending++;
      state.nextGrowth += 18 + (state.level + state.pending - 2) * 6;
    }
    if (state.pending > 0 && state.mode === 'running') {
      state.offers = R.offers(p, state.rng);
      if (state.offers.length) state.mode = 'upgrade';
      else {state.pending = 0; p.mass = R.clamp(p.mass + 6, 0, 400);}
    }
  }
  return {create, start, pause, resume, dash, useSkill, choose, reroll, skip, step, spawnShot, fireWeapon, hurtEnemy, hurtPlayer, playerCircles, nearest, selectTarget, distance, effect};
});
