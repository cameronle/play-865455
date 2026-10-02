(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./content.js') : root.BubbleFrontier.Content);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.BubbleFrontier ||= {}).Rules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const SIZE = 800, CENTER = 400, ROOM_RADIUS = 350;
  const THRESHOLDS = [0, 30, 65, 115, 185, 285];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const tier = mass => THRESHOLDS.reduce((n, t, i) => mass >= t ? i : n, 0);
  function createPlayer(chassis = 'balanced') {
    return {x: CENTER, y: CENTER, angle: -Math.PI / 2, mass: 22, growth: 0, chassis,
      invulnerable: 0, shield: 0, passives: {}, blueprints: {pulse: 1}, skill:'overload',skills:['overload'],relics:{},branches:{},heat:{},
      loadout: [{id: 'pulse', level: 1, cost: 1, slot: 0, angle: 0}]};
  }
  function absorb(player, bubble) {
    player.mass = clamp(player.mass + bubble.value, 0, 400);
    if (bubble.source !== 'self') player.growth += bubble.value;
    return tier(player.mass);
  }
  function bodyShape(player) {
    const t = tier(player.mass), r = 16 + t * 3;
    const circles = [{x: 0, y: 0, r}];
    if (player.chassis === 'scout') {
      for (let i = 0; i < t + 2; i++) circles.push({x: -r * (0.75 + i * 0.52), y: i % 2 ? r * 0.45 : -r * 0.45, r: r * (0.55 - i * 0.035)});
      return circles;
    }
    if (player.chassis === 'bulwark') {
      circles[0].r = r * 1.15;
      for (let i = 0; i < t + 4; i++) {
        const a = Math.PI * 2 * i / (t + 4);
        circles.push({x: Math.cos(a) * r * 1.4, y: Math.sin(a) * r * 1.4, r: r * 0.72});
      }
      return circles;
    }
    if(player.chassis==='gunship'){for(let i=0;i<t+2;i++)for(const side of [-1,1])circles.push({x:r*(-.6+i*.45),y:side*r*1.2,r:r*.55});return circles;}
    if(player.chassis==='swarmbody'){for(let i=0;i<t+3;i++){const a=i*Math.PI*2/(t+3);circles.push({x:Math.cos(a)*r*1.7,y:Math.sin(a)*r*1.7,r:r*.42});}return circles;}
    if(player.chassis==='phase'){for(let i=0;i<t+2;i++){const a=Math.PI*.5+i*Math.PI*2/(t+2);circles.push({x:Math.cos(a)*r*1.8,y:Math.sin(a)*r*1.8,r:r*.34});}return circles;}
    for (let i = 0; i < t + (t > 0 ? 2 : 0); i++) {
      const a = Math.PI * 2 * i / (t + 2);
      circles.push({x: Math.cos(a) * r * 1.25, y: Math.sin(a) * r * 1.25, r: r * 0.66});
    }
    return circles;
  }
  function mount(gun) {
    return {x: Number.isFinite(gun.x) ? gun.x : 18, y: Number.isFinite(gun.y) ? gun.y : (gun.slot % 2 ? 1 : -1) * Math.min(14, gun.slot * 5)};
  }
  function bodyCircles(player) {
    const body = bodyShape(player);
    for (const gun of player.loadout) if (Number.isFinite(gun.x) && Number.isFinite(gun.y)) body.push({...mount(gun), r: 7});
    return body;
  }
  function power(player) { return 4 + tier(player.mass) * 3+(C.chassis.find(c=>c.id===player.chassis)?.power||0)+(player.relics?.efficiency?2:0)-(player.relics?.flow_core?2:0); }
  function activeLoadout(player) {
    let left = power(player);
    return player.loadout.filter(gun => {
      if (gun.cost > left) return false;
      left -= gun.cost;
      return true;
    });
  }
  function damage(player, amount) {
    const before = tier(player.mass);
    if (player.invulnerable > 0) return {lost: 0, before, after: before, dead: false};
    amount *= (C.chassis.find(c => c.id === player.chassis)?.armor || 1)*Math.pow(.9,player.passives.shell||0)*(player.relics?.heavy_core?.75:1)*(player.relics?.glass_core?1.4:1)*(player.relics?.conductive_sea?1.15:1);
    const shieldLoss = Math.min(player.shield, amount);
    player.shield -= shieldLoss;
    const lost = Math.min(player.mass, Math.max(0, amount - shieldLoss)*Math.pow(.92,player.passives.conserve||0));
    player.mass -= lost;
    player.invulnerable = 0.95+(player.passives.protection||0)*.15;
    return {lost, absorbed: shieldLoss, before, after: tier(player.mass), dead: player.mass <= 0};
  }
  function rank(player, id) {return player.blueprints?.[id] || player.loadout.find(g => g.id === id)?.level || player.passives[id] || player.relics?.[id] || (player.skills?.includes(id)?1:0) || (id.endsWith('_branch')&&player.branches?.[id.slice(0,-7)]?1:0);}
  function canUpgrade(player, item) {
    if(!item)return false;
    if (rank(player, item.id) >= item.cap) return false;
    if (item.needs && !activeLoadout(player).some(g => (Array.isArray(item.needs)?item.needs:[item.needs]).includes(g.id))) return false;
    if(item.needsSkill&&player.skill!==item.needsSkill)return false;
    if (item.type === 'gun' && !player.loadout.some(g => g.id === item.id)) {
      return activeLoadout(player).reduce((s, g) => s + g.cost, 0) + item.cost <= power(player);
    }
    return true;
  }
  function offers(player, rng) {
    const pool = C.upgrades.filter(u => canUpgrade(player, u));
    const result = [];
    while (pool.length && result.length < 3) result.push(pool.splice(Math.min(pool.length - 1, Math.floor(rng() * pool.length)), 1)[0]);
    return result;
  }
  function applyUpgrade(player, id) {
    const item = C.upgrades.find(u => u.id === id);
    if (!item || !canUpgrade(player, item)) return false;
    if (item.type === 'gun') {
      const level = rank(player, id) + 1, guns = player.loadout.filter(g => g.id === id);
      player.blueprints ||= {}; player.blueprints[id] = level;
      if (guns.length) for (const gun of guns) gun.level = level;
      else player.loadout.push({id, cost: item.cost, level, slot: Math.max(...player.loadout.map(g => g.slot)) + 1, angle: 0});
    } else if(item.type==='skill'){player.skills||=['overload'];player.skills.push(id);player.skill=id;player.skillClock=0;}
    else if(item.type==='relic'){player.relics||={};player.relics[id]=1;}
    else if(item.type==='branch'){player.branches||={};player.branches[item.gun]=true;}
    else {
      player.passives[id] = (player.passives[id] || 0) + 1;
      if (id === 'shield') player.shield = player.passives.shield * 10;
    }
    return true;
  }
  return {SIZE, CENTER, ROOM_RADIUS, THRESHOLDS, clamp, tier, createPlayer, absorb, bodyShape, bodyCircles, mount, power, activeLoadout, damage, rank, canUpgrade, offers, applyUpgrade};
});
