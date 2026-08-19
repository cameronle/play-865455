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
  let activeLevel = LEVELS[0];
  let player;
  let score = 0;
  let level = 1;
  let levelIndex = 0;
  let lives = 3;
  let state = 'title';
  let overlayAction = 'start';
  let last = 0;
  let worldTime = 0;
  let levelTime = 0;
  let moveLock = 0;
  let deathTimer = 0;
  let goalFlash = 0;
  let movingExposure = 0;
  let checkpointIndex = 0;
  let levelsReturnState = null;
  let progress = loadProgress();

  const rowY = row => row * CELL_H;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pad = value => String(value).padStart(2, '0');

  function loadProgress() {
    const empty = { completed: Array(MAX_LEVEL).fill(false), bestScores: {}, bestTimes: {}, flawless: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return empty;
      return {
        completed: Array.from({ length: MAX_LEVEL }, (_, index) => Boolean(parsed.completed?.[index])),
        bestScores: parsed.bestScores && typeof parsed.bestScores === 'object' ? parsed.bestScores : {},
        bestTimes: parsed.bestTimes && typeof parsed.bestTimes === 'object' ? parsed.bestTimes : {},
        flawless: parsed.flawless && typeof parsed.flawless === 'object' ? parsed.flawless : {},
      };
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

  function setState(nextState) {
    state = nextState;
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
    levelIndex = clamp(index, 0, MAX_LEVEL - 1);
    level = levelIndex + 1;
    activeLevel = LEVELS[levelIndex];
    worldTime = 0;
    levelTime = 0;
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
    if (levelIndex >= MAX_LEVEL - 1) {
      resetRun(0);
      return;
    }
    startLevel(levelIndex + 1);
    setState('playing');
    hideOverlay();
  }

  function action() {
    if (overlayAction === 'start' || overlayAction === 'restart') resetRun(0);
    else if (overlayAction === 'retry') retryCheckpoint();
    else if (overlayAction === 'next') nextLevel();
    else if (overlayAction === 'resume') togglePause();
  }

  function togglePause() {
    if (state === 'playing') {
      setState('paused');
      show('PAUSED', 'TRAFFIC HELD', 'RESUME', 'resume');
    } else if (state === 'paused') {
      setState('playing');
      hideOverlay();
      last = performance.now();
    }
  }

  function destinationBlocked(row, col) {
    return R.isBlockedCell(activeLevel, row, col);
  }

  function move(direction) {
    if (state === 'title' || state === 'over' || state === 'won') {
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
      player.blockedFlash = 0.25;
      return;
    }
    player.col = nextCol;
    player.row = nextRow;
    player.x = nextCol * CELL + CELL / 2;
    player.y = rowY(nextRow) + CELL_H / 2;
    moveLock = 0.075;
    if (direction === 'up') score += 10;
    if (player.row === 0) finishLevel();
    updateHud();
  }

  function hit() {
    if (!player.alive) return;
    player.alive = false;
    deathTimer = 0.65;
    lives--;
    updateHud();
    if (navigator.vibrate) navigator.vibrate(80);
  }

  function finishLevel() {
    goalFlash = 0.8;
    const key = String(level);
    const elapsed = Math.max(1, Math.ceil(levelTime));
    progress.completed[levelIndex] = true;
    progress.bestScores[key] = Math.max(Number(progress.bestScores[key]) || 0, score);
    progress.bestTimes[key] = Math.min(Number(progress.bestTimes[key]) || Infinity, elapsed);
    if (lives === 3) progress.flawless[key] = true;
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

    level++;
    setState('level-clear');
    show('LEVEL CLEAR', `${activeLevel.name} · ${elapsed}S`, 'NEXT LEVEL', 'next');
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
        if (lane.dir > 0 && car.x > W + car.w / 2) car.x = -car.w / 2;
        if (lane.dir < 0 && car.x < -car.w / 2) car.x = W + car.w / 2;
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

  function drawRoad() {
    ctx.fillStyle = '#071017';
    ctx.fillRect(0, 0, W, H);
    for (let row = 0; row < ROWS; row++) {
      const y = rowY(row);
      const safe = BASE_SAFE_ROWS.includes(row);
      if (row === 0) {
        ctx.fillStyle = goalFlash > 0 ? '#e8f0f7' : '#123128';
        ctx.fillRect(0, y, W, CELL_H);
      } else if (safe) {
        ctx.fillStyle = row === 1 || row === 10 || row === 11 ? '#14212a' : '#10251f';
        ctx.fillRect(0, y, W, CELL_H);
        const config = R.safeRowConfig(activeLevel, row);
        if (config.moving) {
          ctx.fillStyle = '#0c171a';
          ctx.fillRect(0, y, W, CELL_H);
          for (const col of R.movingSafeColumns(config.moving, COLS, worldTime)) {
            ctx.fillStyle = '#1e614e';
            ctx.fillRect(col * CELL + 2, y + 4, CELL - 4, CELL_H - 8);
            ctx.fillStyle = '#73f0b0';
            ctx.fillRect(col * CELL + 10, y + 10, CELL - 20, 4);
          }
        }
      } else {
        ctx.fillStyle = row % 2 ? '#101722' : '#0d141d';
        ctx.fillRect(0, y, W, CELL_H);
        ctx.strokeStyle = '#293542';
        ctx.setLineDash([19, 16]);
        ctx.beginPath();
        ctx.moveTo(0, y + CELL_H / 2);
        ctx.lineTo(W, y + CELL_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (row > 0 && row < ROWS - 1) {
        ctx.strokeStyle = '#162633';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    ctx.fillStyle = goalFlash > 0 ? '#e8f0f7' : '#73f0b0';
    for (let x = 10; x < W; x += 32) ctx.fillRect(x, 8, 16, 5);
    ctx.fillStyle = '#748394';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', W / 2, 34);
    ctx.fillText('START', W / 2, H - 14);

    for (const config of activeLevel.safeRows || []) {
      for (const col of config.blocks) drawBlocker(col, config.row);
    }
    for (const lane of lanes) drawSignal(lane);
  }

  function drawBlocker(col, row) {
    const x = col * CELL + CELL / 2;
    const y = rowY(row) + CELL_H / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#2b1514';
    ctx.fillRect(-18, -12, 36, 24);
    ctx.fillStyle = '#ffb45c';
    ctx.fillRect(-15, -9, 30, 5);
    ctx.fillRect(-15, 4, 30, 5);
    ctx.restore();
  }

  function drawSignal(lane) {
    if (!lane.signal) return;
    const active = R.signalState(lane.signal, worldTime) === 'go';
    const y = rowY(lane.row) + 10;
    ctx.fillStyle = active ? '#73f0b0' : '#ff7088';
    ctx.beginPath();
    ctx.arc(W - 13, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVehicle(car, x, y, lane) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#020508';
    ctx.fillRect(-car.w / 2 + 3, -17, car.w, 34);
    if (car.kind === 'bus' || car.kind === 'truck') {
      ctx.fillStyle = car.kind === 'bus' ? '#c894ff' : '#ffb45c';
      ctx.fillRect(-car.w / 2, -15, car.w, 30);
      ctx.fillStyle = '#172733';
      ctx.fillRect(-car.w * 0.33, -11, car.w * 0.62, 9);
      ctx.fillRect(-car.w * 0.33, 3, car.w * 0.62, 7);
      ctx.fillStyle = lane.dir > 0 ? '#ffe9a3' : '#ff7088';
    } else if (car.kind === 'emergency') {
      ctx.fillStyle = '#f0f3f5';
      ctx.fillRect(-car.w / 2, -14, car.w, 28);
      ctx.fillStyle = '#ff5468';
      ctx.fillRect(-car.w * 0.42, -9, car.w * 0.3, 18);
      ctx.fillStyle = '#69c6ff';
      ctx.fillRect(car.w * 0.12, -9, car.w * 0.3, 18);
      ctx.fillStyle = worldTime % 0.5 < 0.25 ? '#ff5468' : '#69c6ff';
      ctx.fillRect(-4, -19, 8, 4);
    } else {
      ctx.fillStyle = car.color;
      ctx.fillRect(-car.w / 2, -14, car.w, 28);
      ctx.fillStyle = '#172733';
      ctx.fillRect(-car.w * 0.18, -11, car.w * 0.36, 22);
      ctx.fillStyle = lane.dir > 0 ? '#ffe9a3' : '#ff7088';
    }
    const nose = lane.dir > 0 ? car.w / 2 - 4 : -car.w / 2;
    ctx.fillRect(nose - 2, -9, 4, 5);
    ctx.fillRect(nose - 2, 4, 4, 5);
    ctx.restore();
  }

  function drawCars() {
    for (const lane of lanes) {
      for (const car of lane.cars) {
        const y = rowY(lane.row) + CELL_H / 2;
        drawVehicle(car, car.x, y, lane);
        if (car.x < car.w / 2) drawVehicle(car, car.x + W, y, lane);
        if (car.x > W - car.w / 2) drawVehicle(car, car.x - W, y, lane);
      }
    }
  }

  function drawPlayer() {
    if (!player || (!player.alive && Math.floor(deathTimer * 14) % 2 === 0)) return;
    const safe = R.safeRowConfig(activeLevel, player.row);
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = '#030708';
    ctx.beginPath();
    ctx.arc(3, 3, player.r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f0f7';
    ctx.beginPath();
    ctx.arc(0, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = safe.moving && !R.isMovingSafe(safe.moving, COLS, player.col, worldTime) ? '#ff7088' : '#73f0b0';
    ctx.lineWidth = 5;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(0, 3); ctx.lineTo(0, 14);
    ctx.moveTo(0, 7); ctx.lineTo(-10, 13);
    ctx.moveTo(0, 7); ctx.lineTo(10, 13);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    drawRoad();
    drawCars();
    drawPlayer();
    ctx.strokeStyle = '#263746';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
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
      const best = progress.bestScores[String(item.id)];
      const time = progress.bestTimes[String(item.id)];
      card.innerHTML = `<span class="level-number">${pad(item.id)}</span><span class="level-name">${item.name}</span><span class="level-detail">${unlocked ? (progress.completed[index] ? 'COMPLETE' : item.subtitle) : 'LOCKED'}${best ? ` · ${best} PTS` : ''}${time ? ` · ${time}S` : ''}</span>`;
      if (unlocked) card.addEventListener('click', () => {
        score = 0;
        lives = 3;
        checkpointIndex = Math.floor(index / 4) * 4;
        startLevel(index);
        setState('playing');
        closeLevels();
        hideOverlay();
      });
      ui.levelGrid.appendChild(card);
    });
  }

  function openLevels() {
    levelsReturnState = state;
    if (state === 'playing') setState('paused');
    renderLevelGrid();
    ui.levelsOverlay.classList.add('show');
    ui.levelsOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeLevels() {
    ui.levelsOverlay.classList.remove('show');
    ui.levelsOverlay.setAttribute('aria-hidden', 'true');
    if (levelsReturnState === 'playing') {
      setState('playing');
      last = performance.now();
    }
    levelsReturnState = null;
  }

  function loop(time) {
    const dt = Math.min(0.04, (time - last) / 1000 || 0);
    last = time;
    if (state === 'playing') update(dt);
    draw();
    requestAnimationFrame(loop);
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
    if (codes[event.code]) {
      move(codes[event.code]);
      event.preventDefault();
    } else if (event.code === 'KeyP') {
      togglePause();
      event.preventDefault();
    } else if (event.code === 'Enter') {
      action();
      event.preventDefault();
    }
  });

  document.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('pointerdown', event => {
    event.preventDefault();
    move(button.dataset.dir);
  }));

  let swipe = null;
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    swipe = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* optional */ }
  });
  canvas.addEventListener('pointerup', event => {
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) move('up');
    else move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  canvas.addEventListener('pointercancel', () => { swipe = null; });
  canvas.addEventListener('lostpointercapture', () => { swipe = null; });

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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') togglePause();
  });

  startLevel(0);
  updateHud();
  show('NIGHT CROSSING', 'REACH THE LIGHTED EXIT', 'START CROSSING', 'start');
  requestAnimationFrame(loop);

  window.CrosswalkGame = {
    getSnapshot: () => ({ state, level, levelIndex, lives, score, laneCount: lanes.length }),
    startLevel,
    move,
  };
})();
