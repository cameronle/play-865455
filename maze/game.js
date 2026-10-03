(() => {
  'use strict';
  const { createMaze, chooseEnemyStep } = window.MazeLogic;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const SIZE = 15, CELL = 32, WIDTH = 480;
  const maze = createMaze();
  const directions = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  let state = 'title', score = 0, high = readHigh();
  let level = 1, lives = 3, player, enemies, dots;
  let direction = { x: 0, y: 0 }, queued = { x: 0, y: 0 }, last = 0, timer = 0, swipe = null, rafId = null;

  function readHigh() {
    try { const value = Number(localStorage.getItem('maze-high')); return Number.isSafeInteger(value) && value >= 0 ? value : 0; } catch { return 0; }
  }
  function saveHigh() {
    try { localStorage.setItem('maze-high', String(high)); } catch { /* Gameplay works without storage. */ }
  }

  const openCells = [];
  for (let row = 1; row < SIZE - 1; row++) for (let col = 1; col < SIZE - 1; col++) if (!maze.isWall(row, col)) openCells.push({ row, col });

  function updateHud() {
    $('score').textContent = String(score).padStart(6, '0');
    $('high').textContent = String(high).padStart(6, '0');
    $('level').textContent = String(level).padStart(2, '0');
    $('remaining').textContent = String(dots.size).padStart(3, '0');
    $('lives').textContent = '♥'.repeat(lives) + '·'.repeat(3 - lives);
  }
  function message(title, hint, button) {
    $('title').textContent = title; $('hint').textContent = hint; $('start').textContent = button;
    $('overlay').classList.remove('hide');
  }
  function makeEnemies() {
    return [
      { row: 13, col: 1, previous: null, color: '#ff6b7a', personality: 0 },
      { row: 13, col: 13, previous: null, color: '#ffb45c', personality: 1 },
    ];
  }
  function resetPositions() {
    player = { row: 1, col: 1 };
    enemies = makeEnemies();
    direction = { x: 0, y: 0 }; queued = { x: 0, y: 0 }; timer = 0; clearSwipe();
  }
  function setup() {
    score = 0; level = 1; lives = 3; resetPositions();
    dots = new Set(openCells.map(point => `${point.row},${point.col}`));
    dots.delete('1,1'); updateHud(); draw();
  }
  function updatePause() {
    $('pause').textContent = state === 'pause' ? 'RESUME' : 'PAUSE';
    $('pause').disabled = state !== 'play' && state !== 'pause';
    $('pause').setAttribute('aria-pressed', String(state === 'pause'));
  }
  function stopLoop() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null; last = 0; timer = 0; clearSwipe();
  }
  function ensureLoop() {
    if (state === 'play' && rafId == null) { last = performance.now(); rafId = requestAnimationFrame(loop); }
  }
  function start() {
    stopLoop(); setup(); state = 'play'; $('overlay').classList.add('hide'); updatePause(); draw(); ensureLoop();
  }
  function pause() {
    if (state === 'play') { state = 'pause'; stopLoop(); message('PAUSED', 'TAP RESUME OR PRESS P', 'RESUME'); }
    else if (state === 'pause') { state = 'play'; $('overlay').classList.add('hide'); ensureLoop(); }
    updatePause(); draw();
  }
  function canMove(point, nextDirection) {
    return !maze.isWall(point.row + nextDirection.y, point.col + nextDirection.x);
  }
  function move(point, nextDirection) {
    const next = { row: point.row + nextDirection.y, col: point.col + nextDirection.x };
    return maze.isWall(next.row, next.col) ? { row: point.row, col: point.col } : next;
  }
  function loseLife() {
    lives--; updateHud();
    if (lives <= 0) {
      state = 'over'; stopLoop(); updatePause();
      if (score > high) { high = score; saveHigh(); }
      updateHud(); message('GAME OVER', `FINAL SCORE ${String(score).padStart(6, '0')}`, 'PLAY AGAIN');
    } else resetPositions();
  }
  function update() {
    if (canMove(player, queued)) direction = queued;
    player = move(player, direction);
    const key = `${player.row},${player.col}`;
    if (dots.delete(key)) { score += 10; if (score > high) { high = score; saveHigh(); } updateHud(); }

    // Catch entry into an occupied tile before ghosts move out of it.
    if (enemies.some(enemy => enemy.row === player.row && enemy.col === player.col)) return loseLife();
    enemies.forEach(enemy => {
      const old = { row: enemy.row, col: enemy.col };
      const next = chooseEnemyStep(maze, enemy, player, Math.random, enemy.personality);
      enemy.row = next.row; enemy.col = next.col; enemy.previous = old;
    });

    if (enemies.some(enemy => enemy.row === player.row && enemy.col === player.col)) return loseLife();
    if (!dots.size) {
      level++; resetPositions();
      dots = new Set(openCells.map(point => `${point.row},${point.col}`));
      dots.delete(`${player.row},${player.col}`); updateHud();
    }
  }
  function mazePalette() {
    if (typeof getComputedStyle !== 'function') return { paper:'#fffaf0', grid:'rgba(75,156,149,.13)', wall:'#b8a7e8', wallBorder:'#3d3832', ink:'#3d3832', mint:'#9eddbd', yellow:'#f7d66c', coral:'#f28c78', purple:'#b8a7e8', ghost:'#b8a7e8', ghostAlt:'#8fc9eb', fish:'#f28c78' };
    const style = getComputedStyle(document.documentElement), get = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return { paper:get('--canvas-bg','#fffaf0'), grid:get('--canvas-grid','rgba(75,156,149,.13)'), wall:get('--wall','#b8a7e8'), wallBorder:get('--wall-border','#3d3832'), ink:get('--ink','#3d3832'), mint:get('--mint','#9eddbd'), yellow:get('--yellow','#f7d66c'), coral:get('--coral','#f28c78'), purple:get('--purple','#b8a7e8'), ghost:get('--ghost','#b8a7e8'), ghostAlt:get('--blue','#8fc9eb'), fish:get('--fish','#f28c78') };
  }

  function mazeBlock(x, y, width, height, radius, fill, stroke, lineWidth = 2) {
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius); else ctx.rect(x, y, width, height); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke();
  }

  function draw() {
    const p = mazePalette(); ctx.fillStyle = p.paper; ctx.fillRect(0, 0, WIDTH, WIDTH); ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
    for (let i = 0; i <= SIZE; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, WIDTH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(WIDTH, i * CELL); ctx.stroke(); }
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) if (maze.isWall(row, col)) { const x = col * CELL + 3, y = row * CELL + 3; mazeBlock(x, y, CELL - 6, CELL - 6, 7, p.wall, p.wallBorder, 2); ctx.strokeStyle = p.paper; ctx.globalAlpha = .28; ctx.beginPath(); ctx.moveTo(x + 8, y + 9); ctx.lineTo(x + 13, y + 5); ctx.moveTo(x + 17, y + 20); ctx.lineTo(x + 23, y + 15); ctx.stroke(); ctx.globalAlpha = 1; }
    dots.forEach(key => { const [row, col] = key.split(',').map(Number), x = col * CELL + 16, y = row * CELL + 16; ctx.save(); ctx.translate(x, y); ctx.fillStyle = p.fish; ctx.strokeStyle = p.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(4, -5); ctx.lineTo(8, 0); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-11, -5); ctx.moveTo(-7, 0); ctx.lineTo(-11, 5); ctx.stroke(); ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(4, -1, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    enemies.forEach((enemy, index) => { const x = enemy.col * CELL + 16, y = enemy.row * CELL + 16, fill = index ? p.ghostAlt : p.ghost; ctx.save(); ctx.translate(x, y); ctx.fillStyle = fill; ctx.strokeStyle = p.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.lineTo(11, 10); ctx.lineTo(5, 6); ctx.lineTo(0, 11); ctx.lineTo(-5, 6); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.paper; ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.arc(4, -3, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(-3, -3, 1.2, 0, Math.PI * 2); ctx.arc(5, -3, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    if (player) { const x = player.col * CELL + 16, y = player.row * CELL + 16; ctx.save(); ctx.translate(x, y); ctx.fillStyle = p.yellow; ctx.strokeStyle = p.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-9, -14); ctx.lineTo(-2, -9); ctx.arc(0, -3, 11, Math.PI, 0); ctx.lineTo(9, -9); ctx.lineTo(10, -14); ctx.lineTo(11, 6); ctx.quadraticCurveTo(0, 16, -11, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(-4, -4, 2, 0, Math.PI * 2); ctx.arc(4, -4, 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = p.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(0, 6); ctx.lineTo(4, 3); ctx.moveTo(-7, 3); ctx.lineTo(-14, 1); ctx.moveTo(-7, 6); ctx.lineTo(-14, 7); ctx.moveTo(7, 3); ctx.lineTo(14, 1); ctx.moveTo(7, 6); ctx.lineTo(14, 7); ctx.stroke(); ctx.restore(); }
  }

  function setDirection(name) {
    if (document.hidden || !directions[name]) return;
    if (state === 'title' || state === 'over') start();
    else if (state === 'pause') pause();
    queued = directions[name];
  }
  function bindButton(name) {
    const button = document.querySelector(`[data-dir="${name}"]`);
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault(); setDirection(name);
    });
    button.addEventListener('click', event => { if (event.detail === 0) setDirection(name); });
  }
  function loop(time) {
    rafId = null;
    const elapsed = Math.min(250, Math.max(0, time - last)); last = time;
    if (state === 'play') {
      timer += elapsed;
      const step = Math.max(100, 185 - (level - 1) * 9);
      while (state === 'play' && timer + 1e-6 >= step) { timer -= step; update(); draw(); }
    }
    if (state === 'play') rafId = requestAnimationFrame(loop);
  }

  $('start').onclick = () => state === 'pause' ? pause() : start();
  $('new').onclick = start; $('pause').onclick = pause;
  Object.keys(directions).forEach(bindButton);
  function clearSwipe() {
    if (!swipe) return;
    const id = swipe.id; swipe = null;
    try { if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch { /* Capture may already be released. */ }
  }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || swipe) return;
    event.preventDefault();
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* Native/synthetic touch may reject capture. */ }
  });
  canvas.addEventListener('pointerup', event => {
    if (!swipe || event.pointerId !== swipe.id) return;
    event.preventDefault(); const gesture = swipe; clearSwipe();
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * WIDTH / rect.width - (player.col * CELL + 16);
      const y = (event.clientY - rect.top) * WIDTH / rect.height - (player.row * CELL + 16);
      if (Math.max(Math.abs(x), Math.abs(y)) >= 6) setDirection(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'));
    } else setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  const cancelSwipe = event => { if (swipe && event.pointerId === swipe.id) { event.preventDefault(); clearSwipe(); } };
  canvas.addEventListener('pointercancel', cancelSwipe);
  canvas.addEventListener('lostpointercapture', cancelSwipe);
  ['contextmenu', 'selectstart', 'dragstart'].forEach(type => canvas.addEventListener(type, event => event.preventDefault()));
  canvas.addEventListener('touchmove', event => { if (state === 'play') event.preventDefault(); }, { passive: false });
  window.onkeydown = event => {
    if (document.hidden || event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const name = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }[key];
    if (name) { event.preventDefault(); setDirection(name); }
    else if (key === 'p' && !event.repeat) { event.preventDefault(); pause(); }
    else if ((key === 'Enter' || key === ' ') && !event.repeat && !/^(BUTTON|A)$/.test(event.target?.tagName || '') && state !== 'play') {
      event.preventDefault(); state === 'pause' ? pause() : start();
    }
  };

  const suspend = () => { if (state === 'play') pause(); else clearSwipe(); };
  function dockUtilities() {
    const dock = document.querySelector('.utility-dock'), clear = document.querySelector('.clear-data-toggle');
    if (dock && clear) dock.appendChild(clear);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dockUtilities, { once: true });
  else dockUtilities();
  document.addEventListener('themechange', draw);
  window.addEventListener('resize', draw);
  window.addEventListener('blur', suspend);
  window.addEventListener('pagehide', suspend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });

  setup(); message('CAT & GHOSTS', 'HELP THE CAT FIND EVERY FISH TREAT', 'START HUNTING'); updatePause();
})();
