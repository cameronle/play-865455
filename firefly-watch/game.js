(() => {
  'use strict';

  const RULES = FireflyWatchRules;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const message = document.getElementById('message');
  const detail = document.getElementById('detail');
  const startButton = document.getElementById('startButton');
  const pauseButton = document.getElementById('pauseButton');
  const upgradePanel = document.getElementById('upgradePanel');
  const upgradeChoices = document.getElementById('upgradeChoices');
  const scoreElement = document.getElementById('score');
  const bestElement = document.getElementById('best');
  const timeElement = document.getElementById('time');
  const levelElement = document.getElementById('level');
  const xpFill = document.getElementById('xpFill');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const TAU = Math.PI * 2;
  const BEST_KEY = 'fireflyWatchBest';
  const bossMilestones = [90, 180, 270];
  const input = {left: false, right: false, up: false, down: false, pointerX: 0, pointerY: 0};
  const gardenMarks = Array.from({length: 32}, (_, index) => ({
    x: 34 + ((index * 137) % 650),
    y: 42 + ((index * 223) % 630),
    size: 2 + (index % 3)
  }));

  const enemyTypes = {
    moth: {label: 'MOTH', radius: 15, hp: 18, speed: 66, xp: 2, score: 24, color: 'violet'},
    gnat: {label: 'GNAT', radius: 9, hp: 10, speed: 108, xp: 1, score: 15, color: 'coral'},
    beetle: {label: 'BEETLE', radius: 21, hp: 48, speed: 44, xp: 4, score: 55, color: 'mint'},
    shade: {label: 'SHADE', radius: 17, hp: 34, speed: 78, xp: 3, score: 42, color: 'cyan'},
    boss: {label: 'MOON MOTH', radius: 46, hp: 430, speed: 35, xp: 24, score: 850, color: 'yellow', boss: true}
  };

  let palette = readPalette();
  let state = 'title';
  let stats = RULES.createPlayerStats();
  let player = createPlayer();
  let enemies = [];
  let shots = [];
  let glowDrops = [];
  let bursts = [];
  let elapsed = 0;
  let score = 0;
  let level = 1;
  let xp = 0;
  let spawnTimer = 0;
  let fireTimer = 0;
  let nextBossIndex = 0;
  let enemySequence = 0;
  let dragPointer = null;
  let lastTime = performance.now();
  let best = readBest();

  function readBest() {
    try {
      return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch (_) {
      return 0;
    }
  }

  function saveBest() {
    if (score <= best) return;
    best = score;
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (_) {}
  }

  function readPalette() {
    const style = getComputedStyle(document.documentElement);
    const value = name => style.getPropertyValue(name).trim();
    return {
      board: value('--board') || '#0d1d20',
      paper: value('--paper') || '#102326',
      panel: value('--panel') || '#173034',
      ink: value('--ink') || '#ecf4d7',
      muted: value('--muted') || '#93a79c',
      line: value('--line') || '#355257',
      yellow: value('--yellow') || '#f1d36b',
      mint: value('--mint') || '#7fcf9a',
      cyan: value('--cyan') || '#70c7c2',
      coral: value('--coral') || '#e78572',
      violet: value('--violet') || '#9c91d5'
    };
  }

  function createPlayer() {
    return {x: WIDTH / 2, y: HEIGHT / 2, radius: 13, invulnerable: 0, orbitAngle: 0};
  }

  function resetInput() {
    for (const key of ['left', 'right', 'up', 'down']) input[key] = false;
    input.pointerX = 0;
    input.pointerY = 0;
    dragPointer = null;
    document.querySelectorAll('.move-pad button').forEach(button => button.classList.remove('active'));
  }

  function startGame() {
    stats = RULES.createPlayerStats();
    player = createPlayer();
    enemies = [];
    shots = [];
    glowDrops = [];
    bursts = [];
    elapsed = 0;
    score = 0;
    level = 1;
    xp = 0;
    spawnTimer = 0.3;
    fireTimer = 0;
    nextBossIndex = 0;
    enemySequence = 0;
    resetInput();
    state = 'playing';
    overlay.classList.add('hidden');
    upgradePanel.hidden = true;
    pauseButton.textContent = 'PAUSE';
    pauseButton.disabled = false;
    updateHud();
    lastTime = performance.now();
  }

  function showOverlay(title, text, buttonText) {
    message.textContent = title;
    detail.textContent = text;
    startButton.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      resetInput();
      pauseButton.textContent = 'RESUME';
      showOverlay('NIGHT PAUSED', 'THE GARDEN IS WAITING.', 'RESUME WATCH');
    } else if (state === 'paused') {
      state = 'playing';
      pauseButton.textContent = 'PAUSE';
      overlay.classList.add('hidden');
      lastTime = performance.now();
    }
  }

  function finishGame(won) {
    state = won ? 'won' : 'over';
    resetInput();
    saveBest();
    pauseButton.textContent = 'PAUSE';
    pauseButton.disabled = true;
    const title = won ? 'DAWN ARRIVES' : 'THE LIGHT WENT OUT';
    const text = won
      ? `NIGHT CLEARED · SCORE ${formatScore(score)} · LEVEL ${String(level).padStart(2, '0')}`
      : `SCORE ${formatScore(score)} · LEVEL ${String(level).padStart(2, '0')} · TRY A NEW BUILD`;
    showOverlay(title, text, won ? 'WATCH ANOTHER NIGHT' : 'TRY AGAIN');
    updateHud();
  }

  function randomEdgePosition(radius) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) return {x: Math.random() * WIDTH, y: -radius - 8};
    if (edge === 1) return {x: WIDTH + radius + 8, y: Math.random() * HEIGHT};
    if (edge === 2) return {x: Math.random() * WIDTH, y: HEIGHT + radius + 8};
    return {x: -radius - 8, y: Math.random() * HEIGHT};
  }

  function chooseEnemyType(tier) {
    const roll = Math.random();
    if (tier <= 0) return roll < 0.78 ? enemyTypes.moth : enemyTypes.gnat;
    if (tier === 1) return roll < 0.5 ? enemyTypes.moth : roll < 0.76 ? enemyTypes.gnat : enemyTypes.beetle;
    if (tier === 2) return roll < 0.34 ? enemyTypes.moth : roll < 0.58 ? enemyTypes.gnat : roll < 0.82 ? enemyTypes.beetle : enemyTypes.shade;
    return roll < 0.24 ? enemyTypes.moth : roll < 0.48 ? enemyTypes.gnat : roll < 0.72 ? enemyTypes.beetle : enemyTypes.shade;
  }

  function spawnEnemy(forceBoss = false) {
    const difficulty = RULES.difficultyAt(elapsed);
    const type = forceBoss ? enemyTypes.boss : chooseEnemyType(difficulty.tier);
    const position = randomEdgePosition(type.radius);
    const bossScale = type.boss ? 1 + elapsed / RULES.survivalDuration * 0.4 : 1;
    const hp = Math.round(type.hp * difficulty.healthScale * bossScale);
    enemies.push({
      id: ++enemySequence,
      type,
      x: position.x,
      y: position.y,
      radius: type.radius,
      hp,
      maxHp: hp,
      speed: type.speed * difficulty.speedScale,
      phase: Math.random() * TAU,
      orbiterCooldown: 0,
      dead: false,
      escaped: false
    });
    if (forceBoss) addBurst(position.x, position.y, palette.yellow, 16, 120);
  }

  function findNearestEnemy() {
    let nearest = null;
    let distanceSquared = Infinity;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const candidate = dx * dx + dy * dy;
      if (candidate < distanceSquared) {
        distanceSquared = candidate;
        nearest = enemy;
      }
    }
    return nearest;
  }

  function fireVolley() {
    const target = findNearestEnemy();
    if (!target) return;
    const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
    const count = stats.projectiles;
    const spread = count > 1 ? 0.18 : 0;
    for (let index = 0; index < count; index += 1) {
      const angle = baseAngle + (index - (count - 1) / 2) * spread;
      shots.push({
        x: player.x,
        y: player.y,
        radius: 4,
        vx: Math.cos(angle) * 510,
        vy: Math.sin(angle) * 510,
        damage: stats.damage,
        pierceLeft: stats.pierce,
        hitIds: new Set(),
        life: 1.6
      });
    }
    addBurst(player.x, player.y, palette.yellow, 3, 45);
  }

  function addBurst(x, y, color, count = 6, speed = 70) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      bursts.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.22 + Math.random() * 0.32,
        maxLife: 0.54,
        color
      });
    }
  }

  function resolveEnemyDeath(enemy) {
    score += enemy.type.score;
    const pieces = enemy.type.boss ? 8 : 1;
    const value = Math.max(1, Math.ceil(enemy.type.xp / pieces));
    for (let index = 0; index < pieces; index += 1) {
      const angle = Math.random() * TAU;
      glowDrops.push({
        x: enemy.x + Math.cos(angle) * enemy.radius * 0.45,
        y: enemy.y + Math.sin(angle) * enemy.radius * 0.45,
        radius: enemy.type.boss ? 6 : 5,
        value,
        phase: Math.random() * TAU
      });
    }
    addBurst(enemy.x, enemy.y, enemy.type.boss ? palette.yellow : palette[enemy.type.color], enemy.type.boss ? 28 : 8, enemy.type.boss ? 180 : 90);
  }

  function damagePlayer() {
    if (player.invulnerable > 0) return;
    if (stats.shields > 0) {
      stats = {...stats, shields: stats.shields - 1};
      player.invulnerable = 0.55;
      addBurst(player.x, player.y, palette.cyan, 12, 110);
      return;
    }
    stats = {...stats, hp: Math.max(0, stats.hp - 1)};
    player.invulnerable = 1.05;
    addBurst(player.x, player.y, palette.coral, 14, 125);
    if (stats.hp <= 0) finishGame(false);
  }

  function gainXp(value) {
    xp += value;
    if (state === 'playing' && xp >= RULES.xpNeeded(level)) triggerLevelUp();
  }

  function triggerLevelUp() {
    const needed = RULES.xpNeeded(level);
    if (xp < needed) return;
    xp -= needed;
    level += 1;
    state = 'upgrade';
    resetInput();
    const offer = RULES.chooseUpgradeOffer(stats);
    if (!offer.length) {
      state = 'playing';
      return;
    }
    upgradeChoices.replaceChildren();
    for (const upgrade of offer) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-choice';
      const rank = stats.upgradeRanks[upgrade.id] || 0;
      button.innerHTML = `<b>${upgrade.label}</b><span>${upgrade.description}</span><small>RANK ${rank + 1} / ${upgrade.maxRank}</small>`;
      button.addEventListener('click', () => chooseUpgrade(upgrade.id), {once: true});
      upgradeChoices.appendChild(button);
    }
    upgradePanel.hidden = false;
    updateHud();
  }

  function chooseUpgrade(upgradeId) {
    stats = RULES.applyUpgrade(stats, upgradeId);
    upgradePanel.hidden = true;
    if (xp >= RULES.xpNeeded(level)) {
      state = 'playing';
      triggerLevelUp();
    } else {
      state = 'playing';
      lastTime = performance.now();
    }
    updateHud();
  }

  function updatePlayer(dt) {
    const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.pointerX;
    const vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.pointerY;
    const direction = RULES.normalizeVector(horizontal, vertical);
    player.x = Math.max(player.radius, Math.min(WIDTH - player.radius, player.x + direction.x * stats.speed * dt));
    player.y = Math.max(player.radius, Math.min(HEIGHT - player.radius, player.y + direction.y * stats.speed * dt));
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.orbitAngle = (player.orbitAngle + dt * 1.75) % TAU;
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      enemy.orbiterCooldown = Math.max(0, enemy.orbiterCooldown - dt);
      enemy.phase += dt * (enemy.type.boss ? 1.2 : 2.1);
      const direction = RULES.normalizeVector(player.x - enemy.x, player.y - enemy.y);
      const wobble = enemy.type === enemyTypes.gnat ? Math.sin(enemy.phase * 3) * 0.42 : enemy.type === enemyTypes.shade ? Math.sin(enemy.phase) * 0.24 : 0;
      enemy.x += (direction.x - direction.y * wobble) * enemy.speed * dt;
      enemy.y += (direction.y + direction.x * wobble) * enemy.speed * dt;

      if (stats.orbiters > 0 && enemy.orbiterCooldown <= 0) {
        for (let index = 0; index < stats.orbiters; index += 1) {
          const angle = player.orbitAngle + index * TAU / stats.orbiters;
          const orbiter = {x: player.x + Math.cos(angle) * 46, y: player.y + Math.sin(angle) * 46, r: 7};
          if (RULES.circlesOverlap(orbiter, {x: enemy.x, y: enemy.y, r: enemy.radius})) {
            enemy.hp -= 8 + stats.damage * 0.45;
            enemy.orbiterCooldown = 0.28;
            addBurst(orbiter.x, orbiter.y, palette.cyan, 4, 55);
            if (enemy.hp <= 0) enemy.dead = true;
            break;
          }
        }
      }

      if (RULES.circlesOverlap({x: player.x, y: player.y, r: player.radius}, {x: enemy.x, y: enemy.y, r: enemy.radius})) {
        damagePlayer();
        if (!enemy.type.boss) {
          enemy.dead = true;
          enemy.escaped = true;
        } else {
          enemy.x -= direction.x * 36;
          enemy.y -= direction.y * 36;
        }
      }
    }
  }

  function updateShots(dt) {
    for (let shotIndex = shots.length - 1; shotIndex >= 0; shotIndex -= 1) {
      const shot = shots[shotIndex];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      let removeShot = shot.life <= 0 || shot.x < -20 || shot.y < -20 || shot.x > WIDTH + 20 || shot.y > HEIGHT + 20;
      if (!removeShot) {
        for (const enemy of enemies) {
          if (enemy.dead || shot.hitIds.has(enemy.id)) continue;
          if (!RULES.circlesOverlap({x: shot.x, y: shot.y, r: shot.radius}, {x: enemy.x, y: enemy.y, r: enemy.radius})) continue;
          shot.hitIds.add(enemy.id);
          enemy.hp -= shot.damage;
          addBurst(shot.x, shot.y, palette.yellow, 3, 45);
          if (enemy.hp <= 0) enemy.dead = true;
          if (shot.pierceLeft > 0) shot.pierceLeft -= 1;
          else removeShot = true;
          break;
        }
      }
      if (removeShot) shots.splice(shotIndex, 1);
    }
  }

  function updateGlowDrops(dt) {
    for (let index = glowDrops.length - 1; index >= 0; index -= 1) {
      const drop = glowDrops[index];
      drop.phase += dt * 4;
      const dx = player.x - drop.x;
      const dy = player.y - drop.y;
      const distance = Math.hypot(dx, dy);
      if (distance < stats.pickupRadius && distance > 0) {
        const speed = 150 + (stats.pickupRadius - distance) * 4;
        drop.x += dx / distance * speed * dt;
        drop.y += dy / distance * speed * dt;
      }
      if (distance < player.radius + drop.radius + 4) {
        gainXp(drop.value);
        score += drop.value * 5;
        addBurst(drop.x, drop.y, palette.yellow, 4, 50);
        glowDrops.splice(index, 1);
      }
    }
  }

  function updateBursts(dt) {
    for (let index = bursts.length - 1; index >= 0; index -= 1) {
      const particle = bursts[index];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= dt;
      if (particle.life <= 0) bursts.splice(index, 1);
    }
  }

  function update(dt) {
    elapsed = Math.min(RULES.survivalDuration, elapsed + dt);
    if (elapsed >= RULES.survivalDuration) {
      finishGame(true);
      return;
    }

    const difficulty = RULES.difficultyAt(elapsed);
    updatePlayer(dt);

    spawnTimer -= dt;
    while (spawnTimer <= 0 && enemies.length < 100) {
      spawnEnemy(false);
      spawnTimer += difficulty.spawnInterval * (0.82 + Math.random() * 0.36);
    }
    if (nextBossIndex < bossMilestones.length && elapsed >= bossMilestones[nextBossIndex]) {
      spawnEnemy(true);
      nextBossIndex += 1;
    }

    fireTimer -= dt;
    if (fireTimer <= 0 && enemies.length) {
      fireVolley();
      fireTimer += stats.fireCooldown;
    }

    updateEnemies(dt);
    if (state !== 'playing') return;
    updateShots(dt);
    updateGlowDrops(dt);
    updateBursts(dt);

    const survivors = [];
    for (const enemy of enemies) {
      if (enemy.dead) {
        if (!enemy.escaped) resolveEnemyDeath(enemy);
      } else {
        survivors.push(enemy);
      }
    }
    enemies = survivors;
    updateHud();
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(6, '0');
  }

  function formatTime(seconds) {
    const remaining = Math.max(0, Math.ceil(RULES.survivalDuration - seconds));
    return `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  }

  function updateHud() {
    scoreElement.textContent = formatScore(score);
    bestElement.textContent = formatScore(Math.max(best, score));
    timeElement.textContent = formatTime(elapsed);
    levelElement.textContent = String(level).padStart(2, '0');
    const needed = RULES.xpNeeded(level);
    xpFill.style.width = `${Math.max(0, Math.min(100, xp / needed * 100))}%`;
  }

  function drawBackground() {
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = palette.line;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    for (let position = 72; position < WIDTH; position += 72) {
      ctx.beginPath();
      ctx.moveTo(position, 0);
      ctx.lineTo(position, HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, position);
      ctx.lineTo(WIDTH, position);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = palette.mint;
    ctx.strokeStyle = palette.mint;
    for (const mark of gardenMarks) {
      ctx.beginPath();
      ctx.moveTo(mark.x, mark.y + mark.size * 2);
      ctx.lineTo(mark.x, mark.y - mark.size * 2);
      ctx.stroke();
      ctx.fillRect(mark.x - mark.size * 2, mark.y - mark.size, mark.size * 2, mark.size);
      ctx.fillRect(mark.x, mark.y - mark.size * 2, mark.size * 2, mark.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawGlowDrops() {
    for (const drop of glowDrops) {
      ctx.save();
      ctx.translate(drop.x, drop.y);
      ctx.rotate(drop.phase * 0.25);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = palette.yellow;
      ctx.fillRect(-drop.radius * 2, -drop.radius * 2, drop.radius * 4, drop.radius * 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.yellow;
      ctx.beginPath();
      ctx.moveTo(0, -drop.radius);
      ctx.lineTo(drop.radius, 0);
      ctx.lineTo(0, drop.radius);
      ctx.lineTo(-drop.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemy(enemy) {
    const color = palette[enemy.type.color];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = color;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = enemy.type.boss ? 3 : 2;

    if (enemy.type === enemyTypes.moth || enemy.type.boss) {
      const wing = enemy.radius * (enemy.type.boss ? 1.05 : 0.92);
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-wing, -wing * 0.7);
      ctx.lineTo(-wing * 0.72, wing * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(wing, -wing * 0.7);
      ctx.lineTo(wing * 0.72, wing * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = enemy.type.boss ? palette.yellow : palette.ink;
      ctx.fillRect(-5, -enemy.radius * 0.72, 10, enemy.radius * 1.45);
    } else if (enemy.type === enemyTypes.beetle) {
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius * 0.72, enemy.radius, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(0, enemy.radius);
      ctx.stroke();
      ctx.fillStyle = palette.ink;
      ctx.fillRect(-enemy.radius * 0.45, -3, enemy.radius * 0.9, 6);
    } else if (enemy.type === enemyTypes.gnat) {
      ctx.beginPath();
      ctx.moveTo(-enemy.radius, -enemy.radius * 0.55);
      ctx.lineTo(enemy.radius, enemy.radius * 0.55);
      ctx.moveTo(enemy.radius, -enemy.radius * 0.55);
      ctx.lineTo(-enemy.radius, enemy.radius * 0.55);
      ctx.stroke();
      ctx.fillRect(-3, -enemy.radius, 6, enemy.radius * 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius, 0);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.board;
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();

    if (enemy.type.boss) {
      const width = 92;
      ctx.fillStyle = palette.line;
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 16, width, 6);
      ctx.fillStyle = palette.yellow;
      ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 16, width * Math.max(0, enemy.hp / enemy.maxHp), 6);
    }
  }

  function drawPlayer() {
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 14) % 2 === 0) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = palette.cyan;
    ctx.beginPath();
    ctx.ellipse(-10, -2, 9, 5, -0.35, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, -2, 9, 5, 0.35, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(-4, -10, 8, 18);
    ctx.fillStyle = palette.yellow;
    ctx.beginPath();
    ctx.arc(0, 10, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = palette.yellow;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(0, 10, 16, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    if (stats.shields > 0) {
      ctx.strokeStyle = palette.cyan;
      ctx.lineWidth = 2 + stats.shields;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 12, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawOrbiters() {
    for (let index = 0; index < stats.orbiters; index += 1) {
      const angle = player.orbitAngle + index * TAU / stats.orbiters;
      const x = player.x + Math.cos(angle) * 46;
      const y = player.y + Math.sin(angle) * 46;
      ctx.fillStyle = palette.cyan;
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.strokeStyle = palette.ink;
      ctx.strokeRect(x - 5, y - 5, 10, 10);
    }
  }

  function drawShots() {
    ctx.fillStyle = palette.yellow;
    for (const shot of shots) {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vy, shot.vx));
      ctx.fillRect(-7, -2, 14, 4);
      ctx.restore();
    }
  }

  function drawBursts() {
    for (const particle of bursts) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawStatus() {
    ctx.fillStyle = palette.paper;
    ctx.globalAlpha = 0.86;
    ctx.fillRect(12, 12, 150, 34);
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.muted;
    ctx.font = '700 10px ui-monospace, monospace';
    ctx.fillText('HEARTS', 22, 33);
    for (let index = 0; index < stats.maxHp; index += 1) {
      ctx.fillStyle = index < stats.hp ? palette.coral : palette.line;
      ctx.fillRect(70 + index * 13, 23, 9, 9);
    }
    if (stats.maxShields > 0) {
      ctx.fillStyle = palette.paper;
      ctx.globalAlpha = 0.86;
      ctx.fillRect(WIDTH - 142, 12, 130, 34);
      ctx.globalAlpha = 1;
      ctx.fillStyle = palette.muted;
      ctx.fillText('SHIELD', WIDTH - 132, 33);
      for (let index = 0; index < stats.maxShields; index += 1) {
        ctx.strokeStyle = index < stats.shields ? palette.cyan : palette.line;
        ctx.strokeRect(WIDTH - 70 + index * 15, 23, 9, 9);
      }
    }
  }

  function draw() {
    drawBackground();
    drawGlowDrops();
    for (const enemy of enemies) drawEnemy(enemy);
    drawShots();
    drawOrbiters();
    drawPlayer();
    drawBursts();
    drawStatus();
  }

  function loop(now) {
    const dt = Math.min(0.033, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (state === 'playing') update(dt);
    else if (state !== 'upgrade') updateBursts(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function keyDirection(code) {
    if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
    if (code === 'ArrowRight' || code === 'KeyD') return 'right';
    if (code === 'ArrowUp' || code === 'KeyW') return 'up';
    if (code === 'ArrowDown' || code === 'KeyS') return 'down';
    return null;
  }

  window.addEventListener('keydown', event => {
    const direction = keyDirection(event.code);
    if (direction) {
      input[direction] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      togglePause();
      event.preventDefault();
      return;
    }
    if ((event.code === 'Enter' || event.code === 'Space') && ['title', 'over', 'won'].includes(state)) {
      startGame();
      event.preventDefault();
    } else if ((event.code === 'Enter' || event.code === 'Space') && state === 'paused') {
      togglePause();
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', event => {
    const direction = keyDirection(event.code);
    if (direction) {
      input[direction] = false;
      event.preventDefault();
    }
  });

  function bindDirectionButton(button) {
    const direction = button.dataset.direction;
    const press = event => {
      event.preventDefault();
      input[direction] = true;
      button.classList.add('active');
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    };
    const release = event => {
      event.preventDefault();
      input[direction] = false;
      button.classList.remove('active');
      try { button.releasePointerCapture(event.pointerId); } catch (_) {}
    };
    button.addEventListener('pointerdown', press);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('selectstart', event => event.preventDefault());
  }

  document.querySelectorAll('.move-pad button').forEach(bindDirectionButton);

  canvas.addEventListener('pointerdown', event => {
    if (state !== 'playing') return;
    event.preventDefault();
    dragPointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  });

  canvas.addEventListener('pointermove', event => {
    if (!dragPointer || dragPointer.id !== event.pointerId || state !== 'playing') return;
    event.preventDefault();
    const dx = event.clientX - dragPointer.x;
    const dy = event.clientY - dragPointer.y;
    const vector = RULES.normalizeVector(dx, dy);
    input.pointerX = vector.x;
    input.pointerY = vector.y;
  });

  function releaseCanvasPointer(event) {
    if (!dragPointer || dragPointer.id !== event.pointerId) return;
    event.preventDefault();
    input.pointerX = 0;
    input.pointerY = 0;
    dragPointer = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  canvas.addEventListener('pointerup', releaseCanvasPointer);
  canvas.addEventListener('pointercancel', releaseCanvasPointer);
  canvas.addEventListener('lostpointercapture', releaseCanvasPointer);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('selectstart', event => event.preventDefault());

  startButton.addEventListener('click', () => {
    if (state === 'paused') togglePause();
    else startGame();
  });
  pauseButton.addEventListener('click', togglePause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') togglePause();
  });
  document.addEventListener('themechange', () => {
    palette = readPalette();
    draw();
  });

  window.__fireflyWatchSnapshot = () => ({
    state,
    elapsed: Number(elapsed.toFixed(2)),
    score,
    best: Math.max(best, score),
    level,
    xp,
    hp: stats.hp,
    shields: stats.shields,
    player:{x:Number(player.x.toFixed(2)),y:Number(player.y.toFixed(2))},
    enemyCount: enemies.length,
    shotCount: shots.length,
    glowCount: glowDrops.length,
    overlayHidden: overlay.classList.contains('hidden'),
    upgradeHidden: upgradePanel.hidden,
    timeText: timeElement.textContent
  });

  bestElement.textContent = formatScore(best);
  updateHud();
  draw();
  requestAnimationFrame(loop);
})();
