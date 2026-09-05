(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = {
    player: document.getElementById('playerScore'), ai: document.getElementById('aiScore'),
    status: document.getElementById('status'), overlay: document.getElementById('overlay'),
    title: document.getElementById('overlayTitle'), text: document.getElementById('overlayText'),
    start: document.getElementById('startButton'), pause: document.getElementById('pauseButton'),
    restart: document.getElementById('restartButton'), best: document.getElementById('best')
  };
  const W = canvas.width, H = canvas.height;
  const paddle = {w: 12, h: 86};
  const player = {x: 26, y: H / 2 - paddle.h / 2, speed: 360};
  const ai = {x: W - 38, y: H / 2 - paddle.h / 2, speed: 285};
  const ball = {x: W / 2, y: H / 2, r: 8, vx: 0, vy: 0};
  let scores = [0, 0], state = 'title', serveTimer = 0, last = 0, raf = 0;
  let matchWins = Number(localStorage.getItem('pongMatchWins') || 0);
  const keys = new Set();
  let heldDirection = 0;
  ui.best.textContent = String(matchWins);

  function resetPositions(direction = Math.random() < .5 ? -1 : 1) {
    player.y = ai.y = H / 2 - paddle.h / 2;
    ball.x = W / 2; ball.y = H / 2; ball.vx = 0; ball.vy = 0;
    serveTimer = .7;
    ball.serveDirection = direction;
  }
  function launchServe() {
    const speed = 285;
    const angle = (Math.random() * .8 - .4);
    ball.vx = Math.cos(angle) * speed * ball.serveDirection;
    ball.vy = Math.sin(angle) * speed;
  }
  function showOverlay(title, text, button) {
    ui.title.textContent = title; ui.text.textContent = text; ui.start.textContent = button;
    ui.overlay.classList.remove('hide');
  }
  function hideOverlay() { ui.overlay.classList.add('hide'); }
  function updateScores() { ui.player.textContent = scores[0]; ui.ai.textContent = scores[1]; }
  function newMatch() {
    scores = [0, 0]; updateScores(); resetPositions(1); state = 'playing';
    ui.status.textContent = 'PLAYING'; ui.pause.textContent = 'PAUSE'; hideOverlay();
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function togglePause() {
    if (state === 'playing') {
      state = 'paused'; ui.status.textContent = 'PAUSED'; ui.pause.textContent = 'RESUME';
      showOverlay('PAUSED', 'PRESS P OR TAP RESUME', 'RESUME');
    } else if (state === 'paused') {
      state = 'playing'; ui.status.textContent = 'PLAYING'; ui.pause.textContent = 'PAUSE'; hideOverlay();
      last = performance.now(); raf = requestAnimationFrame(loop);
    }
  }
  function finish(winner) {
    state = 'over'; ball.vx = ball.vy = 0;
    const won = winner === 0;
    if (won) { matchWins++; localStorage.setItem('pongMatchWins', matchWins); ui.best.textContent = matchWins; }
    const message = won ? 'YOU WIN' : 'AI WINS';
    ui.status.textContent = message; showOverlay(message, `${scores[0]} — ${scores[1]} · PLAY AGAIN?`, 'NEW MATCH');
  }
  function score(side) {
    scores[side]++; updateScores();
    if (scores[side] >= 7) finish(side);
    else resetPositions(side === 0 ? 1 : -1);
  }
  function hitPaddle(p, isLeft) {
    const movingToward = isLeft ? ball.vx < 0 : ball.vx > 0;
    if (!movingToward || ball.y + ball.r < p.y || ball.y - ball.r > p.y + paddle.h) return false;
    const edge = isLeft ? p.x + paddle.w : p.x;
    if (isLeft ? ball.x - ball.r > edge : ball.x + ball.r < edge) return false;
    const offset = (ball.y - (p.y + paddle.h / 2)) / (paddle.h / 2);
    const speed = Math.min(520, Math.hypot(ball.vx, ball.vy) * 1.055);
    ball.x = isLeft ? edge + ball.r : edge - ball.r;
    ball.vx = (isLeft ? 1 : -1) * speed * Math.cos(offset * .85);
    ball.vy = speed * Math.sin(offset * .85);
    return true;
  }
  function update(dt) {
    let direction = heldDirection;
    if (keys.has('ArrowUp') || keys.has('KeyW')) direction -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) direction += 1;
    player.y = Math.max(0, Math.min(H - paddle.h, player.y + Math.sign(direction) * player.speed * dt));
    const target = ball.vx > 0 ? ball.y - paddle.h / 2 : H / 2 - paddle.h / 2;
    const delta = target - ai.y;
    ai.y = Math.max(0, Math.min(H - paddle.h, ai.y + Math.sign(delta) * Math.min(Math.abs(delta), ai.speed * dt)));
    if (serveTimer > 0) { serveTimer -= dt; if (serveTimer <= 0) launchServe(); return; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
    if (ball.y + ball.r >= H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); }
    hitPaddle(player, true); hitPaddle(ai, false);
    if (ball.x + ball.r < 0) score(1);
    else if (ball.x - ball.r > W) score(0);
  }
  function draw() {
    const light = document.documentElement?.dataset?.theme === 'light';
    const sea = light ? '#dff2ec' : '#173b49';
    const foam = light ? '#fffdf5' : '#e9f5e8';
    const deep = light ? '#75aec7' : '#80c7df';
    const coral = light ? '#e98575' : '#ed927e';
    const sand = light ? '#f2ca62' : '#f2ce68';
    ctx.fillStyle = sea; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = light ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.1)';
    for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(70+i*78,70+(i%3)*90,56,7,0,0,Math.PI*2);ctx.fill()}
    ctx.strokeStyle = light ? '#75aec7' : '#80c7df'; ctx.lineWidth=3;
    for(let y=55;y<H;y+=72){ctx.beginPath();ctx.moveTo(0,y);ctx.quadraticCurveTo(W*.25,y-12,W*.5,y);ctx.quadraticCurveTo(W*.75,y+12,W,y);ctx.stroke()}
    ctx.strokeStyle = light ? '#e98575' : '#ed927e'; ctx.lineWidth=2; ctx.setLineDash([5,8]); ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=deep;ctx.beginPath();ctx.ellipse(player.x+paddle.w/2,player.y+paddle.h/2,paddle.w*.9,paddle.h/2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=foam;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=coral;ctx.beginPath();ctx.ellipse(ai.x+paddle.w/2,ai.y+paddle.h/2,paddle.w*.9,paddle.h/2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=foam;ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle=sand;ctx.shadowColor=sand;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r+2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=foam;ctx.beginPath();ctx.arc(ball.x-2,ball.y-2,2,0,Math.PI*2);ctx.fill();
  }
  function loop(now) {
    if (state !== 'playing') return;
    const dt = Math.min(.025, (now - last) / 1000 || 0); last = now; update(dt); draw();
    if (state === 'playing') raf = requestAnimationFrame(loop);
  }
  function movePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const y = (event.clientY - rect.top) * H / rect.height;
    player.y = Math.max(0, Math.min(H - paddle.h, y - paddle.h / 2));
  }
  canvas.addEventListener('pointerdown', e => { try { canvas.setPointerCapture(e.pointerId); } catch (_) {} movePointer(e); if (state === 'title' || state === 'over') newMatch(); else if (state === 'paused') togglePause(); });
  canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') movePointer(e); });
  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyP' || e.code === 'Space') togglePause(); else keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  function bindHold(id, direction) {
    const el = document.getElementById(id);
    const start = e => { e.preventDefault(); heldDirection = direction; try { el.setPointerCapture(e.pointerId); } catch (_) {} };
    const end = () => { if (heldDirection === direction) heldDirection = 0; };
    el.addEventListener('pointerdown', start); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', end);
  }
  bindHold('upButton', -1); bindHold('downButton', 1);
  ui.start.addEventListener('click', () => state === 'paused' ? togglePause() : newMatch());
  ui.pause.addEventListener('click', togglePause); ui.restart.addEventListener('click', newMatch);
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(); });
  resetPositions(1); draw();
})();
