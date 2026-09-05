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
  let state = 'title', score = 0, high = Number(localStorage.getItem('maze-high')) || 0;
  let level = 1, lives = 3, player, enemies, dots;
  let direction = { x: 0, y: 0 }, queued = { x: 0, y: 0 }, last = 0, timer = 0, swipe = null;

  const openCells = [];
  for (let row = 1; row < SIZE - 1; row++) for (let col = 1; col < SIZE - 1; col++) if (!maze.isWall(row, col)) openCells.push({ row, col });

  function updateHud() {
    $('score').textContent = String(score).padStart(6, '0');
    $('high').textContent = String(high).padStart(6, '0');
    $('level').textContent = String(level).padStart(2, '0');
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
    direction = { x: 0, y: 0 }; queued = { x: 0, y: 0 };
  }
  function setup() {
    score = 0; level = 1; lives = 3; resetPositions();
    dots = new Set(openCells.map(point => `${point.row},${point.col}`));
    dots.delete('1,1'); updateHud(); draw();
  }
  function start() {
    setup(); state = 'play'; $('overlay').classList.add('hide');
  }
  function pause() {
    if (state === 'play') { state = 'pause'; message('PAUSED', 'TAP RESUME OR PRESS P', 'RESUME'); }
    else if (state === 'pause') { state = 'play'; $('overlay').classList.add('hide'); }
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
      state = 'over';
      if (score > high) { high = score; localStorage.setItem('maze-high', String(high)); }
      updateHud(); message('GAME OVER', `FINAL SCORE ${String(score).padStart(6, '0')}`, 'PLAY AGAIN');
    } else resetPositions();
  }
  function update() {
    if (canMove(player, queued)) direction = queued;
    player = move(player, direction);
    const key = `${player.row},${player.col}`;
    if (dots.delete(key)) { score += 10; if (score > high) high = score; updateHud(); }

    enemies.forEach(enemy => {
      const old = { row: enemy.row, col: enemy.col };
      const next = chooseEnemyStep(maze, enemy, player, Math.random, enemy.personality);
      enemy.row = next.row; enemy.col = next.col; enemy.previous = old;
    });

    if (enemies.some(enemy => enemy.row === player.row && enemy.col === player.col)) return loseLife();
    if (!dots.size) {
      level++;
      dots = new Set(openCells.map(point => `${point.row},${point.col}`));
      dots.delete(`${player.row},${player.col}`); updateHud();
    }
  }
  function draw() {
    const isLight = document.documentElement?.dataset?.theme === 'light';
    ctx.fillStyle = isLight ? '#f7f4ec' : '#080d15'; ctx.fillRect(0, 0, WIDTH, WIDTH);
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) {
      if (!maze.isWall(row, col)) continue;
      const px = col * CELL, py = row * CELL;
      ctx.fillStyle = isLight ? '#eae4d8' : '#132331'; ctx.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
      ctx.strokeStyle = isLight ? '#d8d0c5' : '#64e6e633'; ctx.strokeRect(px + 5, py + 5, CELL - 10, CELL - 10);
    }
    dots.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      ctx.fillStyle = isLight ? '#8b8177' : '#e8f0f7'; ctx.fillRect(col * CELL + 15, row * CELL + 15, 3, 3);
    });
    enemies.forEach(enemy => {
      const x = enemy.col * CELL + 16, y = enemy.row * CELL + 16;
      ctx.fillStyle = enemy.color; ctx.beginPath(); ctx.arc(x, y, 10, Math.PI, 0);
      ctx.lineTo(x + 10, y + 8); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 5, y + 3); ctx.lineTo(x - 10, y + 8); ctx.lineTo(x - 10, y); ctx.fill();
    });
    ctx.fillStyle = isLight ? '#0288d1' : '#64e6e0'; ctx.beginPath(); ctx.arc(player.col * CELL + 16, player.row * CELL + 16, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isLight ? '#f7f4ec' : '#080d15'; ctx.beginPath(); ctx.arc(player.col * CELL + 20, player.row * CELL + 12, 2, 0, Math.PI * 2); ctx.fill();
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

  function setDirection(name) { queued = directions[name]; }
  function bindButton(name) {
    const button = document.querySelector(`[data-dir="${name}"]`);
    button.addEventListener('pointerdown', event => { event.preventDefault(); setDirection(name); });
  }
  function loop(time) {
    const elapsed = Math.min(100, time - last || 0); last = time;
    if (state === 'play') {
      timer += elapsed;
      if (timer > Math.max(100, 185 - (level - 1) * 9)) { timer = 0; update(); draw(); }
    }
    requestAnimationFrame(loop);
  }

  $('start').onclick = () => state === 'pause' ? pause() : start();
  $('new').onclick = start; $('pause').onclick = pause;
  Object.keys(directions).forEach(bindButton);
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    swipe = { x: event.clientX, y: event.clientY };
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', event => {
    event.preventDefault(); if (!swipe) return;
    const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y; swipe = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
      setDirection(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up'));
    } else setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  canvas.addEventListener('pointercancel', () => { swipe = null; });
  window.onkeydown = event => {
    const name = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }[event.key];
    if (name) { event.preventDefault(); setDirection(name); }
    if (event.key === 'p' || event.key === 'P') pause();
  };

  setup(); message('CAT & GHOSTS', 'HELP THE CAT FIND EVERY FISH TREAT', 'START HUNTING'); requestAnimationFrame(loop);
})();
