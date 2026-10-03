(() => {
  "use strict";
  const board = document.getElementById("board"),
    scoreEl = document.getElementById("score"),
    bestEl = document.getElementById("best"),
    overlay = document.getElementById("overlay"),
    overlayTitle = document.getElementById("overlayTitle");
  let grid,
    score,
    won = false,
    best = loadBest(),
    previous = null,
    rngState = 0;
  const undoEl = document.getElementById("undo"),
    statusEl = document.getElementById("status");
  function announce(action, saved) {
    statusEl.textContent =
      action + " · " + (saved ? "AUTO-SAVED" : "SAVING UNAVAILABLE");
  }
  const dirs = {
    ArrowUp: { r: -1, c: 0 },
    w: { r: -1, c: 0 },
    W: { r: -1, c: 0 },
    ArrowDown: { r: 1, c: 0 },
    s: { r: 1, c: 0 },
    S: { r: 1, c: 0 },
    ArrowLeft: { r: 0, c: -1 },
    a: { r: 0, c: -1 },
    A: { r: 0, c: -1 },
    ArrowRight: { r: 0, c: 1 },
    d: { r: 0, c: 1 },
    D: { r: 0, c: 1 },
  };
  function loadBest() {
    try {
      const n = Number(localStorage.getItem("play-2048-best") || 0);
      return Number.isSafeInteger(n) && n >= 0 ? n : 0;
    } catch (_) {
      return 0;
    }
  }
  function saveBest() {
    try {
      localStorage.setItem("play-2048-best", String(best));
    } catch (_) {}
  }
  const SAVE_KEY = "play-2048-save-v1";
  function snapshot() {
    return { grid: grid.map((row) => row.slice()), score, won, rngState };
  }
  function validRecord(value) {
    return (
      value &&
      Array.isArray(value.grid) &&
      value.grid.length === 4 &&
      value.grid.every(
        (row) =>
          Array.isArray(row) &&
          row.length === 4 &&
          row.every(
            (n) =>
              Number.isSafeInteger(n) &&
              (n === 0 || (n >= 2 && Number.isInteger(Math.log2(n)))),
          ),
      ) &&
      value.grid.some((row) => row.some(Boolean)) &&
      Number.isSafeInteger(value.score) &&
      value.score >= 0 &&
      typeof value.won === "boolean" &&
      (value.rngState === undefined ||
        (Number.isInteger(value.rngState) &&
          value.rngState >= 0 &&
          value.rngState < 4294967296))
    );
  }
  function saveState() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          ...snapshot(),
          previous,
          pendingWin:
            !overlay.classList.contains("hidden") &&
            overlayTitle.textContent === "YOU WIN",
        }),
      );
      return true;
    } catch (_) {
      return false;
    }
  }
  function showOutcome(title, label) {
    clearGesture();
    overlayTitle.textContent = title;
    document.getElementById("tryAgain").textContent = label;
    overlay.classList.remove("hidden");
    document.getElementById("tryAgain").focus({ preventScroll: true });
  }
  function loadState() {
    try {
      const value = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!value || value.version !== 1 || !validRecord(value)) return false;
      grid = value.grid.map((row) => row.slice());
      score = value.score;
      won = value.won;
      rngState = value.rngState ?? 0;
      previous = validRecord(value.previous) ? value.previous : null;
      best = Math.max(best, score);
      saveBest();
      draw();
      if (value.pendingWin) showOutcome("YOU WIN", "CONTINUE");
      else if (!canMove()) showOutcome("GAME OVER", "TRY AGAIN");
      announce("RESTORED", saveState());
      return true;
    } catch (_) {
      return false;
    }
  }
  function emptyGrid() {
    return Array.from({ length: 4 }, () => Array(4).fill(0));
  }
  function randomValue() {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    return rngState / 4294967296;
  }
  function randomEmpty() {
    const cells = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) if (!grid[r][c]) cells.push([r, c]);
    return cells.length
      ? cells[Math.floor(randomValue() * cells.length)]
      : null;
  }
  function addTile() {
    const p = randomEmpty();
    if (p) grid[p[0]][p[1]] = randomValue() < 0.9 ? 2 : 4;
  }
  function format(n) {
    return String(n).padStart(6, "0");
  }
  function updateScore() {
    scoreEl.textContent = format(score);
    bestEl.textContent = format(best);
    undoEl.disabled = !previous;
  }
  function draw() {
    if (board.children.length !== 16) {
      board.innerHTML = "";
      for (let i = 0; i < 16; i++)
        board.appendChild(document.createElement("div"));
    }
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        const cell = board.children[r * 4 + c];
        const className =
          "cell" +
          (v
            ? " tile-" +
              v +
              (v > 2048
                ? " tile-super" + (String(v).length > 4 ? " tile-long" : "")
                : "")
            : "");
        if (cell.className !== className) cell.className = className;
        const text = v ? String(v) : "";
        if (cell.textContent !== text) cell.textContent = text;
      }),
    );
    board.setAttribute(
      "aria-label",
      "2048 board. " +
        grid
          .map(
            (row, r) =>
              "Row " + (r + 1) + ": " + row.map((v) => v || "empty").join(", "),
          )
          .join(". "),
    );
    updateScore();
  }
  function newGame() {
    clearGesture();
    previous = null;
    rngState = Math.floor(Math.random() * 4294967296) >>> 0;
    grid = emptyGrid();
    score = 0;
    won = false;
    overlay.classList.add("hidden");
    addTile();
    addTile();
    draw();
    announce("NEW GAME", saveState());
  }
  function slideLine(line) {
    const values = line.filter(Boolean),
      result = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) {
        const merged = values[i] * 2;
        result.push(merged);
        score += merged;
        i++;
      } else result.push(values[i]);
    }
    while (result.length < 4) result.push(0);
    return result;
  }
  function move(dir) {
    if (!overlay.classList.contains("hidden")) return;
    const beforeMove = snapshot(),
      before = JSON.stringify(grid);
    if (dir.c !== 0) {
      for (let r = 0; r < 4; r++) {
        let line = grid[r].slice();
        if (dir.c > 0) line.reverse();
        line = slideLine(line);
        if (dir.c > 0) line.reverse();
        grid[r] = line;
      }
    } else {
      for (let c = 0; c < 4; c++) {
        let line = [];
        for (let r = 0; r < 4; r++) line.push(grid[r][c]);
        if (dir.r > 0) line.reverse();
        line = slideLine(line);
        if (dir.r > 0) line.reverse();
        for (let r = 0; r < 4; r++) grid[r][c] = line[r];
      }
    }
    if (JSON.stringify(grid) !== before) {
      previous = beforeMove;
      if (score > best) {
        best = score;
        saveBest();
      }
      addTile();
      draw();
      if (!won && grid.some((row) => row.some((value) => value >= 2048))) {
        won = true;
        showOutcome("YOU WIN", "CONTINUE");
      } else if (!canMove()) {
        showOutcome("GAME OVER", "TRY AGAIN");
      }
      const gained = score - beforeMove.score;
      announce(
        !overlay.classList.contains("hidden")
          ? overlayTitle.textContent
          : gained
            ? "MERGED +" + gained
            : "MOVED",
        saveState(),
      );
    }
  }
  function canMove() {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) return true;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
      }
    return false;
  }
  function keyMove(e) {
    if (e.target?.matches?.("input,textarea,select,[contenteditable=true]"))
      return;
    if ((e.key === "z" || e.key === "Z") && !e.altKey && !e.shiftKey) {
      if (previous) {
        e.preventDefault();
        if (!e.repeat) undo();
      }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = dirs[e.key];
    if (!dir) return;
    e.preventDefault();
    if (!e.repeat) move(dir);
  }
  document.addEventListener("keydown", keyMove);
  function undo() {
    if (!previous) return false;
    const value = previous;
    previous = null;
    grid = value.grid.map((row) => row.slice());
    score = value.score;
    won = value.won;
    rngState = value.rngState ?? rngState;
    clearGesture();
    overlay.classList.add("hidden");
    draw();
    announce("UNDONE", saveState());
    return true;
  }
  undoEl.onclick = undo;
  document.getElementById("newGame").onclick = newGame;
  document.getElementById("tryAgain").onclick = () => {
    if (overlayTitle.textContent === "YOU WIN") {
      overlay.classList.add("hidden");
      if (!canMove()) showOutcome("GAME OVER", "TRY AGAIN");
      announce(canMove() ? "CONTINUED" : "GAME OVER", saveState());
    } else newGame();
  };
  document.querySelectorAll("[data-dir]").forEach((b) =>
    b.addEventListener("click", () =>
      move(
        dirs[
          {
            up: "ArrowUp",
            down: "ArrowDown",
            left: "ArrowLeft",
            right: "ArrowRight",
          }[b.dataset.dir]
        ],
      ),
    ),
  );
  let touchStart = null,
    touchBlocked = false;
  board.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) {
        touchStart = null;
        touchBlocked = true;
        return;
      }
      if (touchBlocked || !overlay.classList.contains("hidden")) return;
      const t = e.changedTouches[0];
      touchStart = { id: t.identifier, x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );
  board.addEventListener(
    "touchend",
    (e) => {
      if (touchBlocked) {
        if (!e.touches.length) touchBlocked = false;
        return;
      }
      if (!touchStart) return;
      const t = Array.from(e.changedTouches).find(
        (t) => t.identifier === touchStart.id,
      );
      if (!t) return;
      const dx = t.clientX - touchStart.x,
        dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
      move(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? dirs.ArrowRight
            : dirs.ArrowLeft
          : dy > 0
            ? dirs.ArrowDown
            : dirs.ArrowUp,
      );
    },
    { passive: true },
  );
  function clearGesture() {
    touchStart = null;
    touchBlocked = false;
  }
  board.addEventListener("touchcancel", clearGesture);
  window.addEventListener("blur", clearGesture);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearGesture();
  });
  if (!loadState()) newGame();
  bestEl.textContent = format(best);
})();
