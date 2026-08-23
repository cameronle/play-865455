(() => {
  'use strict';
  const R = window.SokobanRules;
  const levels = window.SokobanLevels;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const ui = {
    level: document.getElementById('level'), moves: document.getElementById('moves'), pushes: document.getElementById('pushes'), best: document.getElementById('best'),
    overlay: document.getElementById('overlay'), title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'), start: document.getElementById('startButton')
  };

  let levelIndex = Math.max(0, Math.min(levels.length - 1, Number(localStorage.getItem('sokobanUnlocked') || 0)));
  let state, history = [], active = false, swipeStart = null;
  let playerDirection = 'down';

  function cloneState(s) {
    return {width:s.width,height:s.height,walls:{...s.walls},goals:{...s.goals},boxes:{...s.boxes},player:{...s.player},moves:s.moves,pushes:s.pushes};
  }

  function bestKey() { return `sokobanBest${levelIndex}`; }

  function loadLevel(index, showIntro = false) {
    levelIndex = (index + levels.length) % levels.length;
    state = R.parseLevel(levels[levelIndex]);
    history = [];
    active = !showIntro;
    updateUi();
    draw();
    if (showIntro) showOverlay('SOKOBAN', 'PUSH EVERY CRATE ONTO A GOAL', 'START');
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
        board: '#070b12', floor: '#111a26', floorGrid: '#172233',
        wall: '#1e293b', wallBorder: '#334155',
        goal: '#f43f5e', goalBg: 'rgba(244, 63, 94, 0.12)',
        box: '#f59e0b', boxBorder: '#d97706', boxLine: 'rgba(0,0,0,0.18)',
        boxGoal: '#10b981', boxGoalBorder: '#059669',
        player: '#0ea5e9', playerBorder: '#0284c7'
      };
    }
    const css = getComputedStyle(document.documentElement), get = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return {
      board: get('--board', '#070b12'),
      floor: get('--floor', '#111a26'),
      floorGrid: get('--floor-grid', '#172233'),
      wall: get('--wall', '#1e293b'),
      wallBorder: get('--wall-border', '#334155'),
      goal: get('--goal', '#f43f5e'),
      goalBg: get('--goal-bg', 'rgba(244, 63, 94, 0.12)'),
      box: get('--box', '#f59e0b'),
      boxBorder: get('--box-border', '#d97706'),
      boxLine: get('--box-line', 'rgba(0,0,0,0.18)'),
      boxGoal: get('--box-goal', '#10b981'),
      boxGoalBorder: get('--box-goal-border', '#059669'),
      player: get('--player', '#0ea5e9'),
      playerBorder: get('--player-border', '#0284c7')
    };
  }

  function isInterior(x, y) {
    const k = `${x},${y}`;
    if (state.walls[k] || state.goals[k] || state.boxes[k]) return true;
    if (state.player.x === x && state.player.y === y) return true;
    return x >= 0 && x < state.width && y >= 0 && y < state.height;
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

  function drawWall(x, y, s, colors) {
    const r = Math.max(3, s * 0.1);
    roundRect(x + 1.5, y + 1.5, s - 3, s - 3, r);
    ctx.fillStyle = colors.wall;
    ctx.fill();
    ctx.strokeStyle = colors.wallBorder || colors.wall;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGoal(x, y, s, colors, covered = false) {
    const cx = x + s / 2, cy = y + s / 2;
    const r = s * 0.26;

    if (!covered) {
      // Soft background pad
      ctx.fillStyle = colors.goalBg;
      ctx.beginPath();
      ctx.arc(cx, cy, r + s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    // Target outer ring
    ctx.strokeStyle = colors.goal;
    ctx.lineWidth = Math.max(2, s * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    if (!covered) {
      // Target center dot
      ctx.fillStyle = colors.goal;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, s * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCrate(x, y, s, colors, onGoal) {
    const inset = s * 0.12, boxSize = s * 0.76;
    const r = Math.max(3, boxSize * 0.12);

    if (onGoal) drawGoal(x, y, s, colors, true);

    const mainColor = onGoal ? colors.boxGoal : colors.box;
    const borderColor = onGoal ? colors.boxGoalBorder : colors.boxBorder;

    // Clean flat rounded box body
    roundRect(x + inset, y + inset, boxSize, boxSize, r);
    ctx.fillStyle = mainColor;
    ctx.fill();

    // Clean crisp border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.stroke();

    if (onGoal) {
      // Bold, clean white checkmark
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2.5, s * 0.08);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.36, y + s * 0.50);
      ctx.lineTo(x + s * 0.46, y + s * 0.60);
      ctx.lineTo(x + s * 0.64, y + s * 0.40);
      ctx.stroke();
    } else {
      // Subtle minimalist cross brace
      ctx.strokeStyle = colors.boxLine || 'rgba(0,0,0,0.15)';
      ctx.lineWidth = Math.max(1.5, s * 0.035);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.28, y + s * 0.28);
      ctx.lineTo(x + s * 0.72, y + s * 0.72);
      ctx.moveTo(x + s * 0.72, y + s * 0.28);
      ctx.lineTo(x + s * 0.28, y + s * 0.72);
      ctx.stroke();
    }
  }

  function drawPlayer(x, y, s, colors) {
    const cx = x + s / 2, cy = y + s / 2;
    const radius = s * 0.36;

    // Clean circular player avatar
    ctx.fillStyle = colors.player;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = colors.playerBorder || '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.stroke();

    // Directional eyes
    ctx.fillStyle = '#ffffff';
    const eyeR = Math.max(2, s * 0.07);
    let ex1 = cx - s * 0.12, ex2 = cx + s * 0.12, ey = cy - s * 0.04;

    if (playerDirection === 'left') {
      ex1 = cx - s * 0.22; ex2 = cx - s * 0.04; ey = cy;
    } else if (playerDirection === 'right') {
      ex1 = cx + s * 0.04; ex2 = cx + s * 0.22; ey = cy;
    } else if (playerDirection === 'up') {
      ex1 = cx - s * 0.12; ex2 = cx + s * 0.12; ey = cy - s * 0.16;
    } else if (playerDirection === 'down') {
      ex1 = cx - s * 0.12; ex2 = cx + s * 0.12; ey = cy + s * 0.08;
    }

    ctx.beginPath();
    ctx.arc(ex1, ey, eyeR, 0, Math.PI * 2);
    ctx.arc(ex2, ey, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Dark pupils
    ctx.fillStyle = '#0f172a';
    const pupilR = Math.max(1, eyeR * 0.55);
    ctx.beginPath();
    ctx.arc(ex1, ey, pupilR, 0, Math.PI * 2);
    ctx.arc(ex2, ey, pupilR, 0, Math.PI * 2);
    ctx.fill();
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
          // Flat seamless floor tile
          ctx.fillStyle = colors.floor;
          ctx.fillRect(px + 1, py + 1, s - 2, s - 2);

          // Subtle floor grid line
          ctx.strokeStyle = colors.floorGrid || colors.board;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
        }

        if (state.goals[k] && !state.boxes[k]) {
          drawGoal(px, py, s, colors);
        }
        if (state.boxes[k]) {
          const onGoal = !!state.goals[k];
          drawCrate(px, py, s, colors, onGoal);
        }
      }
    }

    const px = g.ox + state.player.x * s, py = g.oy + state.player.y * s;
    drawPlayer(px, py, s, colors);
  }

  function attempt(dx, dy) {
    if (!active) { active = true; hideOverlay(); }
    const before = cloneState(state);
    if (!R.move(state, dx, dy)) return;
    playerDirection = directionName(dx, dy);
    history.push(before);
    updateUi();
    draw();
    if (R.isComplete(state)) {
      active = false;
      const old = Number(localStorage.getItem(bestKey()) || Infinity);
      if (state.moves < old) localStorage.setItem(bestKey(), state.moves);
      const unlocked = Math.max(Number(localStorage.getItem('sokobanUnlocked') || 0), Math.min(levels.length - 1, levelIndex + 1));
      localStorage.setItem('sokobanUnlocked', unlocked);
      updateUi();
      showOverlay('LEVEL CLEAR', `${state.moves} MOVES · ${state.pushes} PUSHES`, levelIndex === levels.length - 1 ? 'PLAY AGAIN' : 'NEXT LEVEL');
    }
  }

  function directionName(dx, dy) {
    return dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
  }

  function undo() {
    if (!history.length) return;
    state = history.pop();
    active = true;
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
    if (R.isComplete(state)) loadLevel(levelIndex === levels.length - 1 ? 0 : levelIndex + 1);
    else { active = true; hideOverlay(); }
  });

  if (document.addEventListener) document.addEventListener('themechange', draw);
  loadLevel(levelIndex, true);
})();
