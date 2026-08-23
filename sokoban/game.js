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
        board: '#080d14', floor: '#111a26', floorGrid: '#172231',
        wall: '#222f3e', wallTop: '#34495e', wallMark: '#17202a',
        goal: '#f43f5e', goalBg: 'rgba(244, 63, 94, 0.14)',
        box: '#f59e0b', boxFrame: '#b45309', boxLine: '#78350f',
        boxGoal: '#10b981', boxGoalFrame: '#047857',
        player: '#e8f0f7', playerMark: '#0284c7',
        playerHat: '#fbbf24', playerSkin: '#fed7aa', playerBoots: '#0f172a'
      };
    }
    const css = getComputedStyle(document.documentElement), get = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    return {
      board: get('--board', '#080d14'),
      floor: get('--floor', '#111a26'),
      floorGrid: get('--floor-grid', '#172231'),
      wall: get('--wall', '#222f3e'),
      wallTop: get('--wall-top', '#34495e'),
      wallMark: get('--wall-mark', '#17202a'),
      goal: get('--goal', '#f43f5e'),
      goalBg: get('--goal-bg', 'rgba(244, 63, 94, 0.14)'),
      box: get('--gold', '#f59e0b'),
      boxFrame: get('--gold-frame', '#b45309'),
      boxLine: get('--gold-line', '#78350f'),
      boxGoal: get('--box-goal', '#10b981'),
      boxGoalFrame: get('--box-goal-frame', '#047857'),
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

  function drawWall(x, y, size, colors) {
    const s = size;
    ctx.fillStyle = colors.wall;
    ctx.fillRect(x + 1, y + 1, s - 2, s - 2);

    ctx.fillStyle = colors.wallTop;
    ctx.fillRect(x + 2, y + 2, s - 4, Math.max(2, s * 0.12));
    ctx.fillRect(x + 2, y + 2, Math.max(2, s * 0.1), s - 4);

    ctx.fillStyle = colors.wallMark;
    ctx.fillRect(x + s * 0.18, y + s * 0.18, s * 0.64, Math.max(2, s * 0.05));
    ctx.fillRect(x + 2, y + s * 0.55, s - 4, Math.max(1, s * 0.04));
    ctx.fillRect(x + s * 0.48, y + s * 0.55, Math.max(1, s * 0.04), s * 0.4);
  }

  function drawGoal(x, y, size, colors, covered = false) {
    const inset = size * 0.24, arm = size * 0.15, line = Math.max(2,size*.055);
    if (!covered) {
      ctx.fillStyle = colors.goalBg;
      ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
    }
    ctx.strokeStyle = colors.goal;
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.moveTo(x + inset + arm, y + inset); ctx.lineTo(x + inset, y + inset); ctx.lineTo(x + inset, y + inset + arm);
    ctx.moveTo(x + size - inset - arm, y + inset); ctx.lineTo(x + size - inset, y + inset); ctx.lineTo(x + size - inset, y + inset + arm);
    ctx.moveTo(x + inset, y + size - inset - arm); ctx.lineTo(x + inset, y + size - inset); ctx.lineTo(x + inset + arm, y + size - inset);
    ctx.moveTo(x + size - inset - arm, y + size - inset); ctx.lineTo(x + size - inset, y + size - inset); ctx.lineTo(x + size - inset, y + size - inset - arm);
    ctx.stroke();

    if (!covered) {
      ctx.fillStyle = colors.goal;
      ctx.fillRect(x+size*.47,y+size*.47,size*.06,size*.06);
    }
  }

  function drawCrate(x, y, size, colors, onGoal) {
    const inset = size * 0.14, boxSize = size * 0.72;
    if(onGoal) drawGoal(x, y, size, colors, true);

    const mainColor = onGoal ? colors.boxGoal : colors.box;
    const frameColor = onGoal ? colors.boxGoalFrame : (colors.boxFrame || colors.playerMark);

    ctx.fillStyle = mainColor;
    ctx.fillRect(x + inset, y + inset, boxSize, boxSize);

    ctx.strokeStyle = frameColor;
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeRect(x + inset, y + inset, boxSize, boxSize);

    ctx.strokeStyle = onGoal ? 'rgba(255, 255, 255, 0.45)' : (colors.boxLine || frameColor);
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(x+size*.3,y+size*.3);
    ctx.lineTo(x+size*.7,y+size*.7);
    ctx.moveTo(x+size*.7,y+size*.3);
    ctx.lineTo(x+size*.3,y+size*.7);
    ctx.stroke();

    ctx.fillStyle = colors.player;
    const rivet = Math.max(2, size * 0.045);
    for (const [rx, ry] of [[0.22, 0.22], [0.74, 0.22], [0.22, 0.74], [0.74, 0.74]]) {
      ctx.fillRect(x + size * rx, y + size * ry, rivet, rivet);
    }

    if(onGoal) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2.5, size * 0.08);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x+size*.37,y+size*.51);
      ctx.lineTo(x+size*.47,y+size*.61);
      ctx.lineTo(x+size*.66,y+size*.39);
      ctx.stroke();
    }
  }

  function drawPlayer(x, y, size, colors) {
    const s = size;
    const bodyW = s * 0.48, bodyH = s * 0.36;
    const bodyX = x + (s - bodyW) / 2, bodyY = y + s * 0.4;
    const helmet = s * 0.16;

    ctx.fillStyle = colors.playerMark;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    ctx.fillStyle = colors.playerSkin || '#fed7aa';
    ctx.fillRect(x + s * 0.32, y + s * 0.28, s * 0.36, s * 0.16);

    ctx.fillStyle = colors.playerHat || '#fbbf24';
    ctx.fillRect(x + s * 0.24, y + s * 0.22, s * 0.52, helmet);
    ctx.fillRect(x + s * 0.31, y + s * 0.16, s * 0.38, s * 0.09);

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
          ctx.fillStyle = colors.floor;
          ctx.fillRect(px + 1, py + 1, s - 2, s - 2);
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
