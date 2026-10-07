(() => {
  "use strict";
  let storage;
  try {
    storage = window.localStorage;
  } catch {}
  const C = window.SkyPatrolContent,
    R = window.SkyPatrolRules,
    B = window.SkyPatrolBosses,
    L = window.SkyPatrolLocale.create(storage),
    Renderer = window.SkyPatrolRenderer;
  const $ = (id) => document.getElementById(id),
    canvas = $("game"),
    ctx = canvas.getContext("2d"),
    overlay = $("overlay"),
    startButton = $("startButton"),
    soundButton = $("soundButton");
  const keys = new Set(),
    pointer = { left: false, right: false, up: false, down: false },
    holds = [];
  let g = new R.Game(),
    drag = null,
    muted = false,
    audio,
    frameId = null,
    last = 0,
    accumulator = 0,
    bestRecord = 0,
    clearing = false,
    resultEffectsSuspended = false;
  const legacyBest = readLegacy(),
    legacyCampaign = R.readRecords(safeRead(C.LEGACY_RECORD_KEY), { version: 2, totalStages: 9 }),
    previousCampaign = R.readRecords(safeRead(C.PREVIOUS_RECORD_KEY), { version:3, totalStages:15 });
  let records = R.readRecords(safeRead(C.RECORD_KEY)),
    recordedClear = false;
  bestRecord = records.normal.best;
  function safeRead(key) {
    try {
      return storage?.getItem(key);
    } catch {
      return null;
    }
  }
  function updateRecords() {
    if (clearing || g.state === "title") return;
    const old = JSON.stringify(records),
      r = records[g.mode];
    r.best = Math.max(r.best, g.score);
    r.farthest = Math.max(r.farthest, g.level);
    if (g.state === "clear" && !recordedClear) {
      r.clears++;
      recordedClear = true;
    }
    bestRecord = r.best;
    if (JSON.stringify(records) !== old)
      try {
        storage?.setItem(C.RECORD_KEY, JSON.stringify(records));
      } catch {}
  }

  function readLegacy() {
    try {
      const n = Number(safeRead("sky-patrol-best"));
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  }
  const fmt = (n) => String(Math.max(0, n)).padStart(6, "0");
  function text(id, value) {
    const e = $(id),
      v = String(value);
    if (e.textContent !== v) e.textContent = v;
  }
  function attr(el, key, value) {
    if (el.getAttribute(key) !== String(value))
      el.setAttribute(key, String(value));
  }
  function beep(freq = 440) {
    if (muted) return;
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      audio ||= new A();
      if (audio.state === "suspended") audio.resume()?.catch(() => {});
      const o = audio.createOscillator(),
        a = audio.createGain();
      o.frequency.value = freq;
      a.gain.setValueAtTime(0.025, audio.currentTime);
      a.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.08);
      o.connect(a).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.08);
    } catch {}
  }
  function clearInput() {
    keys.clear();
    for (const k of Object.keys(pointer)) pointer[k] = false;
    for (const h of holds) h.ids.clear();
    drag = null;
  }
  function readInput() {
    return {
      x:
        (keys.has("ArrowRight") || keys.has("d") || pointer.right ? 1 : 0) -
        (keys.has("ArrowLeft") || keys.has("a") || pointer.left ? 1 : 0),
      y:
        (keys.has("ArrowDown") || keys.has("s") || pointer.down ? 1 : 0) -
        (keys.has("ArrowUp") || keys.has("w") || pointer.up ? 1 : 0),
    };
  }
  function setMode(mode) {
    if (!["title", "clear", "gameover"].includes(g.state) || hasResultEffects()) return;
    g = new R.Game({ mode });
    bestRecord = records[mode].best;
    recordedClear = false;
    sync();
    requestFrame();
  }
  function hasResultEffects() {
    return ["intermission", "clear"].includes(g.state) &&
      (g.particles.length > 0 || g.pulseTime > 0);
  }
  function start() {
    if (clearing || document.hidden || g.state === "playing" || hasResultEffects()) return;
    clearInput();
    if (g.state === "paused") g.resume();
    else if (g.state === "intermission") g.nextStage();
    else {
      g.start();
      recordedClear = false;
    }
    updateRecords();
    last = performance.now();
    accumulator = 0;
    sync();
    requestFrame();
    beep(660);
  }
  function pause() {
    if (g.state === "playing") {
      clearInput();
      g.pause();
    } else if (g.state === "paused") {
      if (document.hidden || clearing) return;
      clearInput();
      g.resume();
      last = performance.now();
      accumulator = 0;
    }
    sync();
    requestFrame();
  }
  function pulse() {
    if (g.pulse()) {
      updateRecords();
      sync();
      requestFrame();
      beep(180);
    }
  }
  function sync() {
    const mode = g.mode,
      stage = C.STAGES[g.level - 1],
      state = g.state,
      finishing = hasResultEffects();
    text("score", fmt(g.score));
    text(
      "level",
      String(g.level).padStart(2, "0") +
        " / " +
        (g.phase === "wave" ? Math.min(stage.waves.length, g.wave + 1) : "B"),
    );
    text(
      "lives",
      "♥".repeat(g.lives) +
        "·".repeat(3 - g.lives) +
        (g.player.shield ? " " + L.t("shield") : ""),
    );
    text("pulseButton", L.t("pulse") + " " + g.pulses);
    text("mobilePauseButton", L.t(state === "paused" ? "resume" : "pause"));
    $("mobilePauseButton").disabled = !["playing", "paused"].includes(state);
    $("pulseButton").disabled = state !== "playing" || g.pulses <= 0;
    const b = g.boss;
    $("bossHud").hidden = !b;
    if (b) {
      text("bossName", L.name(b.name));
      text("bossPhase", L.t("phase") + " " + b.phase);
      const hp = B.progress(b);
      $("bossHealth").max = hp.max;
      $("bossHealth").value = hp.value;
      text("bossDetails", b.stagedParts && b.phase === 1 ? L.t("partsPending") : b.turrets ?
        L.t("leftPart") + " " + b.turrets[0].hp + " · " +
        L.t("rightPart") + " " + b.turrets[1].hp + " · " +
        L.t(B.protectedCore(b) ? "coreProtected" : "coreOpen") : L.t("bodyHealth"));
      attr(
        $("bossHealth"),
        "aria-label",
        L.name(b.name) + " " + L.t(b.turrets ? "totalHealth" : "bodyHealth") + " " + hp.value + " / " + hp.max,
      );
    }
    const status =
      state === "playing"
        ? g.phase === "boss-warning"
          ? L.t("warning")
          : g.events.some(e=>e.type==="chase-warning"&&g.time-e.time<3)
            ? L.t("chase")
          : b?.attack || b?.side
            ? L.t((b.attack||b.side).kind)
            : b ? L.t(B.protectedCore(b) ? "tip-parts" : "tip-" + b.tip)
              : g.enemies.some(e=>!e.dead&&e.type==="support")?L.t("support") : L.name(stage.name)
        : L.t(
            state === "title"
              ? "intro"
              : state === "intermission"
                ? "intermission"
                : state === "paused"
                  ? "paused"
                  : state,
          );
    text("combatHint", status);
    text("flightStatus", status);
    overlay.classList.toggle("hidden", state === "playing" || finishing);
    $("supplySelect").hidden = !g.supplyPending;
    $("supplyLifeButton").disabled = !g.supplyPending || g.lives >= 3 || finishing;
    $("supplyPulseButton").disabled = !g.supplyPending || g.pulses >= 2 || finishing;
    $("normalButton").disabled = finishing;
    $("challengeButton").disabled = finishing;
    startButton.disabled = !!g.supplyPending || finishing;
    if (state !== "playing") {
      const titleKey =
        {
          title: "title",
          paused: "paused",
          intermission: "intermission",
          clear: "clear",
          gameover: "gameover",
        }[state] || "title";
      text("eyebrow", state === "title" ? L.t("intro") : L.name(stage.name));
      text("overlayTitle", L.t(titleKey));
      text(
        "hint",
        state === "title"
          ? L.t("help")
          : state === "paused"
            ? L.t("resume")
            : L.t("final") +
              " " +
              fmt(g.score) +
              (state === "intermission" && stage.chapterEnd
                ? "\n" + L.t(g.mode==="challenge"?(g.supplyPending?"supplyChoice":"supplyDone"):"checkpoint")
                : ""),
      );
      text(
        "startButton",
        L.t(
          state === "paused"
            ? "resume"
            : state === "intermission"
              ? "next"
              : state === "title"
                ? "start"
                : "again",
        ),
      );
      $("modeSelect").hidden = ["paused", "intermission"].includes(state);
      text("best", fmt(bestRecord));
      text(
        "record",
        L.t("record") +
          " " +
          records[mode].farthest +
          " / " + C.STAGES.length + " · " +
          L.t("wins") +
          " " +
          records[mode].clears,
      );
      text(
        "legacyBest",
        (previousCampaign[mode].best || previousCampaign[mode].clears ?
          L.t("previousCampaign") + " " + fmt(previousCampaign[mode].best) + " · " + L.t("wins") + " " + previousCampaign[mode].clears + "\n" : "") +
        (legacyCampaign[mode].best || legacyCampaign[mode].clears ?
          L.t("legacyCampaign") + " " + fmt(legacyCampaign[mode].best) + " · " + L.t("wins") + " " + legacyCampaign[mode].clears : "") +
          (legacyBest ? " · " + L.t("legacy") + " " + fmt(legacyBest) : ""),
      );
    }
    attr($("normalButton"), "aria-pressed", mode === "normal");
    attr($("challengeButton"), "aria-pressed", mode === "challenge");
    attr(soundButton, "aria-pressed", !muted);
    soundButton.classList.toggle("on", !muted);
    text("soundButton", L.t(muted ? "muted" : "sound"));
  }
  function update(dt) {
    g.step(dt, readInput());
    updateRecords();
    if (g.state !== "playing") clearInput();
    sync();
  }
  function draw() {
    Renderer.draw(ctx, g.snapshot(), {
      light: document.documentElement.dataset.theme === "light",
      locale: L,
    });
  }
  function requestFrame() {
    if (frameId === null && !clearing) frameId = requestAnimationFrame(loop);
  }
  function loop(t) {
    frameId = null;
    const dt = R.clamp((t - last) / 1000, 0, 0.25);
    last = t;
    if (g.state === "playing") {
      accumulator += dt;
      while (accumulator + 1e-9 >= R.STEP && g.state === "playing") {
        accumulator -= R.STEP;
        update(R.STEP);
      }
    } else {
      accumulator = 0;
      if (hasResultEffects() && !document.hidden && !resultEffectsSuspended) {
        g.updateEffects(dt);
        sync();
      }
    }
    draw();
    if (g.state === "playing" ||
        (hasResultEffects() && !document.hidden && !resultEffectsSuspended)) requestFrame();
  }
  function bindHold(id, prop) {
    const el = $(id),
      ids = new Set();
    holds.push({ prop, ids });
    el.addEventListener("pointerdown", (e) => {
      if (g.state !== "playing" || e.button > 0) return;
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
  function releaseHold(e) {
    for (const h of holds) {
      h.ids.delete(e.pointerId);
      pointer[h.prop] = h.ids.size > 0;
    }
    if (drag?.id === e.pointerId) drag = null;
  }
  for (const type of ["pointerup", "pointercancel"])
    window.addEventListener(type, releaseHold);
  for (const [id, prop] of [
    ["leftButton", "left"],
    ["rightButton", "right"],
    ["upButton", "up"],
    ["downButton", "down"],
  ])
    bindHold(id, prop);
  startButton.addEventListener("click", start);
  $("mobilePauseButton").addEventListener("click", pause);
  $("pulseButton").addEventListener("click", pulse);
  for(const [id,kind] of [["supplyLifeButton","life"],["supplyPulseButton","pulse"]])$(id).addEventListener("click",()=>{
    if(!hasResultEffects() && g.chooseSupply(kind)){sync();requestFrame();beep(520);}
  });
  $("normalButton").addEventListener("click", () => setMode("normal"));
  $("challengeButton").addEventListener("click", () => setMode("challenge"));
  soundButton.addEventListener("click", () => {
    muted = !muted;
    sync();
    if (!muted) beep();
  });
  const movement = [
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
    if (movement.includes(key)) {
      if (g.state === "playing") {
        e.preventDefault();
        keys.add(key);
      }
      return;
    }
    if (["p", "m", " "].includes(key)) {
      e.preventDefault();
      if (e.repeat) return;
      if (key === "p") pause();
      else if (key === "m") soundButton.click();
      else pulse();
    }
  });
  window.addEventListener("keyup", (e) =>
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
  function pointerPosition(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * C.W,
      y: ((e.clientY - r.top) / r.height) * C.H,
    };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (g.state !== "playing" || drag || e.button > 0) return;
    e.preventDefault();
    drag = { id: e.pointerId, ...pointerPosition(e) };
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (g.state !== "playing" || !drag || drag.id !== e.pointerId) return;
    if (e.pointerType === "mouse" && !e.buttons) {
      drag = null;
      return;
    }
    e.preventDefault();
    const p = pointerPosition(e);
    g.player.x = R.clamp(
      g.player.x + p.x - drag.x,
      g.player.w / 2,
      C.W - g.player.w / 2,
    );
    g.player.y = R.clamp(
      g.player.y + p.y - drag.y,
      g.player.h / 2,
      C.H - g.player.h / 2,
    );
    drag.x = p.x;
    drag.y = p.y;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, releaseHold);
  function suspend() {
    clearInput();
    if (g.state === "playing") g.pause();
    if (hasResultEffects()) resultEffectsSuspended = true;
    sync();
    requestFrame();
  }
  function resumeResultEffects() {
    if (clearing || document.hidden || !hasResultEffects()) return;
    resultEffectsSuspended = false;
    last = performance.now();
    accumulator = 0;
    sync();
    requestFrame();
  }
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("focus", resumeResultEffects);
  window.addEventListener("pageshow", resumeResultEffects);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
    else {
      resumeResultEffects();
      sync();
      requestFrame();
    }
  });
  document.addEventListener(
    "touchmove",
    (e) => {
      if (g.state === "playing") e.preventDefault();
    },
    { passive: false },
  );
  for (const type of ["contextmenu", "selectstart", "dragstart"])
    canvas.addEventListener(type, (e) => e.preventDefault());
  window.addEventListener("game-data-clearing", () => {
    clearing = true;
    clearInput();
    g.state = "clearing";
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
  });
  document.addEventListener("themechange", requestFrame);
  window.addEventListener("resize", requestFrame);
  document.documentElement.lang = L.lang;
  for (const [id, key] of [
    ["gameTitle", "title"],
    ["scoreLabel", "score"],
    ["stageLabel", "stage"],
    ["livesLabel", "lives"],
    ["normalButton", "normal"],
    ["challengeButton", "challenge"],
    ["supplyLifeButton", "supplyLife"],
    ["supplyPulseButton", "supplyPulse"],
    ["bestLabel", "best"],
    ["keyboardHelp", "keyboard"],
    ["touchHelp", "touch"],
  ])
    text(id, L.t(key));
  for (const [id, key] of [
    ["leftButton", "left"],
    ["rightButton", "right"],
    ["upButton", "up"],
    ["downButton", "down"],
    ["game", "area"],
    ["pulseButton", "pulseLabel"],
    ["mobilePauseButton", "pauseLabel"],
    ["modeSelect", "mode"],
    ["supplySelect", "supplyChoice"],
    ["soundButton", "soundLabel"],
    ["gameSection", "gameSection"],
    ["touchControls", "touchControls"],
  ])
    attr($(id), "aria-label", L.t(key));
  sync();
  requestFrame();
})();
