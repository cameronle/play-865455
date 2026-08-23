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
        board: '#070b12', floor: '#101722', floorLine: '#162232', floorDot: '#1e2d42',
        wall: '#1e293b', wallTop: '#334155', wallEdge: '#0f172a',
        goal: '#f43f5e', goalBg: 'rgba(244, 63, 94, 0.12)', goalRing: 'rgba(244, 63, 94, 0.28)',
        box: '#d97706', boxTop: '#f59e0b', boxFrame: '#92400e', boxLine: '#78350f', boxShadow: 'rgba(0,0,0,0.35)',
        boxGoal: '#059669', boxGoalTop: '#10b981', boxGoalFrame: '#065f46',
        player: '#e8f0f7', playerMark: '#0284c7',
        playerHat: '#fbbf24', playerSkin: '#fed7aa', playerBoots: '#0f172a'
      };
    }
    const css = getComputedStyle(document.documentElement), get = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return {
      board: get('--board', '#070b12'),
      floor: get('--floor', '#101722'),
      floorLine: get('--floor-line', '#162232'),
      floorDot: get('--floor-dot', '#1e2d42'),
      wall: get('--wall', '#1e293b'),
      wallTop: get('--wall-top', '#334155'),
      wallEdge: get('--wall-edge', '#0f172a'),
      goal: get('--goal', '#f43f5e'),
      goalBg: get('--goal-bg', 'rgba(244, 63, 94, 0.12)'),
      goalRing: get('--goal-ring', 'rgba(244, 63, 94, 0.28)'),
      box: get('--box', '#d97706'),
      boxTop: get('--box-top', '#f59e0b'),
      boxFrame: get('--box-frame', '#92400e'),
      boxLine: get('--box-line', '#78350f'),
      boxShadow: get('--box-shadow', 'rgba(0,0,0,0.35)'),
      boxGoal: get('--box-goal', '#059669'),
      boxGoalTop: get('--box-goal-top', '#10b981'),
      boxGoalFrame: get('--box-goal-frame', '#065f46'),
      player: get('--player', '#e8f0f7'),
      playerMark: get('--player-suit', '#0284c7'),
      playerHat: get('--player-hat', '#fbbf24'),
      playerSkin: get('--player-skin', '#fed7aa'),
      playerBoots: get('--player-boots', '#0f172a')
    };
  }

  function isInterior(x, y) {
    const k = `${x},${y}`;
    if (state.walls[k] || state.goals[k] || state.boxes[k]) return true;
    if (state.player.x === x && state.player.y === y) return true;
    return x >= 0 && x < state.width && y >= 0 && y < state.height;
  }

  function roundRectPath(x, y, w, h, r) {
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

  function drawWall(x, y, size, colors) {
    const s = size;
    const r = Math.max(3, s * 0.08);

    // Wall base block with soft rounded corners
    roundRectPath(x + 1.5, y + 1.5, s - 3, s - 3, r);
    ctx.fillStyle = colors.wall;
    ctx.fill();

    // Subtle 3D top bevel cap
    roundRectPath(x + 2, y + 2, s - 4, s * 0.42, Math.max(2, r - 1));
    ctx.fillStyle = colors.wallTop;
    ctx.fill();

    // Clean outer outline
    roundRectPath(x + 1.5, y + 1.5, s - 3, s - 3, r);
    ctx.strokeStyle = colors.wallEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGoal(x, y, size, colors, covered = false) {
    const s = size;
    const inset = size * 0.24, arm = size * 0.15, line = Math.max(2,size*.055);
    const cx = x + s / 2, cy = y + s / 2;

    if (!covered) {
      // Soft ambient circular pad
      ctx.fillStyle = colors.goalBg;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.34, 0, Math.PI * 2);
      ctx.fill();

      // Subtle target ring
      ctx.strokeStyle = colors.goalRing;
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.stroke();
    }

    // Target corner brackets
    ctx.strokeStyle = colors.goal;
    ctx.lineWidth = line;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + inset + arm, y + inset); ctx.lineTo(x + inset, y + inset); ctx.lineTo(x + inset, y + inset + arm);
    ctx.moveTo(x + size - inset - arm, y + inset); ctx.lineTo(x + size - inset, y + inset); ctx.lineTo(x + size - inset, y + inset + arm);
    ctx.moveTo(x + inset, y + size - inset - arm); ctx.lineTo(x + inset, y + size - inset); ctx.lineTo(x + inset + arm, y + size - inset);
    ctx.moveTo(x + size - inset - arm, y + size - inset); ctx.lineTo(x + size - inset, y + size - inset); ctx.lineTo(x + size - inset, y + size - inset - arm);
    ctx.stroke();

    if(!covered) {
      // Glowing center beacon dot
      ctx.fillStyle = colors.goal;
      ctx.fillRect(x+size*.47,y+size*.47,size*.06,size*.06);
    }
  }

  function drawCrate(x, y, size, colors, onGoal) {
    const s = size;
    const inset = size * 0.14, boxSize = size * 0.72;
    const r = Math.max(3, boxSize * 0.1);

    if (onGoal) drawGoal(x, y, size, colors, true);

    // Soft grounded shadow beneath crate
    ctx.fillStyle = colors.boxShadow;
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + inset + boxSize + s * 0.02, boxSize * 0.44, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    const mainColor = onGoal ? colors.boxGoal : colors.box;
    const topColor = onGoal ? colors.boxGoalTop : colors.boxTop;
    const frameColor = onGoal ? colors.boxGoalFrame : (colors.boxFrame || colors.playerMark);

    // Main rounded box body
    roundRectPath(x + inset, y + inset, boxSize, boxSize, r);
    ctx.fillStyle = mainColor;
    ctx.fill();

    // Top bevel highlight
    roundRectPath(x + inset + 2, y + inset + 2, boxSize - 4, boxSize * 0.38, Math.max(2, r - 1));
    ctx.fillStyle = topColor;
    ctx.fill();

    // Outer structural frame
    roundRectPath(x + inset, y + inset, boxSize, boxSize, r);
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.stroke();

    // Diagonal structural bracing (X)
    ctx.strokeStyle = onGoal ? 'rgba(255, 255, 255, 0.4)' : (colors.boxLine || frameColor);
    ctx.lineWidth = Math.max(1.5, size * 0.035);
    ctx.beginPath();
    ctx.moveTo(x+size*.3,y+size*.3);
    ctx.lineTo(x+size*.7,y+size*.7);
    ctx.moveTo(x+size*.7,y+size*.3);
    ctx.lineTo(x+size*.3,y+size*.7);
    ctx.stroke();

    // Clean corner rivets
    ctx.fillStyle = onGoal ? '#ffffff' : colors.player;
    const rivet = Math.max(2, size * 0.04);
    for (const [rx, ry] of [[0.22, 0.22], [0.74, 0.22], [0.22, 0.74], [0.74, 0.74]]) {
      ctx.fillRect(x + size * rx, y + size * ry, rivet, rivet);
    }

    // Clear completed check mark
    if(onGoal) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2.5, size * 0.08);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + size * 0.37, y + size * 0.51);
      ctx.lineTo(x + size * 0.47, y + size * 0.61);
      ctx.lineTo(x + size * 0.66, y + size * 0.39);
      ctx.stroke();
    }
  }

  function drawPlayer(x, y, size, colors) {
    const s = size;
    const bodyW = s * 0.48, bodyH = s * 0.36;
    const bodyX = x + (s - bodyW) / 2, bodyY = y + s * 0.4;
    const helmet = s * 0.16;

    // Soft grounded shadow beneath player
    ctx.fillStyle = colors.boxShadow;
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s * 0.86, s * 0.26, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // High-visibility uniform torso (blue/cyan)
    ctx.fillStyle = colors.playerMark;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    // Face / skin area
    ctx.fillStyle = colors.playerSkin || '#fed7aa';
    ctx.fillRect(x + s * 0.32, y + s * 0.28, s * 0.36, s * 0.16);

    // Safety Helmet (yellow/amber with brim)
    ctx.fillStyle = colors.playerHat || '#fbbf24';
    ctx.fillRect(x + s * 0.24, y + s * 0.22, s * 0.52, helmet);
    ctx.fillRect(x + s * 0.31, y + s * 0.16, s * 0.38, s * 0.09);

    // Eyes / Visor directional rendering
    ctx.fillStyle = '#0f172a';
    const eye = Math.max(2, s * 0.06), eyeY = y + s * 0.32;
    let eye1 = x + s * 0.37, eye2 = x + s * 0.55;
    if (playerDirection==='left') {
      eye1 = x + s * 0.32; eye2 = x + s * 0.45;
    }
    if (playerDirection==='right') {
      eye1 = x + s * 0.49; eye2 = x + s * 0.62;
    }
    if (playerDirection === 'up') {
      ctx.fillStyle = colors.playerHat || '#fbbf24';
      ctx.fillRect(x + s * 0.28, y + s * 0.26, s * 0.44, s * 0.16);
    } else {
      ctx.fillRect(eye1, eyeY, eye, eye);
      ctx.fillRect(eye2, eyeY, eye, eye);
    }

    // Work boots
    ctx.fillStyle = colors.playerBoots || '#0f172a';
    ctx.fillRect(x + s * 0.29, y + s * 0.74, s * 0.16, s * 0.11);
    ctx.fillRect(x + s * 0.55, y + s * 0.74, s * 0.16, s * 0.11);
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
          // Warm clean floor tile
          ctx.fillStyle = colors.floor;
          ctx.fillRect(px + 1, py + 1, s - 2, s - 2);

          // Delicate floor grid outline
          ctx.strokeStyle = colors.floorLine || colors.board;
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
    playerDirection=directionName(dx,dy);
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
