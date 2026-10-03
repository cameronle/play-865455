(() => {
  "use strict";
  const { levels, isLevelUnlocked, completionCount } = window.MinesweeperLevels;
  const $ = (id) => document.getElementById(id),
    gridEl = $("grid"),
    levelList = $("levelList");
  const COMPLETED_KEY = "minesweeper-completed-v1",
    BEST_KEY = "minesweeper-best-times-v1",
    LEVEL_KEY = "minesweeper-level-v1";
  function readValue(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  const readArray = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };
  const savedCompleted = readArray(COMPLETED_KEY, []),
    savedBest = readArray(BEST_KEY, []);
  let completed = levels.map((_, i) => savedCompleted[i] === true);
  let bestTimes = levels.map((_, i) =>
    Number.isSafeInteger(savedBest[i]) &&
    savedBest[i] >= 0 &&
    (savedBest[i] > 0 || completed[i])
      ? savedBest[i]
      : null,
  );
  const savedLevel = Number(readValue(LEVEL_KEY));
  let levelIndex = Number.isSafeInteger(savedLevel)
    ? Math.max(0, Math.min(levels.length - 1, savedLevel))
    : 0;
  while (levelIndex > 0 && !isLevelUnlocked(levelIndex, completed))
    levelIndex--;
  let rows = 9,
    cols = 9,
    mineCount = 10,
    cells = [],
    started = false,
    over = false,
    flags = 0,
    startTime = 0,
    timer,
    overlayAction = "start";
  function saveProgress() {
    try {
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
      localStorage.setItem(BEST_KEY, JSON.stringify(bestTimes));
      localStorage.setItem(LEVEL_KEY, String(levelIndex));
    } catch {}
  }
  function pad(value, width = 3) {
    return String(value).padStart(width, "0");
  }
  function currentLevel() {
    return levels[levelIndex];
  }
  function updateMeta() {
    const level = currentLevel();
    $("levelLabel").textContent = pad(level.id, 2) + " / " + levels.length;
    $("mines").textContent = pad(mineCount - flags);
    $("progress").textContent =
      completionCount(completed) + " / " + levels.length;
    $("levelsProgress").textContent =
      completionCount(completed) + " / " + levels.length + " CLEARED";
    const best = bestTimes[levelIndex];
    $("best").textContent = best !== null ? pad(best) : "---";
    gridEl.style.setProperty("--cols", String(cols));
  }
  function index(r, c) {
    return r * cols + c;
  }
  function around(r, c) {
    const result = [];
    for (let y = -1; y <= 1; y++)
      for (let x = -1; x <= 1; x++)
        if (x || y) {
          const yy = r + y,
            xx = c + x;
          if (yy >= 0 && yy < rows && xx >= 0 && xx < cols)
            result.push(index(yy, xx));
        }
    return result;
  }
  function setup() {
    cancelPress();
    flagMode = false;
    updateMode();
    focusedIndex = 0;
    gridEl.innerHTML = "";
    $("boardScroll").scrollTop = 0;
    $("boardScroll").scrollLeft = 0;
    const level = currentLevel();
    rows = level.rows;
    cols = level.cols;
    mineCount = level.mines;
    cells = Array.from({ length: rows * cols }, (_, i) => ({
      i,
      mine: false,
      n: 0,
      open: false,
      flag: false,
      long: false,
    }));
    flags = 0;
    over = false;
    started = false;
    clearInterval(timer);
    $("status").textContent = "READY";
    updateMeta();
    render();
  }
  function placeMines(safeIndex) {
    const safe = new Set([
        safeIndex,
        ...around(Math.floor(safeIndex / cols), safeIndex % cols),
      ]),
      available = cells.map((cell) => cell.i).filter((i) => !safe.has(i));
    for (let count = 0; count < mineCount; count++) {
      const pick = Math.floor(Math.random() * available.length),
        i = available.splice(pick, 1)[0];
      cells[i].mine = true;
    }
    cells.forEach(
      (cell) =>
        (cell.n = around(Math.floor(cell.i / cols), cell.i % cols).filter(
          (i) => cells[i].mine,
        ).length),
    );
  }
  let press = null,
    pressTimer = null;
  function cancelPress() {
    clearTimeout(pressTimer);
    pressTimer = null;
    const old = press;
    press = null;
    if (old)
      try {
        if (old.button.hasPointerCapture(old.id))
          old.button.releasePointerCapture(old.id);
      } catch {}
  }
  function canInteract() {
    return (
      !over &&
      $("message").classList.contains("hide") &&
      $("levelsPanel").classList.contains("hide") &&
      !document.hidden
    );
  }
  let flagMode = false;
  function updateMode() {
    $("flagMode").textContent = flagMode ? "MODE: FLAG" : "MODE: DIG";
    $("flagMode").setAttribute("aria-pressed", String(flagMode));
  }
  function activate(i) {
    if (flagMode) flag(i);
    else open(i);
  }
  let focusedIndex = 0;
  function focusPatch(i) {
    focusedIndex = i;
    for (const b of gridEl.children)
      b.tabIndex = Number(b.dataset.index) === i ? 0 : -1;
  }
  function bindCell(button, i) {
    button.onfocus = () => focusPatch(i);
    button.onkeydown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || !canInteract())
        return;
      const r = Math.floor(i / cols),
        c = i % cols;
      let next;
      if (event.key === "ArrowLeft") next = index(r, Math.max(0, c - 1));
      if (event.key === "ArrowRight")
        next = index(r, Math.min(cols - 1, c + 1));
      if (event.key === "ArrowUp") next = index(Math.max(0, r - 1), c);
      if (event.key === "ArrowDown") next = index(Math.min(rows - 1, r + 1), c);
      if (event.key === "Home") next = index(r, 0);
      if (event.key === "End") next = index(r, cols - 1);
      if (next !== undefined) {
        event.preventDefault();
        cancelPress();
        focusPatch(next);
        gridEl.children[next].focus();
        gridEl.children[next].scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (!event.repeat) {
          cancelPress();
          flag(i);
        }
      }
    };
    button.onclick = (event) => {
      // Pointer-up owns physical taps; click with detail 0 remains keyboard/AT accessible.
      event.preventDefault();
      if (event.detail === 0 && !press && canInteract()) activate(i);
    };
    button.oncontextmenu = (event) => {
      event.preventDefault();
      if (canInteract()) {
        cancelPress();
        flag(i);
      }
    };
    button.ondragstart = (event) => event.preventDefault();
    button.onpointerdown = (event) => {
      if (event.button !== 0 || press || !canInteract()) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      press = {
        id: event.pointerId,
        i,
        button,
        x: event.clientX,
        y: event.clientY,
        cancelled: false,
        held: false,
      };
      try {
        button.setPointerCapture(event.pointerId);
      } catch {}
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        pressTimer = setTimeout(() => {
          if (!press || press.cancelled || !canInteract()) return;
          press.held = true;
          flag(i);
        }, 500);
      }
    };
    button.onpointermove = (event) => {
      if (!press || press.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) {
        press.cancelled = true;
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };
    button.onpointerup = (event) => {
      if (!press || press.id !== event.pointerId) return;
      event.preventDefault();
      const action = press;
      cancelPress();
      if (!action.cancelled && !action.held && canInteract())
        activate(action.i);
    };
    button.onpointercancel = (event) => {
      event.preventDefault();
      if (press?.id === event.pointerId) cancelPress();
    };
    button.onlostpointercapture = (event) => {
      if (press?.id === event.pointerId) cancelPress();
    };
  }
  function render() {
    cells.forEach((cell) => {
      let button = gridEl.children[cell.i];
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.dataset.index = String(cell.i);
        bindCell(button, cell.i);
        gridEl.appendChild(button);
      }
      button.tabIndex = cell.i === focusedIndex ? 0 : -1;
      const className =
        "cell " +
        (cell.open ? "open" : "closed") +
        (cell.flag ? " flag" : "") +
        (cell.mine && cell.open ? " mine" : "") +
        (cell.open && !cell.mine && cell.n ? " n" + cell.n : "");
      const text = String(
        cell.flag ? "⚑" : cell.open ? (cell.mine ? "✹" : cell.n || "") : "",
      );
      if (button.className !== className) button.className = className;
      if (button.textContent !== text) button.textContent = text;
      const state = cell.flag
        ? "Flagged patch"
        : cell.open
          ? cell.mine
            ? "Hazard patch"
            : `Safe patch, ${cell.n} nearby hazards`
          : "Closed patch";
      button.setAttribute(
        "aria-label",
        `Row ${Math.floor(cell.i / cols) + 1}, column ${(cell.i % cols) + 1}. ${state}`,
      );
    });
  }
  function beginLevel() {
    $("levelsPanel").classList.add("hide");
    setup();
    gridEl.inert = false;
    $("time").textContent = "000";
    $("message").classList.add("hide");
    $("status").textContent = "TAP A PATCH";
    if (document.activeElement === $("start"))
      gridEl.children[focusedIndex].focus({ preventScroll: true });
  }
  gridEl.addEventListener("selectstart", (event) => event.preventDefault());
  gridEl.addEventListener("contextmenu", (event) => event.preventDefault());
  function start(safeIndex) {
    if (started) return;
    placeMines(safeIndex);
    started = true;
    startTime = Date.now();
    $("status").textContent = "PLAYING";
    $("message").classList.add("hide");
    timer = setInterval(() => {
      $("time").textContent = pad(
        Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
      );
    }, 1000);
  }
  function flag(i) {
    if (
      over ||
      !cells[i] ||
      cells[i].open ||
      (!cells[i].flag && flags >= mineCount)
    )
      return;
    cells[i].flag = !cells[i].flag;
    flags += cells[i].flag ? 1 : -1;
    updateMeta();
    render();
  }
  function finishWin() {
    cancelPress();
    over = true;
    clearInterval(timer);
    cells.filter((cell) => cell.mine).forEach((cell) => (cell.flag = true));
    flags = mineCount;
    const seconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    $("time").textContent = pad(seconds);
    if (bestTimes[levelIndex] === null || seconds < bestTimes[levelIndex])
      bestTimes[levelIndex] = seconds;
    completed[levelIndex] = true;
    saveProgress();
    updateMeta();
    $("status").textContent = "CLEAR";
    const next = levelIndex < levels.length - 1;
    show(
      "CLEARED",
      "LEVEL " + pad(currentLevel().id, 2) + " · TIME " + pad(seconds),
      next ? "NEXT LEVEL" : "PLAY AGAIN",
      next ? "next" : "replay",
    );
  }
  function open(i) {
    if (over || cells[i].flag) return;
    if (!started) start(i);
    const cell = cells[i];
    if (cell.open) {
      const nearby = around(Math.floor(i / cols), i % cols);
      if (cell.n && nearby.filter((j) => cells[j].flag).length === cell.n) {
        for (const j of nearby) {
          if (over) break;
          if (!cells[j].open && !cells[j].flag) open(j);
        }
      }
      return;
    }
    if (cell.mine) {
      cancelPress();
      $("time").textContent = pad(
        Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
      );
      cell.open = true;
      over = true;
      cells.forEach((item) => {
        if (item.mine) item.open = true;
      });
      clearInterval(timer);
      $("status").textContent = "BOOM";
      show("GARDEN BOOM", "YOU FOUND A BAD MUSHROOM", "PLAY AGAIN", "replay");
      render();
      return;
    }
    const stack = [i],
      seen = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (seen.has(current) || cells[current].flag) continue;
      seen.add(current);
      cells[current].open = true;
      if (!cells[current].n)
        stack.push(
          ...around(Math.floor(current / cols), current % cols).filter(
            (next) => !cells[next].mine && !seen.has(next),
          ),
        );
    }
    if (cells.every((cell) => cell.mine || cell.open)) finishWin();
    updateMeta();
    render();
  }
  function show(title, hint, button, action) {
    $("title").textContent = title;
    $("hint").textContent = hint;
    $("start").textContent = button;
    overlayAction = action;
    $("message").classList.remove("hide");
    gridEl.inert = true;
    $("start").focus({ preventScroll: true });
  }
  function renderLevelList() {
    levelList.innerHTML = "";
    let difficulty = "";
    levels.forEach((level, index) => {
      if (level.difficulty !== difficulty) {
        difficulty = level.difficulty;
        const heading = document.createElement("div");
        heading.className = "difficulty-heading";
        heading.textContent = difficulty;
        levelList.appendChild(heading);
      }
      const button = document.createElement("button");
      const unlocked = isLevelUnlocked(index, completed);
      button.type = "button";
      button.className =
        "level-button " +
        (unlocked ? "" : "locked") +
        (completed[index] ? " complete" : "") +
        (index === levelIndex ? " selected" : "");
      button.disabled = !unlocked;
      button.innerHTML =
        "<span>" +
        pad(level.id, 2) +
        (completed[index] ? " ✓" : "") +
        "</span><small>" +
        level.rows +
        "×" +
        level.cols +
        " · " +
        level.mines +
        "M" +
        (bestTimes[index] !== null ? " · " + pad(bestTimes[index]) : "") +
        "</small>";
      button.onclick = () => selectLevel(index);
      levelList.appendChild(button);
    });
  }
  function selectLevel(index) {
    if (!isLevelUnlocked(index, completed)) return;
    levelIndex = index;
    saveProgress();
    $("levelsPanel").classList.add("hide");
    beginLevel();
  }
  function openLevels() {
    cancelPress();
    renderLevelList();
    $("levelsPanel").classList.remove("hide");
    gridEl.inert = true;
    $("levelsPanel").scrollTop = 0;
    $("closeLevels").focus({ preventScroll: true });
  }
  $("start").onclick = () => {
    if (overlayAction === "next") {
      selectLevel(levelIndex + 1);
    } else beginLevel();
  };
  $("flagMode").onclick = () => {
    cancelPress();
    flagMode = !flagMode;
    updateMode();
  };
  $("zoom").onclick = () => {
    cancelPress();
    const large = gridEl.classList.toggle("large");
    $("zoom").setAttribute("aria-pressed", String(large));
    $("zoom").textContent = large ? "NORMAL" : "LARGE";
  };
  $("new").onclick = beginLevel;
  $("levels").onclick = openLevels;
  function closeLevels() {
    cancelPress();
    gridEl.inert = over || !$("message").classList.contains("hide");
    $("levelsPanel").classList.add("hide");
    $("levels").focus({ preventScroll: true });
  }
  $("closeLevels").onclick = closeLevels;
  document.addEventListener("keydown", (event) => {
    if ($("levelsPanel").classList.contains("hide")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLevels();
    }
    if (event.key === "Tab") {
      const buttons = [
        $("closeLevels"),
        ...Array.from(levelList.children).filter(
          (b) => b.tagName === "BUTTON" && !b.disabled,
        ),
      ];
      const i = buttons.indexOf(document.activeElement);
      if (event.shiftKey && i <= 0) {
        event.preventDefault();
        buttons.at(-1).focus();
      } else if (!event.shiftKey && (i === buttons.length - 1 || i < 0)) {
        event.preventDefault();
        buttons[0].focus();
      }
    }
  });
  window.addEventListener("blur", cancelPress);
  window.addEventListener("pagehide", cancelPress);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelPress();
  });
  setup();
  renderLevelList();
  show(
    "MOLE PATROL",
    "LEVEL " + pad(currentLevel().id, 2) + " · TAP A PATCH TO START",
    "START DIGGING",
    "start",
  );
})();
