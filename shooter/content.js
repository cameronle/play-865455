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
  // Profiles share eight mechanics; variants change choices, not just HP/color.
  const BOSSES = {
    outpost: { hp: 130, w: 116, h: 64, kind: "fan", name: ["前哨指挥机", "OUTPOST"], patterns: ["fan"], challenge: ["fan", "aim"], tip: "fan" },
    spear: { hp: 160, w: 106, h: 82, kind: "dash", name: ["尖锋突击舰", "SPEAR"], patterns: ["dash", "aim"], challenge: ["dash", "fan", "aim"], tip: "dash" },
    "iron-wing": { hp: 360, w: 160, h: 74, kind: "fan", name: ["铁翼巡航舰", "IRON WING"], patterns: ["fan", "aim"], later: ["gap", "aim"], challenge: ["gap", "aim", "fan"], tip: "gap" },
    fortress: { hp: 190, w: 146, h: 80, kind: "bomb", name: ["轰炸堡垒", "BOMB FORTRESS"], patterns: ["bomb", "aim"], challenge: ["bomb", "burst"], tip: "bomb" },
    hunter: { hp: 180, w: 120, h: 76, kind: "aim", name: ["锁定猎手", "LOCK HUNTER"], patterns: ["aim", "burst"], challenge: ["burst", "aim", "gap"], tip: "aim" },
    "twin-core": { hp: 260, turretHp: 110, w: 168, h: 88, kind: "parts", name: ["双核护卫舰", "TWIN CORE"], patterns: ["fan", "aim"], challenge: ["burst", "aim", "fan"], tip: "parts" },
    swarm: { hp: 200, w: 148, h: 78, kind: "summon", name: ["蜂群指挥舰", "SWARM COMMAND"], patterns: ["summon", "fan"], challenge: ["summonFormation", "aim", "fan"], tip: "summon" },
    sentinel: { hp: 220, w: 126, h: 86, kind: "laser", name: ["光束哨站", "BEAM SENTINEL"], patterns: ["laser", "aim"], challenge: ["laser", "burst"], tip: "laser" },
    "storm-carrier": { hp: 520, w: 190, h: 98, kind: "combined", name: ["风暴母舰", "STORM CARRIER"], patterns: ["laser", "fan", "summon"], later: ["laser", "gap", "summonFormation"], final: ["laser", "doubleFan", "summonDiver"], challenge: ["laser", "gap", "summonFormation", "aim"], tip: "combined" },
    "iron-mk2": { hp: 250, w: 160, h: 74, kind: "fan", name: ["铁翼改型", "IRON MK II"], patterns: ["doubleFan", "aim"], challenge: ["doubleFan", "gap", "burst"], tip: "doubleFan" },
    "twin-armored": { hp: 150, turretHp: 75, w: 174, h: 90, kind: "parts", alternating: true, name: ["双核重装舰", "ARMORED TWINS"], patterns: ["gap", "aim"], challenge: ["doubleFan", "burst"], tip: "alternating" },
    blockade: { hp: 340, w: 184, h: 94, kind: "combined", name: ["封锁旗舰", "BLOCKADE"], patterns: ["bombLanes", "aim", "gap"], later: ["bombLanes", "burst", "gap"], challenge: ["bombLanes", "burst", "doubleFan"], tip: "blockade" },
    "swarm-carrier": { hp: 270, w: 172, h: 88, kind: "summon", name: ["蜂群母舰", "SWARM CARRIER"], patterns: ["summonFormation", "aim", "gap"], challenge: ["summonDiver", "burst", "gap"], tip: "summon" },
    aurora: { hp: 140, turretHp: 80, w: 176, h: 92, kind: "parts", partLaser: true, name: ["极光双核舰", "AURORA TWINS"], patterns: ["gap", "aim"], challenge: ["doubleFan", "burst"], tip: "laserParts" },
    skybreaker: { hp: 380, turretHp: 60, w: 194, h: 100, kind: "combined", stagedParts: true, name: ["天幕总旗舰", "SKYBREAKER"], patterns: ["fan", "aim"], final: ["laser", "summonFormation", "gap"], challenge: ["gap", "burst", "aim"], tip: "combined" },
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
    waveCount = 4,
  } = {}) => ({
    id,
    name,
    boss,
    chapter: Math.ceil(id / 3),
    chapterEnd: id % 3 === 0,
    waves: Array.from({ length: waveCount }, (_, i) =>
      wave(groups, i, interval, minSeconds),
    ),
  });
  const STAGES = [
    {
      id: 1,
      name: ["初次巡航", "FIRST PATROL"],
      boss: "outpost",
      chapter: 1,
      chapterEnd: false,
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
    ], { boss: "spear" }),
    stage(3, ["铁翼封锁", "IRON BLOCKADE"], [
      ["scout", 3], ["formation", 4], ["scout", 3],
    ], { boss: "iron-wing", minSeconds: 10, waveCount: 1 }),
    stage(4, ["危险空域", "DANGER ZONE"], [
      ["scout", 3], ["bomber", 2], ["formation", 4], ["scout", 2],
    ], { boss: "fortress", interval: 2.6, minSeconds: 11 }),
    stage(5, ["瞄准警戒", "CROSSHAIRS"], [
      ["formation", 4], ["sniper", 2], ["scout", 3], ["diver", 1],
    ], { boss: "hunter" }),
    stage(6, ["双核防线", "TWIN DEFENSE"], [
      ["formation", 4], ["scout", 4], ["formation", 4],
    ], { boss: "twin-core", minSeconds: 10, waveCount: 1 }),
    stage(7, ["护卫集群", "ESCORT FLEET"], [
      ["formation", 4], ["heavy", 1], ["sniper", 2], ["scout", 4],
    ], { boss: "swarm", interval: 2.8 }),
    stage(8, ["风暴前沿", "STORM FRONT"], [
      ["formation", 4], ["bomber", 2], ["diver", 2], ["heavy", 1], ["scout", 3],
    ], { boss: "sentinel", interval: 2.4, minSeconds: 14 }),
    stage(9, ["风暴屏障", "STORM BARRIER"], [
      ["scout", 4], ["formation", 4], ["scout", 4],
    ], { boss: "storm-carrier", minSeconds: 10, waveCount: 1 }),
    stage(10, ["交错火线", "CROSSFIRE"], [
      ["formation", 4], ["diver", 2], ["scout", 3], ["sniper", 1], ["scout", 2],
    ], { boss: "iron-mk2", interval: 2.4, minSeconds: 14 }),
    stage(11, ["装甲壁垒", "ARMORED WALL"], [
      ["formation", 4], ["heavy", 1], ["scout", 3], ["sniper", 2], ["scout", 2],
    ], { boss: "twin-armored", interval: 2.5, minSeconds: 14 }),
    stage(12, ["封锁突破", "BREAK THE BLOCKADE"], [
      ["formation", 4], ["bomber", 2], ["scout", 4],
    ], { boss: "blockade", waveCount: 2, minSeconds: 11 }),
    stage(13, ["蜂群深空", "SWARM SPACE"], [
      ["formation", 4], ["scout", 3], ["diver", 2], ["sniper", 1], ["scout", 3],
    ], { boss: "swarm-carrier", interval: 2.4, minSeconds: 14 }),
    stage(14, ["极光断层", "AURORA RIFT"], [
      ["formation", 4], ["bomber", 2], ["scout", 4], ["heavy", 1], ["scout", 3],
    ], { boss: "aurora", interval: 2.4, minSeconds: 14 }),
    stage(15, ["最后巡航", "FINAL PATROL"], [
      ["formation", 4], ["scout", 4], ["diver", 2], ["scout", 2],
    ], { boss: "skybreaker", waveCount: 2, minSeconds: 12 }),
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
    RECORD_KEY: "sky-patrol-records-v3",
    LEGACY_RECORD_KEY: "sky-patrol-records-v2",
  };
});
