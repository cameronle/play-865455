(() => {
  "use strict";
  const R = window.BubbleShooterRules,
    canvas = document.getElementById("game"),
    ctx = canvas.getContext("2d"),
    $ = (id) => document.getElementById(id);
  const COLS = 8,
    ROWS = 13,
    RADIUS = 27,
    DX = 56,
    DY = 48,
    TOP = 30,
    COLORS = ["mint", "coral", "yellow", "blue"];
  let grid,
    current,
    next,
    score,
    best = readBest(),
    misses,
    active,
    aim = { x: 240, y: 300 },
    shot = null,
    pointerId = null,
    clock = 0,
    offset = 0,
    paused = false;
  function readBest() {
    try {
      const n = Number(localStorage.getItem("bubble-shooter-best") || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }
  function css(name, fallback) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }
  function palette() {
    return {
      mint: css("--mint", "#9eddbd"),
      coral: css("--coral", "#f28c78"),
      yellow: css("--yellow", "#f7d66c"),
      blue: css("--blue", "#8fc9eb"),
      paper: css("--paper", "#fffaf0"),
      board: css("--board", "#fffdf7"),
      grid: css("--grid", "#c7e4dd"),
      line: css("--line", "#d9cfc1"),
      ink: css("--ink", "#3d3832"),
      muted: css("--muted", "#8a7c6e"),
      purple: css("--purple", "#b8a7e8"),
    };
  }
  function randomColor() {
    const used = new Set();
    for (const row of grid || [])
      for (const cell of row) if (cell) used.add(cell);
    const options = used.size ? [...used] : COLORS;
    return options[Math.floor(Math.random() * options.length)];
  }
  function center(row, col) {
    return R.cellCenter(row, col, offset);
  }
  function nearestCell(x, y) {
    let bestCell = null,
      bestDist = Infinity;
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < COLS; c++) {
        const pos = center(r, c),
          dist = Math.hypot(x - pos.x, y - pos.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestCell = { row: r, col: c };
        }
      }
    return bestCell;
  }
  function initialize() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    clearPointer();
    paused = false;
    offset = 0;
    grid = R.emptyGrid(ROWS, COLS);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < COLS; c++)
        if (!(r === 4 && Math.random() < 0.35))
          grid[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
    current = randomColor();
    next = randomColor();
    score = 0;
    misses = 5;
    active = true;
    shot = null;
    aim = { x: 240, y: 300 };
    $("resultOverlay").classList.remove("show");
    updateHud();
    draw();
    canvas.focus({ preventScroll: true });
  }
  function updateHud() {
    $("score").textContent = String(score).padStart(6, "0");
    $("best").textContent = String(best).padStart(6, "0");
    $("misses").textContent = String(misses).padStart(2, "0");
    $("nextBubble").style.background = palette()[next];
    $("pauseButton").textContent = paused ? "RESUME" : "PAUSE";
    $("pauseButton").setAttribute("aria-pressed", String(paused));
    $("pauseButton").disabled = !active;
    $("fireButton").disabled = !active || paused;
  }
  function drawFlower(x, y, color, alpha = 1, p = palette()) {
    const fill = p[color] || p.mint;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = fill;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = p.paper;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 10, Math.sin(a) * 10, 5, 8, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.yellow;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.paper;
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(-8, -10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawGarden(p) {
    ctx.fillStyle = p.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = p.grid;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.coral;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const x = 22 + i * 70,
        y = 12 + (i % 3) * 15;
      ctx.beginPath();
      ctx.moveTo(x, y + 7);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x + 12, y + 7);
      ctx.stroke();
    }
    ctx.fillStyle = p.mint;
    ctx.beginPath();
    ctx.moveTo(0, 704);
    ctx.quadraticCurveTo(95, 680, 190, 704);
    ctx.quadraticCurveTo(300, 730, 480, 696);
    ctx.lineTo(480, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.ink;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, 704);
    ctx.quadraticCurveTo(95, 680, 190, 704);
    ctx.quadraticCurveTo(300, 730, 480, 696);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function normalizedAim() {
    const angle = Math.max(
      Math.PI / 12,
      Math.min(
        (Math.PI * 11) / 12,
        Math.atan2(Math.max(80, 675 - aim.y), aim.x - 240),
      ),
    );
    return { x: Math.cos(angle), y: -Math.sin(angle) };
  }
  function preview() {
    const v = normalizedAim(),
      r = R.advanceShot(
        grid,
        { x: 240, y: 675, vx: v.x, vy: v.y },
        4096,
        offset,
      );
    return {
      path: r.path,
      hit: r.hit,
      cell: R.attachmentCell(grid, r.hit, offset),
    };
  }
  function traceAim(p = palette()) {
    const v = normalizedAim();
    let x = 240,
      y = 675,
      vx = v.x,
      vy = v.y;
    ctx.save();
    ctx.strokeStyle = p.ink;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const point of preview().path) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
  }
  function drawShooter(p) {
    ctx.save();
    ctx.translate(240, 687);
    ctx.fillStyle = p.mint;
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-42, 31);
    ctx.quadraticCurveTo(-35, 0, 0, -5);
    ctx.quadraticCurveTo(35, 0, 42, 31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.yellow;
    ctx.beginPath();
    ctx.arc(-15, 14, 4, 0, Math.PI * 2);
    ctx.arc(15, 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.coral;
    ctx.beginPath();
    ctx.arc(0, 13, 7, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  let frameId = null,
    lastFrame = 0;
  function shoot() {
    if (!active || paused || shot) return;
    const v = normalizedAim();
    shot = { x: 240, y: 675, vx: v.x * 1080, vy: v.y * 1080, color: current };
    lastFrame = performance.now();
    frameId = requestAnimationFrame(animate);
  }
  function animate(time) {
    frameId = null;
    if (!shot || paused) return;
    const dt = Math.max(0, Math.min(0.1, (time - lastFrame) / 1000));
    lastFrame = time;
    const result = R.advanceShot(grid, shot, dt * 1080, offset);
    shot = result.shot;
    if (result.hit) {
      attachShot(result.hit);
      return;
    }
    draw();
    frameId = requestAnimationFrame(animate);
  }
  function attachShot(hit = null) {
    const cell = hit
      ? R.attachmentCell(grid, hit, offset)
      : nearestCell(shot.x, shot.y);
    if (!cell) {
      end(false);
      return;
    }
    let { row, col } = cell;
    if (grid[row][col]) {
      const open = R.neighbors(row, col, offset)
        .filter(([r, c]) => R.inside(grid, r, c) && !grid[r][c])
        .sort((a, b) => {
          const pa = center(...a),
            pb = center(...b);
          return (
            Math.hypot(shot.x - pa.x, shot.y - pa.y) -
            Math.hypot(shot.x - pb.x, shot.y - pb.y)
          );
        });
      if (!open.length) {
        end(false);
        return;
      }
      [row, col] = open[0];
    }
    grid[row][col] = shot.color;
    shot = null;
    const result = R.resolve(grid, row, col, offset);
    if (result.matched) {
      score += result.matched * 10 + result.dropped * 20;
      misses = 5;
    } else {
      misses--;
      if (misses <= 0) addPressureRow();
    }
    if (score > best) {
      best = score;
      try {
        localStorage.setItem("bubble-shooter-best", String(best));
      } catch (_) {}
    }
    if (R.occupied(grid) === 0) {
      end(true);
      return;
    }
    if (grid.some((line, r) => r >= 11 && line.some(Boolean))) {
      end(false);
      return;
    }
    current = grid.some((row) => row.includes(next)) ? next : randomColor();
    next = randomColor();
    updateHud();
    draw();
  }
  function addPressureRow() {
    const row = Array.from(
      { length: COLS },
      () => COLORS[Math.floor(Math.random() * COLORS.length)],
    );
    R.addRow(grid, row);
    offset = 1 - offset;
    if (grid.length > ROWS) grid.pop();
    misses = 5;
  }
  function end(won) {
    active = false;
    paused = false;
    clearPointer();
    shot = null;
    $("resultButton").textContent = "PLAY AGAIN";
    $("resultTitle").textContent = won ? "GARDEN CLEAR" : "GARDEN OVERGROWN";
    $("resultText").textContent = won
      ? "ALL FLOWERS ARE BLOOMING"
      : "THE BUBBLES REACHED THE GROUND";
    $("resultOverlay").classList.add("show");
    $("resultButton").focus({ preventScroll: true });
    updateHud();
    draw();
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }
  function draw() {
    const p = palette();
    drawGarden(p);
    ctx.save();
    ctx.strokeStyle = p.muted;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(0, TOP + 11 * DY);
    ctx.lineTo(canvas.width, TOP + 11 * DY);
    ctx.stroke();
    ctx.restore();
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c]) {
          const pos = center(r, c);
          drawFlower(pos.x, pos.y, grid[r][c], 1, p);
        }
    if (active && !shot) {
      traceAim(p);
      drawFlower(240, 675, current, 1, p);
    }
    if (shot) drawFlower(shot.x, shot.y, shot.color, 1, p);
    drawShooter(p);
    clock += 1;
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (!active || paused || pointerId !== null) return;
    canvas.focus({ preventScroll: true });
    pointerId = event.pointerId;
    try {
      canvas.setPointerCapture?.(pointerId);
    } catch (_) {}
    aim = point(event);
    draw();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId || !active || paused) return;
    event.preventDefault();
    aim = point(event);
    draw();
  });
  canvas.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    aim = point(event);
    clearPointer();
    shoot();
  });
  function clearPointer() {
    const id = pointerId;
    pointerId = null;
    if (id !== null)
      try {
        canvas.releasePointerCapture?.(id);
      } catch (_) {}
  }
  canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerId === pointerId) clearPointer();
  });
  canvas.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === pointerId) pointerId = null;
  });
  function togglePause() {
    if (!active) return;
    paused = !paused;
    clearPointer();
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (paused) {
      $("resultTitle").textContent = "PAUSED";
      $("resultText").textContent = "THE GARDEN IS WAITING";
      $("resultButton").textContent = "RESUME";
      $("resultOverlay").classList.add("show");
      $("resultButton").focus({ preventScroll: true });
    } else {
      $("resultOverlay").classList.remove("show");
      canvas.focus({ preventScroll: true });
      lastFrame = performance.now();
      if (shot) frameId = requestAnimationFrame(animate);
    }
    updateHud();
    draw();
  }
  function installUtilities() {
    const dock = $("utilityDock");
    for (const selector of [".theme-toggle", ".clear-data-toggle"]) {
      const button = document.querySelector(selector);
      if (button) dock.appendChild(button);
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", installUtilities, {
      once: true,
    });
  else installUtilities();
  for (const type of ["contextmenu", "selectstart", "dragstart"])
    canvas.addEventListener(type, (event) => event.preventDefault());
  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (active && !paused && pointerId !== null) event.preventDefault();
    },
    { passive: false },
  );
  $("fireButton").addEventListener("click", shoot);
  $("pauseButton").addEventListener("click", togglePause);
  $("newButton").addEventListener("click", initialize);
  $("resultButton").addEventListener("click", () =>
    paused ? togglePause() : initialize(),
  );
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
      return;
    const target = event.target;
    if (
      target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName)
    )
      return;
    const key = event.code || event.key;
    if (key === "KeyP" || key === "Escape") {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (["Space", "Enter"].includes(key)) {
      if (["BUTTON", "A"].includes(target?.tagName)) return;
      event.preventDefault();
      if (!event.repeat) shoot();
      return;
    }
    if (
      !active ||
      paused ||
      !["ArrowLeft", "ArrowRight", "ArrowUp"].includes(key)
    )
      return;
    event.preventDefault();
    let v = normalizedAim(),
      angle =
        Math.atan2(-v.y, v.x) +
        (key === "ArrowLeft" ? 0.045 : key === "ArrowRight" ? -0.045 : 0);
    if (key === "ArrowUp") angle = Math.PI / 2;
    angle = Math.max(Math.PI / 12, Math.min((Math.PI * 11) / 12, angle));
    aim = { x: 240 + Math.cos(angle) * 400, y: 675 - Math.sin(angle) * 400 };
    draw();
  });
  function suspend() {
    if (active && !paused) togglePause();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
  });
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("resize", draw);
  document.addEventListener("themechange", () => {
    updateHud();
    draw();
  });
  window.BubbleGarden = Object.freeze({
    getSnapshot: () => ({
      state: active ? (paused ? "paused" : "playing") : "over",
      grid: grid.map((row) => row.slice()),
      current,
      next,
      score,
      best,
      misses,
      active,
      paused,
      offset,
      aim: { ...aim },
      shot: shot ? { ...shot } : null,
      pointerId,
      renderCount: clock,
      pendingFrame: frameId !== null,
    }),
    getPreview: preview,
  });
  initialize();
})();
