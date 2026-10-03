(() => {
  "use strict";
  const canvas = document.getElementById("board"),
    ctx = canvas.getContext("2d");
  const COLS = 20,
    ROWS = 20,
    CELL = 20,
    $ = (id) => document.getElementById(id),
    scoreEl = $("score"),
    highScoreEl = $("highScore"),
    speedEl = $("speed"),
    message = $("message"),
    messageTitle = $("messageTitle"),
    messageHint = $("messageHint");
  const SCORE_KEY = "classic-snake-high-score";
  let turnQueue = [],
    swipe = null;
  let snake,
    food,
    direction,
    score = 0,
    highScore = readHighScore(),
    state = "title",
    timer = 0,
    last = 0,
    stepMs = 145,
    frameId = null;
  highScoreEl.textContent = String(highScore).padStart(6, "0");
  function readHighScore() {
    try {
      const value = Number(localStorage.getItem(SCORE_KEY) || 0);
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }
  function key(x, y) {
    return x + "," + y;
  }
  function wrap(value, max) {
    return (value + max) % max;
  }
  function randomFood() {
    const occupied = new Set(snake.map((part) => key(part.x, part.y))),
      free = [];
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (!occupied.has(key(x, y))) free.push({ x, y });
    if (!free.length) return null;
    const spot = free[Math.floor(Math.random() * free.length)];
    spot.kind = ["apple", "berry", "leaf"][Math.floor(Math.random() * 3)];
    return spot;
  }
  function reset() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    direction = { x: 1, y: 0 };
    turnQueue = [];
    food = randomFood();
    score = 0;
    timer = 0;
    stepMs = 145;
    updateHud();
    draw();
  }
  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, "0");
    highScoreEl.textContent = String(highScore).padStart(6, "0");
    speedEl.textContent = String(
      Math.max(1, Math.floor((145 - stepMs) / 5) + 1),
    ).padStart(2, "0");
  }
  function setControls() {
    const paused = state === "paused";
    $("pauseButton").textContent = paused ? "RESUME" : "PAUSE";
    $("pauseButton").disabled = state !== "playing" && !paused;
    $("pauseButton").setAttribute("aria-pressed", String(paused));
    document
      .querySelectorAll("[data-action]")
      .forEach((b) => (b.disabled = state !== "playing"));
  }
  function showMessage(title, hint, button = "START") {
    messageTitle.textContent = title;
    messageHint.textContent = hint;
    $("startButton").textContent = button;
    message.classList.remove("hidden");
    setControls();
    $("startButton").focus({ preventScroll: true });
  }
  function hideMessage() {
    message.classList.add("hidden");
    setControls();
    canvas.focus({ preventScroll: true });
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
  function start() {
    swipe = null;
    stopFrame();
    state = "playing";
    reset();
    hideMessage();
    last = performance.now();
    requestFrame();
  }
  function pause() {
    if (state === "playing") {
      state = "paused";
      swipe = null;
      turnQueue = [];
      stopFrame();
      showMessage("PAUSED", "PRESS P OR RESUME", "RESUME");
    } else if (state === "paused") {
      state = "playing";
      hideMessage();
      last = performance.now();
      requestFrame();
    }
    draw();
  }
  function saveHigh() {
    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem(SCORE_KEY, String(highScore));
      } catch {}
    }
  }
  function gameOver() {
    state = "over";
    swipe = null;
    turnQueue = [];
    stopFrame();
    saveHigh();
    updateHud();
    showMessage(
      "GARDEN REST",
      "SCORE " + String(score).padStart(6, "0"),
      "PLAY AGAIN",
    );
  }
  function gameWon() {
    state = "won";
    swipe = null;
    turnQueue = [];
    stopFrame();
    saveHigh();
    updateHud();
    showMessage(
      "FULL GARDEN",
      "EVERY APPLE FOUND · SCORE " + String(score).padStart(6, "0"),
      "PLAY AGAIN",
    );
  }
  function setDirection(x, y) {
    if (state !== "playing" || turnQueue.length >= 2) return;
    const previous = turnQueue.at(-1) || direction;
    if (
      (x === previous.x && y === previous.y) ||
      (x === -previous.x && y === -previous.y)
    )
      return;
    turnQueue.push({ x, y });
  }
  function tick() {
    if (turnQueue.length) direction = turnQueue.shift();
    const head = snake[0],
      next = {
        x: wrap(head.x + direction.x, COLS),
        y: wrap(head.y + direction.y, ROWS),
      },
      eating = food && next.x === food.x && next.y === food.y,
      body = eating ? snake : snake.slice(0, -1);
    if (body.some((part) => part.x === next.x && part.y === next.y)) {
      gameOver();
      return;
    }
    snake.unshift(next);
    if (eating) {
      score += 10;
      saveHigh();
      stepMs = Math.max(65, 145 - Math.floor(score / 50) * 5);
      food = randomFood();
      updateHud();
      if (!food) gameWon();
    } else snake.pop();
  }
  let palette;
  function color(name, fallback) {
    const value = palette.getPropertyValue(name).trim();
    return value || fallback;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function drawGarden() {
    ctx.fillStyle = color("--canvas-bg", "#fffaf0");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color("--canvas-grid", "rgba(75,156,149,.14)");
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL + 0.5);
      ctx.lineTo(canvas.width, i * CELL + 0.5);
      ctx.stroke();
    }
  }
  function drawApple(item) {
    if (!item) return;
    const p = {
        coral: color("--coral", "#f28c78"),
        yellow: color("--yellow", "#f7d66c"),
        mint: color("--mint", "#9eddbd"),
        ink: color("--ink", "#3d3832"),
      },
      x = item.x * CELL + CELL / 2,
      y = item.y * CELL + CELL / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    if (item.kind === "berry") {
      ctx.fillStyle = p.purple || color("--purple", "#b8a7e8");
      ctx.beginPath();
      ctx.arc(-5, 2, 6, 0, Math.PI * 2);
      ctx.arc(5, 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.mint;
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (item.kind === "leaf") {
      ctx.fillStyle = p.mint;
      ctx.beginPath();
      ctx.ellipse(0, 2, 7, 10, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = p.ink;
      ctx.beginPath();
      ctx.moveTo(-2, 9);
      ctx.lineTo(4, -7);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.coral;
      ctx.beginPath();
      ctx.arc(-5, 1, 7, 0, Math.PI * 2);
      ctx.arc(5, 1, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = p.mint;
      ctx.beginPath();
      ctx.ellipse(5, -9, 7, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = p.ink;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(2, -10);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawWorm() {
    if (!snake) return;
    const p = {
      mint: color("--mint", "#9eddbd"),
      blue: color("--blue", "#8fc9eb"),
      yellow: color("--yellow", "#f7d66c"),
      ink: color("--ink", "#3d3832"),
      eye: color("--snake-eye", "#fffaf0"),
    };
    for (let i = snake.length - 1; i >= 0; i--) {
      const part = snake[i],
        x = part.x * CELL + 2,
        y = part.y * CELL + 2,
        head = i === 0;
      ctx.save();
      ctx.fillStyle = head ? p.mint : i % 2 ? p.blue : p.mint;
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      roundRect(x, y, CELL - 4, CELL - 4, head ? 8 : 6);
      ctx.fill();
      ctx.stroke();
      if (head) {
        const ex =
            part.x * CELL + (direction.x < 0 ? 5 : direction.x > 0 ? 13 : 7),
          ey = part.y * CELL + (direction.y < 0 ? 5 : direction.y > 0 ? 13 : 5);
        ctx.fillStyle = p.eye;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.arc(
          ex + (direction.x === 0 ? 7 : 0),
          ey + (direction.y === 0 ? 7 : 0),
          3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.ink;
        ctx.beginPath();
        ctx.arc(ex, ey, 1.3, 0, Math.PI * 2);
        ctx.arc(
          ex + (direction.x === 0 ? 7 : 0),
          ey + (direction.y === 0 ? 7 : 0),
          1.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 2, y - 5);
        ctx.moveTo(x + 13, y + 2);
        ctx.lineTo(x + 16, y - 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.yellow;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  function draw() {
    palette = getComputedStyle(document.documentElement);
    drawGarden();
    drawApple(food);
    drawWorm();
    if (state === "paused") {
      ctx.fillStyle = color("--paper", "#fffaf0") + "bb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  function action(name) {
    if (name === "up") setDirection(0, -1);
    if (name === "down") setDirection(0, 1);
    if (name === "left") setDirection(-1, 0);
    if (name === "right") setDirection(1, 0);
  }
  function loop(time) {
    frameId = null;
    const dt = Math.max(0, Math.min(250, time - last));
    last = time;
    if (state === "playing") {
      timer += dt;
      let moved = false;
      while (timer + 1e-7 >= stepMs && state === "playing") {
        timer = Math.max(0, timer - stepMs);
        tick();
        moved = true;
      }
      if (moved) draw();
    }
    if (state === "playing") requestFrame();
  }
  $("startButton").addEventListener("click", () => {
    if (state === "paused") pause();
    else start();
  });
  $("newGameButton").addEventListener("click", start);
  $("pauseButton").addEventListener("click", pause);
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
    if (key === "p" && (state === "playing" || state === "paused")) {
      e.preventDefault();
      if (!e.repeat) pause();
      return;
    }
    if (state !== "playing") return;
    const name = {
      ArrowUp: "up",
      w: "up",
      ArrowDown: "down",
      s: "down",
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
    }[key];
    if (name) {
      e.preventDefault();
      if (!e.repeat) action(name);
    }
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      action(button.dataset.action);
    });
    button.addEventListener("click", (e) => {
      if (e.detail === 0) action(button.dataset.action);
    });
    for (const type of ["contextmenu", "selectstart", "dragstart"])
      button.addEventListener(type, (e) => e.preventDefault());
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "playing" || e.button > 0 || swipe) return;
    e.preventDefault();
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (state !== "playing" || !swipe || e.pointerId !== swipe.id) return;
    e.preventDefault();
    const dx = e.clientX - swipe.x,
      dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    action(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
    swipe.x = e.clientX;
    swipe.y = e.clientY;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, (e) => {
      if (swipe?.id === e.pointerId) {
        e.preventDefault();
        swipe = null;
      }
    });
  for (const type of ["contextmenu", "selectstart", "dragstart"])
    canvas.addEventListener(type, (e) => e.preventDefault());
  function suspend() {
    if (state === "playing") pause();
  }
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("resize", draw);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
  });
  document.addEventListener("themechange", draw);
  reset();
  showMessage("WORM & APPLE", "PRESS START TO PLAY", "START GROWING");
})();
