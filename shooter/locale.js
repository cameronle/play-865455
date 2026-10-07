(function (root, factory) {
  "use strict";
  const locale = factory();
  if (typeof module === "object") module.exports = locale;
  else root.SkyPatrolLocale = locale;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TEXT = {
    previousCampaign: ["旧15关战役", "OLD 15-STAGE CAMPAIGN"],
    supplyChoice: ["章节补给：生命或脉冲，选一项", "CHAPTER SUPPLY: CHOOSE LIFE OR PULSE"],
    supplyDone: ["章节补给已结算", "CHAPTER SUPPLY RESOLVED"],
    supplyLife: ["生命 +1", "LIFE +1"],
    supplyPulse: ["脉冲 +1", "PULSE +1"],
    doubleDash: ["折线冲刺 · 两段航线已锁定", "TWO DASHES · FIXED ROUTE"],
    chainBomb: ["分批轰炸 · 换位后留意掩护弹", "CHAIN BOMBS · WATCH COVER FIRE"],
    cross: ["交叉弹幕 · 避开两侧火线", "CROSSFIRE · WATCH BOTH FLANKS"],
    rotatingGap: ["缺口迁移 · 跟随下一处开口", "SHIFTING GAP · REPOSITION"],
    lockChain: ["连续点名 · 每次预警后换位", "CHAIN LOCKS · MOVE AFTER EACH WARNING"],
    reverseLaser: ["反向扫掠 · 留出横向通道", "REVERSE SWEEP · KEEP A SIDE ROUTE"],
    mineLanes: ["地雷封路 · 短时区域不会被脉冲擦除", "TEMPORARY MINES · PULSE DOES NOT CLEAR THEM"],
    summonSupport: ["支援护卫 · 拆掉连线源", "SUPPORT ESCORT · BREAK SHIELD LINKS"],
    summonFlank: ["侧翼突袭 · 先看固定航线", "FLANK ESCORT · WATCH FIXED ROUTES"],
    support: ["支援机无盾 · 击毁即可断开连线", "SUPPORT IS UNPROTECTED · BREAK ITS LINKS"],
    chase: ["关键目标漏网 · 两架侧翼追击", "KEY TARGET ESCAPED · TWO FLANK PURSUERS"],

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
    intro: ["十五关 · 九类敌机 · 每关首领", "15 STAGES · 9 ENEMY ROLES · 15 BOSSES"],
    legacyCampaign: ["旧9关战役", "OLD 9-STAGE CAMPAIGN"],
    help: [
      "拖动 / 方向键移动 · 自动射击\n脉冲清弹，不清光束与地雷 · 优先处理首机/支援",
      "Drag to move / Arrows / WASD · AUTO-FIRE\nPulse clears bullets, not beams/mines · Break leaders/support",
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
    autoNext: ["即将自动进入下一关", "NEXT STAGE STARTS AUTOMATICALLY"],

    clear: ["战役通关", "CAMPAIGN CLEAR"],
    gameover: ["巡航失败", "GAME OVER"],
    final: ["最终分数", "FINAL SCORE"],
    warning: ["首领接近 · 准备迎战", "BOSS APPROACHING · GET READY"],
    fan: ["扇形弹 · 寻找间隙", "FAN ATTACK · FIND THE GAP"],
    aim: ["目标锁定 · 及时换位", "TARGET LOCKED · MOVE AWAY"],
    laser: ["激光预警 · 离开条纹区域", "LASER WARNING · LEAVE STRIPED AREA"],
    summon: ["护卫入场 · 留意两翼", "ESCORT INCOMING · WATCH THE FLANKS"],
    phase: ["阶段", "PHASE"],
    leftPart: ["左部件", "LEFT"],
    rightPart: ["右部件", "RIGHT"],
    coreProtected: ["核心受保护 · 总进度含部件", "CORE LOCKED · TOTAL INCLUDES PARTS"],
    coreOpen: ["核心已暴露", "CORE EXPOSED"],
    totalHealth: ["总战斗进度（含部件）", "TOTAL HEALTH (WITH PARTS)"],
    bodyHealth: ["本体生命", "HULL HEALTH"],
    partsPending: ["本体可攻击 · 部件尚未部署 · 总进度含后续部件", "HULL VULNERABLE · PARTS NOT DEPLOYED · TOTAL INCLUDES LATER PARTS"],
    "tip-parts": ["先击毁两侧炮台 · 核心受保护", "DESTROY SIDE TURRETS · CORE PROTECTED"],
    "tip-fan": ["扇形弹 · 寻找间隙", "FAN ATTACK · FIND THE GAP"],
    dash: ["俯冲锁定 · 避开虚线路径", "DIVE LOCKED · LEAVE DASHED PATH"],
    bomb: ["爆炸预警 · 离开圆形区域", "BOMB WARNING · LEAVE CIRCLES"],
    bombLanes: ["区域封锁 · 找通道再反击", "AREA BLOCKADE · FIND A ROUTE"],
    burst: ["窄束锁定 · 向侧面换位", "LOCKED BURST · SIDESTEP"],
    gap: ["交替缺口 · 注意换位", "ALTERNATING GAP · REPOSITION"],
    doubleFan: ["双轮扇弹 · 缺口左右交替", "TWO VOLLEYS · ALTERNATING GAPS"],
    summonFormation: ["护卫编队 · 优先处理首机", "ESCORT FORMATION · TARGET LEADER"],
    summonDiver: ["俯冲护卫 · 留意锁定路径", "DIVING ESCORT · WATCH LOCKED PATH"],
    partLaser: ["部件激光 · 拆除发射器减压", "PART LASER · DESTROY EMITTERS"],
    "tip-dash": ["避开固定俯冲路径 · 恢复时反击", "DODGE FIXED DIVE · HIT IN RECOVERY"],
    "tip-gap": ["扇弹与锁定交替 · 留意安全缺口", "FANS AND LOCKS · WATCH THE GAP"],
    "tip-bomb": ["离开爆炸区 · 标记锁定后不追踪", "LEAVE BOMB MARKS · FIXED TARGETS"],
    "tip-aim": ["锁定与窄束交替 · 预警后换位", "LOCKS AND BURSTS · REPOSITION"],
    "tip-summon": ["护卫有限 · 本体仍可攻击", "LIMITED ESCORTS · HULL VULNERABLE"],
    "tip-laser": ["激光扫掠 · 提前离开条纹区", "SWEEPING LASER · LEAVE STRIPES"],
    "tip-combined": ["攻势交替 · 躲开预警再输出", "ALTERNATING ATTACKS · DODGE THEN HIT"],
    "tip-doubleFan": ["两轮错位弹 · 连续换位再反击", "OFFSET VOLLEYS · MOVE THEN HIT"],
    "tip-alternating": ["炮台交替开放 · 攻击亮框部件", "ALTERNATING TURRETS · HIT BRIGHT OUTLINE"],
    "tip-blockade": ["爆炸与锁定封路 · 先找安全通道", "BOMBS AND LOCKS · FIND SAFE ROUTE"],
    "tip-laserParts": ["先拆激光发射器 · 每拆一个减压", "DESTROY LASER EMITTERS TO REDUCE PRESSURE"],
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
