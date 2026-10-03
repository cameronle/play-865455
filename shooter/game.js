(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const $ = (id) => document.getElementById(id);
  const scoreEl = $("score"),
    levelEl = $("level"),
    livesEl = $("lives"),
    bestEl = $("best");
  const overlay = $("overlay"),
    startButton = $("startButton"),
    soundButton = $("soundButton");
  const keys = new Set();
  const pointer = { left: false, right: false, up: false, down: false };
  const holds = [];
  let drag = null;
  const colors = {
    cyan: "#64e6e0",
    orange: "#ffb45c",
    red: "#ff6b7a",
    white: "#e8f0f7",
    muted: "#748394",
  };
  let state = "title",
    score = 0,
    level = 1,
    lives = 3,
    best = readBest(),
    muted = false;
  let player,
    bullets = [],
    enemyBullets = [],
    enemies = [],
    particles = [],
    stars = [],
    powerups = [];
  const STEP = 1 / 120;
  let accumulator = 0,
    frameId = null;
  let last = 0,
    spawnTimer = 0,
    fireTimer = 0,
    enemyFireTimer = 0,
    levelTimer = 0,
    shake = 0,
    audio;
  bestEl.textContent = fmt(best);

  function readBest() {
    try {
      const n = Number(localStorage.getItem("sky-patrol-best"));
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  }
  function saveBest() {
    try {
      localStorage.setItem("sky-patrol-best", String(best));
    } catch {}
  }
  function fmt(n) {
    return String(Math.max(0, n)).padStart(6, "0");
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function hit(a, b) {
    return (
      Math.abs(a.x - b.x) < a.w / 2 + b.w / 2 &&
      Math.abs(a.y - b.y) < a.h / 2 + b.h / 2
    );
  }
  function shotHit(a, b) {
    const from = (a.previousY ?? a.y) - (b.previousY ?? b.y),
      to = a.y - b.y,
      r = (a.h + b.h) / 2;
    return (
      Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
      Math.min(from, to) < r &&
      Math.max(from, to) > -r
    );
  }
  function setHud() {
    if (score > best) {
      best = score;
      saveBest();
      bestEl.textContent = fmt(best);
    }
    scoreEl.textContent = fmt(score);
    levelEl.textContent = String(level).padStart(2, "0");
    livesEl.textContent = "♥".repeat(lives) + "·".repeat(3 - lives);
  }

  function beep(freq, duration, type = "square", volume = 0.035) {
    if (muted) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio();
      if (audio.state === "suspended") audio.resume()?.catch(() => {});
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(volume, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + duration);
    } catch {
      /* Audio is optional; gameplay must continue. */
    }
  }
  function noise() {
    beep(75, 0.08, "sawtooth", 0.045);
  }

  function reset() {
    clearInput();
    score = 0;
    level = 1;
    lives = 3;
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    spawnTimer = 0;
    fireTimer = 0;
    enemyFireTimer = 0;
    levelTimer = 0;
    shake = 0;
    player = {
      x: W / 2,
      y: H - 24,
      w: 30,
      h: 44,
      speed: 285,
      invuln: 0,
      fireLevel: 1,
    };
    stars = Array.from({ length: 70 }, () => ({
      x: rand(12, W - 12),
      y: rand(0, H),
      s: rand(0.5, 2.1),
      v: rand(20, 90),
      a: rand(0.25, 0.9),
    }));
    setHud();
  }
  function start() {
    reset();
    last = performance.now();
    accumulator = 0;
    state = "playing";
    setControls("Flight started. Weapons fire automatically.");
    overlay.classList.add("hidden");
    requestFrame();
    beep(440, 0.08);
    setTimeout(() => beep(660, 0.12), 70);
  }
  function gameOver() {
    clearInput();
    state = "gameover";
    setControls("Run complete. Final score " + score + ".");
    overlay.classList.remove("hidden");
    startButton.textContent = "PLAY AGAIN";
    document.querySelector(".eyebrow").textContent = "RUN COMPLETE";
    document.querySelector(".intro h1").innerHTML = "GAME<br><em>OVER</em>";
    document.querySelector(".hint").textContent = "FINAL SCORE " + fmt(score);
    best = Math.max(best, score);
    saveBest();
    bestEl.textContent = fmt(best);
    noise();
  }
  function setControls(message) {
    const button = $("mobilePauseButton");
    button.disabled = !["playing", "paused"].includes(state);
    button.textContent = state === "paused" ? "RESUME" : "PAUSE";
    if (message) $("flightStatus").textContent = message;
  }
  function clearInput() {
    keys.clear();
    for (const prop of Object.keys(pointer)) pointer[prop] = false;
    for (const hold of holds) hold.ids.clear();
    drag = null;
  }
  function pause() {
    if (state === "playing") {
      clearInput();
      state = "paused";
      setControls("Flight paused.");
      overlay.classList.remove("hidden");
      startButton.textContent = "RESUME";
      document.querySelector(".eyebrow").textContent = "FLIGHT PAUSED";
      document.querySelector(".intro h1").innerHTML = "PAUSED";
      document.querySelector(".hint").textContent = "PRESS P OR TAP RESUME";
      requestFrame();
    } else if (state === "paused") {
      clearInput();
      last = performance.now();
      accumulator = 0;
      state = "playing";
      setControls("Flight resumed.");
      overlay.classList.add("hidden");
      requestFrame();
    }
  }

  function spawnEnemy() {
    const type = Math.random() < 0.2 ? "heavy" : "scout";
    const w = type === "heavy" ? 34 : 25;
    enemies.push({
      x: rand(26, W - 26),
      y: -30,
      w,
      h: w,
      hp: type === "heavy" ? 3 : 1,
      maxHp: type === "heavy" ? 3 : 1,
      type,
      vy: rand(30, 48) + level * 4,
      vx: rand(-28, 28),
      phase: Math.random() * 7,
      score: type === "heavy" ? 90 : 25,
    });
  }
  function fire() {
    if (fireTimer > 0) return;
    fireTimer += 0.18;
    const spread = player.fireLevel > 1 ? [-7, 7] : [0];
    spread.forEach((dx) =>
      bullets.push({
        x: player.x + dx,
        y: player.y - 20,
        w: 3,
        h: 14,
        vy: -520,
      }),
    );
    beep(520, 0.035, "square", 0.018);
  }
  function enemyFire() {
    const visible = enemies.filter((e) => e.y >= e.h / 2 && e.y <= H - e.h / 2);
    if (!visible.length) return;
    const e = visible[Math.floor(Math.random() * visible.length)];
    enemyBullets.push({
      x: e.x,
      y: e.y + 18,
      w: 4,
      h: 12,
      vy: 145 + level * 10,
    });
    beep(120, 0.035, "triangle", 0.012);
  }
  function burst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++)
      particles.push({
        x,
        y,
        vx: rand(-100, 100),
        vy: rand(-100, 100),
        life: rand(0.25, 0.65),
        max: 0.65,
        color,
        size: rand(1, 3),
      });
  }
  function hurt() {
    if (state !== "playing" || player.invuln > 0) return;
    lives--;
    player.invuln = 1.5;
    shake = 0.3;
    burst(player.x, player.y, colors.red, 24);
    noise();
    setHud();
    if (lives <= 0) gameOver();
  }

  function update(dt) {
    if (state !== "playing") return;
    stars.forEach((s) => {
      s.y += s.v * dt * (1 + level * 0.04);
      if (s.y > H + 4) {
        s.y = -4;
        s.x = rand(12, W - 12);
      }
    });
    player.previousY = player.y;
    if (player.invuln > 0) player.invuln -= dt;
    const dirX =
      (keys.has("ArrowLeft") || keys.has("a") || pointer.left ? -1 : 0) +
      (keys.has("ArrowRight") || keys.has("d") || pointer.right ? 1 : 0);
    const dirY =
      (keys.has("ArrowUp") || keys.has("w") || pointer.up ? -1 : 0) +
      (keys.has("ArrowDown") || keys.has("s") || pointer.down ? 1 : 0);
    const length = Math.hypot(dirX, dirY) || 1;
    player.x = clamp(
      player.x + (dirX / length) * player.speed * dt,
      player.w / 2,
      W - player.w / 2,
    );
    player.y = clamp(
      player.y + (dirY / length) * player.speed * dt,
      player.h / 2,
      H - player.h / 2,
    );
    // The ship fires automatically.
    fireTimer -= dt;
    fire();

    spawnTimer -= dt;
    enemyFireTimer -= dt;
    levelTimer += dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer += Math.max(0.28, 1.05 - level * 0.045);
    }
    if (enemyFireTimer <= 0) {
      enemyFire();
      enemyFireTimer += Math.max(0.55, 1.7 - level * 0.08);
    }
    if (levelTimer >= 24) {
      level++;
      levelTimer -= 24;
      setHud();
      beep(880, 0.12, "triangle");
    }
    bullets.forEach((b) => {
      b.previousY = b.y;
      b.y += b.vy * dt;
    });
    enemyBullets.forEach((b) => {
      b.previousY = b.y;
      b.y += b.vy * dt;
    });
    enemies.forEach((e) => {
      e.previousY = e.y;
      e.y += e.vy * dt;
      e.x = clamp(
        e.x + Math.sin((e.y + e.phase * 20) / 70) * e.vx * dt,
        e.w / 2,
        W - e.w / 2,
      );
    });
    enemies = enemies.filter((e) => {
      if (e.y > H + 40) {
        hurt();
        return false;
      }
      return true;
    });
    if (state !== "playing") return;
    for (let i = bullets.length - 1; i >= 0; i--) {
      let removed = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (shotHit(bullets[i], enemies[j])) {
          const e = enemies[j];
          e.hp--;
          burst(bullets[i].x, bullets[i].y, colors.orange, 5);
          bullets.splice(i, 1);
          removed = true;
          if (e.hp <= 0) {
            score += e.score;
            burst(e.x, e.y, e.type === "heavy" ? colors.red : colors.cyan, 18);
            if (Math.random() < 0.08)
              powerups.push({
                x: e.x,
                y: e.y,
                w: 15,
                h: 15,
                vy: 55,
                kind: "double",
              });
            enemies.splice(j, 1);
            beep(e.type === "heavy" ? 180 : 260, 0.08, "square", 0.025);
            setHud();
          }
          break;
        }
      }
      if (removed) continue;
    }
    bullets = bullets.filter((b) => b.y > -20);
    enemyBullets.forEach((b) => {
      if (shotHit(b, player)) {
        b.y = H + 30;
        hurt();
      }
    });
    enemyBullets = enemyBullets.filter((b) => b.y < H + 20);
    enemies.forEach((e) => {
      if (hit(e, player)) {
        e.y = H + 30;
        hurt();
      }
    });
    if (state !== "playing") return;
    powerups.forEach((p) => (p.y += p.vy * dt));
    powerups = powerups.filter((p) => {
      if (hit(p, player)) {
        player.fireLevel = 2;
        score += 15;
        setHud();
        beep(740, 0.12, "sine");
        return false;
      }
      return p.y < H + 20;
    });
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 70 * dt;
      p.life -= dt;
    });
    particles = particles.filter((p) => p.life > 0);
    shake = Math.max(0, shake - dt);
  }

  function draw() {
    const isLight = document.documentElement.dataset.theme === "light";
    ctx.save();
    if (shake > 0) ctx.translate(rand(-3, 3), rand(-3, 3));
    ctx.fillStyle = isLight ? "#f7f4ec" : "#080d15";
    ctx.fillRect(0, 0, W, H);
    stars.forEach((s) => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = isLight ? "#8b8177" : colors.white;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = isLight ? "rgba(2,136,209,.15)" : "rgba(100,230,224,.08)";
    ctx.beginPath();
    ctx.moveTo(0, H - 48);
    ctx.lineTo(W, H - 48);
    ctx.stroke();
    const cyan = isLight ? "#0288d1" : colors.cyan;
    const red = isLight ? "#e63946" : colors.red;
    const orange = isLight ? "#f77f00" : colors.orange;
    bullets.forEach((b) => {
      ctx.fillStyle = cyan;
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    });
    enemyBullets.forEach((b) => {
      ctx.fillStyle = red;
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    });
    enemies.forEach((e) => {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = e.type === "heavy" ? red : orange;
      ctx.strokeStyle = isLight ? "#d8d0c5" : "#101923";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-e.w / 2, -e.h / 3);
      ctx.lineTo(-e.w / 5, -e.h / 2);
      ctx.lineTo(e.w / 5, -e.h / 2);
      ctx.lineTo(e.w / 2, -e.h / 3);
      ctx.lineTo(e.w / 3, e.h / 3);
      ctx.lineTo(-e.w / 3, e.h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isLight ? "#f7f4ec" : "#101923";
      ctx.fillRect(-e.w / 4, -2, 4, 4);
      ctx.fillRect(e.w / 4 - 4, -2, 4, 4);
      if (e.maxHp > 1) {
        ctx.fillStyle = isLight ? "#d8d0c5" : "#172432";
        ctx.fillRect(-e.w / 2, -e.h / 2 - 8, e.w, 3);
        ctx.fillStyle = red;
        ctx.fillRect(-e.w / 2, -e.h / 2 - 8, e.w * (e.hp / e.maxHp), 3);
      }
      ctx.restore();
    });
    powerups.forEach((p) => {
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = cyan;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("×", p.x, p.y + 4);
    });
    if (
      player &&
      !(player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0)
    ) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(15, 15);
      ctx.lineTo(5, 12);
      ctx.lineTo(0, 22);
      ctx.lineTo(-5, 12);
      ctx.lineTo(-15, 15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isLight ? "#f7f4ec" : "#0b111a";
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(5, 4);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function requestFrame() {
    if (frameId === null) frameId = requestAnimationFrame(loop);
  }
  function loop(t) {
    frameId = null;
    const dt = clamp((t - last) / 1000, 0, 0.25);
    last = t;
    if (state === "playing") {
      accumulator += dt;
      while (accumulator + 1e-9 >= STEP && state === "playing") {
        accumulator -= STEP;
        update(STEP);
      }
    } else accumulator = 0;
    draw();
    if (state === "playing") requestFrame();
  }

  function releaseHold(e) {
    for (const hold of holds) {
      hold.ids.delete(e.pointerId);
      pointer[hold.prop] = hold.ids.size > 0;
    }
  }
  function bindHold(id, prop) {
    const el = $(id),
      ids = new Set();
    holds.push({ prop, ids });
    el.addEventListener("pointerdown", (e) => {
      if (state !== "playing" || e.button > 0) return;
      e.preventDefault();
      ids.add(e.pointerId);
      pointer[prop] = true;
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {}
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(type, (e) => {
        e.preventDefault();
        ids.delete(e.pointerId);
        pointer[prop] = ids.size > 0;
      });
  }
  window.addEventListener("pointerup", releaseHold);
  window.addEventListener("pointercancel", releaseHold);
  startButton.addEventListener("click", () => {
    if (state === "paused") {
      pause();
    } else start();
  });
  soundButton.addEventListener("click", () => {
    muted = !muted;
    soundButton.setAttribute("aria-pressed", String(!muted));
    soundButton.classList.toggle("on", !muted);
    soundButton.textContent = muted ? "MUTED" : "SOUND";
    if (!muted) beep(660, 0.06);
  });
  $("mobilePauseButton").addEventListener("click", pause);
  bindHold("leftButton", "left");
  bindHold("rightButton", "right");
  bindHold("upButton", "up");
  bindHold("downButton", "down");
  const movementKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "a",
    "d",
    "w",
    "s",
  ];
  window.addEventListener("keydown", (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.target?.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)
    )
      return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (movementKeys.includes(key)) {
      if (state === "playing") {
        e.preventDefault();
        keys.add(key);
      }
      return;
    }
    if (["p", "m"].includes(key)) {
      e.preventDefault();
      if (e.repeat) return;
      if (key === "p") pause();
      else soundButton.click();
    }
  });
  window.addEventListener("keyup", (e) =>
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
  function pointerPosition(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "playing" || drag || e.button > 0) return;
    e.preventDefault();
    drag = { id: e.pointerId, ...pointerPosition(e) };
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (state !== "playing" || !drag || drag.id !== e.pointerId) return;
    if (e.pointerType === "mouse" && !e.buttons) {
      drag = null;
      return;
    }
    e.preventDefault();
    const p = pointerPosition(e);
    player.x = clamp(player.x + p.x - drag.x, player.w / 2, W - player.w / 2);
    player.y = clamp(player.y + p.y - drag.y, player.h / 2, H - player.h / 2);
    drag.x = p.x;
    drag.y = p.y;
  });
  function endDrag(e) {
    if (drag?.id === e.pointerId) drag = null;
  }
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, endDrag);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  function suspend() {
    clearInput();
    if (state === "playing") pause();
  }
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
  });
  function preventGameTouch(e) {
    if (state === "playing") e.preventDefault();
  }
  document.addEventListener("touchmove", preventGameTouch, { passive: false });
  document.addEventListener("themechange", requestFrame);
  window.addEventListener("resize", requestFrame);
  reset();
  setControls();
  soundButton.setAttribute("aria-pressed", String(!muted));
  requestFrame();
})();
