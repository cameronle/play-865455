(() => {
  "use strict";

  const boardCanvas = document.getElementById("board");
  const nextCanvas = document.getElementById("next");
  const ctx = boardCanvas.getContext("2d");
  const nextCtx = nextCanvas.getContext("2d");
  const COLS = 10,
    ROWS = 20,
    CELL = 30;
  const COLORS = {
    I: "#55b7c8",
    J: "#5b78c8",
    L: "#e69b52",
    O: "#e2c45d",
    S: "#7eb96a",
    T: "#aa78b8",
    Z: "#d86c66",
  };
  const SHAPES = {
    I: [[1, 1, 1, 1]],
    J: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  };
  const TYPES = Object.keys(SHAPES);
  const $ = (id) => document.getElementById(id);
  const scoreEl = $("score"),
    highScoreEl = $("highScore"),
    levelEl = $("level"),
    linesEl = $("lines");
  const message = $("message"),
    messageTitle = $("messageTitle"),
    messageHint = $("messageHint");
  function cssValue(name, fallback) {
    if (typeof getComputedStyle !== "function") return fallback;
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || fallback
    );
  }
  const SCORE_KEY = "classic-tetris-high-score";
  function readHighScore() {
    try {
      const value = Number(localStorage.getItem(SCORE_KEY) || 0);
      return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }
  function saveHighScore() {
    try {
      localStorage.setItem(SCORE_KEY, String(highScore));
    } catch {}
  }
  let grid,
    piece,
    nextType,
    score = 0,
    highScore = readHighScore(),
    level = 1,
    lines = 0;
  let state = "title",
    dropTimer = 0,
    lastTime = 0,
    softDropRequested = false,
    softDropHeld = false,
    frameId = null;
  const heldKeys = new Map(),
    pointerHolds = new Map();
  let horizontalDirection = 0,
    horizontalTimer = 0,
    horizontalRepeated = false;
  highScoreEl.textContent = String(highScore).padStart(6, "0");

  function emptyGrid() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }
  function randomType() {
    return TYPES[Math.floor(Math.random() * TYPES.length)];
  }
  function cloneMatrix(m) {
    return m.map((row) => row.slice());
  }
  function rotate(matrix) {
    return matrix[0].map((_, i) => matrix.map((row) => row[i]).reverse());
  }
  function newPiece(type = randomType()) {
    const matrix = cloneMatrix(SHAPES[type]);
    return { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
  }
  function collides(p, dx = 0, dy = 0, matrix = p.matrix) {
    for (let y = 0; y < matrix.length; y++)
      for (let x = 0; x < matrix[y].length; x++)
        if (matrix[y][x]) {
          const nx = p.x + x + dx,
            ny = p.y + y + dy;
          if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && grid[ny][nx]))
            return true;
        }
    return false;
  }
  let cellStroke = "rgba(62,57,52,.14)";
  function drawCell(context, x, y, color, size) {
    const pad = Math.max(1, size * 0.08);
    context.fillStyle = color;
    context.fillRect(
      x * size + pad,
      y * size + pad,
      size - pad * 2,
      size - pad * 2,
    );
    context.fillStyle = "rgba(255,255,255,.22)";
    context.fillRect(
      x * size + pad,
      y * size + pad,
      size - pad * 2,
      Math.max(2, size * 0.1),
    );
    context.strokeStyle = cellStroke;
    context.strokeRect(
      x * size + pad + 0.5,
      y * size + pad + 0.5,
      size - pad * 2 - 1,
      size - pad * 2 - 1,
    );
  }
  function drawGhostCell(context, x, y, color, size) {
    const pad = Math.max(2, size * 0.1);
    context.save();
    context.globalAlpha = 0.7;
    context.strokeStyle = color;
    context.lineWidth = Math.max(2, size * 0.07);
    context.setLineDash([Math.max(3, size * 0.16), Math.max(2, size * 0.1)]);
    context.strokeRect(
      x * size + pad + 0.5,
      y * size + pad + 0.5,
      size - pad * 2 - 1,
      size - pad * 2 - 1,
    );
    context.setLineDash([]);
    context.globalAlpha = 0.08;
    context.fillStyle = color;
    context.fillRect(
      x * size + pad,
      y * size + pad,
      size - pad * 2,
      size - pad * 2,
    );
    context.restore();
  }
  function draw() {
    cellStroke = cssValue("--canvas-grid", "rgba(62,57,52,.14)");
    ctx.fillStyle = cssValue("--canvas-bg", "#d8d1c5");
    ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (grid[y][x]) drawCell(ctx, x, y, COLORS[grid[y][x]], CELL);
    if (piece) {
      const ghost = { ...piece, y: piece.y };
      while (!collides(ghost, 0, 1)) ghost.y++;
      piece.matrix.forEach((row, y) =>
        row.forEach((v, x) => {
          if (v)
            drawGhostCell(
              ctx,
              piece.x + x,
              ghost.y + y,
              COLORS[piece.type],
              CELL,
            );
        }),
      );
      piece.matrix.forEach((row, y) =>
        row.forEach((v, x) => {
          if (v)
            drawCell(ctx, piece.x + x, piece.y + y, COLORS[piece.type], CELL);
        }),
      );
    }
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextType) {
      const m = SHAPES[nextType],
        size = 22,
        ox = (nextCanvas.width - m[0].length * size) / 2,
        oy = (nextCanvas.height - m.length * size) / 2;
      m.forEach((row, y) =>
        row.forEach((v, x) => {
          if (v) {
            nextCtx.save();
            nextCtx.translate(ox, oy);
            drawCell(nextCtx, x, y, COLORS[nextType], size);
            nextCtx.restore();
          }
        }),
      );
    }
  }
  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, "0");
    highScoreEl.textContent = String(highScore).padStart(6, "0");
    levelEl.textContent = String(level).padStart(2, "0");
    linesEl.textContent = String(lines).padStart(3, "0");
  }
  function addScore(points) {
    score += points;
    if (score > highScore) {
      highScore = score;
      saveHighScore();
    }
    updateHud();
  }
  function showMessage(title, hint, button = "START") {
    messageTitle.textContent = title;
    messageHint.textContent = hint;
    document.getElementById("startButton").textContent = button;
    message.classList.remove("hidden");
    $("startButton").focus?.({ preventScroll: true });
  }
  function hideMessage() {
    message.classList.add("hidden");
    boardCanvas.focus?.({ preventScroll: true });
  }
  function start() {
    clearInput();
    grid = emptyGrid();
    score = 0;
    level = 1;
    lines = 0;
    nextType = randomType();
    piece = newPiece();
    state = "playing";
    dropTimer = 0;
    lastTime = performance.now();
    softDropRequested = false;
    softDropHeld = false;
    hideMessage();
    updateHud();
    setControls();
    draw();
    requestFrame();
  }
  function clearInput() {
    endSoftDrop();
    heldKeys.clear();
    for (const set of pointerHolds.values()) set.clear();
    horizontalDirection = 0;
    horizontalTimer = 0;
    horizontalRepeated = false;
  }
  function isHeld(name) {
    return (
      [...heldKeys.values()].includes(name) ||
      (pointerHolds.get(name)?.size || 0) > 0
    );
  }
  function heldDirection() {
    return Number(isHeld("right")) - Number(isHeld("left"));
  }
  function refreshDirection() {
    const direction = heldDirection();
    if (direction !== horizontalDirection) {
      horizontalDirection = direction;
      horizontalTimer = 0;
      horizontalRepeated = false;
    }
  }
  function beginHorizontal() {
    refreshDirection();
    if (horizontalDirection) move(horizontalDirection);
  }
  function updateHorizontal(dt) {
    refreshDirection();
    if (!horizontalDirection) return;
    horizontalTimer += dt;
    let interval = horizontalRepeated ? 65 : 180;
    while (horizontalTimer + 1e-7 >= interval) {
      horizontalTimer -= interval;
      move(horizontalDirection, false);
      horizontalRepeated = true;
      interval = 65;
    }
  }
  function releaseHolds() {
    if (!isHeld("down")) endSoftDrop();
    refreshDirection();
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
  function stopFrame() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }
  function requestFrame() {
    if (frameId === null) frameId = requestAnimationFrame(tick);
  }
  function pause() {
    if (state === "playing") {
      clearInput();
      state = "paused";
      stopFrame();
      showMessage("PAUSED", "PRESS P OR RESUME", "RESUME");
    } else if (state === "paused") {
      clearInput();
      state = "playing";
      lastTime = performance.now();
      hideMessage();
      requestFrame();
    } else return;
    setControls();
    draw();
  }
  function gameOver() {
    clearInput();
    state = "over";
    stopFrame();
    setControls();
    updateHud();
    showMessage(
      "GAME OVER",
      "FINAL SCORE " + String(score).padStart(6, "0"),
      "PLAY AGAIN",
    );
  }
  function lock() {
    dropTimer = 0;
    piece.matrix.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v && piece.y + y >= 0) grid[piece.y + y][piece.x + x] = piece.type;
      }),
    );
    clearLines();
    piece = newPiece(nextType);
    nextType = randomType();
    softDropRequested = false;
    if (collides(piece)) gameOver();
  }
  function clearLines() {
    let count = 0;
    grid = grid.filter((row) => {
      if (row.every(Boolean)) {
        count++;
        return false;
      }
      return true;
    });
    while (grid.length < ROWS) grid.unshift(Array(COLS).fill(null));
    if (count) {
      const points = [0, 100, 300, 500, 800][count] * level;
      lines += count;
      level = Math.floor(lines / 10) + 1;
      addScore(points);
    }
  }
  function stepDown() {
    if (!collides(piece, 0, 1)) {
      piece.y++;
      return true;
    }
    lock();
    return false;
  }
  function move(dx, render = true) {
    if (state === "playing" && !collides(piece, dx, 0)) {
      piece.x += dx;
      if (render) draw();
    }
  }
  function turn() {
    if (state !== "playing") return;
    const rotated = rotate(piece.matrix);
    for (const kick of [0, -1, 1, -2, 2])
      if (!collides(piece, kick, 0, rotated)) {
        piece.matrix = rotated;
        piece.x += kick;
        draw();
        return;
      }
  }
  function hardDrop() {
    if (state !== "playing") return;
    let distance = 0;
    while (!collides(piece, 0, 1)) {
      piece.y++;
      distance++;
    }
    addScore(distance * 2);
    lock();
    draw();
  }
  function tick(time) {
    frameId = null;
    const dt = Math.max(0, Math.min(250, time - lastTime));
    lastTime = time;
    if (state === "playing") {
      const previous = piece,
        previousX = piece.x,
        previousY = piece.y;
      updateHorizontal(dt);
      if (collides(piece, 0, 1)) {
        lock();
        dropTimer = 0;
      } else {
        dropTimer += dt;
        const interval = softDropRequested
          ? 50
          : Math.max(80, 800 - (level - 1) * 65);
        while (dropTimer + 1e-7 >= interval && state === "playing") {
          dropTimer -= interval;
          if (!stepDown()) {
            dropTimer = 0;
            break;
          }
          if (softDropRequested) addScore(1);
        }
      }
      if (piece !== previous || piece.x !== previousX || piece.y !== previousY)
        draw();
    }
    if (state === "playing") requestFrame();
  }
  function beginSoftDrop() {
    if (softDropHeld || state !== "playing" || !piece) return;
    softDropHeld = true;
    softDropRequested = true;
    dropTimer = 0;
    if (stepDown()) addScore(1);
    draw();
  }
  function endSoftDrop() {
    softDropHeld = false;
    softDropRequested = false;
  }
  function action(name) {
    if (state !== "playing" || !piece) return;
    if (name === "left") move(-1);
    if (name === "right") move(1);
    if (name === "rotate") turn();
    if (name === "down") {
      if (stepDown()) addScore(1);
      draw();
    }
    if (name === "drop") hardDrop();
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
    if (key === " " && e.target?.tagName === "BUTTON") return;
    if (key === "p" && (state === "playing" || state === "paused")) {
      e.preventDefault();
      if (!e.repeat) pause();
      return;
    }
    if (state !== "playing") return;
    const names = {
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
      ArrowUp: "rotate",
      w: "rotate",
      ArrowDown: "down",
      s: "down",
      " ": "drop",
    };
    const name = names[key];
    if (!name) return;
    e.preventDefault();
    if (e.repeat) return;
    if (["left", "right", "down"].includes(name)) {
      if (heldKeys.has(key)) return;
      heldKeys.set(key, name);
      if (name === "down") beginSoftDrop();
      else beginHorizontal();
    } else action(name);
  });
  window.addEventListener("keyup", (e) => {
    heldKeys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    releaseHolds();
  });
  function releasePointer(e) {
    for (const ids of pointerHolds.values()) ids.delete(e.pointerId);
    releaseHolds();
  }
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  document.querySelectorAll("[data-action]").forEach((button) => {
    const name = button.dataset.action,
      ids = new Set();
    pointerHolds.set(name, ids);
    button.addEventListener("pointerdown", (e) => {
      if (state !== "playing" || e.button > 0 || ids.has(e.pointerId)) return;
      e.preventDefault();
      ids.add(e.pointerId);
      try {
        button.setPointerCapture?.(e.pointerId);
      } catch {}
      if (name === "down") beginSoftDrop();
      else if (name === "left" || name === "right") beginHorizontal();
      else action(name);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(type, (e) => {
        e.preventDefault();
        ids.delete(e.pointerId);
        releaseHolds();
      });
    button.addEventListener("click", (e) => {
      if (e.detail === 0) action(name);
    });
  });
  function suspend() {
    clearInput();
    if (state === "playing") pause();
  }
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("resize", draw);
  if (document.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspend();
    });
    document.addEventListener("themechange", draw);
  }
  grid = emptyGrid();
  piece = null;
  nextType = randomType();
  updateHud();
  setControls();
  draw();
})();
