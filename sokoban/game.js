(() => {
  'use strict';
  const R = window.SokobanRules;
  const levels = window.SokobanLevels;
  const NEXT_LEVEL_SECONDS = 5;
  const SAVE_KEY = 'sokoban-save-v1';
  const MOVE_CODES = {U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const ui = {
    level: document.getElementById('level'), moves: document.getElementById('moves'), pushes: document.getElementById('pushes'), best: document.getElementById('best'),
    overlay: document.getElementById('overlay'), title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'), start: document.getElementById('startButton'),
    select: document.getElementById('levelSelect'), status: document.getElementById('statusText'), undo: document.getElementById('undoButton'),
    previous: document.getElementById('previousButton'), next: document.getElementById('nextButton'), review: document.getElementById('reviewButton')
  };

  const savedMemory = new Map();
  function readSaved(key) {
    if (savedMemory.has(key)) return savedMemory.get(key);
    let value = null;
    try { value = localStorage.getItem(key); } catch (_) {}
    savedMemory.set(key, value);
    return value;
  }
  function writeSaved(key, value) {
    savedMemory.set(key, String(value));
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  function validIndex(value) {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 && n < levels.length ? n : 0;
  }
  function bestRecord(index = levelIndex) {
    const n = Number(readSaved(`sokobanBest${index}`));
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  let levelIndex = validIndex(readSaved('sokobanLastLevel') ?? readSaved('sokobanUnlocked'));
  let movePath = '';
  let state, history = [], active = false, swipeStart = null;
  let playerDirection = 'down';
  let gamePhase = 'title', countdownTimer = 0, countdownVersion = 0, pageSuspended = false;

  function cloneState(s) {
    return {width:s.width,height:s.height,walls:s.walls,floor:s.floor,goals:s.goals,boxes:{...s.boxes},player:{...s.player},moves:s.moves,pushes:s.pushes};
  }

  function removeSaved(key) {
    savedMemory.set(key, null);
    try { localStorage.removeItem(key); } catch (_) {}
  }
  function saveRun() {
    writeSaved('sokobanLastLevel', levelIndex);
    if (gamePhase === 'complete' || movePath.length > 10000) removeSaved(SAVE_KEY);
    else writeSaved(SAVE_KEY, JSON.stringify({version:1,level:levelIndex,path:movePath}));
  }
  function restoreRun(raw) {
    try {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1 || !Number.isInteger(saved.level) || saved.level < 0 || saved.level >= levels.length || typeof saved.path !== 'string' || saved.path.length > 10000 || /[^UDLR]/.test(saved.path)) return false;
      const restored = R.parseLevel(levels[saved.level]), undoStates = [];
      let direction = 'down';
      for (const code of saved.path) {
        const before = cloneState(restored), previousDirection = direction;
        if (!R.move(restored, ...MOVE_CODES[code]) || R.isComplete(restored)) return false;
        undoStates.push({state:before,direction:previousDirection});
        direction = directionName(...MOVE_CODES[code]);
      }
      levelIndex = saved.level; state = restored; history = undoStates;
      movePath = saved.path; playerDirection = direction;
      saveRun(); updateUi(); draw();
      if (movePath) showOverlay('WELCOME BACK', `${state.moves} MOVES · ${state.pushes} PUSHES · SAVED PUZZLE`, 'RESUME PUZZLE');
      return true;
    } catch (_) { return false; }
  }

  function bestKey() { return `sokobanBest${levelIndex}`; }
  function levelLabel(index) { return `LEVEL ${String(index + 1).padStart(2, '0')}${bestRecord(index) !== null ? ' ✓' : ''}`; }

  function loadLevel(index, showIntro = false) {
    cancelNextLevelCountdown();
    clearGesture();
    if (!Number.isInteger(index)) return;
    levelIndex = Math.max(0, Math.min(levels.length - 1, index));
    state = R.parseLevel(levels[levelIndex]);
    history = [];
    movePath = '';
    playerDirection = 'down';
    active = !showIntro;
    gamePhase = showIntro ? 'title' : 'playing';
    saveRun();
    updateUi();
    draw();
    if (showIntro) showOverlay('BEAR & BOXES', 'PUSH EVERY FRUIT CRATE INTO A BASKET', 'START THE WALK');
    else hideOverlay();
  }

  function updateUi() {
    ui.level.textContent = `${String(levelIndex + 1).padStart(2,'0')} / ${String(levels.length).padStart(2,'0')}`;
    ui.moves.textContent = String(state.moves).padStart(3,'0');
    ui.pushes.textContent = String(state.pushes).padStart(3,'0');
    const best = bestRecord();
    ui.best.textContent = best === null ? '---' : String(best).padStart(3,'0');
    ui.select.value = String(levelIndex);
    if (ui.select.options[levelIndex]) ui.select.options[levelIndex].textContent = levelLabel(levelIndex);
    ui.previous.disabled = levelIndex === 0;
    ui.next.disabled = levelIndex === levels.length - 1;
    ui.undo.disabled = history.length === 0;
    const total = Object.keys(state.boxes).length, placed = Object.keys(state.boxes).filter(k => state.goals[k]).length;
    ui.status.textContent = `${placed} / ${total} BASKETS${gamePhase === 'complete' ? ' · LEVEL CLEAR' : ' · PUSH, DO NOT PULL'}`;
    canvas.setAttribute('aria-label', `Level ${levelIndex + 1}. Bear at row ${state.player.y + 1}, column ${state.player.x + 1}. ${placed} of ${total} baskets placed. ${state.moves} moves, ${state.pushes} pushes.`);
  }

  function showOverlay(title, text, button) {
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.start.textContent = button;
    ui.review.hidden = gamePhase !== 'complete';
    ui.overlay.classList.remove('hide');
  }

  function hideOverlay() { ui.overlay.classList.add('hide'); }

  function cancelNextLevelCountdown() {
    countdownVersion += 1;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = 0;
    }
  }

  function countdownText(seconds) {
    return `${state.moves} MOVES · ${state.pushes} PUSHES · NEXT LEVEL IN ${seconds}S`;
  }

  function startNextLevelCountdown() {
    if (levelIndex === levels.length - 1) {
      showOverlay('FINAL LEVEL CLEAR', `${state.moves} MOVES · ${state.pushes} PUSHES`, 'PLAY AGAIN');
      return;
    }
    const version = countdownVersion;
    let remaining = NEXT_LEVEL_SECONDS;
    showOverlay('LEVEL CLEAR', countdownText(remaining), 'SKIP 5S');
    countdownTimer = window.setInterval(() => {
      if (version !== countdownVersion || gamePhase !== 'complete' || document.hidden || pageSuspended) return;
      remaining -= 1;
      if (remaining <= 0) {
        cancelNextLevelCountdown();
        loadLevel(levelIndex + 1);
      } else {
        ui.text.textContent = countdownText(remaining);
      }
    }, 1000);
  }

  function tileGeometry() {
    const size = Math.floor(Math.min(canvas.width / state.width, canvas.height / state.height));
    return {
      size,
      ox: Math.floor((canvas.width - state.width * size) / 2),
      oy: Math.floor((canvas.height - state.height * size) / 2)
    };
  }

  function palette() {
    if (typeof getComputedStyle !== 'function') {
      return {
        board: '#090d14', floor: '#151c24', floorGrid: '#293442',
        wall: '#3e4955', wallBorder: '#202933',
        goal: '#ff6b7a', goalBg: 'rgba(255,107,122,0.12)',
        orange: '#ffb45c', orangeBorder: '#c98740',
        player: '#64e6e0', playerBorder: '#2f9994', ink: '#e8edf3'
      };
    }
    const css = getComputedStyle(document.documentElement), get = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return {
      board: get('--board', '#090d14'),
      floor: get('--floor', '#151c24'),
      floorGrid: get('--floor-grid', '#293442'),
      wall: get('--wall', '#3e4955'),
      wallBorder: get('--wall-border', '#202933'),
      goal: get('--red', '#ff6b7a'),
      goalBg: get('--goal-bg', 'rgba(255,107,122,0.12)'),
      orange: get('--orange', '#ffb45c'),
      orangeBorder: get('--orange-border', '#c98740'),
      player: get('--cyan', '#64e6e0'),
      playerBorder: get('--cyan-border', '#2f9994'),
      ink: get('--ink', '#e8edf3')
    };
  }

  function isInterior(x, y) {
    const k = `${x},${y}`;
    if (state.walls[k] || state.goals[k] || state.boxes[k]) return true;
    if (state.player.x === x && state.player.y === y) return true;
    return !!state.floor[k];
  }

  function drawWall(x, y, s, colors) {
    ctx.fillStyle = colors.wall;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.strokeStyle = colors.wallBorder || colors.wall;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }

  function attempt(dx, dy) {
    if (gamePhase === 'title') {
      gamePhase = 'playing';
      active = true;
      hideOverlay();
    }
    if (gamePhase !== 'playing') return;
    const before = cloneState(state), previousDirection = playerDirection;
    if (!R.move(state, dx, dy)) return;
    playerDirection = directionName(dx, dy);
    history.push({state:before, direction:previousDirection});
    movePath += dx < 0 ? 'L' : dx > 0 ? 'R' : dy < 0 ? 'U' : 'D';
    saveRun();
    updateUi();
    draw();
    if (R.isComplete(state)) {
      active = false;
      gamePhase = 'complete';
      saveRun();
      const old = bestRecord() ?? Infinity;
      if (state.moves < old) writeSaved(bestKey(), state.moves);
      const unlocked = Math.max(validIndex(readSaved('sokobanUnlocked')), Math.min(levels.length - 1, levelIndex + 1));
      writeSaved('sokobanUnlocked', unlocked);
      updateUi();
      startNextLevelCountdown();
    }
  }

  function directionName(dx, dy) {
    return dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
  }

  function undo() {
    cancelNextLevelCountdown();
    if (!history.length) return;
    const previous = history.pop();
    state = previous.state;
    playerDirection = previous.direction;
    movePath = movePath.slice(0, -1);
    clearGesture();
    active = true;
    gamePhase = 'playing';
    hideOverlay();
    saveRun();
    updateUi();
    draw();
  }

  const directions = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };

  window.addEventListener('keydown', e => {
    const tag = e.target?.tagName;
    if (e.target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.altKey || e.metaKey) return;
    if (e.ctrlKey && e.code !== 'KeyZ') return;
    if (directions[e.code]) {
      e.preventDefault();
      attempt(...directions[e.code]);
    } else if (e.code === 'KeyR' && !e.repeat) {
      e.preventDefault();
      loadLevel(levelIndex);
    } else if (e.code === 'KeyZ' && !e.repeat) {
      e.preventDefault();
      undo();
    } else if ((e.code === 'Enter' || e.code === 'Space') && tag !== 'BUTTON' && tag !== 'A' && gamePhase === 'title') {
      e.preventDefault();
      startCurrent();
    }
  });

  document.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('click', e => {
    if (e.button && e.button !== 0) return;
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    attempt(...map[button.dataset.dir]);
  }));

  function clearGesture() {
    const old = swipeStart;
    swipeStart = null;
    if (old) { try { canvas.releasePointerCapture(old.id); } catch (_) {} }
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.isPrimary === false || swipeStart) return;
    e.preventDefault();
    canvas.focus();
    swipeStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (swipeStart?.id === e.pointerId) e.preventDefault();
  });
  canvas.addEventListener('pointerup', e => {
    if (!swipeStart || swipeStart.id !== e.pointerId || e.button !== 0) return;
    e.preventDefault();
    const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y;
    clearGesture();
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) attempt(Math.sign(dx), 0);
    else attempt(0, Math.sign(dy));
  });
  for (const event of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => {
    if (swipeStart?.id === e.pointerId) clearGesture();
  });
  window.addEventListener('blur', () => { pageSuspended = true; clearGesture(); });
  window.addEventListener('focus', () => { pageSuspended = false; });
  window.addEventListener('resize', clearGesture);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearGesture(); });
  canvas.addEventListener('touchmove', e => { if (gamePhase === 'playing') e.preventDefault(); }, {passive:false});
  for (const event of ['contextmenu', 'selectstart', 'dragstart']) canvas.addEventListener(event, e => e.preventDefault());

  document.getElementById('resetButton').addEventListener('click', () => loadLevel(levelIndex));
  document.getElementById('undoButton').addEventListener('click', undo);
  document.getElementById('previousButton').addEventListener('click', () => loadLevel(levelIndex - 1));
  document.getElementById('nextButton').addEventListener('click', () => loadLevel(levelIndex + 1));
  ui.select.addEventListener('change', () => loadLevel(Number(ui.select.value)));
  ui.review.addEventListener('click', () => {
    if (gamePhase !== 'complete') return;
    cancelNextLevelCountdown(); clearGesture(); hideOverlay(); canvas.focus();
  });
  function startCurrent() {
    if (gamePhase === 'complete') {
      loadLevel(levelIndex === levels.length - 1 ? 0 : levelIndex + 1);
    } else {
      gamePhase = 'playing';
      active = true;
      hideOverlay();
    }
    canvas.focus();
  }
  ui.start.addEventListener('click', startCurrent);

  function drawGoal(x, y, s, colors, covered = false) {
    const inset = s * (covered ? .07 : .2), size = s - inset * 2;
    ctx.strokeStyle = colors.goal; ctx.lineWidth = Math.max(2, s * 0.055); ctx.strokeRect(x + inset, y + inset, size, size);
    if (!covered) { ctx.fillStyle = colors.goal; ctx.fillRect(x + s * .31, y + s * .47, s * .12, s * .12); ctx.fillRect(x + s * .57, y + s * .47, s * .12, s * .12); ctx.strokeStyle = colors.orange; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.moveTo(x + s * .28, y + s * .73); ctx.lineTo(x + s * .72, y + s * .73); ctx.stroke(); }
  }

  function drawCrate(x, y, s, colors, onGoal) {
    if (onGoal) drawGoal(x, y, s, colors, true);
    const inset = s * .12, size = s - inset * 2;
    ctx.fillStyle = colors.orange; ctx.fillRect(x + inset, y + inset, size, size); ctx.strokeStyle = colors.orangeBorder || colors.orange; ctx.lineWidth = Math.max(1.5, s * .035); ctx.strokeRect(x + inset + .5, y + inset + .5, size - 1, size - 1);
    ctx.strokeStyle = colors.orangeBorder || colors.ink; ctx.lineWidth = Math.max(1.5, s * .03); ctx.beginPath(); ctx.moveTo(x + s * .2, y + s * .34); ctx.lineTo(x + s * .8, y + s * .34); ctx.moveTo(x + s * .2, y + s * .65); ctx.lineTo(x + s * .8, y + s * .65); ctx.stroke();
    ctx.fillStyle = colors.goal; ctx.fillRect(x + s * .28, y + s * .43, s * .12, s * .12); ctx.fillStyle = colors.player; ctx.fillRect(x + s * .45, y + s * .39, s * .12, s * .12); ctx.fillStyle = colors.player; ctx.fillRect(x + s * .61, y + s * .45, s * .12, s * .12);
    ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1.5, s * .035); ctx.beginPath(); ctx.moveTo(x + s * .34, y + s * .43); ctx.lineTo(x + s * .37, y + s * .36); ctx.moveTo(x + s * .51, y + s * .39); ctx.lineTo(x + s * .54, y + s * .32); ctx.moveTo(x + s * .67, y + s * .45); ctx.lineTo(x + s * .7, y + s * .38); ctx.stroke();
    if (onGoal) { ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(2, s * .07); ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(x + s * .32, y + s * .54); ctx.lineTo(x + s * .44, y + s * .66); ctx.lineTo(x + s * .7, y + s * .37); ctx.stroke(); }
  }

  function drawPlayer(x, y, s, colors) {
    const bodyX = x + s * 0.2, bodyY = y + s * 0.37, bodyW = s * 0.6, bodyH = s * 0.46;
    ctx.fillStyle = colors.player; ctx.strokeStyle = colors.playerBorder || colors.player; ctx.lineWidth = Math.max(2, s * 0.035); ctx.lineJoin = 'round';
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH); ctx.strokeRect(bodyX + .5, bodyY + .5, bodyW - 1, bodyH - 1);
    ctx.fillStyle = colors.player; ctx.fillRect(x + s * .18, y + s * .16, s * .64, s * .46); ctx.strokeStyle = colors.playerBorder || colors.player; ctx.strokeRect(x + s * .185, y + s * .165, s * .63, s * .45);
    ctx.fillStyle = colors.orange; ctx.fillRect(x + s * .12, y + s * .06, s * .18, s * .18); ctx.fillRect(x + s * .7, y + s * .06, s * .18, s * .18); ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1.5, s * .03); ctx.strokeRect(x + s * .12, y + s * .06, s * .18, s * .18); ctx.strokeRect(x + s * .7, y + s * .06, s * .18, s * .18);
    const facingX = playerDirection === 'left' ? -.04 : playerDirection === 'right' ? .04 : 0;
    const facingY = playerDirection === 'up' ? -.04 : playerDirection === 'down' ? .04 : 0;
    ctx.fillStyle = colors.ink; const eye = Math.max(2, s * .06);
    ctx.fillRect(x + s * (.34 + facingX), y + s * (.31 + facingY), eye, eye);
    ctx.fillRect(x + s * (.58 + facingX), y + s * (.31 + facingY), eye, eye);
    ctx.fillStyle = colors.goal; ctx.fillRect(x + s * .46, y + s * .41, s * .08, s * .06);
    ctx.fillStyle = colors.orange; ctx.fillRect(x + s * .18, y + s * .78, s * .64, s * .09); ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1.5, s * .03); ctx.strokeRect(x + s * .18, y + s * .78, s * .64, s * .09);
  }

  function draw() {
    const colors = palette(); ctx.fillStyle = colors.board; ctx.fillRect(0, 0, canvas.width, canvas.height); const g = tileGeometry(), s = g.size;
    for (let y = 0; y < state.height; y++) for (let x = 0; x < state.width; x++) { const k = `${x},${y}`, px = g.ox + x * s, py = g.oy + y * s; if (state.walls[k]) drawWall(px, py, s, colors); else if (isInterior(x, y)) { ctx.fillStyle = colors.floor; ctx.fillRect(px + 1, py + 1, s - 2, s - 2); ctx.strokeStyle = colors.floorGrid || colors.board; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, s - 1, s - 1); } if (state.goals[k] && !state.boxes[k]) drawGoal(px, py, s, colors); if (state.boxes[k]) drawCrate(px, py, s, colors, !!state.goals[k]); }
    drawPlayer(g.ox + state.player.x * s, g.oy + state.player.y * s, s, colors);
  }

  if (document.addEventListener) document.addEventListener('themechange', draw);
  levels.forEach((_, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = levelLabel(index);
    ui.select.appendChild(option);
  });
  const savedRun = readSaved(SAVE_KEY);
  loadLevel(levelIndex, true);
  restoreRun(savedRun);
  function dockUtilities() {
    document.querySelectorAll('.theme-toggle,.clear-data-toggle').forEach(button => document.getElementById('utilityDock').appendChild(button));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dockUtilities, {once:true});
  else dockUtilities();
})();
