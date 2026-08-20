(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const R = window.BridgesRules;
  const LEVELS = window.BridgesLevels.levels;
  const STORAGE_KEY = 'bridges-progress-v1';

  const $ = id => document.getElementById(id);
  const ui = {
    packSelect: $('packSelect'),
    levelSelect: $('levelSelect'),
    bridgeStat: $('bridgeStat'),
    islandStat: $('islandStat'),
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

  let currentPack = '4x4';
  let levelIndex = 0;
  let levelData = null;
  let bridges = {}; // "u-v" -> count (1 or 2)
  let selectedIsland = null;
  let dragStart = null;
  let dragCurrent = null;
  let history = [];
  let autoNextTimer = 0;
  let startTime = Date.now();
  let progress = loadProgress();

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        completed: saved.completed || {},
        bestTimes: saved.bestTimes || {},
      };
    } catch (_) {
      return { completed: {}, bestTimes: {} };
    }
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch (_) {}
  }

  function getLevelKey(pack, idx) { return `${pack}:${idx}`; }

  function isLevelUnlocked(pack, idx) {
    if (idx === 0) return true;
    return Boolean(progress.completed[getLevelKey(pack, idx - 1)]);
  }

  function loadLevel(pack, index) {
    currentPack = pack;
    levelIndex = Math.max(0, Math.min(LEVELS[pack].length - 1, index));
    levelData = LEVELS[pack][levelIndex];
    bridges = {};
    selectedIsland = null;
    dragStart = null;
    dragCurrent = null;
    history = [];
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

  function updateStats() {
    if (!levelData) return;
    let totalBridges = 0;
    for (const k in bridges) totalBridges += bridges[k] || 0;
    ui.bridgeStat.textContent = String(totalBridges);

    let satisfied = 0;
    for (const isl of levelData.islands) {
      if (R.getIslandDegree(isl.id, bridges) === isl.count) satisfied++;
    }
    ui.islandStat.textContent = `${satisfied} / ${levelData.islands.length}`;
  }

  function checkWin() {
    if (!R.isLevelComplete(levelData, bridges)) return;
    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const key = getLevelKey(currentPack, levelIndex);
    progress.completed[key] = true;
    progress.bestTimes[key] = Math.min(progress.bestTimes[key] || Infinity, elapsed);
    saveProgress();
    populateLevelSelect();

    autoNextTimer = 3.0;
    ui.winTitle.textContent = 'NETWORK COMPLETE';
    ui.winDetail.textContent = `ALL ISLANDS CONNECTED · ${elapsed}S · AUTO NEXT IN 3S`;
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
        loadLevel('4x4', 0);
      }
    }
  }

  function getIslandCenter(isl) {
    const padX = W / (levelData.cols * 2);
    const padY = H / (levelData.rows * 2);
    const stepX = W / levelData.cols;
    const stepY = H / levelData.rows;
    return {
      x: isl.c * stepX + padX,
      y: isl.r * stepY + padY,
    };
  }

  function getIslandRadius() {
    const minStep = Math.min(W / levelData.cols, H / levelData.rows);
    return minStep * 0.32;
  }

  function getIslandAtCoords(x, y) {
    if (!levelData) return null;
    const rect = canvas.getBoundingClientRect();
    const px = (x - rect.left) * (W / rect.width);
    const py = (y - rect.top) * (H / rect.height);
    const radius = getIslandRadius() * 1.35; // slightly generous hit target

    for (const isl of levelData.islands) {
      const pt = getIslandCenter(isl);
      const dist = Math.hypot(px - pt.x, py - pt.y);
      if (dist <= radius) return isl;
    }
    return null;
  }

  function toggleBridge(islA, islB) {
    if (!islA || !islB || islA.id === islB.id) return;
    const validNeighbors = R.findValidNeighbors(levelData, islA.id);
    if (!validNeighbors.some(n => n.id === islB.id)) return;

    const key = R.edgeKey(islA.id, islB.id);
    const current = bridges[key] || 0;
    const next = (current + 1) % 3;

    // Check crossing if adding bridge
    if (next > 0) {
      for (const k in bridges) {
        if (k !== key && bridges[k] > 0) {
          const [u, v] = k.split('-').map(Number);
          const oA = levelData.islands.find(i => i.id === u);
          const oB = levelData.islands.find(i => i.id === v);
          if (R.bridgesCross(islA, islB, oA, oB)) return; // blocked by crossing
        }
      }
    }

    if (next === 0) delete bridges[key];
    else bridges[key] = next;

    updateStats();
    draw();
    checkWin();
  }

  function draw() {
    if (!levelData) return;
    ctx.clearRect(0, 0, W, H);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const radius = getIslandRadius();

    // 1. Draw Bridges
    for (const key in bridges) {
      const count = bridges[key];
      if (!count) continue;
      const [u, v] = key.split('-').map(Number);
      const islA = levelData.islands.find(i => i.id === u);
      const islB = levelData.islands.find(i => i.id === v);
      if (!islA || !islB) continue;

      const ptA = getIslandCenter(islA);
      const ptB = getIslandCenter(islB);
      const isH = islA.r === islB.r;

      ctx.save();
      ctx.strokeStyle = isDark ? '#69c6ff' : '#0288d1';
      ctx.lineWidth = Math.max(2.5, radius * 0.18);
      ctx.lineCap = 'round';

      if (count === 1) {
        ctx.beginPath();
        ctx.moveTo(ptA.x, ptA.y); ctx.lineTo(ptB.x, ptB.y);
        ctx.stroke();
      } else if (count === 2) {
        const offset = Math.max(4, radius * 0.28);
        if (isH) {
          ctx.beginPath();
          ctx.moveTo(ptA.x, ptA.y - offset); ctx.lineTo(ptB.x, ptB.y - offset);
          ctx.moveTo(ptA.x, ptA.y + offset); ctx.lineTo(ptB.x, ptB.y + offset);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(ptA.x - offset, ptA.y); ctx.lineTo(ptB.x - offset, ptB.y);
          ctx.moveTo(ptA.x + offset, ptA.y); ctx.lineTo(ptB.x + offset, ptB.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 2. Draw active drag line
    if (dragStart && dragCurrent) {
      const ptA = getIslandCenter(dragStart);
      ctx.save();
      ctx.strokeStyle = '#ffe9a3';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(ptA.x, ptA.y);
      ctx.lineTo(dragCurrent.x, dragCurrent.y);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Islands
    for (const isl of levelData.islands) {
      const pt = getIslandCenter(isl);
      const deg = R.getIslandDegree(isl.id, bridges);
      const isSelected = selectedIsland && selectedIsland.id === isl.id;
      const isSatisfied = deg === isl.count;
      const isOver = deg > isl.count;

      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = isDark ? '#2a2818' : '#fff3cd';
        ctx.strokeStyle = '#ffbe0b';
        ctx.lineWidth = 3.5;
      } else if (isOver) {
        ctx.fillStyle = isDark ? '#381519' : '#f8d7da';
        ctx.strokeStyle = isDark ? '#ff7088' : '#e63946';
        ctx.lineWidth = 2.5;
      } else if (isSatisfied) {
        ctx.fillStyle = isDark ? '#123024' : '#d1e7dd';
        ctx.strokeStyle = isDark ? '#73f0b0' : '#38b000';
        ctx.lineWidth = 2.5;
      } else {
        ctx.fillStyle = isDark ? '#152230' : '#e2dbcd';
        ctx.strokeStyle = isDark ? '#3d5166' : '#a89c89';
        ctx.lineWidth = 2;
      }

      ctx.fill();
      ctx.stroke();

      // Island count number
      ctx.fillStyle = isOver ? (isDark ? '#ff7088' : '#e63946') : (isSatisfied ? (isDark ? '#73f0b0' : '#38b000') : (isDark ? '#e8f0f7' : '#3e3934'));
      ctx.font = `bold ${Math.round(radius * 1.05)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(isl.count), pt.x, pt.y + 1);
      ctx.restore();
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

  // Pointer interaction
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const isl = getIslandAtCoords(e.clientX, e.clientY);
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);

    if (isl) {
      if (selectedIsland && selectedIsland.id !== isl.id) {
        toggleBridge(selectedIsland, isl);
        selectedIsland = null;
        dragStart = null;
      } else {
        selectedIsland = isl;
        dragStart = isl;
        dragCurrent = { x: px, y: py };
      }
    } else {
      selectedIsland = null;
      dragStart = null;
      dragCurrent = null;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    draw();
  });

  canvas.addEventListener('pointermove', e => {
    if (!dragStart) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    dragCurrent = {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    };
    draw();
  });

  canvas.addEventListener('pointerup', e => {
    if (dragStart) {
      const targetIsl = getIslandAtCoords(e.clientX, e.clientY);
      if (targetIsl && targetIsl.id !== dragStart.id) {
        toggleBridge(dragStart, targetIsl);
        selectedIsland = null;
      }
      dragStart = null;
      dragCurrent = null;
      draw();
    }
  });

  canvas.addEventListener('pointercancel', () => {
    dragStart = null;
    dragCurrent = null;
    draw();
  });

  // UI Event listeners
  ui.packSelect.addEventListener('change', () => loadLevel(ui.packSelect.value, 0));
  ui.levelSelect.addEventListener('change', () => loadLevel(currentPack, Number(ui.levelSelect.value)));
  ui.resetButton.addEventListener('click', () => {
    bridges = {};
    selectedIsland = null;
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

  loadLevel('4x4', 0);

  window.BridgesGame = {
    loadLevel,
    getSnapshot: () => ({ currentPack, levelIndex, completedCount: Object.keys(progress.completed).length }),
    bridges,
  };
})();
