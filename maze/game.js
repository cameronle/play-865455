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

  setup(); message('NEON MAZE', 'PRESS START TO PLAY', 'START'); requestAnimationFrame(loop);
})();
