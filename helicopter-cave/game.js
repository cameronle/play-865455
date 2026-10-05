(() => {
  "use strict";
  const canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d"),
    W = canvas.width,
    H = canvas.height,
    GRAVITY = 620,
    LIFT = 1050,
    MIN_GAP = 150,
    MAX_GAP = 245,
    $ = (id) => document.getElementById(id);
  const ui = {
    distance: $("distance"),
    best: $("best"),
    speed: $("speed"),
    overlay: $("overlay"),
    message: $("message"),
    detail: $("detail"),
    startButton: $("startButton"),
    pauseButton: $("pauseButton"),
    thrustButton: $("thrustButton"),
  };
  const input = { thrust: false },
    heldSources = new Set();
  let state = "title",
    paused = false,
    helicopter,
    cave = [],
    obstacles = [],
    particles = [],
    distance = 0,
    best = readBest(),
    scrollSpeed = 185,
    last = 0,
    nextObstacle = 900,
    accumulator = 0;
  const FIXED_STEP = 1 / 120;
  let rafId = null;
  function scheduleFrame() {
    if (!document.hidden && rafId === null) rafId = requestAnimationFrame(loop);
  }
  function readBest() {
    try {
      const value = Number(localStorage.getItem("helicopterCaveBest"));
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch (_) {
      return 0;
    }
  }
  function generateCaveSegment() {
    const previous = cave.length
      ? cave[cave.length - 1]
      : { x: -50, center: H / 2, gap: MAX_GAP, shift: 0 };
    const x = previous.x + 48,
      worldX = x + distance * 12,
      warmup = worldX <= 900;
    const difficulty = Math.min(1, Math.max(0, (worldX - 900) / 42000));
    const target = warmup
      ? MAX_GAP
      : Math.max(
          MIN_GAP,
          Math.min(
            MAX_GAP,
            MAX_GAP -
              (MAX_GAP - MIN_GAP) * difficulty +
              Math.sin(worldX / 450) * 8,
          ),
        );
    const gap = Math.max(
      MIN_GAP,
      Math.min(
        MAX_GAP,
        previous.gap + Math.max(-3, Math.min(3, target - previous.gap)),
      ),
    );
    const maxShift = 7 + difficulty * 7;
    const shift = warmup
      ? 0
      : Math.max(
          -maxShift,
          Math.min(
            maxShift,
            (previous.shift || 0) * 0.65 +
              (Math.random() - 0.5) * maxShift * 0.7,
          ),
        );
    const center = warmup
      ? H / 2
      : Math.max(
          gap / 2 + 28,
          Math.min(H - gap / 2 - 28, previous.center + shift),
        );
    const segment = { x, center, gap, shift };
    cave.push(segment);
    return segment;
  }
  function fillCave() {
    while (!cave.length || cave[cave.length - 1].x < W + 300)
      generateCaveSegment();
  }
  function start() {
    state = "playing";
    paused = false;
    distance = 0;
    scrollSpeed = 185;
    nextObstacle = 900;
    cave = [{ x: -50, center: H / 2, gap: MAX_GAP }];
    fillCave();
    obstacles = [];
    particles = [];
    helicopter = { x: 145, y: H / 2, w: 48, h: 25, vy: 0, rotor: 0 };
    clearInput();
    ui.pauseButton.textContent = "PAUSE";
    hideOverlay();
    updateHud();
    last = performance.now();
    accumulator = 0;
    scheduleFrame();
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
  function togglePause() {
    if (state !== "playing") return;
    recordBest();
    paused = !paused;
    clearInput();
    accumulator = 0;
    ui.pauseButton.textContent = paused ? "RESUME" : "PAUSE";
    scheduleFrame();
    if (paused) showOverlay("PAUSED", "THE CAVE IS WAITING", "RESUME");
    else {
      hideOverlay();
      last = performance.now();
    }
    updateHud();
  }
  function recordBest() {
    const metres = Math.floor(distance);
    if (metres <= best) return;
    best = metres;
    try {
      localStorage.setItem("helicopterCaveBest", String(best));
    } catch (_) {}
  }
  function gameOver() {
    if (state !== "playing") return;
    state = "over";
    paused = false;
    clearInput();
    const metres = Math.floor(distance);
    recordBest();
    burst(helicopter.x, helicopter.y, "#ed927e", 34);
    updateHud();
    showOverlay(
      "LIGHTS OUT",
      `DISTANCE ${metres}m · DEPTH ${(scrollSpeed / 185).toFixed(2)}×`,
      "FLY AGAIN",
    );
  }
  function caveBoundsAt(x) {
    for (let i = 1; i < cave.length; i++)
      if (x <= cave[i].x) {
        const a = cave[i - 1],
          b = cave[i],
          t = (x - a.x) / Math.max(1, b.x - a.x),
          center = a.center + (b.center - a.center) * t,
          gap = a.gap + (b.gap - a.gap) * t;
        return { top: center - gap / 2, bottom: center + gap / 2 };
      }
    return { top: 0, bottom: H };
  }
  function caveBoundsFor(left, right) {
    const samples = [caveBoundsAt(left), caveBoundsAt(right)];
    for (const s of cave)
      if (s.x > left && s.x < right)
        samples.push({
          top: s.center - s.gap / 2,
          bottom: s.center + s.gap / 2,
        });
    return {
      top: Math.max(...samples.map((b) => b.top)),
      bottom: Math.min(...samples.map((b) => b.bottom)),
    };
  }
  function spawnObstacle() {
    const x = W + 80,
      w = 24 + Math.random() * 22,
      bounds = caveBoundsFor(x - 32, x + w + 32),
      available = bounds.bottom - bounds.top;
    if (available < 115) return;
    const fromTop = Math.random() < 0.5,
      height = Math.min(70, available * 0.28, available - 104),
      y = fromTop ? bounds.top : bounds.bottom - height;
    obstacles.push({ x, y, w, h: height, fromTop });
  }
  function crystalPoints(o) {
    const local = [
      [0, o.h],
      [o.w * 0.35, 6],
      [o.w * 0.58, o.h * 0.35],
      [o.w * 0.82, 0],
      [o.w, o.h],
    ];
    return local.map(([x, y]) => ({
      x: o.x + x,
      y: o.y + (o.fromTop ? o.h - y : y),
    }));
  }
  function triangleHitsRect(points, left, right, top, bottom) {
    const rect = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];
    const axes = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    for (let i = 0; i < 3; i++) {
      const a = points[i],
        b = points[(i + 1) % 3];
      axes.push({ x: -(b.y - a.y), y: b.x - a.x });
    }
    return axes.every((axis) => {
      const a = points.map((p) => p.x * axis.x + p.y * axis.y),
        b = rect.map((p) => p.x * axis.x + p.y * axis.y);
      return (
        Math.max(...a) >= Math.min(...b) && Math.max(...b) >= Math.min(...a)
      );
    });
  }
  function checkCollision() {
    const left = helicopter.x - helicopter.w / 2,
      right = helicopter.x + helicopter.w / 2,
      top = helicopter.y - helicopter.h / 2,
      bottom = helicopter.y + helicopter.h / 2,
      bounds = caveBoundsFor(left, right);
    if (top <= bounds.top || bottom >= bounds.bottom) return true;
    return obstacles.some((o) => {
      if (right < o.x || left > o.x + o.w || bottom < o.y || top > o.y + o.h)
        return false;
      const points = crystalPoints(o);
      return [
        [0, 1, 2],
        [0, 2, 4],
        [2, 3, 4],
      ].some((ids) =>
        triangleHitsRect(
          ids.map((i) => points[i]),
          left,
          right,
          top,
          bottom,
        ),
      );
    });
  }
  function update(dt) {
    if (state !== "playing" || paused) return;
    scrollSpeed = Math.min(390, 185 + distance * 0.055);
    helicopter.vy += (GRAVITY - (input.thrust ? LIFT : 0)) * dt;
    helicopter.vy = Math.max(-310, Math.min(360, helicopter.vy));
    helicopter.y += helicopter.vy * dt;
    helicopter.rotor += dt * 25;
    const dx = scrollSpeed * dt;
    distance += dx / 12;
    cave.forEach((s) => (s.x -= dx));
    obstacles.forEach((o) => (o.x -= dx));
    cave = cave.filter((s, i) => i === cave.length - 1 || s.x > -100);
    fillCave();
    obstacles = obstacles.filter((o) => o.x + o.w > -40);
    nextObstacle -= dx;
    if (nextObstacle <= 0) {
      spawnObstacle();
      nextObstacle = 550 + Math.random() * 430 - Math.min(150, distance * 0.03);
    }
    updateParticles(dt);
    if (input.thrust && Math.random() < 0.75)
      particles.push({
        x: helicopter.x - 21,
        y: helicopter.y + 9,
        vx: -70 - Math.random() * 45,
        vy: 20 + Math.random() * 35,
        life: 0.2,
        color: "#f2ce68",
      });
    if (checkCollision()) gameOver();
    updateHud();
  }
  function updateParticles(dt) {
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    particles = particles.filter((p) => p.life > 0);
  }
  function updateHud() {
    const text = (e, value) => {
      if (e.textContent !== value) e.textContent = value;
    };
    text(ui.distance, String(Math.floor(distance)).padStart(5, "0") + "m");
    text(
      ui.best,
      String(Math.max(best, Math.floor(distance))).padStart(5, "0") + "m",
    );
    text(ui.speed, (scrollSpeed / 185).toFixed(2) + "×");
    ui.pauseButton.disabled = state !== "playing";
    if (ui.pauseButton.getAttribute("aria-pressed") !== String(paused))
      ui.pauseButton.setAttribute("aria-pressed", String(paused));
    ui.thrustButton.disabled = paused;
    if (ui.thrustButton.getAttribute("aria-pressed") !== String(input.thrust))
      ui.thrustButton.setAttribute("aria-pressed", String(input.thrust));
  }
  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++)
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 210,
        vy: (Math.random() - 0.5) * 210,
        life: 0.45 + Math.random() * 0.6,
        color,
      });
  }
  function draw() {
    const light = document.documentElement?.dataset?.theme === "light";
    ctx.fillStyle = light ? "#fff0c9" : "#07131c";
    ctx.fillRect(0, 0, W, H);
    drawCave(light);
    drawObstacles(light);
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;
    if (state !== "over") drawFirefly(light);
    if (paused) {
      ctx.fillStyle = light ? "#fff0c988" : "#07131c99";
      ctx.fillRect(0, 0, W, H);
    }
  }
  function drawCave(light) {
    ctx.fillStyle = light ? "#d8c59d" : "#132c38";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    cave.forEach((s, i) => {
      const y = s.center - s.gap / 2;
      i ? ctx.lineTo(s.x, y) : ctx.lineTo(s.x, y);
    });
    ctx.lineTo(W, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = light ? "#c7b184" : "#0e202a";
    ctx.beginPath();
    ctx.moveTo(0, H);
    cave.forEach((s) => ctx.lineTo(s.x, s.center + s.gap / 2));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = light ? "#8abf93" : "#80c7df";
    ctx.lineWidth = 3;
    ctx.beginPath();
    cave.forEach((s, i) =>
      i
        ? ctx.lineTo(s.x, s.center - s.gap / 2)
        : ctx.moveTo(s.x, s.center - s.gap / 2),
    );
    ctx.stroke();
    ctx.beginPath();
    cave.forEach((s, i) =>
      i
        ? ctx.lineTo(s.x, s.center + s.gap / 2)
        : ctx.moveTo(s.x, s.center + s.gap / 2),
    );
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 ? "#80c7df77" : "#f2ce6877";
      ctx.beginPath();
      ctx.arc(
        (i * 83 + distance * 1.5) % (W + 40),
        50 + ((i * 71) % H),
        2 + (i % 3),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    for (let i = 0; i < 10; i++) {
      const px = ((i * 113 + distance * 0.65) % (W + 90)) - 45,
        b = caveBoundsAt(px);
      ctx.fillStyle = light ? "#75aec7" : "#80c7df";
      ctx.beginPath();
      ctx.moveTo(px - 8, b.top - 2);
      ctx.lineTo(px, b.top - 28);
      ctx.lineTo(px + 8, b.top - 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - 8, b.bottom + 2);
      ctx.lineTo(px, b.bottom + 28);
      ctx.lineTo(px + 8, b.bottom + 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  function drawObstacles(light) {
    obstacles.forEach((o) => {
      ctx.fillStyle = light ? "#e98575" : "#ed927e";
      ctx.beginPath();
      crystalPoints(o).forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = light ? "#fff0c966" : "#f2ce6866";
      ctx.fillRect(o.x + 5, o.y + 12, 4, Math.max(4, o.h - 24));
      ctx.restore();
    });
  }
  function drawFirefly(light) {
    ctx.save();
    ctx.translate(helicopter.x, helicopter.y);
    ctx.rotate(Math.max(-0.22, Math.min(0.22, helicopter.vy / 700)));
    ctx.shadowColor = "#f2ce68";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#f2ce68";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (light) {
      ctx.strokeStyle = "#826224";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = light ? "#3f3a34" : "#fff0c9";
    ctx.beginPath();
    ctx.ellipse(-14, -12, 13, 6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-14, 12, 13, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ed927e";
    ctx.beginPath();
    ctx.arc(16, -1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f3a34";
    ctx.beginPath();
    ctx.arc(18, -2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#80c7df";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-31, 0);
    ctx.stroke();
    ctx.restore();
  }
  function loop(time) {
    rafId = null;
    accumulator += Math.max(0, Math.min(0.1, (time - last) / 1000 || 0));
    last = time;
    while (accumulator >= FIXED_STEP - 1e-9) {
      if (state === "over" && !paused) updateParticles(FIXED_STEP);
      else update(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    if (accumulator < 0) accumulator = 0;
    draw();
    if (
      (state === "playing" && !paused) ||
      (state === "over" && particles.length)
    )
      scheduleFrame();
  }
  function clearInput() {
    heldSources.clear();
    input.thrust = false;
    ui.thrustButton.classList.remove("active");
    ui.thrustButton.setAttribute("aria-pressed", "false");
  }
  function setThrust(value, event, source = "keyboard") {
    event?.preventDefault();
    if (value && paused) return;
    if (value && state !== "playing") start();
    value ? heldSources.add(source) : heldSources.delete(source);
    input.thrust = heldSources.size > 0;
    ui.thrustButton.classList.toggle("active", input.thrust);
    if (ui.thrustButton.getAttribute("aria-pressed") !== String(input.thrust))
      ui.thrustButton.setAttribute("aria-pressed", String(input.thrust));
  }
  ui.thrustButton.addEventListener("selectstart", (event) =>
    event.preventDefault(),
  );
  ui.thrustButton.addEventListener("contextmenu", (event) =>
    event.preventDefault(),
  );
  ui.thrustButton.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    setThrust(true, event, "pointer:" + event.pointerId);
    if (ui.thrustButton.setPointerCapture)
      try {
        ui.thrustButton.setPointerCapture(event.pointerId);
      } catch (_) {}
  });
  ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach(
    (type) =>
      ui.thrustButton.addEventListener(type, (event) =>
        setThrust(false, event, "pointer:" + event.pointerId),
      ),
  );
  for (const type of ["contextmenu", "selectstart", "dragstart"])
    canvas.addEventListener(type, (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    setThrust(true, event, "pointer:" + event.pointerId);
    if (canvas.setPointerCapture)
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (_) {}
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    canvas.addEventListener(type, (event) =>
      setThrust(false, event, "pointer:" + event.pointerId),
    ),
  );
  addEventListener("keydown", (event) => {
    const target = event.target,
      nativeControl =
        target &&
        (["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(
          target.tagName,
        ) ||
          target.isContentEditable);
    if (
      (nativeControl && target !== ui.thrustButton) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) setThrust(true, event);
    }
    if (event.key?.toLowerCase() === "p" && !event.repeat) togglePause();
  });
  addEventListener("keyup", (event) => {
    if (event.code === "Space") setThrust(false, event);
  });
  addEventListener("beforeunload", () => {
    if (state === "playing") recordBest();
  });
  addEventListener("game-data-clearing", () => {
    state = "title";
    paused = false;
    best = 0;
    distance = 0;
    scrollSpeed = 185;
    particles = [];
    obstacles = [];
    clearInput();
    helicopter = { x: 145, y: H / 2, w: 48, h: 25, vy: 0, rotor: 0 };
    cave = [
      { x: -50, center: H / 2, gap: MAX_GAP },
      { x: W + 50, center: H / 2, gap: MAX_GAP },
    ];
    showOverlay(
      "FIREFLY CAVE",
      "HOLD TO RISE · RELEASE TO DESCEND",
      "ENTER CAVE",
    );
    updateHud();
    scheduleFrame();
  });
  ui.startButton.onclick = () => (paused ? togglePause() : start());
  ui.pauseButton.onclick = togglePause;
  addEventListener("blur", () => {
    clearInput();
    if (state === "playing" && !paused) togglePause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing" && !paused) togglePause();
    if (!document.hidden) scheduleFrame();
  });
  helicopter = { x: 145, y: H / 2, w: 48, h: 25, vy: 0, rotor: 0 };
  cave = [
    { x: -50, center: H / 2, gap: MAX_GAP },
    { x: W + 50, center: H / 2, gap: MAX_GAP },
  ];
  showOverlay(
    "FIREFLY CAVE",
    "HOLD TO RISE · RELEASE TO DESCEND",
    "ENTER CAVE",
  );
  updateHud();
  document.addEventListener("themechange", scheduleFrame);
  addEventListener("resize", scheduleFrame);
  function dockUtilities() {
    const dock = document.getElementById("utilityDock"),
      clear = document.querySelector(".clear-data-toggle");
    if (dock && clear) dock.appendChild(clear);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", dockUtilities, {
      once: true,
    });
  else dockUtilities();
  scheduleFrame();
})();
