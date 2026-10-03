(() => {
  "use strict";
  const c = document.getElementById("game"),
    x = c.getContext("2d"),
    W = 480,
    H = 640,
    FLOWER_SCALE = 0.7,
    FLOWER_RADIUS = 17 * FLOWER_SCALE,
    $ = (id) => document.getElementById(id);
  let state = "title",
    score = 0,
    high = readHigh(),
    level = 1,
    lives = 3,
    bar,
    ball,
    bricks = [],
    keys = new Set(),
    last = 0,
    dragging = false,
    accumulator = 0,
    frameId = null;
  const colors = [
    "#ef8b70",
    "#f3b95f",
    "#f6d66b",
    "#9fd8a4",
    "#84c5df",
    "#a99add",
  ];
  function readHigh() {
    try {
      const v = Number(localStorage.getItem("breakout-high") || 0);
      return Number.isSafeInteger(v) && v >= 0 ? v : 0;
    } catch {
      return 0;
    }
  }
  function clearInput() {
    keys.clear();
    clearDrag();
  }
  function clearDrag() {
    const owner = dragging;
    dragging = false;
    if (owner && typeof owner === "object")
      try {
        c.releasePointerCapture(owner.id);
      } catch {}
  }
  function attachBall() {
    ball = {
      x: bar.x + bar.w / 2,
      y: bar.y - 9.5,
      vx: 190,
      vy: -250,
      r: 7.5,
      stuck: true,
    };
  }
  function reset() {
    clearInput();
    score = 0;
    level = 1;
    lives = 3;
    bar = { x: W / 2 - 48, y: H - 42, w: 96, h: 14, v: 390 };
    attachBall();
    makeBricks();
    hud();
    draw();
  }
  function makeBricks() {
    bricks = [];
    for (let row = 0; row < 6 + Math.min(level, 4); row++)
      for (let col = 0; col < 9; col++)
        bricks.push({
          x: 28 + col * 47,
          y: 52 + row * 27,
          w: 41,
          h: 20,
          color: colors[row % colors.length],
          alive: true,
          row,
          col,
        });
  }
  function hud() {
    $("score").textContent = String(score).padStart(6, "0");
    $("high").textContent = String(high).padStart(6, "0");
    $("level").textContent = String(level).padStart(2, "0");
    $("lives").textContent = "♥".repeat(lives) + "·".repeat(3 - lives);
    setControls();
  }
  function setControls() {
    const paused = state === "pause";
    $("pause").textContent = paused ? "RESUME" : "PAUSE";
    $("pause").disabled = state !== "play" && !paused;
    $("pause").setAttribute("aria-pressed", String(paused));
    $("mobileLaunch").disabled = state === "play" && !ball.stuck;
    $("mobileLaunch").textContent = paused
      ? "RESUME"
      : state === "play"
        ? ball.stuck
          ? "RELEASE FIREFLY"
          : "IN FLIGHT"
        : state === "over"
          ? "PLAY AGAIN"
          : "START & GLOW";
    $("lives").setAttribute("aria-label", lives + " chances remaining");
  }
  function msg(t, h, b) {
    $("title").textContent = t;
    $("hint").textContent = h;
    $("start").textContent = b;
    $("overlay").classList.remove("hide");
    setControls();
    $("start").focus({ preventScroll: true });
  }
  function start() {
    stopFrame();
    state = "play";
    reset();
    accumulator = 0;
    last = performance.now();
    $("overlay").classList.add("hide");
    setControls();
    c.focus({ preventScroll: true });
    requestFrame();
  }
  function pause() {
    if (state === "play") {
      state = "pause";
      clearInput();
      accumulator = 0;
      stopFrame();
      msg("RESTING GARDEN", "THE FIREFLY IS WAITING", "RESUME");
    } else if (state === "pause") {
      state = "play";
      last = performance.now();
      accumulator = 0;
      $("overlay").classList.add("hide");
      setControls();
      c.focus({ preventScroll: true });
      requestFrame();
    }
    draw();
  }
  function launch() {
    if (state === "play" && ball.stuck) {
      ball.stuck = false;
      ball.vx = (Math.random() > 0.5 ? 1 : -1) * 190;
      ball.vy = -250;
      setControls();
      draw();
    }
  }
  function startAndLaunch() {
    if (state === "pause") {
      pause();
      return;
    }
    if (state !== "play") start();
    launch();
  }
  function lose() {
    if (state !== "play") return;
    lives = Math.max(0, lives - 1);
    clearInput();
    accumulator = 0;
    attachBall();
    hud();
    if (lives === 0) {
      state = "over";
      stopFrame();
      msg(
        "THE GARDEN IS QUIET",
        "FINAL GLOW " + String(score).padStart(6, "0"),
        "PLAY AGAIN",
      );
    }
  }
  function moveBar(e) {
    const r = c.getBoundingClientRect(),
      width = c.clientWidth || r.width;
    bar.x = Math.max(
      8,
      Math.min(
        W - bar.w - 8,
        dragging.barX + ((e.clientX - dragging.x) / width) * W,
      ),
    );
    if (ball.stuck) ball.x = bar.x + bar.w / 2;
    draw();
  }
  function update(dt) {
    let d =
      (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) -
      (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
    bar.x = Math.max(8, Math.min(W - bar.w - 8, bar.x + d * bar.v * dt));
    if (ball.stuck) {
      ball.x = bar.x + bar.w / 2;
      return;
    }
    const previousX = ball.x,
      previousY = ball.y;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x - ball.r <= 0 && ball.vx < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
    } else if (ball.x + ball.r >= W && ball.vx > 0) {
      ball.x = W - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r <= 0 && ball.vy < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y > H + 20) {
      lose();
      return;
    }
    if (
      ball.vy > 0 &&
      previousY + ball.r <= bar.y &&
      ball.y + ball.r >= bar.y
    ) {
      const fraction = (bar.y - ball.r - previousY) / (ball.y - previousY),
        crossX = previousX + (ball.x - previousX) * fraction;
      if (crossX + ball.r >= bar.x && crossX - ball.r <= bar.x + bar.w) {
        const hit = Math.max(
            -1,
            Math.min(1, (crossX - (bar.x + bar.w / 2)) / (bar.w / 2)),
          ),
          speed = Math.hypot(ball.vx, ball.vy),
          angle = (hit * Math.PI) / 3;
        ball.x = crossX;
        ball.y = bar.y - ball.r - 0.01;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
      }
    }
    for (const b of bricks) {
      if (!b.alive) continue;
      const cx = b.x + b.w / 2,
        cy = b.y + b.h / 2,
        dx = ball.x - cx,
        dy = ball.y - cy,
        distance = Math.hypot(dx, dy),
        radius = FLOWER_RADIUS;
      if (distance >= radius + ball.r) continue;
      const speed = Math.hypot(ball.vx, ball.vy),
        nx = distance > 1e-8 ? dx / distance : speed > 0 ? -ball.vx / speed : 0,
        ny =
          distance > 1e-8 ? dy / distance : speed > 0 ? -ball.vy / speed : -1;
      ball.x = cx + nx * (radius + ball.r + 0.01);
      ball.y = cy + ny * (radius + ball.r + 0.01);
      const approach = ball.vx * nx + ball.vy * ny;
      if (approach < 0) {
        ball.vx -= 2 * approach * nx;
        ball.vy -= 2 * approach * ny;
        if (Math.abs(ball.vy) < speed * 0.2) {
          ball.vy = (ball.vy < 0 ? -1 : 1) * speed * 0.2;
          ball.vx =
            (ball.vx < 0 ? -1 : 1) *
            Math.sqrt(speed * speed - ball.vy * ball.vy);
        }
      }
      b.alive = false;
      score += 10 * level;
      if (score > high) {
        high = score;
        try {
          localStorage.setItem("breakout-high", String(high));
        } catch {}
      }
      hud();
      break;
    }
    if (bricks.every((b) => !b.alive)) {
      level++;
      makeBricks();
      clearInput();
      accumulator = 0;
      attachBall();
      hud();
    }
  }
  function flower(b) {
    x.save();
    x.translate(b.x + b.w / 2, b.y + b.h / 2);
    x.scale(FLOWER_SCALE, FLOWER_SCALE);
    x.fillStyle = b.color;
    for (let i = 0; i < 4; i++) {
      x.rotate(Math.PI / 2);
      x.beginPath();
      x.ellipse(0, -7, 7, 10, 0, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = "#fff1a8";
    x.beginPath();
    x.arc(0, 0, 5, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  function draw() {
    const light = document.documentElement?.dataset?.theme === "light";
    x.fillStyle = light ? "#fff7df" : "#10213a";
    x.fillRect(0, 0, W, H);
    bricks.forEach((b) => {
      if (b.alive) flower(b);
    });
    x.fillStyle = light ? "#6aa16f" : "#9fd8a4";
    x.beginPath();
    x.ellipse(
      bar.x + bar.w / 2,
      bar.y + bar.h / 2,
      bar.w / 2,
      bar.h / 2,
      0,
      0,
      Math.PI * 2,
    );
    x.fill();
    x.strokeStyle = light ? "#29333c" : "#10213a";
    x.lineWidth = 2;
    x.stroke();
    if (ball) {
      x.save();
      x.shadowColor = light ? "#f3b95f" : "#ffe27a";
      x.shadowBlur = 18;
      x.fillStyle = "#ffe27a";
      x.beginPath();
      x.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = light ? "#8a4b16" : "#fff4cf";
      x.lineWidth = 2;
      x.stroke();
      x.restore();
    }
  }
  function requestFrame() {
    if (frameId === null) frameId = requestAnimationFrame(loop);
  }
  function stopFrame() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }
  function loop(t) {
    frameId = null;
    const dt = Math.max(0, Math.min(0.25, (t - last) / 1000));
    last = t;
    if (state === "play") {
      accumulator += dt;
      while (accumulator + 1e-9 >= 1 / 120 && state === "play") {
        accumulator = Math.max(0, accumulator - 1 / 120);
        update(1 / 120);
      }
      draw();
      if (state === "play") requestFrame();
    }
  }
  $("start").onclick = startAndLaunch;
  $("new").onclick = () => {
    start();
    launch();
  };
  $("mobileNew").onclick = () => {
    start();
    launch();
  };
  $("pause").onclick = pause;
  $("mobileLaunch").onclick = startAndLaunch;
  window.addEventListener("keydown", (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)
    )
      return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === "p" && (state === "play" || state === "pause")) {
      e.preventDefault();
      if (!e.repeat) pause();
      return;
    }
    if (key === " ") {
      if (["BUTTON", "A"].includes(e.target?.tagName)) return;
      e.preventDefault();
      if (!e.repeat) startAndLaunch();
      return;
    }
    if (
      state === "play" &&
      ["ArrowLeft", "ArrowRight", "a", "d"].includes(key)
    ) {
      e.preventDefault();
      if (!e.repeat) keys.add(key);
    }
  });
  window.addEventListener("keyup", (e) =>
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
  c.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || dragging || state === "pause" || state === "over")
      return;
    e.preventDefault();
    if (state === "title") {
      start();
      launch();
    }
    dragging = { id: e.pointerId, x: e.clientX, barX: bar.x };
    try {
      c.setPointerCapture(e.pointerId);
    } catch {}
    c.focus({ preventScroll: true });
    launch();
  });
  c.addEventListener("pointermove", (e) => {
    if (state !== "play" || !dragging || e.pointerId !== dragging.id) return;
    e.preventDefault();
    moveBar(e);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    c.addEventListener(type, (e) => {
      if (dragging && dragging.id === e.pointerId) {
        e.preventDefault();
        clearDrag();
      }
    });
  for (const type of ["contextmenu", "selectstart", "dragstart"])
    c.addEventListener(type, (e) => e.preventDefault());
  function suspend() {
    if (state === "play") pause();
  }
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
  });
  window.addEventListener("resize", draw);
  document.addEventListener("themechange", draw);
  reset();
  msg("FIRELIGHT GARDEN", "TAP START TO RELEASE THE FIREFLY", "START");
})();
