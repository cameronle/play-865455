(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const CX = W / 2;

  const R = window.ColorRules;
  const STORAGE_KEY = 'color-bounce-best-v1';

  const COLORS = [
    '#ff4b5c', // 0: Red
    '#38ef7d', // 1: Green
    '#00d2fc', // 2: Cyan
    '#ffbe0b', // 3: Yellow
  ];

  const $ = id => document.getElementById(id);
  const ui = {
    scoreStat: $('scoreStat'),
    bestStat: $('bestStat'),
    overlay: $('overlay'),
    title: $('overlayTitle'),
    text: $('overlayText'),
    start: $('startButton'),
    pause: $('pauseButton'),
  };

  let state = 'title'; // 'title', 'playing', 'paused', 'over'
  let score = 0;
  let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let ball = null;
  let cameraY = 0;
  let obstacles = [];
  let pickups = []; // stars and color switchers
  let particles = [];
  let lastTime = 0;
  let nextObstacleY = 0;

  function randomColorExcept(current) {
    const choices = [0, 1, 2, 3].filter(c => c !== current);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function spawnObstacle(y) {
    const type = 'circle';
    const radius = 75;
    const speed = (0.7 + Math.random() * 0.5) * (Math.random() < 0.5 ? 1 : -1);
    obstacles.push({
      type,
      y,
      radius,
      thickness: 16,
      angle: Math.random() * Math.PI * 2,
      speed,
      colors: [0, 1, 2, 3],
    });

    // Star in the center
    pickups.push({
      type: 'star',
      x: CX,
      y,
      radius: 12,
      collected: false,
    });

    // Color switcher between obstacles
    pickups.push({
      type: 'switcher',
      x: CX,
      y: y - 150,
      radius: 14,
      collected: false,
    });
  }

  function resetGame() {
    score = 0;
    cameraY = 0;
    ball = {
      x: CX,
      y: 480,
      vy: 0,
      r: 9,
      color: Math.floor(Math.random() * 4),
    };
    obstacles = [];
    pickups = [];
    particles = [];
    nextObstacleY = 240;

    for (let i = 0; i < 4; i++) {
      spawnObstacle(nextObstacleY);
      nextObstacleY -= 300;
    }

    updateHud();
  }

  function updateHud() {
    ui.scoreStat.textContent = String(score);
    ui.bestStat.textContent = String(best);
  }

  function jump() {
    if (state === 'title' || state === 'over') {
      resetGame();
      state = 'playing';
      ui.overlay.classList.add('hide');
      ui.pause.textContent = 'PAUSE';
      ball = R.applyJump(ball, -430);
      lastTime = performance.now();
      return;
    }
    if (state !== 'playing' || !ball) return;
    ball = R.applyJump(ball, -430);
    if (navigator.vibrate) navigator.vibrate(10);
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      ui.title.textContent = 'PAUSED';
      ui.text.textContent = `CURRENT SCORE: ${score}`;
      ui.start.textContent = 'RESUME';
      ui.overlay.classList.remove('hide');
      ui.pause.textContent = 'RESUME';
    } else if (state === 'paused') {
      state = 'playing';
      ui.overlay.classList.add('hide');
      ui.pause.textContent = 'PAUSE';
      lastTime = performance.now();
    }
  }

  function triggerExplosion(x, y, color) {
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 220;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.8 + Math.random() * 0.4,
        color: COLORS[color],
      });
    }
  }

  function gameOver() {
    state = 'over';
    if (score > best) {
      best = score;
      localStorage.setItem(STORAGE_KEY, String(best));
    }
    updateHud();
    if (ball) triggerExplosion(ball.x, ball.y, ball.color);
    ball = null;

    setTimeout(() => {
      ui.title.textContent = 'GAME OVER';
      ui.text.textContent = `SCORE ${score} · BEST ${best}`;
      ui.start.textContent = 'PLAY AGAIN';
      ui.overlay.classList.remove('hide');
    }, 400);

    if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
  }

  function update(dt) {
    // Update ball physics
    if (ball) {
      ball = R.updatePhysics(ball, dt, 1200);

      // Camera follow
      if (ball.y < cameraY + 320) {
        cameraY = ball.y - 320;
      }

      // Check fall boundary
      if (ball.y > cameraY + H + 40) {
        gameOver();
        return;
      }

      // Check obstacle collisions
      for (const obs of obstacles) {
        const res = R.checkObstacleCollision(ball, CX, obs);
        if (res === 'hit') {
          gameOver();
          return;
        }
      }

      // Check pickups
      for (const p of pickups) {
        if (p.collected) continue;
        const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
        if (dist <= ball.r + p.radius) {
          p.collected = true;
          if (p.type === 'star') {
            score++;
            if (score > best) best = score;
            updateHud();
            if (navigator.vibrate) navigator.vibrate(25);
          } else if (p.type === 'switcher') {
            ball.color = randomColorExcept(ball.color);
            if (navigator.vibrate) navigator.vibrate(35);
          }
        }
      }
    }

    // Rotate obstacles
    for (const obs of obstacles) {
      obs.angle += obs.speed * dt;
    }

    // Spawn new obstacles as camera moves up
    if (nextObstacleY > cameraY - 400) {
      spawnObstacle(nextObstacleY);
      nextObstacleY -= 300;
    }

    // Cleanup old obstacles
    obstacles = obstacles.filter(o => o.y < cameraY + H + 200);
    pickups = pickups.filter(p => p.y < cameraY + H + 200);

    // Update particles
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(0, -cameraY);

    // 1. Draw obstacles
    for (const obs of obstacles) {
      if (obs.type === 'circle') {
        const segAngle = (Math.PI * 2) / 4;
        for (let i = 0; i < 4; i++) {
          const startA = obs.angle + i * segAngle;
          const endA = startA + segAngle;
          ctx.save();
          ctx.strokeStyle = COLORS[obs.colors[i]];
          ctx.lineWidth = obs.thickness;
          ctx.beginPath();
          ctx.arc(CX, obs.y, obs.radius, startA, endA);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 2. Draw pickups
    for (const p of pickups) {
      if (p.collected) continue;
      if (p.type === 'star') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.type === 'switcher') {
        ctx.save();
        const segA = (Math.PI * 2) / 4;
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = COLORS[i];
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.arc(p.x, p.y, p.radius, i * segA, (i + 1) * segA);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 3. Draw particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.restore();
    }

    // 4. Draw ball
    if (ball) {
      ctx.save();
      ctx.fillStyle = COLORS[ball.color];
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function loop(time) {
    const dt = Math.min(0.04, (time - lastTime) / 1000 || 0);
    lastTime = time;
    if (state === 'playing') update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Controls
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    jump();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      jump();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      togglePause();
    }
  });

  ui.start.addEventListener('click', jump);
  ui.pause.addEventListener('click', togglePause);

  resetGame();
  updateHud();

  window.ColorGame = {
    jump,
    getSnapshot: () => ({ state, score, best, hasBall: Boolean(ball) }),
  };
})();
