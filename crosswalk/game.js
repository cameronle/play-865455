(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const COLS = 9;
  const ROWS = 12;
  const CELL = W / COLS;
  const CELL_H = H / ROWS;
  const R = window.CrosswalkRules;
  const LEVELS = window.CrosswalkLevels.levels;
  const MAX_LEVEL = LEVELS.length;
  const BASE_SAFE_ROWS = R.BASE_SAFE_ROWS;
  const PROGRESS_KEY = 'crosswalk-progress-v2';
  const CAR_SPEED = 62;
  const palettes = ['#ff7088', '#ffb45c', '#73f0b0', '#69c6ff', '#c894ff'];

  const $ = id => document.getElementById(id);
  const ui = {
    score: $('score'),
    level: $('level'),
    chapter: $('chapter'),
    lives: $('lives'),
    overlay: $('overlay'),
    title: $('overlayTitle'),
    text: $('overlayText'),
    start: $('startButton'),
    pause: $('pauseButton'),
    levelsButton: $('levelsButton'),
    levelsOverlay: $('levelsOverlay'),
    levelGrid: $('levelGrid'),
    levelsProgress: $('levelsProgress'),
    closeLevels: $('closeLevels'),
  };

  let lanes = [];
  let paletteCache = null;
  let activeLevel = LEVELS[0];
  let player;
  let score = 0;
  let levelStartScore = 0, levelDeaths = 0, furthestRow = 11;
  let level = 1;
  let levelIndex = 0;
  let lives = 3;
  let state = 'title';
  let overlayAction = 'start';
  const FIXED_STEP = 1 / 120;
  let last = 0, accumulator = 0, frameId = 0, dirty = false, pageSuspended = false;
  let worldTime = 0;
  let levelTime = 0;
  let moveLock = 0;
  let deathTimer = 0;
  let goalFlash = 0;
  let movingExposure = 0;
  let checkpointIndex = 0;
  let autoNextTimer = 0;
  let levelsReturnState = null, levelsReturnFocus = null;
  let progress = loadProgress();

  const rowY = row => row * CELL_H;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pad = value => String(value).padStart(2, '0');

  function loadProgress() {
    const empty = { completed: Array(MAX_LEVEL).fill(false), bestScores: {}, levelScores: {}, bestTimes: {}, flawless: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return empty;
      for (let index = 0; index < MAX_LEVEL; index++) {
        const key = String(index + 1);
        empty.completed[index] = parsed.completed?.[index] === true;
        const score = parsed.bestScores?.[key], time = parsed.bestTimes?.[key];
        if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= 10000000) empty.bestScores[key] = score;
        if (typeof time === 'number' && Number.isFinite(time) && time > 0 && time <= 86400) empty.bestTimes[key] = time;
        const levelScore = parsed.levelScores?.[key];
        if (typeof levelScore === 'number' && Number.isSafeInteger(levelScore) && levelScore >= 0 && levelScore <= (ROWS - 1) * 10) empty.levelScores[key] = levelScore;
        if (parsed.flawless?.[key] === true) empty.flawless[key] = true;
      }
      return empty;
    } catch (_) {
      return empty;
    }
  }

  function saveProgress() {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (_) { /* local storage is optional */ }
  }

  function makeLanes() {
    lanes = activeLevel.lanes.map((config, laneIndex) => ({
      ...config,
      speedPx: CAR_SPEED * config.speed * activeLevel.speedScale * config.dir,
      cars: config.vehicles.map((spec, carIndex) => ({
        kind: spec.kind,
        x: spec.offset * W,
        w: CELL * R.vehicleWidth(spec.kind),
        color: palettes[(laneIndex + carIndex + levelIndex) % palettes.length],
      })),
    }));
    return lanes;
  }
  window.makeLanes = makeLanes;

  function spawn() {
    player = { col: 4, row: 11, x: 4 * CELL + CELL / 2, y: rowY(11) + CELL_H / 2, r: 17, alive: true, blockedFlash: 0 };
    movingExposure = 0;
    moveLock = 0;
  }

  function updateHud() {
    ui.score.textContent = String(score).padStart(6, '0');
    ui.level.textContent = `${pad(level)} / ${pad(MAX_LEVEL)}`;
    ui.chapter.textContent = `${pad(activeLevel.chapter)} / 05`;
    ui.lives.textContent = Array(Math.max(0, lives)).fill('♥').join(' ') || '—';
  }

  function resetClock() { last = performance.now(); accumulator = 0; }
  function requestRender() {
    dirty = true;
    if (!frameId && !document.hidden) frameId = requestAnimationFrame(loop);
  }
  function setState(nextState) {
    clearGesture(); state = nextState; resetClock(); requestRender();
    ui.pause.disabled = !['playing', 'paused'].includes(state);
    ui.pause.textContent = state === 'paused' ? 'RESUME' : 'PAUSE';
  }

  function show(title, text, button, action) {
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.start.textContent = button;
    overlayAction = action;
    ui.overlay.classList.remove('hide');
  }

  function hideOverlay() {
    ui.overlay.classList.add('hide');
  }

  function startLevel(index) {
    if (!Number.isInteger(index)) return;
    autoNextTimer = 0; clearGesture(); resetClock();
    levelIndex = clamp(index, 0, MAX_LEVEL - 1);
    level = levelIndex + 1;
    activeLevel = LEVELS[levelIndex];
    worldTime = 0;
    levelTime = 0;
    levelStartScore = score; levelDeaths = 0; furthestRow = ROWS - 1;
    deathTimer = 0;
    goalFlash = 0;
    makeLanes();
    spawn();
    updateHud();
    draw();
  }

  function resetRun(startIndex = 0) {
    score = 0;
    lives = 3;
    checkpointIndex = Math.floor(startIndex / 4) * 4;
    startLevel(startIndex);
    setState('playing');
    hideOverlay();
  }

  function retryCheckpoint() {
    resetRun(checkpointIndex);
  }

  function nextLevel() {
    autoNextTimer = 0;
    if (levelIndex >= MAX_LEVEL - 1) {
      resetRun(0);
      return;
    }
    startLevel(levelIndex + 1);
    setState('playing');
    hideOverlay();
  }

  function action() {
    if (ui.levelsOverlay.classList.contains('show') || (state === 'playing' && ui.overlay.classList.contains('hide'))) return;
    if (overlayAction === 'start' || overlayAction === 'restart') resetRun(0);
    else if (overlayAction === 'retry') retryCheckpoint();
    else if (overlayAction === 'next') nextLevel();
    else if (overlayAction === 'resume') togglePause();
  }

  function togglePause() {
    if (ui.levelsOverlay.classList.contains('show')) return;
    if (state === 'playing') {
      setState('paused');
      show('PAUSED', 'TRAFFIC HELD', 'RESUME', 'resume');
    } else if (state === 'paused') {
      setState('playing');
      hideOverlay();
      resetClock(); requestRender();
    }
  }

  function destinationBlocked(row, col) {
    return R.isBlockedCell(activeLevel, row, col);
  }

  function move(direction) {
    if (ui.levelsOverlay.classList.contains('show')) return;
    if (state === 'title' || state === 'over' || state === 'won' || state === 'level-clear') {
      action();
      return;
    }
    if (state !== 'playing' || !player.alive || moveLock > 0) return;
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
    if (!delta) return;
    const nextCol = clamp(player.col + delta[0], 0, COLS - 1);
    const nextRow = clamp(player.row + delta[1], 0, ROWS - 1);
    if (nextCol === player.col && nextRow === player.row) return;
    if (destinationBlocked(nextRow, nextCol)) {
      player.blockedFlash = 0.25; requestRender();
      return;
    }
    player.col = nextCol;
    player.row = nextRow;
    player.x = nextCol * CELL + CELL / 2;
    player.y = rowY(nextRow) + CELL_H / 2;
    moveLock = 0.075; requestRender();
    if (nextRow < furthestRow) { score += (furthestRow - nextRow) * 10; furthestRow = nextRow; }
    const lane = lanes.find(item => item.row === player.row);
    const safe = R.safeRowConfig(activeLevel, player.row);
    if (lane || !safe.moving || R.isMovingSafe(safe.moving, COLS, player.col, worldTime)) movingExposure = 0;
    if (lane && lane.cars.some(car => R.collides(player, car, W))) hit();
    if (player.row === 0 && player.alive) finishLevel();
    updateHud();
  }

  function hit() {
    if (!player.alive) return;
    clearGesture(); player.alive = false;
    deathTimer = 0.65;
    lives--;
    levelDeaths++;
    updateHud();
    if (navigator.vibrate) navigator.vibrate(80);
  }

  function finishLevel() {
    if (state !== 'playing' || !player.alive || player.row !== 0) return;
    goalFlash = 0.8;
    const key = String(level);
    const elapsed = Math.max(1, Math.ceil(levelTime));
    progress.completed[levelIndex] = true;
    progress.levelScores[key] = Math.max(progress.levelScores[key] || 0, score - levelStartScore);
    progress.bestTimes[key] = Math.min(Number(progress.bestTimes[key]) || Infinity, elapsed);
    if (levelDeaths === 0) progress.flawless[key] = true;
    saveProgress();

    if (activeLevel.checkpoint) {
      checkpointIndex = Math.min(levelIndex + 1, MAX_LEVEL - 1);
      lives = Math.min(3, lives + 1);
    }

    if (levelIndex === MAX_LEVEL - 1) {
      level = MAX_LEVEL;
      setState('won');
      show('CITY CROSSED', `FINAL SCORE ${String(score).padStart(6, '0')} · ${elapsed}S`, 'CROSS AGAIN', 'restart');
      updateHud();
      return;
    }

    setState('level-clear');
    autoNextTimer = 3.0;
    show('LEVEL CLEAR', `${activeLevel.name} · ${elapsed}S · AUTO NEXT IN 3S`, 'NEXT LEVEL (3S)', 'next');
    updateHud();
  }

  function update(dt) {
    worldTime += dt;
    levelTime += dt;
    moveLock = Math.max(0, moveLock - dt);
    goalFlash = Math.max(0, goalFlash - dt);
    if (player) player.blockedFlash = Math.max(0, player.blockedFlash - dt);

    for (const lane of lanes) {
      for (const car of lane.cars) {
        car.x += lane.speedPx * R.vehicleMotionFactor(lane, worldTime, car) * dt;
        car.x = ((car.x % W) + W) % W;
      }
    }

    if (!player.alive) {
      deathTimer -= dt;
      if (deathTimer <= 0) {
        if (lives <= 0) {
          setState('over');
          show('CROSSING CLOSED', `SCORE ${String(score).padStart(6, '0')}`, 'RETRY CHAPTER', 'retry');
        } else {
          spawn();
        }
      }
      return;
    }

    const lane = lanes.find(item => item.row === player.row);
    if (lane) {
      movingExposure = 0;
      for (const car of lane.cars) {
        if (R.collides(player, car, W)) {
          hit();
          break;
        }
      }
    } else {
      const safe = R.safeRowConfig(activeLevel, player.row);
      if (safe.moving && !R.isMovingSafe(safe.moving, COLS, player.col, worldTime)) movingExposure += dt;
      else movingExposure = 0;
      if (movingExposure > 0.45) hit();
    }
  }

  function drawCars() {
    for (const lane of lanes) {
      for (const car of lane.cars) {
        const y = rowY(lane.row) + CELL_H / 2;
        drawVehicle(car, car.x, y, lane);
        if (car.x - car.w / 2 < 0) drawVehicle(car, car.x + W, y, lane);
        if (car.x + car.w / 2 > W) drawVehicle(car, car.x - W, y, lane);
      }
    }
  }

  function renderLevelGrid() {
    ui.levelGrid.replaceChildren();
    ui.levelsProgress.textContent = `${R.completionCount(progress.completed)} / ${MAX_LEVEL} COMPLETE`;
    LEVELS.forEach((item, index) => {
      const unlocked = R.isLevelUnlocked(index, progress.completed);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card';
      card.classList.toggle('completed', progress.completed[index]);
      card.classList.toggle('current', index === levelIndex);
      card.disabled = !unlocked;
      const best = progress.levelScores[String(item.id)];
      const time = progress.bestTimes[String(item.id)];
      const labels = [
        ['level-number', pad(item.id)], ['level-name', item.name],
        ['level-detail', `${unlocked ? (progress.completed[index] ? 'COMPLETE' : item.subtitle) : 'LOCKED'}${best !== undefined ? ` · ${best} PTS` : ''}${time ? ` · ${time}S` : ''}`]
      ];
      for (const [className, text] of labels) {
        const span = document.createElement('span'); span.className = className; span.textContent = text; card.appendChild(span);
      }
      if (unlocked) card.addEventListener('click', () => {
        levelsReturnState = null;
        closeLevels();
        score = 0;
        lives = 3;
        checkpointIndex = Math.floor(index / 4) * 4;
        startLevel(index);
        setState('playing');
        hideOverlay(); canvas.focus?.();
      });
      ui.levelGrid.appendChild(card);
    });
  }

  function openLevels() {
    if (ui.levelsOverlay.classList.contains('show')) return;
    clearGesture(); levelsReturnFocus = document.activeElement;
    levelsReturnState = state;
    if (state === 'playing') setState('paused');
    renderLevelGrid();
    ui.levelsOverlay.classList.add('show');
    ui.levelsOverlay.setAttribute('aria-hidden', 'false');
    if ($('gamePage')) $('gamePage').inert = true;
    ui.closeLevels.focus?.();
  }

  function closeLevels() {
    ui.levelsOverlay.classList.remove('show');
    ui.levelsOverlay.setAttribute('aria-hidden', 'true');
    if ($('gamePage')) $('gamePage').inert = false;
    levelsReturnFocus?.focus?.(); levelsReturnFocus = null;
    if (levelsReturnState === 'playing' || levelsReturnState === 'level-clear') {
      setState(levelsReturnState);
      resetClock(); requestRender();
    }
    levelsReturnState = null;
  }

  function loop(time) {
    frameId = 0;
    const dt = Math.min(0.25, Math.max(0, (time - last) / 1000));
    last = time;
    const running = !document.hidden && !pageSuspended && !ui.levelsOverlay.classList.contains('show');
    if (running && state === 'playing') {
      accumulator += dt;
      while (accumulator + 1e-9 >= FIXED_STEP && state === 'playing') { accumulator -= FIXED_STEP; update(FIXED_STEP); }
      dirty = true;
    } else if (running && state === 'level-clear') {
      autoNextTimer = Math.max(0, autoNextTimer - dt);
      const secs = Math.max(1, Math.ceil(autoNextTimer));
      const text = `${activeLevel.name} · ${Math.max(1, Math.ceil(levelTime))}S · AUTO NEXT IN ${secs}S`;
      if (ui.text.textContent !== text) ui.text.textContent = text;
      const button = `NEXT LEVEL (${secs}S` + ')';
      if (ui.start.textContent !== button) ui.start.textContent = button;
      if (autoNextTimer <= 1e-9) nextLevel();
    }
    if (dirty) { draw(); dirty = false; }
    if (running && (state === 'playing' || state === 'level-clear') && !frameId) frameId = requestAnimationFrame(loop);
  }

  const codes = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };

  addEventListener('keydown', event => {
    if (event.code === 'Escape' && ui.levelsOverlay.classList.contains('show')) {
      closeLevels();
      event.preventDefault();
      return;
    }
    if (ui.levelsOverlay.classList.contains('show')) {
      if (event.code === 'Tab') {
        const buttons = [ui.closeLevels, ...ui.levelGrid.children].filter(button => !button.disabled);
        const index = buttons.indexOf(document.activeElement);
        const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        buttons[next]?.focus?.(); event.preventDefault();
      }
      return;
    }
    const tag = event.target?.tagName;
    if (event.altKey || event.ctrlKey || event.metaKey || event.target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
    if (codes[event.code]) {
      move(codes[event.code]);
      event.preventDefault();
    } else if (event.code === 'KeyP' && !event.repeat) {
      togglePause();
      event.preventDefault();
    } else if ((event.code === 'Enter' || event.code === 'Space') && tag !== 'BUTTON' && tag !== 'A' && !event.repeat) {
      action();
      event.preventDefault();
    }
  });

  document.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('click', event => {
    if (event.button && event.button !== 0) return;
    move(button.dataset.dir);
  }));

  let swipe = null;
  function clearGesture() {
    const old = swipe; swipe = null;
    if (old) { try { canvas.releasePointerCapture(old.pointerId); } catch (_) {} }
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || swipe) return;
    event.preventDefault(); canvas.focus();
    swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', event => { if (swipe?.pointerId === event.pointerId) event.preventDefault(); });
  canvas.addEventListener('pointerup', event => {
    if (!swipe || swipe.pointerId !== event.pointerId || event.button !== 0) return;
    event.preventDefault();
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
    clearGesture();
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) move('up');
    else move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  for (const type of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => { if (swipe?.pointerId === event.pointerId) clearGesture(); });
  for (const type of ['contextmenu', 'selectstart', 'dragstart']) canvas.addEventListener(type, event => event.preventDefault());
  canvas.addEventListener('touchmove', event => { if (state === 'playing') event.preventDefault(); }, {passive:false});

  ui.start.addEventListener('click', action);
  ui.pause.addEventListener('click', () => {
    if (state === 'title') action();
    else togglePause();
  });
  ui.levelsButton.addEventListener('click', openLevels);
  ui.closeLevels.addEventListener('click', closeLevels);
  ui.levelsOverlay.addEventListener('click', event => {
    if (event.target === ui.levelsOverlay) closeLevels();
  });
  function suspendPage() {
    pageSuspended = true; clearGesture();
    if (levelsReturnState === 'playing') { levelsReturnState = 'paused'; show('PAUSED', 'TRAFFIC HELD', 'RESUME', 'resume'); }
    if (state === 'playing' && !ui.levelsOverlay.classList.contains('show')) togglePause();
    resetClock(); requestRender();
  }
  addEventListener('blur', suspendPage);
  addEventListener('focus', () => { pageSuspended = false; resetClock(); requestRender(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendPage();
    else { pageSuspended = false; resetClock(); requestRender(); }
  });
  document.addEventListener('themechange', () => { paletteCache = null; requestRender(); });
  addEventListener('resize', () => { clearGesture(); requestRender(); });

  function doodlePalette() {
    if (paletteCache) return paletteCache;
    if (typeof getComputedStyle !== 'function') return { paper:'#fffaf0', grid:'#b9dfe0', ink:'#3d3832', muted:'#8a7c6e', mint:'#9eddbd', blue:'#8fc9eb', yellow:'#f7d66c', coral:'#f28c78', purple:'#b8a7e8', road:'#fffdf7', roadLine:'#c8bfae', line:'#d9cfc1' };
    const style = getComputedStyle(document.documentElement);
    const get = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return paletteCache = { paper:get('--paper','#fffaf0'), grid:get('--grid','#b9dfe0'), ink:get('--ink','#3d3832'), muted:get('--muted','#8a7c6e'), mint:get('--mint','#9eddbd'), blue:get('--blue','#8fc9eb'), yellow:get('--yellow','#f7d66c'), coral:get('--coral','#f28c78'), purple:get('--purple','#b8a7e8'), road:get('--road','#fffdf7'), roadLine:get('--road-line','#c8bfae'), line:get('--line','#d9cfc1') };
  }

  function doodleRect(x, y, width, height, radius, fill, stroke, lineWidth = 2) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
    else ctx.rect(x, y, width, height);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function doodleCloud(x, y, scale, fill, p) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = p.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(-34 * scale, 8 * scale); ctx.bezierCurveTo(-39 * scale, -6 * scale, -28 * scale, -16 * scale, -17 * scale, -12 * scale); ctx.bezierCurveTo(-12 * scale, -29 * scale, 8 * scale, -29 * scale, 14 * scale, -13 * scale); ctx.bezierCurveTo(30 * scale, -20 * scale, 41 * scale, -5 * scale, 33 * scale, 9 * scale); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function drawRoad() {
    const p = doodlePalette();
    ctx.fillStyle = p.paper; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = p.grid; ctx.globalAlpha = .42; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    doodleCloud(78, 64, .62, p.paper, p); doodleCloud(500, 111, .42, p.paper, p);
    ctx.fillStyle = p.mint; ctx.globalAlpha = .72; ctx.fillRect(0, rowY(0), W, CELL_H); ctx.fillRect(0, rowY(1), W, CELL_H); ctx.fillRect(0, rowY(10), W, CELL_H); ctx.fillRect(0, rowY(11), W, CELL_H); ctx.globalAlpha = 1;
    for (let row = 2; row <= 9; row++) {
      const y = rowY(row);
      if (BASE_SAFE_ROWS.includes(row)) {
        const moving = R.safeRowConfig(activeLevel, row).moving;
        ctx.fillStyle = moving ? p.coral : p.mint; ctx.globalAlpha = moving ? .22 : .55;
        ctx.fillRect(0, y, W, CELL_H); ctx.globalAlpha = 1; continue;
      }
      ctx.fillStyle = row % 2 ? p.road : p.paper; ctx.fillRect(0, y, W, CELL_H);
      ctx.strokeStyle = p.roadLine; ctx.lineWidth = 2; ctx.setLineDash([18, 18]); ctx.beginPath(); ctx.moveTo(0, y + CELL_H / 2); ctx.lineTo(W, y + CELL_H / 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = p.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const movingRows = (activeLevel.safeRows || []).filter(item => item.moving);
    for (const config of movingRows) {
      for (const col of R.movingSafeColumns(config.moving, COLS, worldTime)) {
        ctx.fillStyle = p.blue; doodleRect(col * CELL + 3, rowY(config.row) + 7, CELL - 6, CELL_H - 14, 7, p.blue, p.ink, 1.5);
      }
    }
    ctx.fillStyle = p.ink; ctx.font = '900 11px ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HOME', W / 2, rowY(0) + 27); ctx.fillText('START', W / 2, rowY(11) + 27);
    ctx.strokeStyle = p.coral; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(24, rowY(1) + 18); ctx.lineTo(31, rowY(1) + 11); ctx.lineTo(38, rowY(1) + 18); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W - 40, rowY(10) + 18); ctx.lineTo(W - 33, rowY(10) + 11); ctx.lineTo(W - 26, rowY(10) + 18); ctx.stroke();
    for (const config of activeLevel.safeRows || []) for (const col of config.blocks) drawBlocker(col, config.row);
    for (const lane of lanes) drawSignal(lane);
  }

  function drawBlocker(col, row) {
    const p = doodlePalette(), x = col * CELL + CELL / 2, y = rowY(row) + CELL_H / 2;
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = p.ink; ctx.lineWidth = 2.5; ctx.fillStyle = p.coral; doodleRect(-17, -13, 34, 24, 6, p.coral, p.ink, 2.5); ctx.fillStyle = p.yellow; ctx.beginPath(); ctx.arc(0, -3, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = p.ink; ctx.beginPath(); ctx.moveTo(-8, 11); ctx.lineTo(-12, 17); ctx.moveTo(8, 11); ctx.lineTo(12, 17); ctx.stroke(); ctx.restore();
  }

  function drawSignal(lane) {
    if (!lane.signal) return; const p = doodlePalette(), go = R.signalState(lane.signal, worldTime) === 'go', x = W - 17, y = rowY(lane.row) + 9;
    ctx.save(); ctx.strokeStyle = p.ink; ctx.lineWidth = 2; doodleRect(x - 9, y - 7, 18, 34, 8, p.paper, p.ink, 2); ctx.fillStyle = go ? p.mint : p.coral; ctx.beginPath(); ctx.arc(x, y + 1, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = go ? p.muted : p.yellow; ctx.beginPath(); ctx.arc(x, y + 15, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  function drawVehicle(car, x, y, lane) {
    const p = doodlePalette(); ctx.save(); ctx.translate(x, y); const width = car.w, height = 30, direction = lane.dir > 0 ? 1 : -1;
    const fill = car.kind === 'bus' ? p.purple : car.kind === 'truck' ? p.coral : car.kind === 'emergency' ? p.paper : car.color;
    doodleRect(-width / 2, -height / 2, width, height, 8, fill, p.ink, 2.5);
    ctx.fillStyle = p.blue; doodleRect(-width * .28, -10, width * .48, 9, 3, p.blue, p.ink, 1.5);
    if (car.kind === 'bus') { ctx.fillStyle = p.yellow; for (let i = -1; i <= 1; i++) doodleRect(i * 17 - 5, 3, 10, 5, 2, p.yellow, p.ink, 1); }
    if (car.kind === 'truck') { ctx.fillStyle = p.yellow; doodleRect(direction * width * .12, -11, width * .28, 21, 3, p.yellow, p.ink, 1.5); }
    if (car.kind === 'emergency') { ctx.fillStyle = p.coral; ctx.fillRect(-width * .35, -6, width * .25, 12); ctx.fillStyle = p.blue; ctx.fillRect(width * .1, -6, width * .25, 12); ctx.fillStyle = worldTime % .5 < .25 ? p.coral : p.blue; ctx.fillRect(-4, -height / 2 - 5, 8, 4); }
    ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(-width * .28, height / 2, 6, 0, Math.PI * 2); ctx.arc(width * .28, height / 2, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = p.paper; ctx.beginPath(); ctx.arc(-width * .28, height / 2, 2, 0, Math.PI * 2); ctx.arc(width * .28, height / 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.yellow; ctx.fillRect(direction * (width / 2 - 5), -8, 4, 5); ctx.fillRect(direction * (width / 2 - 5), 4, 4, 5); ctx.fillStyle = p.coral; ctx.fillRect(-direction * (width / 2 - 5), -7, 3, 4); ctx.fillRect(-direction * (width / 2 - 5), 4, 3, 4); ctx.restore();
  }

  function drawPlayer() {
    if (!player || (!player.alive && Math.floor(deathTimer * 14) % 2 === 0)) return; const p = doodlePalette(); ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(Math.sin(worldTime * 8) * .04); ctx.strokeStyle = p.ink; ctx.lineWidth = 2.5; ctx.fillStyle = p.yellow; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.yellow; ctx.beginPath(); ctx.ellipse(-14, 5, 7, 12, -.5, 0, Math.PI * 2); ctx.ellipse(14, 5, 7, 12, .5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.coral; ctx.beginPath(); ctx.moveTo(14, -2); ctx.lineTo(26, 2); ctx.lineTo(14, 7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.paper; ctx.beginPath(); ctx.arc(6, -7, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(7, -7, 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = p.coral; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-15, 9); ctx.quadraticCurveTo(0, 15, 16, 9); ctx.stroke(); ctx.strokeStyle = p.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(-2, -23); ctx.moveTo(5, -15); ctx.lineTo(8, -23); ctx.stroke(); ctx.restore();
  }

  function draw() { drawRoad(); drawCars(); drawPlayer(); const p = doodlePalette(); ctx.strokeStyle = p.ink; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2); }

  startLevel(0);
  updateHud();
  show('TINY CROSSING', 'HELP THE LITTLE DUCK REACH HOME', 'START CROSSING', 'start');

  function dockUtilities() { document.querySelectorAll('.theme-toggle,.clear-data-toggle').forEach(button => $('utilityDock').appendChild(button)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dockUtilities, {once:true});
  else dockUtilities();

  window.CrosswalkGame = {
    getSnapshot: () => JSON.parse(JSON.stringify({ state, level, levelIndex, lives, score, laneCount: lanes.length, player, worldTime, levelTime, checkpointIndex, autoNextTimer, progress })),
    getLaneCars: () => lanes.flatMap(lane => lane.cars.map(car => ({ ...car }))),
    startLevel,
    finishLevel,
    move,
  };
})();
