(() => {
  "use strict";

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const R = window.FlowRules;
  const LEVELS = window.FlowLevels.levels;
  const STORAGE_KEY = "flow-progress-v1";

  const COLORS = [
    "#e98575", // coral ribbon
    "#8abf93", // mint ribbon
    "#80bdd8", // blue ribbon
    "#f2ca62", // yellow ribbon
    "#b8a7e8", // purple ribbon
    "#e69b52", // orange ribbon
    "#d47d95",
    "#75a9b8",
  ];

  const $ = (id) => document.getElementById(id);
  const ui = {
    packSelect: $("packSelect"),
    levelSelect: $("levelSelect"),
    flowStat: $("flowStat"),
    coverStat: $("coverStat"),
    winOverlay: $("winOverlay"),
    winTitle: $("winTitle"),
    winDetail: $("winDetail"),
    nextButton: $("nextButton"),
    levelsButton: $("levelsButton"),
    levelsOverlay: $("levelsOverlay"),
    levelGrid: $("levelGrid"),
    levelsProgress: $("levelsProgress"),
    closeLevels: $("closeLevels"),
    resetButton: $("resetButton"),
  };

  let currentPack = "5x5";
  let levelIndex = 0;
  let levelData = null;
  let paths = {}; // colorIndex -> array of {r, c}
  let activeDrag = null; // { color, pointerId }
  let autoNextTimer = 0;
  let startTime = Date.now();
  let progress = loadProgress();
  let clearing = false;
  let paused = false,
    won = false,
    elapsedBefore = 0,
    autoNextJob = null,
    countdownAt = 0;
  let resumeAfterAlbum = false;
  let cursor = { r: 0, c: 0 },
    showCursor = false;
  ui.pauseOverlay = $("pauseOverlay");
  ui.pauseButton = $("pauseButton");
  ui.resumeButton = $("resumeButton");
  function elapsedSeconds() {
    return (
      elapsedBefore +
      (paused || won ? 0 : Math.max(0, Date.now() - startTime) / 1000)
    );
  }
  function stopCountdown() {
    if (autoNextJob !== null) clearInterval(autoNextJob);
    autoNextJob = null;
  }
  function updateCountdown() {
    const secs = Math.max(1, Math.ceil(autoNextTimer));
    ui.nextButton.textContent = `NEXT CARD (${secs}S)`;
    ui.winDetail.textContent = `100% COVERED · ${Math.max(1, Math.round(elapsedBefore))}S · AUTO NEXT IN ${secs}S`;
  }
  function startCountdown() {
    stopCountdown();
    if (paused || !won || document.hidden || autoNextTimer <= 0) return;
    countdownAt = Date.now();
    autoNextJob = setInterval(() => {
      const now = Date.now();
      autoNextTimer -= Math.max(0, now - countdownAt) / 1000;
      countdownAt = now;
      if (autoNextTimer <= 0) nextLevel();
      else updateCountdown();
    }, 100);
  }
  function pauseGame() {
    if (paused) return;
    if (!won) elapsedBefore = elapsedSeconds();
    paused = true;
    endDrag();
    stopCountdown();
    ui.pauseOverlay?.classList.remove("hide");
    if (ui.pauseButton) ui.pauseButton.textContent = "RESUME";
    ui.resumeButton?.focus();
  }
  function resumeGame() {
    if (
      !paused ||
      document.hidden ||
      ui.levelsOverlay.classList.contains("show")
    )
      return;
    paused = false;
    startTime = Date.now();
    ui.pauseOverlay?.classList.add("hide");
    if (ui.pauseButton) ui.pauseButton.textContent = "PAUSE";
    canvas.focus();
    startCountdown();
    draw();
  }
  ui.pauseButton?.addEventListener("click", () =>
    paused ? resumeGame() : pauseGame(),
  );
  ui.resumeButton?.addEventListener("click", resumeGame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resumeAfterAlbum = false;
      pauseGame();
    }
  });
  window.addEventListener("blur", () => {
    resumeAfterAlbum = false;
    pauseGame();
  });
  window.addEventListener("pagehide", pauseGame);
  window.addEventListener("game-data-clearing", () => {
    clearing = true;
    pauseGame();
  });

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const clean = { completed: {}, bestTimes: {}, drafts: {}, last: null };
      for (const [pack, levels] of Object.entries(LEVELS))
        levels.forEach((_, i) => {
          const key = getLevelKey(pack, i);
          if (saved?.completed?.[key] === true) clean.completed[key] = true;
          const t = saved?.bestTimes?.[key];
          if (Number.isSafeInteger(t) && t > 0) clean.bestTimes[key] = t;
          const draft = saved?.drafts?.[key];
          const normalized = draft && R.normalizePaths(levels[i], draft.paths);
          if (
            normalized &&
            Number.isFinite(draft.elapsed) &&
            draft.elapsed >= 0 &&
            draft.elapsed <= Number.MAX_SAFE_INTEGER &&
            !R.isLevelComplete(levels[i], normalized)
          )
            clean.drafts[key] = { paths: normalized, elapsed: draft.elapsed };
        });
      const last = saved?.last;
      if (
        last &&
        Object.hasOwn(LEVELS, last.pack) &&
        Number.isInteger(last.index) &&
        last.index >= 0 &&
        last.index < LEVELS[last.pack].length
      )
        clean.last = { pack: last.pack, index: last.index };
      return clean;
    } catch (_) {
      return { completed: {}, bestTimes: {}, drafts: {}, last: null };
    }
  }

  function checkpoint() {
    if (!levelData) return;
    const key = getLevelKey(currentPack, levelIndex);
    if (won) delete progress.drafts[key];
    else
      progress.drafts[key] = {
        paths: JSON.parse(JSON.stringify(paths)),
        elapsed: elapsedSeconds(),
      };
    progress.last = { pack: currentPack, index: levelIndex };
    saveProgress();
  }

  function saveProgress() {
    if (clearing) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (_) {}
  }

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  function getLevelKey(pack, idx) {
    return `${pack}:${idx}`;
  }

  function isLevelUnlocked(pack, idx) {
    return (
      Object.hasOwn(LEVELS, pack) &&
      Number.isInteger(idx) &&
      idx >= 0 &&
      idx < LEVELS[pack].length
    );
  }

  function loadLevel(pack, index, fresh = false) {
    if (
      !Object.hasOwn(LEVELS, pack) ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= LEVELS[pack].length
    )
      return false;
    if (levelData) {
      endDrag();
      checkpoint();
    }
    if (fresh) delete progress.drafts[getLevelKey(pack, index)];
    stopCountdown();
    paused = false;
    won = false;
    elapsedBefore = 0;
    ui.pauseOverlay?.classList.add("hide");
    if (ui.pauseButton) ui.pauseButton.textContent = "PAUSE";
    currentPack = pack;
    levelIndex = Math.max(0, Math.min(LEVELS[pack].length - 1, index));
    levelData = LEVELS[pack][levelIndex];
    cursor = {
      r: levelData.endpoints[0].start[0],
      c: levelData.endpoints[0].start[1],
    };
    const draft = progress.drafts[getLevelKey(pack, levelIndex)];
    paths = draft ? JSON.parse(JSON.stringify(draft.paths)) : {};
    elapsedBefore = draft?.elapsed || 0;
    activeDrag = null;
    autoNextTimer = 0;
    startTime = Date.now();
    ui.winOverlay.classList.add("hide");

    ui.packSelect.value = pack;
    populateLevelSelect();
    updateStats();
    draw();
    checkpoint();
  }

  function populateLevelSelect() {
    ui.levelSelect.replaceChildren();
    const count = LEVELS[currentPack].length;
    for (let i = 0; i < count; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      const done = progress.completed[getLevelKey(currentPack, i)] ? " ✓" : "";
      opt.textContent = `${String(i + 1).padStart(2, "0")} / ${count}${done}`;
      ui.levelSelect.appendChild(opt);
    }
    ui.levelSelect.value = String(levelIndex);
  }

  function countConnectedFlows() {
    if (!levelData) return 0;
    let count = 0;
    for (const ep of levelData.endpoints) {
      if (R.isPathConnected(ep, paths[ep.color])) count++;
    }
    return count;
  }

  function countCoveredCells() {
    const covered = new Set();
    for (const color in paths) {
      for (const cell of paths[color] || []) {
        covered.add(cellKey(cell.r, cell.c));
      }
    }
    return covered.size;
  }

  function updateStats() {
    if (!levelData) return;
    const flows = countConnectedFlows();
    const totalFlows = levelData.endpoints.length;
    ui.flowStat.textContent = `${flows} / ${totalFlows}`;
    const covered = countCoveredCells();
    const totalCells = levelData.size * levelData.size;
    ui.coverStat.textContent = `${Math.round((covered / totalCells) * 100)}%`;
  }

  function checkWin() {
    if (won || paused || !R.isLevelComplete(levelData, paths)) return;
    elapsedBefore = elapsedSeconds();
    won = true;
    const elapsed = Math.max(1, Math.round(elapsedBefore));
    const key = getLevelKey(currentPack, levelIndex);
    progress.completed[key] = true;
    delete progress.drafts[key];
    progress.bestTimes[key] = Math.min(
      progress.bestTimes[key] || Infinity,
      elapsed,
    );
    saveProgress();
    populateLevelSelect();

    autoNextTimer = 3.0;
    ui.winTitle.textContent = "PERFECT FLOW";
    ui.winDetail.textContent = `100% COVERED · ${elapsed}S · AUTO NEXT IN 3S`;
    ui.nextButton.textContent = "NEXT LEVEL (3S)";
    ui.winOverlay.classList.remove("hide");
    startCountdown();
    ui.nextButton.focus();
    try {
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (_) {}
  }

  function nextLevel() {
    stopCountdown();
    autoNextTimer = 0;
    if (levelIndex < LEVELS[currentPack].length - 1) {
      loadLevel(currentPack, levelIndex + 1);
    } else {
      const packs = Object.keys(LEVELS);
      const nextPackIdx = packs.indexOf(currentPack) + 1;
      if (nextPackIdx < packs.length) {
        loadLevel(packs[nextPackIdx], 0);
      } else {
        loadLevel("5x5", 0);
      }
    }
  }

  function getCellFromCoords(x, y) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (x - rect.left) * scaleX;
    const py = (y - rect.top) * scaleY;
    const size = levelData.size;
    const cellSize = W / size;
    const c = Math.floor(px / cellSize);
    const r = Math.floor(py / cellSize);
    if (r >= 0 && r < size && c >= 0 && c < size) return { r, c };
    return null;
  }

  function startDrag(cell, pointerId) {
    if (!cell || !levelData) return;
    const ep = R.getEndpoint(levelData, cell.r, cell.c);
    if (ep) {
      activeDrag = { color: ep.color, pointerId };
      paths[ep.color] = [{ r: cell.r, c: cell.c }];
      cutOtherPaths(ep.color, cell);
      updateStats();
      draw();
      return;
    }

    for (const color in paths) {
      const path = paths[color];
      const idx = path.findIndex((p) => R.sameCell(p, cell));
      if (idx !== -1) {
        activeDrag = { color: Number(color), pointerId };
        paths[color] = path.slice(0, idx + 1);
        updateStats();
        draw();
        return;
      }
    }
  }

  function cutOtherPaths(currentColor, cell) {
    for (const color in paths) {
      if (Number(color) === currentColor) continue;
      const path = paths[color];
      const idx = path.findIndex((p) => R.sameCell(p, cell));
      if (idx !== -1) {
        paths[color] = path.slice(0, idx);
      }
    }
  }

  function handleMove(cell) {
    if (paused || won || !activeDrag || !cell || !levelData) return;
    const color = activeDrag.color;
    const path = paths[color];
    if (!path || path.length === 0) return;
    const head = path[path.length - 1];

    if (R.sameCell(head, cell)) return;

    // Retract if backtracking
    if (path.length >= 2 && R.sameCell(path[path.length - 2], cell)) {
      path.pop();
      updateStats();
      draw();
      return;
    }

    // Must be adjacent
    if (!R.isAdjacent(head, cell)) {
      if (head.r !== cell.r && head.c !== cell.c) return;
      const dr = Math.sign(cell.r - head.r),
        dc = Math.sign(cell.c - head.c);
      const steps = Math.abs(cell.r - head.r) + Math.abs(cell.c - head.c);
      for (let i = 1; i <= steps && activeDrag; i++) {
        const next = { r: head.r + dr * i, c: head.c + dc * i };
        const before = paths[color][paths[color].length - 1];
        handleMove(next);
        if (R.sameCell(before, paths[color][paths[color].length - 1])) break;
      }
      return;
    }

    // Check if cell is an endpoint of a different color
    const ep = R.getEndpoint(levelData, cell.r, cell.c);
    if (ep && ep.color !== color) return;

    // Loop back on own path
    const existingIdx = path.findIndex((p) => R.sameCell(p, cell));
    if (existingIdx !== -1) {
      paths[color] = path.slice(0, existingIdx + 1);
      updateStats();
      draw();
      return;
    }

    // Cut any other color crossing this cell
    cutOtherPaths(color, cell);
    path.push({ r: cell.r, c: cell.c });
    updateStats();
    draw();

    // If reached matching target endpoint, end dragging for this path
    const endEp = levelData.endpoints.find((e) => e.color === color);
    if (endEp && R.isPathConnected(endEp, path)) {
      endDrag();
    }
  }

  function endDrag() {
    if (activeDrag) {
      const id = activeDrag.pointerId;
      activeDrag = null;
      try {
        if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      } catch (_) {}
      checkWin();
      draw();
    }
    checkpoint();
  }

  function draw() {
    if (!levelData) return;
    const size = levelData.size;
    const cellSize = W / size;

    ctx.clearRect(0, 0, W, H);

    if (showCursor) {
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--panel")
        .trim();
      ctx.fillRect(
        cursor.c * cellSize,
        cursor.r * cellSize,
        cellSize,
        cellSize,
      );
    }

    // Draw grid
    ctx.strokeStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--grid-line")
        .trim() || "#1c2a38";
    ctx.lineWidth = 1;
    for (let i = 1; i < size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, H);
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(W, i * cellSize);
      ctx.stroke();
    }

    // Draw paths
    for (const colorStr in paths) {
      const colorIdx = Number(colorStr);
      const path = paths[colorStr];
      if (!path || path.length < 2) continue;
      const color = COLORS[colorIdx % COLORS.length];

      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 0;
      ctx.lineWidth = cellSize * 0.38;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(
        path[0].c * cellSize + cellSize / 2,
        path[0].r * cellSize + cellSize / 2,
      );
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(
          path[i].c * cellSize + cellSize / 2,
          path[i].r * cellSize + cellSize / 2,
        );
      }
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue("--ink")
        .trim();
      ctx.lineWidth += cellSize * 0.05;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = cellSize * 0.38;
      ctx.stroke();
      ctx.restore();
    }

    // Draw endpoints
    for (const ep of levelData.endpoints) {
      const color = COLORS[ep.color % COLORS.length];
      const isConnected = R.isPathConnected(ep, paths[ep.color]);
      const radius = cellSize * 0.34;

      for (const [r, c] of [ep.start, ep.end]) {
        const cx = c * cellSize + cellSize / 2;
        const cy = r * cellSize + cellSize / 2;

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = getComputedStyle(document.documentElement)
          .getPropertyValue("--ink")
          .trim();
        ctx.lineWidth = cellSize * (isConnected ? 0.06 : 0.035);
        ctx.stroke();
        ctx.fillStyle = getComputedStyle(document.documentElement)
          .getPropertyValue("--ribbon-label")
          .trim();
        ctx.font = `800 ${cellSize * 0.25}px system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(ep.color + 1), cx, cy);
        ctx.restore();
      }
    }
  }

  function renderLevelGrid() {
    ui.levelGrid.replaceChildren();
    let completedTotal = 0;
    let totalLevels = 0;

    for (const pack in LEVELS) {
      totalLevels += LEVELS[pack].length;
      LEVELS[pack].forEach((_, i) => {
        if (progress.completed[getLevelKey(pack, i)]) completedTotal++;
      });
    }
    ui.levelsProgress.textContent = `${completedTotal} / ${totalLevels} COMPLETE`;

    const packLevels = LEVELS[currentPack];
    packLevels.forEach((_, i) => {
      const unlocked = isLevelUnlocked(currentPack, i);
      const isDone = progress.completed[getLevelKey(currentPack, i)] === true;
      const best = progress.bestTimes[getLevelKey(currentPack, i)];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card";
      card.classList.toggle("completed", isDone);
      card.classList.toggle("current", i === levelIndex);
      card.disabled = !unlocked;
      const number = document.createElement("span");
      number.className = "level-num";
      number.textContent = `LEVEL ${String(i + 1).padStart(2, "0")}`;
      const status = document.createElement("span");
      status.className = "level-status";
      status.textContent = isDone
        ? best
          ? `${best}S ✓`
          : "COMPLETE ✓"
        : "PLAY";
      card.appendChild(number);
      card.appendChild(status);
      if (unlocked) {
        card.addEventListener("click", () => {
          loadLevel(currentPack, i);
          closeLevels();
        });
      }
      ui.levelGrid.appendChild(card);
    });
  }

  function openLevels() {
    resumeAfterAlbum = !paused;
    pauseGame();
    renderLevelGrid();
    ui.levelsOverlay.classList.add("show");
    ui.levelsOverlay.setAttribute("aria-hidden", "false");
    const page = $("gamePage");
    if (page) page.inert = true;
    ui.closeLevels.focus();
  }

  function closeLevels() {
    ui.levelsOverlay.classList.remove("show");
    ui.levelsOverlay.setAttribute("aria-hidden", "true");
    const page = $("gamePage");
    if (page) page.inert = false;
    if (resumeAfterAlbum) resumeGame();
    ui.levelsButton.focus();
  }

  canvas.addEventListener("focus", () => {
    showCursor = true;
    draw();
  });
  canvas.addEventListener("blur", () => {
    showCursor = false;
    if (activeDrag?.pointerId === "keyboard") endDrag();
    draw();
  });
  canvas.addEventListener("keydown", (e) => {
    if (
      paused ||
      won ||
      ui.levelsOverlay.classList.contains("show") ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    const steps = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (steps[e.key]) {
      e.preventDefault();
      const [dr, dc] = steps[e.key];
      cursor = {
        r: Math.max(0, Math.min(levelData.size - 1, cursor.r + dr)),
        c: Math.max(0, Math.min(levelData.size - 1, cursor.c + dc)),
      };
      if (activeDrag?.pointerId === "keyboard") handleMove(cursor);
      draw();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (e.repeat) return;
      if (activeDrag?.pointerId === "keyboard") endDrag();
      else if (!activeDrag) startDrag(cursor, "keyboard");
    } else if (e.key === "Escape" && activeDrag?.pointerId === "keyboard") {
      e.preventDefault();
      endDrag();
    }
    const ep = R.getEndpoint(levelData, cursor.r, cursor.c);
    const status = $("statusText");
    if (status)
      status.textContent = `Row ${cursor.r + 1}, column ${cursor.c + 1}${ep ? `, ribbon ${ep.color + 1}` : ""}. ${ui.flowStat.textContent} ribbons connected.`;
  });
  for (const type of ["contextmenu", "selectstart", "dragstart"])
    canvas.addEventListener(type, (e) => e.preventDefault());

  // Pointer listeners
  canvas.addEventListener("pointerdown", (e) => {
    if (
      paused ||
      document.hidden ||
      e.isPrimary === false ||
      e.button !== 0 ||
      activeDrag ||
      !ui.winOverlay.classList.contains("hide") ||
      ui.levelsOverlay.classList.contains("show")
    )
      return;
    e.preventDefault();
    const cell = getCellFromCoords(e.clientX, e.clientY);
    if (cell) {
      startDrag(cell, e.pointerId);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const cell = getCellFromCoords(e.clientX, e.clientY);
    if (cell) handleMove(cell);
  });

  function releaseOwnedPointer(e) {
    if (activeDrag && activeDrag.pointerId !== e.pointerId) return;
    endDrag();
    try {
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }
  canvas.addEventListener("pointerup", releaseOwnedPointer);
  canvas.addEventListener("pointercancel", releaseOwnedPointer);
  canvas.addEventListener("lostpointercapture", releaseOwnedPointer);

  // UI Event listeners
  ui.packSelect.addEventListener("change", () =>
    loadLevel(ui.packSelect.value, 0),
  );
  ui.levelSelect.addEventListener("change", () =>
    loadLevel(currentPack, Number(ui.levelSelect.value)),
  );
  ui.resetButton.addEventListener("click", () =>
    loadLevel(currentPack, levelIndex, true),
  );
  ui.nextButton.addEventListener("click", nextLevel);
  ui.levelsButton.addEventListener("click", openLevels);
  ui.closeLevels.addEventListener("click", closeLevels);
  ui.levelsOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLevels();
      return;
    }
    if (e.key !== "Tab") return;
    const buttons = [
      ...ui.levelsOverlay.querySelectorAll("button:not(:disabled)"),
    ];
    const first = buttons[0],
      last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  ui.levelsOverlay.addEventListener("click", (e) => {
    if (e.target === ui.levelsOverlay) closeLevels();
  });

  function fitBoard() {
    const page = $("gamePage"),
      frame = document.querySelector(".frame");
    if (!page || !frame) return;
    const width = window.innerWidth,
      height = window.visualViewport?.height || window.innerHeight;
    let available;
    if (width >= 540 && height <= 520)
      available = Math.min(height - 28, width - 274);
    else {
      const style = getComputedStyle(page);
      let chrome =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + 12;
      for (const selector of [
        ".topbar",
        ".toolbar",
        "footer",
        ".utility-dock",
      ]) {
        const el = page.querySelector(selector);
        if (!el) continue;
        const s = getComputedStyle(el);
        if (s.display !== "none")
          chrome +=
            el.getBoundingClientRect().height +
            parseFloat(s.marginTop) +
            parseFloat(s.marginBottom);
      }
      available = Math.min(
        page.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        height - chrome,
      );
    }
    frame.style.setProperty(
      "--board-size",
      `${Math.max(112, Math.floor(Math.min(480, available)))}px`,
    );
  }
  function dockUtilities() {
    const dock = $("utilityDock"),
      clear = document.querySelector(".clear-data-toggle");
    if (dock && clear) dock.appendChild(clear);
    fitBoard();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", dockUtilities, {
      once: true,
    });
  else dockUtilities();
  window.addEventListener("resize", fitBoard);
  window.visualViewport?.addEventListener("resize", fitBoard);
  document.addEventListener("themechange", () => {
    draw();
    fitBoard();
  });

  loadLevel(progress.last?.pack || "5x5", progress.last?.index || 0);

  window.FlowGame = {
    loadLevel,
    getSnapshot: () => ({
      currentPack,
      levelIndex,
      completedCount: Object.keys(progress.completed).length,
      paths: JSON.parse(JSON.stringify(paths)),
      activeDrag: activeDrag ? { ...activeDrag } : null,
      autoNextTimer,
      paused,
      won,
      cursor: { ...cursor },
      elapsedSeconds: elapsedSeconds(),
    }),
    get paths() {
      return JSON.parse(JSON.stringify(paths));
    },
  };
})();
