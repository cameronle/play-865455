(function (root, factory) {
  "use strict";
  const locale = factory();
  if (typeof module === "object") module.exports = locale;
  else root.SkyPatrolLocale = locale;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TEXT = {
    title: ["星空巡航", "SKY PATROL"],
    score: ["分数", "SCORE"],
    stage: ["关卡 / 波次", "STAGE / WAVE"],
    lives: ["生命 / 护盾", "LIVES / SHIELD"],
    start: ["开始巡航", "START GAME"],
    again: ["重新开始", "PLAY AGAIN"],
    resume: ["继续巡航", "RESUME"],
    pause: ["暂停", "PAUSE"],
    pulse: ["脉冲", "PULSE"],
    normal: ["普通", "NORMAL"],
    challenge: ["挑战", "CHALLENGE"],
    best: ["最佳", "BEST"],
    legacy: ["旧版成绩", "LEGACY SCORE"],
    intro: ["九关战役 · 三大首领", "9 STAGES · 3 BOSSES"],
    help: [
      "拖动 / 方向键移动 · 自动射击\n空格释放脉冲 · 击毁编队首机获得奖励",
      "Drag to move / Arrows / WASD · AUTO-FIRE\nSpace: pulse · Defeat formation leaders for a bonus",
    ],
    keyboard: [
      "方向键 / WASD · 自动射击 · 空格脉冲 · P 暂停 · M 静音",
      "ARROWS / WASD · AUTO-FIRE · SPACE PULSE · P PAUSE · M MUTE",
    ],
    touch: [
      "拖动或按住方向键 · 自动射击 · 脉冲清除敌弹",
      "DRAG OR HOLD ARROWS · AUTO-FIRE · PULSE CLEARS BULLETS",
    ],
    sound: ["声音", "SOUND"],
    soundLabel: ["切换声音", "Toggle sound"],
    gameSection: ["星空巡航游戏", "Sky Patrol game"],
    touchControls: ["触控操作", "Touch controls"],
    muted: ["静音", "MUTED"],
    paused: ["巡航暂停", "FLIGHT PAUSED"],
    intermission: ["关卡完成", "STAGE COMPLETE"],
    next: ["下一关", "NEXT STAGE"],
    clear: ["战役通关", "CAMPAIGN CLEAR"],
    gameover: ["巡航失败", "GAME OVER"],
    final: ["最终分数", "FINAL SCORE"],
    warning: ["首领接近 · 准备迎战", "BOSS APPROACHING · GET READY"],
    fan: ["扇形弹 · 寻找间隙", "FAN ATTACK · FIND THE GAP"],
    aim: ["目标锁定 · 及时换位", "TARGET LOCKED · MOVE AWAY"],
    laser: ["激光预警 · 离开条纹区域", "LASER WARNING · LEAVE STRIPED AREA"],
    summon: ["护卫入场 · 留意两翼", "ESCORT INCOMING · WATCH THE FLANKS"],
    phase: ["阶段", "PHASE"],
    left: ["向左移动", "Move left"],
    right: ["向右移动", "Move right"],
    up: ["向上移动", "Move up"],
    down: ["向下移动", "Move down"],
    area: [
      "巡航区域：拖动或方向键移动，自动射击；空格释放脉冲",
      "Sky Patrol flight area. Drag or use direction controls to move; weapons fire automatically. Space releases a pulse.",
    ],
    pauseLabel: ["暂停或继续", "Pause or resume"],
    pulseLabel: [
      "释放一次脉冲，清除敌弹",
      "Release one pulse to clear enemy bullets",
    ],
    mode: ["难度", "Difficulty"],
    shield: ["盾", "S"],
    checkpoint: [
      "章节补给：生命 +1，脉冲 +1",
      "CHAPTER SUPPLY: LIFE +1, PULSE +1",
    ],
    record: ["最远关卡", "FARTHEST STAGE"],
    wins: ["通关次数", "CLEARS"],
  };
  function create(storage) {
    let lang = "zh";
    try {
      if (storage?.getItem("play-lang") === "en") lang = "en";
    } catch {}
    const index = lang === "en" ? 1 : 0;
    return {
      lang,
      t: (key) => TEXT[key]?.[index] ?? key,
      name: (pair) => pair[index],
    };
  }
  return { TEXT, create };
});
