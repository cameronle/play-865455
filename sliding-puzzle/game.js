(() => {
  "use strict";

  const boardEl = document.getElementById("board");
  const R = window.SlidingRules;
  const STORAGE_KEY = "sliding-puzzle-best-v1";
  const SAVE_KEY = "sliding-puzzle-game-v1";
  const SAVED_HISTORY_LIMIT = 200;
  let clearing = false;

  const $ = (id) => document.getElementById(id);
  const ui = {
    sizeSelect: $("sizeSelect"),
    moveStat: $("moveStat"),
    timeStat: $("timeStat"),
    bestStat: $("bestStat"),
    winOverlay: $("winOverlay"),
    winTitle: $("winTitle"),
    winDetail: $("winDetail"),
    restartButton: $("restartButton"),
    undoButton: $("undoButton"),
    newButton: $("newButton"),
    pauseButton: $("pauseButton"),
    pauseOverlay: $("pauseOverlay"),
    resumeButton: $("resumeButton"),
  };

  let size = 4;
  let board = [];
  let moves = 0;
  let history = [];
  let startTime = null;
  let timerInterval = null;
  let isWon = false;
  let paused = false;
  let elapsedMs = 0;
  let started = false;
  let records = loadRecords();

  function loadRecords() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const clean = {};
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return clean;
      for (const n of [3, 4, 5]) {
        const r = raw[n];
        if (
          r &&
          Number.isSafeInteger(r.moves) &&
          r.moves > 0 &&
          Number.isSafeInteger(r.time) &&
          r.time > 0
        )
          clean[n] = { moves: r.moves, time: r.time };
      }
      return clean;
    } catch (_) {
      return {};
    }
  }

  function saveRecords() {
    if (clearing) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (_) {}
  }

  function saveGame() {
    if (clearing) return;
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          size,
          board,
          moves,
          started,
          elapsed: elapsedSeconds(),
          history: history.slice(-SAVED_HISTORY_LIMIT),
        }),
      );
    } catch (_) {}
  }
  function restoreGame() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (
        !s ||
        s.version !== 1 ||
        !R.isValidBoard(s.board, s.size) ||
        !R.isSolvable(s.board, s.size) ||
        !Number.isSafeInteger(s.moves) ||
        s.moves < 0 ||
        !Number.isSafeInteger(s.elapsed) ||
        s.elapsed < 0 ||
        typeof s.started !== "boolean" ||
        !Array.isArray(s.history) ||
        s.history.length > Math.min(s.moves, SAVED_HISTORY_LIMIT) ||
        (s.moves > 0 && !s.started) ||
        (R.isSolved(s.board) && s.moves === 0)
      )
        return false;
      const chain = [...s.history, s.board];
      for (let i = 0; i < chain.length - 1; i++) {
        const prev = chain[i],
          next = chain[i + 1];
        if (
          !R.isValidBoard(prev, s.size) ||
          !R.isSolvable(prev, s.size) ||
          R.isSolved(prev)
        )
          return false;
        const moved = R.move(prev, s.size, next.indexOf(0));
        if (!moved || moved.some((v, j) => v !== next[j])) return false;
      }
      size = s.size;
      board = s.board.slice();
      moves = s.moves;
      started = s.started;
      elapsedMs = s.elapsed * 1000;
      history = s.history.map((b) => b.slice());
      isWon = R.isSolved(board);
      paused = started && !isWon;
      ui.sizeSelect.value = String(size);
      updateHud();
      renderBoard();
      if (isWon) {
        ui.winTitle.textContent = "PUZZLE SOLVED";
        ui.winDetail.textContent = `${size}×${size} SOLVED IN ${moves} MOVES (${formatTime(Math.max(1, elapsedSeconds()))})`;
        ui.winOverlay.classList.remove("hide");
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function elapsedSeconds() {
    return Math.floor(
      (elapsedMs +
        (startTime === null ? 0 : Math.max(0, performance.now() - startTime))) /
        1000,
    );
  }
  function startTimer() {
    if (timerInterval || !started || isWon || paused) return;
    startTime = performance.now();
    timerInterval = setInterval(() => {
      ui.timeStat.textContent = formatTime(elapsedSeconds());
    }, 500);
  }
  function stopTimer() {
    if (startTime !== null) {
      elapsedMs += Math.max(0, performance.now() - startTime);
      startTime = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
  function pauseGame() {
    releaseGesture();
    stopTimer();
    if (!isWon) paused = true;
    updateHud();
    saveGame();
  }
  function resumeGame() {
    if (document.hidden || isWon) return;
    paused = false;
    startTimer();
    updateHud();
    saveGame();
    boardEl.focus();
  }
  function updateHud() {
    ui.timeStat.textContent = formatTime(elapsedSeconds());
    ui.pauseButton.textContent = paused ? "RESUME" : "PAUSE";
    ui.pauseButton.disabled = isWon;
    ui.pauseOverlay.classList.toggle("hide", !paused || isWon);
    boardEl.inert = paused || isWon;
    ui.undoButton.disabled = paused || isWon || history.length === 0;
    ui.moveStat.textContent = String(moves);
    const rec = records[String(size)];
    if (rec && rec.moves) {
      ui.bestStat.textContent = `${rec.moves}M · ${formatTime(rec.time)}`;
    } else {
      ui.bestStat.textContent = "--";
    }
    fitBoard();
  }

  function renderBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    if (boardEl.children.length !== board.length) {
      boardEl.replaceChildren();
      board.forEach((_, idx) => {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.tabIndex = -1;
        tile.dataset.index = String(idx);
        tile.addEventListener("click", (e) => {
          if (e.detail === 0) handleTileClick(idx);
        });
        boardEl.appendChild(tile);
      });
    }
    board.forEach((val, idx) => {
      const tile = boardEl.children[idx];
      tile.className = "tile";
      tile.classList.toggle("blank", val === 0);
      tile.classList.toggle("correct", val !== 0 && val === idx + 1);
      tile.textContent = val === 0 ? "" : String(val);
      tile.disabled = val === 0;
      tile.setAttribute(
        "aria-label",
        val === 0
          ? "Empty space"
          : `Tile ${val}${val === idx + 1 ? ", in place" : ""}`,
      );
    });
  }

  function handleTileClick(idx) {
    if (isWon || paused || document.hidden) return;
    const next = R.move(board, size, idx);
    if (next) {
      history.push(board.slice());
      board = next;
      moves++;
      if (!started) {
        started = true;
        startTimer();
      }
      updateHud();
      renderBoard();
      checkWin();
      saveGame();
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }

  function undo() {
    if (isWon || paused || document.hidden || history.length === 0) return;
    releaseGesture();
    board = history.pop();
    moves = Math.max(0, moves - 1);
    saveGame();
    updateHud();
    renderBoard();
  }

  function checkWin() {
    if (!R.isSolved(board)) return;
    isWon = true;
    releaseGesture();
    stopTimer();
    elapsedMs = Math.max(1000, elapsedMs);
    const elapsed = Math.max(1, elapsedSeconds());
    const key = String(size);
    const prev = records[key];

    if (
      !prev ||
      moves < prev.moves ||
      (moves === prev.moves && elapsed < prev.time)
    ) {
      records[key] = { moves, time: elapsed };
      saveRecords();
    }

    updateHud();
    ui.winTitle.textContent = "PUZZLE SOLVED";
    ui.winDetail.textContent = `${size}×${size} SOLVED IN ${moves} MOVES (${formatTime(elapsed)})`;
    ui.winOverlay.classList.remove("hide");
    ui.restartButton.focus();
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  }

  function newGame() {
    stopTimer();
    releaseGesture();
    startTime = null;
    elapsedMs = 0;
    started = false;
    paused = !!document.hidden;
    moves = 0;
    history = [];
    isWon = false;
    ui.timeStat.textContent = "00:00";
    ui.winOverlay.classList.add("hide");
    board = R.generateSolvableBoard(size);
    saveGame();
    updateHud();
    renderBoard();
  }

  function handleKey(e) {
    if (
      e.altKey ||
      (e.target?.closest("select,input,textarea,a,button") &&
        !boardEl.contains(e.target)) ||
      e.target?.isContentEditable
    )
      return;
    if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      paused ? resumeGame() : pauseGame();
      return;
    }
    if (
      isWon ||
      paused ||
      document.hidden ||
      ((e.ctrlKey || e.metaKey) && e.code !== "KeyZ")
    )
      return;
    const blankIdx = board.indexOf(0);
    const r0 = Math.floor(blankIdx / size);
    const c0 = blankIdx % size;

    let targetIdx = -1;
    // Keys push a tile towards the blank space:
    // ArrowUp: tile below blank moves UP -> tile at (r0 + 1, c0)
    // ArrowDown: tile above blank moves DOWN -> tile at (r0 - 1, c0)
    // ArrowLeft: tile to the right of blank moves LEFT -> tile at (r0, c0 + 1)
    // ArrowRight: tile to the left of blank moves RIGHT -> tile at (r0, c0 - 1)
    if (e.code === "ArrowUp" || e.code === "KeyW") {
      if (r0 + 1 < size) targetIdx = (r0 + 1) * size + c0;
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      if (r0 - 1 >= 0) targetIdx = (r0 - 1) * size + c0;
    } else if (e.code === "ArrowLeft" || e.code === "KeyA") {
      if (c0 + 1 < size) targetIdx = r0 * size + (c0 + 1);
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      if (c0 - 1 >= 0) targetIdx = r0 * size + (c0 - 1);
    } else if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) {
      undo();
      e.preventDefault();
      return;
    }

    if (targetIdx !== -1) {
      e.preventDefault();
      handleTileClick(targetIdx);
    }
  }

  let gesture = null;
  function releaseGesture() {
    const old = gesture;
    gesture = null;
    if (old) {
      try {
        if (boardEl.hasPointerCapture(old.id))
          boardEl.releasePointerCapture(old.id);
      } catch (_) {}
    }
  }
  boardEl.addEventListener("pointerdown", (e) => {
    if (
      isWon ||
      paused ||
      document.hidden ||
      gesture ||
      e.button !== 0 ||
      e.isPrimary === false
    )
      return;
    e.preventDefault();
    const tile = e.target.closest(".tile");
    gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      index: tile ? Number(tile.dataset.index) : -1,
      distance: 0,
    };
    boardEl.focus();
    try {
      boardEl.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  boardEl.addEventListener("pointermove", (e) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    e.preventDefault();
    gesture.distance = Math.max(
      gesture.distance,
      Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y),
    );
  });
  boardEl.addEventListener("pointerup", (e) => {
    if (!gesture || e.pointerId !== gesture.id) return;
    e.preventDefault();
    const g = gesture,
      dx = e.clientX - g.x,
      dy = e.clientY - g.y;
    releaseGesture();
    if (Math.hypot(dx, dy) < 20) {
      if (g.distance < 20) handleTileClick(g.index);
      return;
    }
    const blankIdx = board.indexOf(0),
      r0 = Math.floor(blankIdx / size),
      c0 = blankIdx % size;
    let targetIdx = -1;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && c0 > 0) targetIdx = blankIdx - 1;
      else if (dx < 0 && c0 < size - 1) targetIdx = blankIdx + 1;
    } else {
      if (dy > 0 && r0 > 0) targetIdx = blankIdx - size;
      else if (dy < 0 && r0 < size - 1) targetIdx = blankIdx + size;
    }
    if (targetIdx !== -1) handleTileClick(targetIdx);
  });
  for (const name of ["pointercancel", "lostpointercapture"])
    boardEl.addEventListener(name, (e) => {
      if (gesture?.id === e.pointerId) releaseGesture();
    });
  for (const name of ["contextmenu", "selectstart", "dragstart"])
    boardEl.addEventListener(name, (e) => e.preventDefault());

  function setSize(s) {
    if (![3, 4, 5].includes(s)) {
      ui.sizeSelect.value = String(size);
      return false;
    }
    releaseGesture();
    size = s;
    ui.sizeSelect.value = String(s);
    newGame();
    return true;
  }
  // Event Listeners
  ui.sizeSelect.addEventListener("change", () => {
    setSize(Number(ui.sizeSelect.value));
  });
  ui.pauseButton.addEventListener("click", () =>
    paused ? resumeGame() : pauseGame(),
  );
  ui.resumeButton.addEventListener("click", resumeGame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseGame();
  });
  window.addEventListener("pagehide", pauseGame);
  window.addEventListener("game-data-clearing", () => {
    clearing = true;
    pauseGame();
  });
  ui.undoButton.addEventListener("click", undo);
  ui.newButton.addEventListener("click", newGame);
  ui.restartButton.addEventListener("click", newGame);
  window.addEventListener("keydown", handleKey);

  document.addEventListener("themechange", () => {
    renderBoard();
    fitBoard();
  });

  function fitBoard() {
    const page = $("gamePage"),
      frame = $("boardFrame");
    if (!page || !frame) return;
    const style = getComputedStyle(page),
      num = (x) => parseFloat(x) || 0;
    const pw = page.clientWidth || window.innerWidth;
    const wide = window.innerHeight <= 500 && window.innerWidth >= 560;
    const availableWidth =
      pw - num(style.paddingLeft) - num(style.paddingRight) - (wide ? 232 : 0);
    let availableHeight =
      window.innerHeight - num(style.paddingTop) - num(style.paddingBottom);
    if (!wide)
      for (const sel of [
        "header.topbar",
        ".toolbar",
        "footer",
        "#utilityDock",
      ]) {
        const e = document.querySelector(sel);
        if (e) {
          const s = getComputedStyle(e);
          availableHeight -=
            e.getBoundingClientRect().height +
            num(s.marginTop) +
            num(s.marginBottom);
        }
      }
    frame.style.width =
      Math.max(
        0,
        Math.floor(Math.min(460, availableWidth, availableHeight - 6)),
      ) + "px";
  }
  function mountUtilities() {
    const dock = $("utilityDock"),
      clear = document.querySelector(".clear-data-toggle");
    if (dock && clear) dock.appendChild(clear);
    fitBoard();
  }
  window.addEventListener("resize", fitBoard);
  window.visualViewport?.addEventListener("resize", fitBoard);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mountUtilities, {
      once: true,
    });
  else mountUtilities();

  if (!restoreGame()) newGame();
  fitBoard();

  window.SlidingGame = {
    newGame,
    setSize,
    getSnapshot: () => ({
      size,
      moves,
      isWon,
      paused,
      started,
      elapsedSeconds: elapsedSeconds(),
      undoCount: history.length,
      activeGesture: gesture ? { id: gesture.id } : null,
      board: board.slice(),
    }),
    handleTileClick,
    undo,
  };
})();
