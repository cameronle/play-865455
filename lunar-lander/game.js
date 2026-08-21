(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = Object.fromEntries(['score','best','level','fuel','vertical','horizontal','angle','overlay','message','detail','startButton','pauseButton','leftButton','thrustButton','rightButton'].map(id => [id, document.getElementById(id)]));
  const GRAVITY = 18;
  const ROTATION_SPEED = 2.2;
  const THRUST = 45;
  const keys = { left: false, right: false, thrust: false };
  let ship, terrain, platform, stars, fuel, score = 0, best = Number(localStorage.getItem('lunarLanderBest') || 0), level = 1;
  let state = 'title', paused = false, lastTime = 0, particles = [], stateTimer = 0;

  function makeTerrain() {
    const points = [{ x: 0, y: 485 + Math.random() * 45 }];
    const platformWidth = Math.max(82, 140 - level * 7);
    const platformX = 90 + Math.random() * (canvas.width - platformWidth - 180);
    const platformY = 445 + Math.random() * 85;
    for (let x = 40; x < canvas.width; x += 40) {
      if (x >= platformX - 25 && x <= platformX + platformWidth + 25) continue;
      const previous = points[points.length - 1].y;
      points.push({ x, y: Math.max(395, Math.min(565, previous + (Math.random() - .5) * 75)) });
    }
    points.push({ x: platformX, y: platformY }, { x: platformX + platformWidth, y: platformY }, { x: canvas.width, y: 500 + Math.random() * 50 });
    points.sort((a, b) => a.x - b.x);
    platform = { x: platformX, y: platformY, width: platformWidth };
    return points;
  }

  function resetShip() {
    ship = { x: 80 + Math.random() * 640, y: 70, vx: (Math.random() - .5) * 12, vy: 2, angle: 0, radius: 14 };
    fuel = Math.max(52, 105 - level * 3); particles = [];
  }

  function beginLevel() {
    terrain = makeTerrain(); resetShip(); state = 'playing'; paused = false; lastTime = performance.now(); hideOverlay(); updateHud();
  }
  function newMission() { score = 0; level = 1; beginLevel(); }
  function showOverlay(title, detail, button) { ui.message.textContent = title; ui.detail.textContent = detail; ui.startButton.textContent = button; ui.overlay.classList.remove('hidden'); }
  function hideOverlay() { ui.overlay.classList.add('hidden'); }

  function terrainHeight(x) {
    for (let i = 1; i < terrain.length; i++) if (x <= terrain[i].x) {
      const a = terrain[i - 1], b = terrain[i], t = (x - a.x) / Math.max(1, b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
    return canvas.height;
  }

  function checkLanding() {
    const verticalSpeed = Math.abs(ship.vy);
    const horizontalSpeed = Math.abs(ship.vx);
    const angleError = Math.abs(Math.atan2(Math.sin(ship.angle), Math.cos(ship.angle)));
    const centered = ship.x - 11 >= platform.x && ship.x + 11 <= platform.x + platform.width;
    if (centered && verticalSpeed <= 30 && horizontalSpeed <= 16 && angleError <= .18) {
      const bonus = Math.round(600 + fuel * 8 + Math.max(0, 300 - verticalSpeed * 8) + level * 100);
      score += bonus; best = Math.max(best, score); localStorage.setItem('lunarLanderBest', best);
      state = 'landed'; stateTimer = 1.8; showOverlay('SAFE LANDING', `+${bonus} · FUEL ${Math.ceil(fuel)} · NEXT SECTOR`, 'CONTINUE');
    } else {
      state = 'crashed'; stateTimer = 1.2; explode(); showOverlay('CRASHED', centered ? 'TOO FAST OR NOT LEVEL' : 'MISSED THE LANDING PLATFORM', 'RETRY LEVEL');
    }
    updateHud();
  }

  function explode() {
    for (let i = 0; i < 45; i++) particles.push({ x: ship.x, y: ship.y, vx: (Math.random() - .5) * 150, vy: (Math.random() - .7) * 150, life: .5 + Math.random() * 1.1 });
  }

  function update(dt) {
    if (state !== 'playing' || paused) return;
    if (keys.left) ship.angle -= ROTATION_SPEED * dt;
    if (keys.right) ship.angle += ROTATION_SPEED * dt;
    if (keys.thrust && fuel > 0) {
      ship.vx += Math.sin(ship.angle) * THRUST * dt;
      ship.vy -= Math.cos(ship.angle) * THRUST * dt;
      fuel = Math.max(0, fuel - 13 * dt);
      if (Math.random() < .7) particles.push({ x: ship.x - Math.sin(ship.angle) * 14, y: ship.y + Math.cos(ship.angle) * 14, vx: -Math.sin(ship.angle) * 15 + (Math.random() - .5) * 20, vy: Math.cos(ship.angle) * 30 + (Math.random() - .5) * 20, life: .25 });
    }
    ship.vy += (GRAVITY + level * .8) * dt;
    ship.x += ship.vx * dt; ship.y += ship.vy * dt;
    if (ship.x < 0) ship.x = canvas.width; else if (ship.x > canvas.width) ship.x = 0;
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 20 * dt; p.life -= dt; }); particles = particles.filter(p => p.life > 0);
    if (ship.y + ship.radius >= terrainHeight(ship.x) || ship.y > canvas.height) checkLanding();
    updateHud();
  }

  function updateHud() {
    ui.score.textContent = String(score).padStart(5, '0'); ui.best.textContent = String(best).padStart(5, '0'); ui.level.textContent = level; ui.fuel.textContent = Math.ceil(fuel || 0);
    ui.vertical.textContent = ship ? ship.vy.toFixed(1) : '0.0'; ui.horizontal.textContent = ship ? Math.abs(ship.vx).toFixed(1) : '0.0'; ui.angle.textContent = ship ? `${Math.round(ship.angle * 180 / Math.PI)}°` : '0°';
    ui.vertical.style.color = ship && Math.abs(ship.vy) > 30 ? 'var(--red)' : 'var(--ink)'; ui.fuel.style.color = fuel < 25 ? 'var(--red)' : 'var(--green)';
  }

  function draw() {
    const isLight = document.documentElement?.dataset?.theme === 'light';
    ctx.fillStyle = isLight ? '#f7f4ec' : '#010307'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isLight ? '#8b8177' : '#9cc4ca'; stars.forEach(s => { ctx.globalAlpha = s.a; ctx.fillRect(s.x, s.y, s.r, s.r); }); ctx.globalAlpha = 1;
    ctx.strokeStyle = isLight ? '#a89f91' : '#31576a'; ctx.lineWidth = 2; ctx.beginPath(); terrain.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height); ctx.closePath(); ctx.fillStyle = isLight ? '#eae4d8' : '#061019'; ctx.fill();
    ctx.strokeStyle = isLight ? '#198754' : '#64ffbd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(platform.x, platform.y); ctx.lineTo(platform.x + platform.width, platform.y); ctx.stroke();
    ctx.fillStyle = isLight ? '#198754' : '#64ffbd'; ctx.font = '11px monospace'; ctx.fillText(`${Math.max(1, 6 - level)}×`, platform.x + platform.width / 2 - 9, platform.y + 19);
    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.life > .35 ? (isLight ? '#f77f00' : '#ffd166') : (isLight ? '#e63946' : '#ff5468'); ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }); ctx.globalAlpha = 1;
    if (state !== 'crashed') drawShip();
    if (paused) { ctx.fillStyle = isLight ? '#f5f1e8cc' : '#02060bcc'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = isLight ? '#3e3934' : '#d8f8ef'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2); ctx.textAlign = 'left'; }
  }

  function drawShip() {
    const isLight = document.documentElement?.dataset?.theme === 'light';
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle); ctx.strokeStyle = isLight ? '#3e3934' : '#d8f8ef'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(11, 8); ctx.lineTo(7, 12); ctx.lineTo(-7, 12); ctx.lineTo(-11, 8); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 9); ctx.lineTo(-14, 16); ctx.moveTo(8, 9); ctx.lineTo(14, 16); ctx.stroke();
    if (keys.thrust && fuel > 0 && state === 'playing') { ctx.strokeStyle = isLight ? '#f77f00' : '#ffd166'; ctx.beginPath(); ctx.moveTo(-5, 13); ctx.lineTo(0, 23 + Math.random() * 8); ctx.lineTo(5, 13); ctx.stroke(); }
    ctx.restore();
  }

  function frame(now) { const dt = Math.min(.033, (now - lastTime) / 1000 || 0); lastTime = now; update(dt); draw(); requestAnimationFrame(frame); }
  function togglePause() { if (state !== 'playing') return; paused = !paused; ui.pauseButton.textContent = paused ? 'RESUME' : 'PAUSE'; }
  function primaryAction() { if (state === 'landed') { level++; beginLevel(); } else if (state === 'crashed') beginLevel(); else if (state === 'title') newMission(); }
  function bindHold(button, key) { const set = value => event => { event.preventDefault(); keys[key] = value; button.classList.toggle('active', value); }; button.addEventListener('pointerdown', set(true)); ['pointerup','pointercancel','pointerleave'].forEach(type => button.addEventListener(type, set(false))); }
  bindHold(ui.leftButton, 'left'); bindHold(ui.thrustButton, 'thrust'); bindHold(ui.rightButton, 'right');
  document.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (['arrowleft','a'].includes(k)) keys.left = true; if (['arrowright','d'].includes(k)) keys.right = true; if (['arrowup','w',' '].includes(k)) { keys.thrust = true; e.preventDefault(); } if (k === 'p') togglePause(); if (k === 'r') newMission(); });
  document.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (['arrowleft','a'].includes(k)) keys.left = false; if (['arrowright','d'].includes(k)) keys.right = false; if (['arrowup','w',' '].includes(k)) keys.thrust = false; });
  ui.startButton.addEventListener('click', primaryAction); ui.pauseButton.addEventListener('click', togglePause);
  stars = Array.from({ length: 95 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * 430, r: Math.random() < .85 ? 1 : 2, a: .25 + Math.random() * .7 }));
  terrain = makeTerrain(); resetShip(); showOverlay('LUNAR LANDER', 'LAND SOFTLY ON THE LIT PLATFORM', 'START MISSION'); updateHud(); requestAnimationFrame(frame);
})();
