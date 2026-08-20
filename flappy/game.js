(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const GROUND_Y = H - 32;

  const R = window.FlappyRules;
  const STORAGE_KEY = 'flappy-best-v1';

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
  let bird = null;
  let pipes = [];
  let particles = [];
  let lastTime = 0;
  let spawnTimer = 0;

  function spawnPipe(x) {
    const gapHeight = 140;
    const minTop = 60;
    const maxTop = GROUND_Y - gapHeight - 60;
    const topY = minTop + Math.random() * (maxTop - minTop);
    const bottomY = topY + gapHeight;
    pipes.push({
      x,
      width: 52,
      topY,
      bottomY,
      scored: false,
    });
  }

  function resetGame() {
    score = 0;
    bird = {
      x: 90,
      y: 260,
      vy: 0,
      r: 13,
      angle: 0,
    };
    pipes = [];
    particles = [];
    spawnTimer = 0;
    spawnPipe(W + 60);
    spawnPipe(W + 280);
    updateHud();
  }

  function updateHud() {
    ui.scoreStat.textContent = String(score);
    ui.bestStat.textContent = String(best);
  }

  function flap() {
    if (state === 'title' || state === 'over') {
      resetGame();
      state = 'playing';
      ui.overlay.classList.add('hide');
      ui.pause.textContent = 'PAUSE';
      bird = R.flap(bird, -350);
      lastTime = performance.now();
      return;
    }
    if (state !== 'playing' || !bird) return;
    bird = R.flap(bird, -350);
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

  function triggerExplosion(x, y) {
    for (let i = 0; i < 25; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 180;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.7 + Math.random() * 0.4,
        color: i % 2 ? '#ffbe0b' : '#ff7088',
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
    if (bird) triggerExplosion(bird.x, bird.y);
    bird = null;

    setTimeout(() => {
      ui.title.textContent = 'GAME OVER';
      ui.text.textContent = `SCORE ${score} · BEST ${best}`;
      ui.start.textContent = 'PLAY AGAIN';
      ui.overlay.classList.remove('hide');
    }, 400);

    if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
  }

  function update(dt) {
    if (bird) {
      bird = R.updatePhysics(bird, dt, 1050);

      // Pitch angle
      if (bird.vy < -50) bird.angle = -0.38;
      else bird.angle = Math.min(1.2, bird.angle + dt * 2.8);

      // Ground / Ceiling collision
      if (bird.y + bird.r >= GROUND_Y || bird.y - bird.r <= 0) {
        gameOver();
        return;
      }

      // Pipe collisions & scoring
      for (const p of pipes) {
        if (R.checkPipeCollision(bird, p)) {
          gameOver();
          return;
        }
        if (!p.scored && p.x + p.width < bird.x) {
          p.scored = true;
          score++;
          if (score > best) best = score;
          updateHud();
          if (navigator.vibrate) navigator.vibrate(20);
        }
      }
    }

    // Scroll pipes
    const speed = 135;
    for (const p of pipes) {
      p.x -= speed * dt;
    }

    // Spawn new pipes
    const lastPipe = pipes[pipes.length - 1];
    if (lastPipe && lastPipe.x < W - 210) {
      spawnPipe(W + 20);
    }

    // Cleanup offscreen pipes
    pipes = pipes.filter(p => p.x + p.width > -20);

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
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // 1. Draw Pipes
    for (const p of pipes) {
      ctx.save();
      ctx.fillStyle = isDark ? '#143526' : '#b7e4c7';
      ctx.strokeStyle = isDark ? '#23684a' : '#52b788';
      ctx.lineWidth = 2;

      // Top pipe
      ctx.fillRect(p.x, 0, p.width, p.topY);
      ctx.strokeRect(p.x, -2, p.width, p.topY + 2);
      // Top pipe lip
      ctx.fillStyle = isDark ? '#1a4733' : '#a3d9b5';
      ctx.fillRect(p.x - 4, p.topY - 18, p.width + 8, 18);
      ctx.strokeRect(p.x - 4, p.topY - 18, p.width + 8, 18);

      // Bottom pipe
      ctx.fillStyle = isDark ? '#143526' : '#b7e4c7';
      ctx.fillRect(p.x, p.bottomY, p.width, GROUND_Y - p.bottomY);
      ctx.strokeRect(p.x, p.bottomY, p.width, GROUND_Y - p.bottomY);
      // Bottom pipe lip
      ctx.fillStyle = isDark ? '#1a4733' : '#a3d9b5';
      ctx.fillRect(p.x - 4, p.bottomY, p.width + 8, 18);
      ctx.strokeRect(p.x - 4, p.bottomY, p.width + 8, 18);

      ctx.restore();
    }

    // 2. Draw Ground
    ctx.save();
    ctx.fillStyle = isDark ? '#151e28' : '#ddd5c7';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.strokeStyle = isDark ? '#263746' : '#d8d0c5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y);
    ctx.stroke();
    ctx.restore();

    // 3. Draw Particles
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.restore();
    }

    // 4. Draw Bird
    if (bird) {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.angle);

      // Body
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d49b04';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Wing
      ctx.fillStyle = '#fb5607';
      ctx.beginPath();
      ctx.ellipse(-4, 2, 7, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06110c';
      ctx.beginPath();
      ctx.arc(6, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ff4b5c';
      ctx.beginPath();
      ctx.moveTo(11, -1);
      ctx.lineTo(18, 2);
      ctx.lineTo(11, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
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
    flap();
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      flap();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      togglePause();
    }
  });

  ui.start.addEventListener('click', flap);
  ui.pause.addEventListener('click', togglePause);

  resetGame();
  updateHud();

  window.FlappyGame = {
    flap,
    getSnapshot: () => ({ state, score, best, hasBird: Boolean(bird) }),
  };
})();
