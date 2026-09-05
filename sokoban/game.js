(() => {
  'use strict';
  const R = window.SokobanRules;
  const levels = window.SokobanLevels;
  const NEXT_LEVEL_SECONDS = 5;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const ui = {
    level: document.getElementById('level'), moves: document.getElementById('moves'), pushes: document.getElementById('pushes'), best: document.getElementById('best'),
    overlay: document.getElementById('overlay'), title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'), start: document.getElementById('startButton')
  };

  let levelIndex = Math.max(0, Math.min(levels.length - 1, Number(localStorage.getItem('sokobanUnlocked') || 0)));
  let state, history = [], active = false, swipeStart = null;
  let playerDirection = 'down';
  let gamePhase = 'title', countdownTimer = 0;

  function cloneState(s) {
    return {width:s.width,height:s.height,walls:{...s.walls},goals:{...s.goals},boxes:{...s.boxes},player:{...s.player},moves:s.moves,pushes:s.pushes};
  }

  function bestKey() { return `sokobanBest${levelIndex}`; }

  function loadLevel(index, showIntro = false) {
    cancelNextLevelCountdown();
    levelIndex = (index + levels.length) % levels.length;
    state = R.parseLevel(levels[levelIndex]);
    history = [];
    active = !showIntro;
    gamePhase = showIntro ? 'title' : 'playing';
    updateUi();
    draw();
    if (showIntro) showOverlay('BEAR & BOXES', 'PUSH EVERY FRUIT CRATE INTO A BASKET', 'START THE WALK');
    else hideOverlay();
  }

  function updateUi() {
    ui.level.textContent = `${String(levelIndex + 1).padStart(2,'0')} / ${String(levels.length).padStart(2,'0')}`;
    ui.moves.textContent = String(state.moves).padStart(3,'0');
    ui.pushes.textContent = String(state.pushes).padStart(3,'0');
    const best = localStorage.getItem(bestKey());
    ui.best.textContent = best === null ? '---' : String(best).padStart(3,'0');
  }

  function showOverlay(title, text, button) {
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.start.textContent = button;
    ui.overlay.classList.remove('hide');
  }

  function hideOverlay() { ui.overlay.classList.add('hide'); }

  function cancelNextLevelCountdown() {
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
      showOverlay('PACK COMPLETE', `${state.moves} MOVES · ${state.pushes} PUSHES`, 'PLAY AGAIN');
      return;
    }
    let remaining = NEXT_LEVEL_SECONDS;
    showOverlay('LEVEL CLEAR', countdownText(remaining), 'SKIP 5S');
    countdownTimer = window.setInterval(() => {
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
    return x >= 0 && x < state.width && y >= 0 && y < state.height;
  }

  function drawWall(x, y, s, colors) {
    ctx.fillStyle = colors.wall;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    ctx.strokeStyle = colors.wallBorder || colors.wall;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }

  function drawGoal(x, y, s, colors, covered = false) {
    const inset = s * 0.23;
    const size = s - inset * 2;
    const radius = Math.max(2, s * 0.05);

    // One square language for target, crate and player.
    ctx.strokeStyle = colors.goal;
    ctx.lineWidth = Math.max(2, s * 0.055);
    ctx.beginPath();
    ctx.moveTo(x + inset + radius, y + inset);
    ctx.lineTo(x + inset + size - radius, y + inset);
    ctx.lineTo(x + inset + size, y + inset + radius);
    ctx.lineTo(x + inset + size, y + inset + size - radius);
    ctx.lineTo(x + inset + size - radius, y + inset + size);
    ctx.lineTo(x + inset + radius, y + inset + size);
    ctx.lineTo(x + inset, y + inset + size - radius);
    ctx.lineTo(x + inset, y + inset + radius);
    ctx.closePath();
    ctx.stroke();

    if (!covered) {
      ctx.fillStyle = colors.goal;
      ctx.fillRect(x + s * 0.47, y + s * 0.47, s * 0.06, s * 0.06);
    }
  }

  function drawCrate(x, y, s, colors, onGoal) {
    const inset = s * 0.13;
    const size = s - inset * 2;

    // Keep the target outline visible behind a box on a goal.
    if (onGoal) drawGoal(x, y, s, colors, true);

    ctx.fillStyle = colors.orange;
    ctx.fillRect(x + inset, y + inset, size, size);
    ctx.strokeStyle = colors.orangeBorder || colors.orange;
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, size - 1, size - 1);

    if (onGoal) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = Math.max(2, s * 0.07);
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.36, y + s * 0.51);
      ctx.lineTo(x + s * 0.46, y + s * 0.61);
      ctx.lineTo(x + s * 0.65, y + s * 0.39);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.29, y + s * 0.29);
      ctx.lineTo(x + s * 0.71, y + s * 0.71);
      ctx.moveTo(x + s * 0.71, y + s * 0.29);
      ctx.lineTo(x + s * 0.29, y + s * 0.71);
      ctx.stroke();
    }
  }

  function drawPlayer(x, y, s, colors) {
    const inset = s * 0.18;
    const size = s - inset * 2;

    // A small flat square avatar, not a separate cartoon style.
    ctx.fillStyle = colors.player;
    ctx.fillRect(x + inset, y + inset, size, size);
    ctx.strokeStyle = colors.playerBorder || colors.player;
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.strokeRect(x + inset + 0.5, y + inset + 0.5, size - 1, size - 1);

    ctx.fillStyle = colors.ink;
    const eye = Math.max(2, s * 0.06);
    let eye1 = x + s * 0.39;
    let eye2 = x + s * 0.55;
    let eyeY = y + s * 0.43;
    if (playerDirection === 'left') {
      eye1 = x + s * 0.32;
      eye2 = x + s * 0.46;
      eyeY = y + s * 0.50;
    } else if (playerDirection === 'right') {
      eye1 = x + s * 0.48;
      eye2 = x + s * 0.62;
      eyeY = y + s * 0.50;
    } else if (playerDirection === 'up') {
      eyeY = y + s * 0.34;
    } else if (playerDirection === 'down') {
      eyeY = y + s * 0.54;
    }
    ctx.fillRect(eye1, eyeY, eye, eye);
    ctx.fillRect(eye2, eyeY, eye, eye);
  }

  function draw() {
    const colors = palette();
    ctx.fillStyle = colors.board;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const g = tileGeometry(), s = g.size;

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const k = `${x},${y}`, px = g.ox + x * s, py = g.oy + y * s;

        if (state.walls[k]) {
          drawWall(px, py, s, colors);
        } else if (isInterior(x, y)) {
          ctx.fillStyle = colors.floor;
          ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
          ctx.strokeStyle = colors.floorGrid || colors.board;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
        }

        if (state.goals[k] && !state.boxes[k]) drawGoal(px, py, s, colors);
        if (state.boxes[k]) drawCrate(px, py, s, colors, !!state.goals[k]);
      }
    }

    const px = g.ox + state.player.x * s, py = g.oy + state.player.y * s;
    drawPlayer(px, py, s, colors);
  }

  function attempt(dx, dy) {
    if (gamePhase === 'title') {
      gamePhase = 'playing';
      active = true;
      hideOverlay();
    }
    if (gamePhase !== 'playing') return;
    const before = cloneState(state);
    if (!R.move(state, dx, dy)) return;
    playerDirection = directionName(dx, dy);
    history.push(before);
    updateUi();
    draw();
    if (R.isComplete(state)) {
      active = false;
      gamePhase = 'complete';
      const old = Number(localStorage.getItem(bestKey()) || Infinity);
      if (state.moves < old) localStorage.setItem(bestKey(), state.moves);
      const unlocked = Math.max(Number(localStorage.getItem('sokobanUnlocked') || 0), Math.min(levels.length - 1, levelIndex + 1));
      localStorage.setItem('sokobanUnlocked', unlocked);
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
    state = history.pop();
    active = true;
    gamePhase = 'playing';
    hideOverlay();
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
    if (directions[e.code]) {
      e.preventDefault();
      attempt(...directions[e.code]);
    } else if (e.code === 'KeyR') {
      loadLevel(levelIndex);
    } else if (e.code === 'KeyZ') {
      undo();
    }
  });

  document.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('pointerdown', e => {
    e.preventDefault();
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    attempt(...map[button.dataset.dir]);
  }));

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    swipeStart = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', e => {
    if (!swipeStart) return;
    const dx = e.clientX - swipeStart.x, dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) attempt(Math.sign(dx), 0);
    else attempt(0, Math.sign(dy));
  });

  canvas.addEventListener('pointercancel', () => swipeStart = null);

  document.getElementById('resetButton').addEventListener('click', () => loadLevel(levelIndex));
  document.getElementById('undoButton').addEventListener('click', undo);
  document.getElementById('previousButton').addEventListener('click', () => loadLevel(levelIndex - 1));
  document.getElementById('nextButton').addEventListener('click', () => loadLevel(levelIndex + 1));
  ui.start.addEventListener('click', () => {
    if (gamePhase === 'complete') {
      loadLevel(levelIndex === levels.length - 1 ? 0 : levelIndex + 1);
    } else {
      gamePhase = 'playing';
      active = true;
      hideOverlay();
    }
  });

  function drawGoal(x, y, s, colors, covered = false) {
    const inset = s * 0.2, size = s - inset * 2;
    ctx.strokeStyle = colors.goal; ctx.lineWidth = Math.max(2, s * 0.055); ctx.strokeRect(x + inset, y + inset, size, size);
    if (!covered) { ctx.fillStyle = colors.goal; ctx.fillRect(x + s * .31, y + s * .47, s * .12, s * .12); ctx.fillRect(x + s * .57, y + s * .47, s * .12, s * .12); ctx.strokeStyle = colors.orange; ctx.lineWidth = Math.max(1.5, s * .04); ctx.beginPath(); ctx.moveTo(x + s * .28, y + s * .73); ctx.lineTo(x + s * .72, y + s * .73); ctx.stroke(); }
  }

  function drawCrate(x, y, s, colors, onGoal) {
    if (onGoal) drawGoal(x, y, s, colors, true);
    const inset = s * .12, size = s - inset * 2;
    ctx.fillStyle = colors.orange; ctx.fillRect(x + inset, y + inset, size, size); ctx.strokeStyle = colors.orangeBorder || colors.orange; ctx.lineWidth = Math.max(1.5, s * .035); ctx.strokeRect(x + inset + .5, y + inset + .5, size - 1, size - 1);
    ctx.strokeStyle = colors.orangeBorder || colors.ink; ctx.lineWidth = Math.max(1.5, s * .03); ctx.beginPath(); ctx.moveTo(x + s * .2, y + s * .34); ctx.lineTo(x + s * .8, y + s * .34); ctx.moveTo(x + s * .2, y + s * .65); ctx.lineTo(x + s * .8, y + s * .65); ctx.stroke();
    ctx.fillStyle = colors.red; ctx.fillRect(x + s * .28, y + s * .43, s * .12, s * .12); ctx.fillStyle = colors.cyan; ctx.fillRect(x + s * .45, y + s * .39, s * .12, s * .12); ctx.fillStyle = colors.player; ctx.fillRect(x + s * .61, y + s * .45, s * .12, s * .12);
    ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1.5, s * .035); ctx.beginPath(); ctx.moveTo(x + s * .34, y + s * .43); ctx.lineTo(x + s * .37, y + s * .36); ctx.moveTo(x + s * .51, y + s * .39); ctx.lineTo(x + s * .54, y + s * .32); ctx.moveTo(x + s * .67, y + s * .45); ctx.lineTo(x + s * .7, y + s * .38); ctx.stroke();
    if (onGoal) { ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(2, s * .07); ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(x + s * .32, y + s * .54); ctx.lineTo(x + s * .44, y + s * .66); ctx.lineTo(x + s * .7, y + s * .37); ctx.stroke(); }
  }

  function drawPlayer(x, y, s, colors) {
    const bodyX = x + s * 0.2, bodyY = y + s * 0.37, bodyW = s * 0.6, bodyH = s * 0.46;
    ctx.fillStyle = colors.player; ctx.strokeStyle = colors.playerBorder || colors.player; ctx.lineWidth = Math.max(2, s * 0.035); ctx.lineJoin = 'round';
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH); ctx.strokeRect(bodyX + .5, bodyY + .5, bodyW - 1, bodyH - 1);
    ctx.fillStyle = colors.player; ctx.fillRect(x + s * .18, y + s * .16, s * .64, s * .46); ctx.strokeStyle = colors.playerBorder || colors.player; ctx.strokeRect(x + s * .185, y + s * .165, s * .63, s * .45);
    ctx.fillStyle = colors.orange; ctx.fillRect(x + s * .12, y + s * .06, s * .18, s * .18); ctx.fillRect(x + s * .7, y + s * .06, s * .18, s * .18); ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1.5, s * .03); ctx.strokeRect(x + s * .12, y + s * .06, s * .18, s * .18); ctx.strokeRect(x + s * .7, y + s * .06, s * .18, s * .18);
    ctx.fillStyle = colors.ink; const eye = Math.max(2, s * .06); ctx.fillRect(x + s * .34, y + s * .31, eye, eye); ctx.fillRect(x + s * .58, y + s * .31, eye, eye);
    ctx.fillStyle = colors.red; ctx.fillRect(x + s * .46, y + s * .41, s * .08, s * .06);
    ctx.fillStyle = colors.orange; ctx.fillRect(x + s * .18, y + s * .78, s * .64, s * .09); ctx.strokeStyle = colors.ink; ctx.lineWidth = Math.max(1.5, s * .03); ctx.strokeRect(x + s * .18, y + s * .78, s * .64, s * .09);
  }

  function draw() {
    const colors = palette(); ctx.fillStyle = colors.board; ctx.fillRect(0, 0, canvas.width, canvas.height); const g = tileGeometry(), s = g.size;
    for (let y = 0; y < state.height; y++) for (let x = 0; x < state.width; x++) { const k = `${x},${y}`, px = g.ox + x * s, py = g.oy + y * s; if (state.walls[k]) drawWall(px, py, s, colors); else if (isInterior(x, y)) { ctx.fillStyle = colors.floor; ctx.fillRect(px + 1, py + 1, s - 2, s - 2); ctx.strokeStyle = colors.floorGrid || colors.board; ctx.lineWidth = 1; ctx.strokeRect(px + .5, py + .5, s - 1, s - 1); } if (state.goals[k] && !state.boxes[k]) drawGoal(px, py, s, colors); if (state.boxes[k]) drawCrate(px, py, s, colors, !!state.goals[k]); }
    drawPlayer(g.ox + state.player.x * s, g.oy + state.player.y * s, s, colors);
  }

  if (document.addEventListener) document.addEventListener('themechange', draw);
  loadLevel(levelIndex, true);
})();
