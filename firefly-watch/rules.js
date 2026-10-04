(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FireflyWatchRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const UPGRADES = [
    {id: 'quick-glow', label: 'QUICK GLOW', description: 'Shot interval -0.07s (minimum 0.22s).', maxRank: 5},
    {id: 'split-spark', label: 'SPLIT SPARK', description: 'Add another spark to every volley.', maxRank: 3},
    {id: 'bright-core', label: 'BRIGHT CORE', description: 'Sparks deal 35% more damage.', maxRank: 5},
    {id: 'piercing-light', label: 'PIERCING LIGHT', description: 'Sparks pass through another enemy.', maxRank: 3},
    {id: 'swift-wings', label: 'SWIFT WINGS', description: 'Move 12% faster.', maxRank: 4},
    {id: 'wide-lantern', label: 'WIDE LANTERN', description: 'Collect glow from farther away.', maxRank: 4},
    {id: 'orbiting-mote', label: 'ORBITING MOTE', description: 'Add a protective orbiting light.', maxRank: 3},
    {id: 'leaf-shield', label: 'LEAF SHIELD', description: 'Gain and carry one more shield.', maxRank: 3},
    {id: 'dew-heart', label: 'DEW HEART', description: 'Gain one heart and fully heal.', maxRank: 3}
  ];

  function createPlayerStats() {
    return {
      fireCooldown: 0.55,
      projectiles: 1,
      damage: 12,
      pierce: 0,
      speed: 230,
      pickupRadius: 62,
      orbiters: 0,
      maxHp: 3,
      hp: 3,
      maxShields: 0,
      shields: 0,
      upgradeRanks: Object.create(null)
    };
  }

  function applyUpgrade(stats, upgradeId) {
    const next = {
      ...stats,
      upgradeRanks: {...(stats.upgradeRanks || {})}
    };
    const definition = UPGRADES.find(upgrade => upgrade.id === upgradeId);
    if (!definition) return next;
    const currentRank = next.upgradeRanks[upgradeId] || 0;
    if (currentRank >= definition.maxRank) return next;
    next.upgradeRanks[upgradeId] = currentRank + 1;

    if (upgradeId === 'quick-glow') next.fireCooldown = Math.max(0.22, Number((next.fireCooldown - 0.07).toFixed(2)));
    if (upgradeId === 'split-spark') next.projectiles = Math.min(4, next.projectiles + 1);
    if (upgradeId === 'bright-core') next.damage = Number((next.damage * 1.35).toFixed(2));
    if (upgradeId === 'piercing-light') next.pierce = Math.min(3, next.pierce + 1);
    if (upgradeId === 'swift-wings') next.speed = Math.round(next.speed * 1.12);
    if (upgradeId === 'wide-lantern') next.pickupRadius += 28;
    if (upgradeId === 'orbiting-mote') next.orbiters = Math.min(3, next.orbiters + 1);
    if (upgradeId === 'leaf-shield') {
      next.maxShields = Math.min(3, next.maxShields + 1);
      next.shields = next.maxShields;
    }
    if (upgradeId === 'dew-heart') {
      next.maxHp = Math.min(6, next.maxHp + 1);
      next.hp = next.maxHp;
    }
    return next;
  }

  function chooseUpgradeOffer(stats, rolls) {
    const available = UPGRADES.filter(upgrade => (stats.upgradeRanks?.[upgrade.id] || 0) < upgrade.maxRank);
    const pool = available.slice();
    const offer = [];
    let index = 0;
    while (pool.length && offer.length < 3) {
      const roll = Array.isArray(rolls) && rolls.length ? rolls[index % rolls.length] : Math.random();
      const poolIndex = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, roll)) * pool.length));
      offer.push(pool.splice(poolIndex, 1)[0]);
      index += 1;
    }
    return offer;
  }

  const survivalDuration = 360;
  const DIFFICULTY_STAGES = [
    {at: 0, spawnInterval: 0.92, healthScale: 1, speedScale: 1, tier: 0},
    {at: 90, spawnInterval: 0.72, healthScale: 1.35, speedScale: 1.12, tier: 1},
    {at: 180, spawnInterval: 0.56, healthScale: 1.8, speedScale: 1.26, tier: 2},
    {at: 270, spawnInterval: 0.42, healthScale: 2.35, speedScale: 1.42, tier: 3},
    {at: survivalDuration, spawnInterval: 0.3, healthScale: 3, speedScale: 1.6, tier: 4}
  ];

  function difficultyAt(seconds) {
    const time = Math.max(0, Math.min(survivalDuration, Number(seconds) || 0));
    let start = DIFFICULTY_STAGES[0];
    let end = DIFFICULTY_STAGES.at(-1);
    for (let index = 1; index < DIFFICULTY_STAGES.length; index += 1) {
      if (time <= DIFFICULTY_STAGES[index].at) {
        end = DIFFICULTY_STAGES[index];
        start = DIFFICULTY_STAGES[index - 1];
        break;
      }
    }
    const span = Math.max(1, end.at - start.at);
    const progress = Math.max(0, Math.min(1, (time - start.at) / span));
    const mix = key => Number((start[key] + (end[key] - start[key]) * progress).toFixed(3));
    return {
      spawnInterval: mix('spawnInterval'),
      healthScale: mix('healthScale'),
      speedScale: mix('speedScale'),
      tier: time >= end.at ? end.tier : start.tier
    };
  }

  function normalizeVector(x, y) {
    const length = Math.hypot(x, y);
    return length > 0 ? {x: x / length, y: y / length} : {x: 0, y: 0};
  }

  function circlesOverlap(a, b) {
    const radius = a.r + b.r;
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < radius ** 2;
  }

  // First contact along two moving circles; null means no contact this step.
  function sweptHit(from, shot, enemy, fraction = 1) {
    const ex = enemy.previousX ?? enemy.x, ey = enemy.previousY ?? enemy.y;
    const x = from.x - ex, y = from.y - ey;
    const dx = shot.x - from.x - (enemy.x - ex) * fraction;
    const dy = shot.y - from.y - (enemy.y - ey) * fraction;
    const radius = shot.radius + enemy.radius;
    const c = x * x + y * y - radius * radius;
    if (c <= 0) return 0;
    const a = dx * dx + dy * dy;
    if (a < 1e-12) return null;
    const b = 2 * (x * dx + y * dy), discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }

  function xpNeeded(level) {
    return 6 + Math.max(1, Number(level) || 1) * 4;
  }

  return {
    UPGRADES,
    createPlayerStats,
    applyUpgrade,
    chooseUpgradeOffer,
    survivalDuration,
    difficultyAt,
    normalizeVector,
    circlesOverlap,
    sweptHit,
    xpNeeded
  };
});
