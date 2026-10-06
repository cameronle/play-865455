(function (root, factory) {
  "use strict";
  const content = factory();
  if (typeof module === "object") module.exports = content;
  else root.SkyPatrolContent = content;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ENEMIES = {
    scout: {
      hp: 2,
      score: 30,
      w: 26,
      h: 28,
      speed: 66,
      shape: "triangle",
      name: ["侦察机", "SCOUT"],
    },
    formation: {
      hp: 2,
      score: 40,
      w: 28,
      h: 26,
      speed: 56,
      shape: "wings",
      name: ["编队机", "FORMATION"],
    },
    diver: {
      hp: 3,
      score: 65,
      w: 24,
      h: 42,
      speed: 58,
      shape: "dart",
      name: ["俯冲机", "DIVER"],
    },
    heavy: {
      hp: 7,
      score: 100,
      w: 44,
      h: 36,
      speed: 38,
      shape: "shield",
      name: ["重装机", "ARMORED"],
    },
    sniper: {
      hp: 3,
      score: 70,
      w: 24,
      h: 44,
      speed: 54,
      shape: "barrel",
      name: ["狙击机", "SNIPER"],
    },
    bomber: {
      hp: 4,
      score: 80,
      w: 46,
      h: 30,
      speed: 48,
      shape: "pods",
      name: ["投弹机", "BOMBER"],
    },
  };
  const BOSSES = {
    "iron-wing": { hp: 360, w: 160, h: 74, name: ["铁翼巡航舰", "IRON WING"] },
    "twin-core": {
      hp: 260,
      turretHp: 110,
      w: 168,
      h: 88,
      name: ["双核护卫舰", "TWIN CORE"],
    },
    "storm-carrier": {
      hp: 520,
      w: 190,
      h: 98,
      name: ["风暴母舰", "STORM CARRIER"],
    },
  };
  const MODES = {
    normal: { hpScale: 1, fireScale: 1, speedScale: 1 },
    challenge: { hpScale: 1.15, fireScale: 1.28, speedScale: 1.08 },
  };
  const wave = (groups, index, interval, minSeconds) => ({
    minSeconds,
    groups: groups.map(([type, count], i) => ({
      type,
      at: Math.round(i * interval * 100) / 100,
      count,
      x: [120, 240, 360][(index + i) % 3],
    })),
  });
  const stage = (id, name, groups, {
    boss = null,
    interval = 2.7,
    minSeconds = 12,
  } = {}) => ({
    id,
    name,
    boss,
    waves: (boss ? [0] : [0, 1, 2, 3]).map((i) =>
      wave(groups, i, interval, minSeconds),
    ),
  });
  const STAGES = [
    {
      id: 1,
      name: ["初次巡航", "FIRST PATROL"],
      boss: null,
      waves: [0, 1, 2, 3].map((waveIndex) => ({
        minSeconds: 10,
        groups: ["scout", "formation", "scout"].map((type, groupIndex) => ({
          type,
          at: groupIndex * 3,
          count: [3, 4, 3][groupIndex],
          x: [120, 240, 360][(waveIndex + groupIndex) % 3],
        })),
      })),
    },
    stage(2, ["突袭航线", "AMBUSH ROUTE"], [
      ["scout", 3], ["diver", 2], ["heavy", 1], ["formation", 4],
    ]),
    stage(3, ["铁翼封锁", "IRON BLOCKADE"], [
      ["scout", 3], ["formation", 4], ["scout", 3],
    ], { boss: "iron-wing", minSeconds: 10 }),
    stage(4, ["危险空域", "DANGER ZONE"], [
      ["scout", 3], ["bomber", 2], ["formation", 4], ["scout", 2],
    ], { interval: 2.6, minSeconds: 11 }),
    stage(5, ["瞄准警戒", "CROSSHAIRS"], [
      ["formation", 4], ["sniper", 2], ["scout", 3], ["diver", 1],
    ]),
    stage(6, ["双核防线", "TWIN DEFENSE"], [
      ["formation", 4], ["scout", 4], ["formation", 4],
    ], { boss: "twin-core", minSeconds: 10 }),
    stage(7, ["护卫集群", "ESCORT FLEET"], [
      ["formation", 4], ["heavy", 1], ["sniper", 2], ["scout", 4],
    ], { interval: 2.8 }),
    stage(8, ["风暴前沿", "STORM FRONT"], [
      ["formation", 4], ["bomber", 2], ["diver", 2], ["heavy", 1], ["scout", 3],
    ], { interval: 2.4, minSeconds: 14 }),
    stage(9, ["最后巡航", "FINAL PATROL"], [
      ["scout", 4], ["formation", 4], ["scout", 4],
    ], { boss: "storm-carrier", minSeconds: 10 }),
  ];
  const LIMITS = {
    enemies: 18,
    enemyBullets: 140,
    bullets: 90,
    hazards: 8,
    particles: 100,
    powerups: 8,
  };
  return {
    ENEMIES,
    BOSSES,
    MODES,
    STAGES,
    LIMITS,
    W: 480,
    H: 648,
    RECORD_KEY: "sky-patrol-records-v2",
  };
});
