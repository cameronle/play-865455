(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const R = window.FlowRules;
  const LEVELS = window.FlowLevels.levels;
  const STORAGE_KEY = 'flow-progress-v1';

  const COLORS = [
    '#e98575', // coral ribbon
    '#8abf93', // mint ribbon
    '#80bdd8', // blue ribbon
    '#f2ca62', // yellow ribbon
    '#b8a7e8', // purple ribbon
    '#e69b52', // orange ribbon
    '#d47d95',
    '#75a9b8',
  ];

  const $ = id => document.getElementById(id);
  const ui = {
    packSelect: $('packSelect'),
    levelSelect: $('levelSelect'),
    flowStat: $('flowStat'),
    coverStat: $('coverStat'),
    winOverlay: $('winOverlay'),
    winTitle: $('winTitle'),
    winDetail: $('winDetail'),
    nextButton: $('nextButton'),
    levelsButton: $('levelsButton'),
    levelsOverlay: $('levelsOverlay'),
    levelGrid: $('levelGrid'),
    levelsProgress: $('levelsProgress'),
    closeLevels: $('closeLevels'),
    resetButton: $('resetButton'),
  };

  let currentPack = '5x5';
  let levelIndex = 0;
  let levelData = null;
  let paths = {}; // colorIndex -> array of {r, c}
  let activeDrag = null; // { color, pointerId }
  let autoNextTimer = 0;
  let startTime = Date.now();
  let progress = loadProgress();

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        completed: saved.completed || {}, // key: "5x5:0" -> true
        bestTimes: saved.bestTimes || {},
      };
    } catch (_) {
      return { completed: {}, bestTimes: {} };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (_) {}
  }

  function cellKey(r, c) { return `${r},${c}`; }

  function getLevelKey(pack, idx) { return `${pack}:${idx}`; }

  function isLevelUnlocked(pack, idx) {
    if (idx === 0) return true;
    return Boolean(progress.completed[getLevelKey(pack, idx - 1)]);
  }

  function loadLevel(pack, index) {
    currentPack = pack;
    levelIndex = Math.max(0, Math.min(LEVELS[pack].length - 1, index));
    levelData = LEVELS[pack][levelIndex];
    paths = {};
    activeDrag = null;
    autoNextTimer = 0;
    startTime = Date.now();
    ui.winOverlay.classList.add('hide');

    ui.packSelect.value = pack;
    populateLevelSelect();
    updateStats();
    draw();
  }

  function populateLevelSelect() {
    ui.levelSelect.replaceChildren();
    const count = LEVELS[currentPack].length;
    for (let i = 0; i < count; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      const done = progress.completed[getLevelKey(currentPack, i)] ? ' ✓' : '';
      opt.textContent = `${String(i + 1).padStart(2, '0')} / ${count}${done}`;
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
    ui.coverStat.textContent = `${Math.round(covered / totalCells * 100)}%`;
  }

  function checkWin() {
    if (!R.isLevelComplete(levelData, paths)) return;
    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const key = getLevelKey(currentPack, levelIndex);
    progress.completed[key] = true;
    progress.bestTimes[key] = Math.min(progress.bestTimes[key] || Infinity, elapsed);
    saveProgress();
    populateLevelSelect();

    autoNextTimer = 3.0;
    ui.winTitle.textContent = 'PERFECT FLOW';
    ui.winDetail.textContent = `100% COVERED · ${elapsed}S · AUTO NEXT IN 3S`;
    ui.nextButton.textContent = 'NEXT LEVEL (3S)';
    ui.winOverlay.classList.remove('hide');
    if (navigator.vibrate) navigator.vibrate(50);
  }

  function nextLevel() {
    autoNextTimer = 0;
    if (levelIndex < LEVELS[currentPack].length - 1) {
      loadLevel(currentPack, levelIndex + 1);
    } else {
      const packs = Object.keys(LEVELS);
      const nextPackIdx = packs.indexOf(currentPack) + 1;
      if (nextPackIdx < packs.length) {
        loadLevel(packs[nextPackIdx], 0);
      } else {
        loadLevel('5x5', 0);
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
      const idx = path.findIndex(p => R.sameCell(p, cell));
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
      const idx = path.findIndex(p => R.sameCell(p, cell));
      if (idx !== -1) {
        paths[color] = path.slice(0, idx);
      }
    }
  }

  function handleMove(cell) {
    if (!activeDrag || !cell || !levelData) return;
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
    if (!R.isAdjacent(head, cell)) return;

    // Check if cell is an endpoint of a different color
    const ep = R.getEndpoint(levelData, cell.r, cell.c);
    if (ep && ep.color !== color) return;

    // Loop back on own path
    const existingIdx = path.findIndex(p => R.sameCell(p, cell));
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
    const endEp = levelData.endpoints.find(e => e.color === color);
    if (endEp && R.isPathConnected(endEp, path)) {
      activeDrag = null;
      checkWin();
    }
  }

  function endDrag() {
    if (activeDrag) {
      activeDrag = null;
      checkWin();
      draw();
    }
  }

  function draw() {
    if (!levelData) return;
    const size = levelData.size;
    const cellSize = W / size;

    ctx.clearRect(0, 0, W, H);

    // Draw grid
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim() || '#1c2a38';
    ctx.lineWidth = 1;
    for (let i = 1; i < size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, H);
      ctx.moveTo(0, i * cellSize); ctx.lineTo(W, i * cellSize);
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
      ctx.shadowBlur = 5;
      ctx.lineWidth = cellSize * 0.38;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].c * cellSize + cellSize / 2, path[0].r * cellSize + cellSize / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].c * cellSize + cellSize / 2, path[i].r * cellSize + cellSize / 2);
      }
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

        if (isConnected) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
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
      const isDone = progress.completed[getLevelKey(currentPack, i)];
      const best = progress.bestTimes[getLevelKey(currentPack, i)];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card';
      card.classList.toggle('completed', isDone);
      card.classList.toggle('current', i === levelIndex);
      card.disabled = !unlocked;
      card.innerHTML = `<span class="level-num">LEVEL ${String(i + 1).padStart(2, '0')}</span><span class="level-status">${unlocked ? (isDone ? `${best}S ✓` : 'PLAY') : 'LOCKED'}</span>`;
      if (unlocked) {
        card.addEventListener('click', () => {
          loadLevel(currentPack, i);
          closeLevels();
        });
      }
      ui.levelGrid.appendChild(card);
    });
  }

  function openLevels() {
    renderLevelGrid();
    ui.levelsOverlay.classList.add('show');
    ui.levelsOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeLevels() {
    ui.levelsOverlay.classList.remove('show');
    ui.levelsOverlay.setAttribute('aria-hidden', 'true');
  }

  // Pointer listeners
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const cell = getCellFromCoords(e.clientX, e.clientY);
    if (cell) {
      startDrag(cell, e.pointerId);
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!activeDrag || activeDrag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const cell = getCellFromCoords(e.clientX, e.clientY);
    if (cell) handleMove(cell);
  });

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // UI Event listeners
  ui.packSelect.addEventListener('change', () => loadLevel(ui.packSelect.value, 0));
  ui.levelSelect.addEventListener('change', () => loadLevel(currentPack, Number(ui.levelSelect.value)));
  ui.resetButton.addEventListener('click', () => {
    paths = {};
    updateStats();
    draw();
  });
  ui.nextButton.addEventListener('click', nextLevel);
  ui.levelsButton.addEventListener('click', openLevels);
  ui.closeLevels.addEventListener('click', closeLevels);
  ui.levelsOverlay.addEventListener('click', e => {
    if (e.target === ui.levelsOverlay) closeLevels();
  });

  // Auto-advance loop
  let lastTime = performance.now();
  function loop(time) {
    const dt = Math.min(0.1, (time - lastTime) / 1000);
    lastTime = time;

    if (autoNextTimer > 0 && !ui.levelsOverlay.classList.contains('show')) {
      autoNextTimer -= dt;
      const secs = Math.max(1, Math.ceil(autoNextTimer));
      ui.nextButton.textContent = `NEXT LEVEL (${secs}S)`;
      if (autoNextTimer <= 0) nextLevel();
    }

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  document.addEventListener('themechange', draw);

  loadLevel('5x5', 0);

  window.FlowGame = {
    loadLevel,
    getSnapshot: () => ({ currentPack, levelIndex, completedCount: Object.keys(progress.completed).length }),
    paths,
  };
})();
