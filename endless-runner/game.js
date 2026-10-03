(() => {
  "use strict";
  const canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d"),
    W = canvas.width,
    H = canvas.height,
    GROUND = 365,
    GRAVITY = 1900,
    JUMP_SPEED = 700,
    MIN_REACTION_TIME = 1.02,
    COYOTE_TIME = 0.12,
    JUMP_BUFFER = 0.14,
    JUMP_HOLD_TIME = 0.16,
    $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const ui = {
    distance: $("distance"),
    best: $("best"),
    speed: $("speed"),
    stickers: $("stickers"),
    overlay: $("overlay"),
    message: $("message"),
    detail: $("detail"),
    startButton: $("startButton"),
    pauseButton: $("pauseButton"),
    jumpButton: $("jumpButton"),
    dropButton: $("dropButton"),
  };
  let state = "title",
    paused = false,
    player,
    hazards = [],
    coins = [],
    particles = [],
    distance = 0,
    travelDistance = 0,
    stickerCount = 0,
    best = readBest(),
    scrollSpeed = 265,
    last = 0,
    spawnX = 0,
    lastPattern = "start",
    jumpHeld = false,
    fastFall = false,
    jumpBuffer = 0,
    coyoteTime = 0,
    jumpHoldTime = 0;
  const jumpSources = new Set(),
    fallSources = new Set(),
    swipes = new Map();
  let bestDirty = false,
    clearing = false;
  function syncControls() {
    for (const [button, value] of [
      [ui.jumpButton, jumpHeld],
      [ui.dropButton, fastFall],
    ]) {
      button.classList.toggle("active", value);
      if (button.getAttribute("aria-pressed") !== String(value))
        button.setAttribute("aria-pressed", String(value));
      if (button.disabled !== paused) button.disabled = paused;
    }
    if (ui.pauseButton.disabled !== (state !== "playing"))
      ui.pauseButton.disabled = state !== "playing";
    if (ui.pauseButton.getAttribute("aria-pressed") !== String(paused))
      ui.pauseButton.setAttribute("aria-pressed", String(paused));
  }
  function clearInput() {
    jumpSources.clear();
    fallSources.clear();
    swipes.clear();
    jumpHeld = false;
    fastFall = false;
    jumpHoldTime = 0;
    jumpBuffer = 0;
    for (const button of [ui.jumpButton, ui.dropButton]) {
      button.classList.remove("active");
      button.setAttribute("aria-pressed", "false");
    }
  }
  function readBest() {
    try {
      const n = Number(localStorage.getItem("endlessRunnerBest"));
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }
  function saveBest() {
    if (!bestDirty || clearing) return;
    try {
      localStorage.setItem("endlessRunnerBest", String(best));
      bestDirty = false;
    } catch (_) {}
  }
  function start() {
    saveBest();
    clearInput();
    state = "playing";
    paused = false;
    distance = 0;
    travelDistance = 0;
    stickerCount = 0;
    scrollSpeed = 265;
    hazards = [];
    coins = [];
    particles = [];
    spawnX = W + 280;
    lastPattern = "start";
    player = {
      x: 145,
      y: GROUND - 48,
      w: 34,
      h: 48,
      vy: 0,
      onGround: true,
      run: 0,
      air: 0,
    };
    jumpHeld = false;
    fastFall = false;
    jumpBuffer = 0;
    coyoteTime = COYOTE_TIME;
    jumpHoldTime = 0;
    ui.pauseButton.textContent = "PAUSE";
    hideOverlay();
    updateHud();
    accumulator = 0;
    last = performance.now();
    requestRender();
  }
  function showOverlay(title, detail, button) {
    ui.message.textContent = title;
    ui.detail.textContent = detail;
    ui.startButton.textContent = button;
    ui.overlay.classList.remove("hidden");
  }
  function hideOverlay() {
    ui.overlay.classList.add("hidden");
  }
  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }
  const RUN_STAGES = [
    {
      id: 1,
      name: "WARM UP",
      from: 0,
      to: 3000,
      startSpeed: 285,
      endSpeed: 500,
      startDifficulty: 0.08,
      endDifficulty: 0.25,
      patterns: ["spike", "crate", "pencil", "coin"],
    },
    {
      id: 2,
      name: "DESK FLOW",
      from: 3000,
      to: 5000,
      startSpeed: 500,
      endSpeed: 720,
      startDifficulty: 0.25,
      endDifficulty: 0.5,
      patterns: ["spike", "crate", "pencil", "ruler", "coin"],
    },
    {
      id: 3,
      name: "BUSY DESK",
      from: 5000,
      to: 8000,
      startSpeed: 720,
      endSpeed: 980,
      startDifficulty: 0.5,
      endDifficulty: 0.75,
      patterns: [
        "spike",
        "crate",
        "pencil",
        "ruler",
        "ink",
        "gap",
        "combo",
        "coin",
      ],
    },
    {
      id: 4,
      name: "STICKER RUSH",
      from: 8000,
      to: Infinity,
      startSpeed: 980,
      endSpeed: 1325,
      startDifficulty: 0.75,
      endDifficulty: 1,
      patterns: [
        "spike",
        "crate",
        "pencil",
        "ruler",
        "ink",
        "gap",
        "gap",
        "combo",
        "coin",
      ],
    },
  ];
  function currentStage(metres) {
    return (
      RUN_STAGES.find((stage) => metres < stage.to) ||
      RUN_STAGES[RUN_STAGES.length - 1]
    );
  }
  function stageProgress(metres, stage) {
    return stage.to === Infinity
      ? clamp((metres - stage.from) / 3000, 0, 1)
      : clamp((metres - stage.from) / (stage.to - stage.from), 0, 1);
  }
  function runnerSpeed(metres) {
    const stage = currentStage(metres);
    return lerp(stage.startSpeed, stage.endSpeed, stageProgress(metres, stage));
  }
  function runnerDifficulty(metres) {
    const stage = currentStage(metres);
    return lerp(
      stage.startDifficulty,
      stage.endDifficulty,
      stageProgress(metres, stage),
    );
  }
  function performJump() {
    if (state !== "playing" || !player || (!player.onGround && coyoteTime <= 0))
      return;
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    coyoteTime = 0;
    jumpBuffer = 0;
    jumpHoldTime = JUMP_HOLD_TIME;
    burst(player.x + 10, GROUND, "#f2ca62", 7);
  }
  function jump(source = "api") {
    if (paused) return;
    if (state !== "playing") start();
    const already = jumpHeld;
    jumpSources.add(source);
    jumpHeld = true;
    syncControls();
    if (already) return;
    jumpBuffer = JUMP_BUFFER;
    if (player?.onGround || coyoteTime > 0) performJump();
  }
  function releaseJump(source = "api") {
    const held = jumpHeld;
    jumpSources.delete(source);
    jumpHeld = jumpSources.size > 0;
    if (held && !jumpHeld) {
      jumpHoldTime = 0;
      if (player && player.vy < 0) player.vy *= 0.54;
    }
    syncControls();
  }
  function setFastFall(value, source = "api") {
    if (paused) return;
    if (value && state !== "playing") start();
    value ? fallSources.add(source) : fallSources.delete(source);
    fastFall = fallSources.size > 0;
    syncControls();
  }
  function togglePause() {
    if (state !== "playing") return;
    paused = !paused;
    clearInput();
    ui.pauseButton.textContent = paused ? "RESUME" : "PAUSE";
    if (paused) {
      saveBest();
      showOverlay("PAUSED", "THE DESK IS WAITING", "RESUME");
    } else {
      hideOverlay();
      accumulator = 0;
      last = performance.now();
    }
    syncControls();
    requestRender();
  }
  function gameOver() {
    if (state !== "playing") return;
    state = "over";
    clearInput();
    const metres = Math.floor(distance);
    if (metres > best) {
      best = metres;
      bestDirty = true;
    }
    saveBest();
    burst(player.x + player.w / 2, player.y + player.h / 2, "#e98575", 28);
    updateHud();
    showOverlay(
      "DESK DETOUR",
      `DISTANCE ${metres}m · STICKERS ${stickerCount} · PACE ${(scrollSpeed / 265).toFixed(2)}×`,
      "RUN AGAIN",
    );
  }
  function reactionDistance() {
    return scrollSpeed * MIN_REACTION_TIME + 110;
  }
  function addCoinLine(x, y, count = 4) {
    for (let i = 0; i < count; i++)
      coins.push({
        x: x + i * 34,
        y: y - Math.sin((i / (count - 1)) * Math.PI) * 42,
        r: 7,
        taken: false,
      });
  }
  function spawnPattern() {
    const safeDistance = reactionDistance(),
      stage = currentStage(travelDistance),
      difficulty = runnerDifficulty(travelDistance),
      options = stage.patterns;
    let type = options[Math.floor(Math.random() * options.length)];
    if (type === lastPattern && type !== "coin") type = "coin";
    if (lastPattern === "gap" && ["gap", "crate", "ruler"].includes(type))
      type = "coin";
    if (lastPattern === "pencil" && type === "pencil") type = "coin";
    const x = Math.max(spawnX, W + safeDistance);
    if (type === "spike") {
      hazards.push({ type: "spike", x, y: GROUND - 24, w: 30, h: 24 });
      if (difficulty > 0.35 && Math.random() < 0.48)
        hazards.push({
          type: "spike",
          x: x + 38,
          y: GROUND - 24,
          w: 30,
          h: 24,
        });
      addCoinLine(x - 15, GROUND - 78, 4);
      spawnX = x + 95 + safeDistance * 0.38;
    } else if (type === "crate") {
      hazards.push({ type: "crate", x, y: GROUND - 47, w: 42, h: 47 });
      addCoinLine(x - 18, GROUND - 94, 4);
      spawnX = x + 90 + safeDistance * 0.42;
    } else if (type === "pencil") {
      hazards.push({ type: "pencil", x, y: GROUND - 22, w: 74, h: 22 });
      addCoinLine(x - 10, GROUND - 78, 4);
      spawnX = x + 125 + safeDistance * 0.44;
    } else if (type === "ruler") {
      hazards.push({ type: "ruler", x, y: GROUND - 24, w: 88, h: 24 });
      addCoinLine(x - 5, GROUND - 86, 4);
      spawnX = x + 135 + safeDistance * 0.48;
    } else if (type === "ink") {
      hazards.push({ type: "ink", x, y: GROUND - 18, w: 48, h: 18 });
      addCoinLine(x - 10, GROUND - 69, 4);
      spawnX = x + 105 + safeDistance * 0.4;
    } else if (type === "combo") {
      hazards.push(
        { type: "crate", x, y: GROUND - 47, w: 42, h: 47 },
        { type: "spike", x: x + 120, y: GROUND - 24, w: 30, h: 24 },
      );
      addCoinLine(x + 18, GROUND - 105, 5);
      spawnX = x + 230 + safeDistance * 0.48;
    } else if (type === "gap") {
      const width = Math.min(150, 90 + difficulty * 60);
      hazards.push({ type: "gap", x, y: GROUND, w: width, h: H - GROUND });
      addCoinLine(x + 4, GROUND - 74, Math.max(3, Math.floor(width / 34)));
      spawnX = x + width + safeDistance * 0.62;
    } else {
      addCoinLine(x, GROUND - 62, 5);
      spawnX = x + 190 + safeDistance * 0.34;
    }
    lastPattern = type;
  }
  function overGap(x) {
    return hazards.some((h) => h.type === "gap" && x > h.x && x < h.x + h.w);
  }
  const PENCIL_TILT = -0.12;
  function hazardPolygon(h) {
    if (h.type === "spike")
      return [
        [h.x, h.y + h.h],
        [h.x + h.w / 2, h.y],
        [h.x + h.w, h.y + h.h],
      ];
    if (h.type === "pencil") {
      const c = Math.cos(PENCIL_TILT),
        s = Math.sin(PENCIL_TILT);
      return [
        [-12, 0],
        [0, -7],
        [h.w, -7],
        [h.w, 7],
        [0, 7],
      ].map(([x, y]) => [h.x + x * c - y * s, h.y + h.h / 2 + x * s + y * c]);
    }
    return [
      [h.x + 3, h.y + 3],
      [h.x + h.w - 3, h.y + 3],
      [h.x + h.w - 3, h.y + h.h],
      [h.x + 3, h.y + h.h],
    ];
  }
  function inkShapes(h) {
    return [
      [h.x + 16, h.y + 12, 17, 9],
      [h.x + 32, h.y + 10, 13, 8],
      [h.x + 8, h.y + 14, 8, 6],
    ];
  }
  function polygonsOverlap(a, b) {
    for (const p of [a, b])
      for (let i = 0; i < p.length; i++) {
        const q = p[(i + 1) % p.length],
          axis = [-(q[1] - p[i][1]), q[0] - p[i][0]],
          pa = a.map((v) => v[0] * axis[0] + v[1] * axis[1]),
          pb = b.map((v) => v[0] * axis[0] + v[1] * axis[1]);
        if (
          Math.max(...pa) <= Math.min(...pb) ||
          Math.max(...pb) <= Math.min(...pa)
        )
          return false;
      }
    return true;
  }
  function checkCollision() {
    const left = player.x + 5,
      right = player.x + player.w - 5,
      top = player.y + 5,
      bottom = player.y + player.h,
      rect = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
      ];
    for (const h of hazards) {
      if (h.type === "gap") continue;
      if (h.type === "ink") {
        if (
          inkShapes(h).some(
            ([x, y, rx, ry]) =>
              ((clamp(x, left, right) - x) / rx) ** 2 +
                ((clamp(y, top, bottom) - y) / ry) ** 2 <
              1,
          )
        )
          return true;
      } else if (polygonsOverlap(rect, hazardPolygon(h))) return true;
    }
    return false;
  }

  function update(dt) {
    if (state !== "playing" || paused) return;
    scrollSpeed = runnerSpeed(travelDistance);
    travelDistance += (scrollSpeed * dt) / 17;
    distance = travelDistance;
    const dx = scrollSpeed * dt;
    hazards.forEach((h) => (h.x -= dx));
    coins.forEach((c) => (c.x -= dx));
    spawnX -= dx;
    player.run += dt * 12;
    player.air += dt;
    jumpBuffer = Math.max(0, jumpBuffer - dt);
    coyoteTime = Math.max(0, coyoteTime - dt);
    const extra = fastFall && player.vy > 0 ? 1500 : 0;
    const heldGravity =
      jumpHeld && player.vy < 0 && jumpHoldTime > 0 ? GRAVITY * 0.56 : GRAVITY;
    player.vy += (heldGravity + extra) * dt;
    if (player.vy < 0 && jumpHoldTime > 0)
      jumpHoldTime = Math.max(0, jumpHoldTime - dt);
    player.y += player.vy * dt;
    const wasGrounded = player.onGround,
      feetX = player.x + player.w * 0.55;
    if (player.y + player.h >= GROUND && !overGap(feetX) && player.vy >= 0) {
      player.y = GROUND - player.h;
      player.vy = 0;
      player.onGround = true;
      player.air = 0;
      coyoteTime = COYOTE_TIME;
    } else {
      player.onGround = false;
      if (wasGrounded) coyoteTime = COYOTE_TIME;
    }
    if (jumpBuffer > 0) performJump();
    if (player.y > H + 50) {
      gameOver();
      return;
    }
    hazards = hazards.filter((h) => h.x + h.w > -60);
    coins = coins.filter((c) => c.x > -40 && !c.taken);
    while (spawnX < W + reactionDistance()) spawnPattern();
    coins.forEach((c) => {
      if (
        Math.abs(player.x + player.w / 2 - c.x) < 25 &&
        Math.abs(player.y + player.h / 2 - c.y) < 30
      ) {
        c.taken = true;
        stickerCount++;
        burst(c.x, c.y, "#f2ca62", 6);
      }
    });
    updateParticles(dt);
    if (checkCollision()) gameOver();
    updateHud();
  }
  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }
  function updateHud() {
    const metres = Math.floor(distance);
    if (metres > best) {
      best = metres;
      bestDirty = true;
    }
    syncControls();
    setText(ui.distance, String(Math.floor(distance)).padStart(5, "0") + "m");
    setText(ui.best, String(best).padStart(5, "0") + "m");
    setText(ui.speed, (scrollSpeed / 265).toFixed(2) + "×");
    setText(ui.stickers, String(stickerCount).padStart(2, "0"));
  }
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++)
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: -40 - Math.random() * 140,
        life: 0.3 + Math.random() * 0.35,
        color,
      });
  }
  function drawDeskDecor(light) {
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = light ? "#f2ca62" : "#f2ce68";
    ctx.fillRect(560, 58, 132, 82);
    ctx.fillStyle = light ? "#fff7e7" : "#fff0c9";
    ctx.fillRect(570, 69, 112, 61);
    ctx.strokeStyle = light ? "#80bdd8" : "#80c7df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(585, 87);
    ctx.lineTo(663, 87);
    ctx.moveTo(585, 104);
    ctx.lineTo(645, 104);
    ctx.stroke();
    ctx.fillStyle = light ? "#e98575" : "#ed927e";
    ctx.fillRect(520, 74, 14, 76);
    ctx.fillStyle = light ? "#3f3a34" : "#fff0c9";
    ctx.fillRect(517, 68, 20, 9);
    ctx.strokeStyle = light ? "#80bdd8" : "#80c7df";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(420, 195);
    ctx.lineTo(545, 218);
    ctx.stroke();
    ctx.fillStyle = light ? "#e98575" : "#ed927e";
    ctx.beginPath();
    ctx.moveTo(414, 194);
    ctx.lineTo(426, 191);
    ctx.lineTo(426, 201);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = light ? "#8abf93" : "#8fd2a4";
    ctx.fillRect(690, 180, 38, 25);
    ctx.fillStyle = light ? "#3f3a34" : "#fff0c9";
    for (let i = 0; i < 4; i++) ctx.fillRect(695 + i * 8, 185, 3, 15);
    ctx.restore();
  }
  function draw() {
    const light = document.documentElement?.dataset?.theme === "light";
    ctx.fillStyle = light ? "#fff0c9" : "#1a2e3d";
    ctx.fillRect(0, 0, W, H);
    drawDeskDecor(light);
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle =
        i % 5
          ? light
            ? "#8b806d22"
            : "#fff0c922"
          : light
            ? "#80bdd855"
            : "#80c7df55";
      ctx.fillRect(
        (i * 137 - ((distance * 4) % (W + 80))) % (W + 80),
        40 + ((i * 59) % 245),
        2,
        2,
      );
    }
    drawGround(light);
    hazards.forEach((h) => drawHazard(h, light));
    coins.forEach((c) => {
      ctx.fillStyle = "#f2ca62";
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff7e7";
      ctx.beginPath();
      ctx.arc(c.x - 2, c.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life * 3);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    if (state !== "over") drawPlayer(light);
  }
  function drawGround(light) {
    ctx.fillStyle = light ? "#e7d9b9" : "#263f4d";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = light ? "#e98575" : "#f2ca62";
    ctx.fillRect(0, GROUND, W, 4);
    ctx.strokeStyle = light ? "#b99b6a" : "#52717b";
    ctx.lineWidth = 2;
    for (let x = -((distance * 3) % 60); x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 20);
      ctx.lineTo(x + 28, GROUND + 20);
      ctx.stroke();
    }
    hazards
      .filter((h) => h.type === "gap")
      .forEach((h) => {
        ctx.fillStyle = light ? "#fff0c9" : "#1a2e3d";
        ctx.fillRect(h.x, GROUND - 1, h.w, H - GROUND + 2);
        ctx.fillStyle = light ? "#e98575" : "#f2ca62";
        ctx.fillRect(h.x - 3, GROUND, 3, H - GROUND);
        ctx.fillRect(h.x + h.w, GROUND, 3, H - GROUND);
      });
  }
  function drawHazard(h, light) {
    if (h.type === "spike") {
      ctx.fillStyle = light ? "#e98575" : "#ed927e";
      ctx.beginPath();
      ctx.moveTo(h.x, h.y + h.h);
      ctx.lineTo(h.x + h.w / 2, h.y);
      ctx.lineTo(h.x + h.w, h.y + h.h);
      ctx.fill();
      ctx.fillStyle = "#fff0c966";
      ctx.fillRect(h.x + 8, h.y + 13, 3, 7);
    } else if (h.type === "crate") {
      ctx.fillStyle = light ? "#c98d5d" : "#b87555";
      ctx.beginPath();
      ctx.roundRect(h.x, h.y, h.w, h.h, 5);
      ctx.fill();
      ctx.strokeStyle = light ? "#3f3a34" : "#fff0c9";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = light ? "#f2ca62" : "#f2ce68";
      ctx.fillRect(h.x + h.w * 0.42, h.y + 2, h.w * 0.16, h.h - 4);
      ctx.fillRect(h.x + 2, h.y + h.h * 0.42, h.w - 4, h.h * 0.16);
      ctx.fillStyle = light ? "#fff7e7" : "#fff0c9";
      ctx.beginPath();
      ctx.roundRect(h.x + 9, h.y + 13, h.w - 18, 14, 3);
      ctx.fill();
      ctx.strokeStyle = light ? "#8b806d" : "#52717b";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = light ? "#80bdd8" : "#80c7df";
      ctx.fillRect(h.x + 14, h.y + 17, 10, 4);
      ctx.fillRect(h.x + 29, h.y + 17, 7, 4);
    } else if (h.type === "pencil") {
      ctx.save();
      ctx.translate(h.x, h.y + h.h / 2);
      ctx.rotate(PENCIL_TILT);
      ctx.fillStyle = light ? "#f2ca62" : "#f2ce68";
      ctx.fillRect(0, -7, h.w - 13, 14);
      ctx.fillStyle = light ? "#e98575" : "#ed927e";
      ctx.fillRect(h.w - 13, -7, 13, 14);
      ctx.fillStyle = light ? "#3f3a34" : "#fff0c9";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(-12, 0);
      ctx.lineTo(0, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (h.type === "ruler") {
      ctx.fillStyle = light ? "#80bdd8" : "#80c7df";
      ctx.fillRect(h.x, h.y, h.w, h.h);
      ctx.strokeStyle = light ? "#3f3a34" : "#fff0c9";
      ctx.lineWidth = 2;
      for (let i = 8; i < h.w; i += 12) {
        ctx.beginPath();
        ctx.moveTo(h.x + i, h.y + 3);
        ctx.lineTo(h.x + i, h.y + (i % 24 ? 10 : 17));
        ctx.stroke();
      }
    } else if (h.type === "ink") {
      ctx.fillStyle = light ? "#aa78b8" : "#b8a7e8";
      ctx.beginPath();
      for (const [x, y, rx, ry] of inkShapes(h))
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawPlayer(light) {
    const grounded = player.onGround,
      stride = grounded ? Math.sin(player.run) * 3 : 0,
      lean = clamp(player.vy / 900, -0.12, 0.12);
    ctx.save();
    ctx.translate(player.x + 17, player.y + 24);
    ctx.rotate(lean);
    const ink = light ? "#3f3a34" : "#fff0c9",
      paper = light ? "#fffdf5" : "#fff0c9",
      blue = light ? "#80bdd8" : "#80c7df",
      accent = light ? "#e98575" : "#ed927e",
      yellow = light ? "#f2ca62" : "#f2ce68";
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-27, 7);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = blue;
    ctx.beginPath();
    ctx.roundRect(-13, -5, 26, 24, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = paper;
    ctx.beginPath();
    ctx.arc(0, -14, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = yellow;
    ctx.beginPath();
    ctx.moveTo(-15, -18);
    ctx.quadraticCurveTo(0, -31, 15, -18);
    ctx.lineTo(12, -13);
    ctx.quadraticCurveTo(0, -20, -12, -13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(-5, -14, 2, 0, Math.PI * 2);
    ctx.arc(5, -14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = paper;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -3);
    ctx.lineTo(-5, 10);
    ctx.moveTo(8, -3);
    ctx.lineTo(5, 10);
    ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.lineTo(-8, 25 + stride);
    ctx.moveTo(8, 18);
    ctx.lineTo(8, 25 - stride);
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-13, 27 + stride);
    ctx.lineTo(-3, 27 + stride);
    ctx.moveTo(3, 27 - stride);
    ctx.lineTo(13, 27 - stride);
    ctx.stroke();
    ctx.restore();
  }
  const FIXED_STEP = 1 / 120;
  let accumulator = 0,
    frameId = null;
  function requestRender() {
    if (frameId === null && !document.hidden)
      frameId = requestAnimationFrame(loop);
  }
  function updateParticles(dt) {
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
    });
    particles = particles.filter((p) => p.life > 0);
  }
  function loop(time) {
    frameId = null;
    const dt = Math.max(0, Math.min(0.1, (time - last) / 1000 || 0));
    last = time;
    if (state === "playing" && !paused) {
      accumulator += dt;
      while (accumulator + 1e-10 >= FIXED_STEP) {
        update(FIXED_STEP);
        accumulator -= FIXED_STEP;
        if (state !== "playing" || paused) {
          accumulator = 0;
          break;
        }
      }
    } else accumulator = 0;
    if (state === "over" && !paused) updateParticles(dt);
    draw();
    if (
      !clearing &&
      ((state === "playing" && !paused) ||
        (state === "over" && particles.length))
    )
      requestRender();
  }
  function bindHold(button, on, off) {
    button.addEventListener("selectstart", (e) => e.preventDefault());
    button.addEventListener("contextmenu", (e) => e.preventDefault());
    button.addEventListener("pointerdown", (e) => {
      if ((e.pointerType === "mouse" && e.button !== 0) || paused) return;
      e.preventDefault();
      on(button.id + ":" + e.pointerId);
      try {
        button.setPointerCapture?.(e.pointerId);
      } catch (_) {}
    });
    [
      "pointerup",
      "pointercancel",
      "pointerleave",
      "lostpointercapture",
    ].forEach((type) =>
      button.addEventListener(type, (e) => {
        if (type === "pointerleave" && e.buttons) return;
        e.preventDefault();
        off(button.id + ":" + e.pointerId);
      }),
    );
  }
  bindHold(ui.jumpButton, jump, releaseJump);
  ui.jumpButton.addEventListener("click", (e) => {
    if (e.detail === 0 && !paused) {
      jump("assistive");
      releaseJump("assistive");
    }
  });
  bindHold(
    ui.dropButton,
    (source) => setFastFall(true, source),
    (source) => setFastFall(false, source),
  );
  canvas.addEventListener("selectstart", (e) => e.preventDefault());
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if ((e.pointerType === "mouse" && e.button !== 0) || paused) return;
    e.preventDefault();
    jump("canvas:" + e.pointerId);
    swipes.set(e.pointerId, e.clientY);
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch (_) {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (
      e.buttons &&
      swipes.has(e.pointerId) &&
      e.clientY - swipes.get(e.pointerId) > 42
    )
      setFastFall(true, "canvas:" + e.pointerId);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    canvas.addEventListener(type, (e) => {
      e.preventDefault();
      swipes.delete(e.pointerId);
      releaseJump("canvas:" + e.pointerId);
      setFastFall(false, "canvas:" + e.pointerId);
    }),
  );
  addEventListener("keydown", (event) => {
    const target = event.target;
    const action =
      target === ui.jumpButton
        ? "jump"
        : target === ui.dropButton
          ? "fall"
          : null;
    if (action && ["Space", "Enter"].includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) {
        const source = "key:" + target.id + ":" + event.code;
        action === "jump" ? jump(source) : setFastFall(true, source);
      }
      return;
    }
    if (
      target &&
      (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) ||
        (["BUTTON", "A"].includes(target.tagName) &&
          ["Space", "Enter", "ArrowDown"].includes(event.code)))
    )
      return;
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) jump("key:Space");
    }
    if (event.code === "ArrowDown") {
      event.preventDefault();
      if (!event.repeat) setFastFall(true, "key:ArrowDown");
    }
    if (event.key.toLowerCase() === "p" && !event.repeat) togglePause();
  });
  addEventListener("keyup", (event) => {
    if (event.code === "Space") releaseJump("key:Space");
    if (event.code === "ArrowDown") setFastFall(false, "key:ArrowDown");
    for (const button of [ui.jumpButton, ui.dropButton]) {
      const source = "key:" + button.id + ":" + event.code;
      releaseJump(source);
      setFastFall(false, source);
    }
  });
  ui.startButton.onclick = () => (paused ? togglePause() : start());
  ui.pauseButton.onclick = togglePause;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing" && !paused) togglePause();
  });
  addEventListener("blur", () => {
    if (state === "playing" && !paused) togglePause();
  });
  addEventListener("pagehide", saveBest);
  addEventListener("beforeunload", saveBest);
  addEventListener("game-data-clearing", () => {
    clearing = true;
    bestDirty = false;
    best = 0;
    state = "title";
    paused = false;
    clearInput();
  });
  window.DeskDash = {
    jump,
    getSnapshot: () => ({
      state,
      paused,
      jumpHeld,
      fastFall,
      vy: player?.vy,
      distance,
      best,
      scrollSpeed,
      player: player ? { ...player } : null,
      obstacles: hazards.map((h) => ({ ...h })),
      onGround: player?.onGround,
      y: player?.y,
      buffer: jumpBuffer,
      coyote: coyoteTime,
      travelDistance,
      stage: currentStage(travelDistance).id,
      stageName: currentStage(travelDistance).name,
      hazards: hazards.map((h) => h.type),
    }),
  };
  player = {
    x: 145,
    y: GROUND - 48,
    w: 34,
    h: 48,
    vy: 0,
    onGround: true,
    run: 0,
  };
  showOverlay(
    "DESK DASH",
    "JUMP THE PENCILS · CATCH THE STICKERS",
    "START DASH",
  );
  const dock = $("utilityDock");
  const moveUtility = () => {
    const clear = document.querySelector(".clear-data-toggle");
    if (dock && clear && clear.parentElement !== dock) dock.appendChild(clear);
  };
  moveUtility();
  document.addEventListener("DOMContentLoaded", moveUtility);
  updateHud();
  draw();
  addEventListener("resize", requestRender);
  document.addEventListener("themechange", requestRender);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) requestRender();
  });
})();
