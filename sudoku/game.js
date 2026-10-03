(() => {
  "use strict";
  const R = window.SudokuRules,
    $ = (id) => document.getElementById(id),
    boardEl = $("board");
  let puzzle,
    solution,
    board,
    notes,
    givens,
    selected = { r: 0, c: 0 },
    history = [],
    mistakes = 0,
    state = "title",
    notesMode = false,
    startTime = 0,
    timerId = 0,
    elapsed = 0,
    elapsedMs = 0,
    hintsUsed = 0,
    cells = [],
    currentDifficulty = "medium",
    savedAt = 0;
  const ui = {
    timer: $("timer"),
    mistakes: $("mistakes"),
    best: $("best"),
    difficulty: $("difficulty"),
    overlay: $("overlay"),
    title: $("overlayTitle"),
    text: $("overlayText"),
    start: $("startButton"),
    notes: $("notesButton"),
  };
  const pad = (n) => String(n).padStart(2, "0"),
    formatTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`,
    bestKey = () => `sudokuBest-${ui.difficulty.value}`;
  const now = () =>
    window.performance?.now ? window.performance.now() : Date.now();
  function updateTimer() {
    if (state === "playing")
      elapsed = Math.floor((elapsedMs + Math.max(0, now() - startTime)) / 1000);
    ui.timer.textContent = formatTime(elapsed);
    if (
      state === "playing" &&
      elapsedMs + Math.max(0, now() - startTime) - savedAt >= 10000
    )
      saveGame();
  }
  function stopClock() {
    if (state === "playing") {
      elapsedMs += Math.max(0, now() - startTime);
      elapsed = Math.floor(elapsedMs / 1000);
    }
    clearInterval(timerId);
    timerId = 0;
    ui.timer.textContent = formatTime(elapsed);
  }
  function pause() {
    if (state !== "playing") return;
    stopClock();
    state = "paused";
    setOverlay("PAUSED", "YOUR GRID IS WAITING", "RESUME");
    updateHud();
    saveGame();
  }

  function readBest() {
    try {
      const raw = localStorage.getItem(bestKey());
      return typeof raw === "string" &&
        /^(0|[1-9]\d*)$/.test(raw) &&
        +raw <= 2678400
        ? +raw
        : null;
    } catch (_) {
      return null;
    }
  }
  function updateBest() {
    const value = readBest();
    ui.best.textContent = value === null ? "--:--" : formatTime(value);
  }
  function setOverlay(title, text, button) {
    ui.title.textContent = title;
    ui.text.textContent = text;
    ui.start.textContent = button;
    ui.overlay.classList.remove("hide");
    boardEl.inert = true;
    updateControls();
    ui.start.focus?.({ preventScroll: true });
  }
  function hideOverlay() {
    ui.overlay.classList.add("hide");
    boardEl.inert = false;
    cells[selected.r * 9 + selected.c]?.focus({ preventScroll: true });
  }
  function snapshot() {
    return {
      board: R.clone(board),
      notes: notes.map((row) => row.map((set) => [...set])),
      selected: { ...selected },
      mistakes,
    };
  }
  function restore(s) {
    board = R.clone(s.board);
    notes = s.notes.map((row) => row.map((values) => new Set(values)));
    selected = { ...s.selected };
    updateHud();
    render();
  }
  function updateControls() {
    const active = state === "playing";
    const edit = active && !givens?.[selected.r]?.[selected.c];
    for (const button of document.querySelectorAll("[data-number]"))
      button.disabled = !edit;
    ui.notes.disabled = !active;
    $("hintButton").disabled = !active;
    $("undoButton").disabled = !active || !history.length;
    $("eraseButton").disabled =
      !edit ||
      (!board?.[selected.r]?.[selected.c] &&
        !notes?.[selected.r]?.[selected.c]?.size);
    if ($("pauseButton")) $("pauseButton").disabled = !active;
    if ($("statusText"))
      $("statusText").textContent =
        `FILLED ${board.flat().filter(Boolean).length} / 81${hintsUsed ? " · " + hintsUsed + " HINT" + (hintsUsed === 1 ? "" : "S") : ""}`;
  }
  function updateHud() {
    ui.mistakes.textContent = `${mistakes} / 3`;
    ui.notes.classList.toggle("active", notesMode);
    ui.notes.setAttribute("aria-pressed", String(notesMode));
    updateBest();
    updateControls();
  }
  function newGame(showIntro = false) {
    const game = R.generatePuzzle(ui.difficulty.value);
    currentDifficulty = game.difficulty;
    ui.difficulty.value = currentDifficulty;
    puzzle = game.puzzle;
    solution = game.solution;
    board = R.clone(puzzle);
    givens = puzzle.map((row) => row.map(Boolean));
    notes = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => new Set()),
    );
    const firstEmpty = puzzle.flat().indexOf(0);
    selected = { r: Math.floor(firstEmpty / 9), c: firstEmpty % 9 };
    history = [];
    mistakes = 0;
    notesMode = false;
    hintsUsed = 0;
    elapsed = 0;
    elapsedMs = 0;
    startTime = now();
    savedAt = 0;
    clearInterval(timerId);
    state = showIntro ? "title" : "playing";
    updateHud();
    render();
    updateTimer();
    discardSave();
    if (showIntro)
      setOverlay("BENTO NUMBERS", "SELECT A CELL AND PACK A NUMBER", "START");
    else startClock();
  }
  function startClock() {
    if (document.hidden) return;
    state = "playing";
    startTime = now();
    clearInterval(timerId);
    timerId = setInterval(updateTimer, 500);
    hideOverlay();
    updateHud();
    saveGame();
  }
  function render() {
    if (!cells.length)
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement("button");
          cell.type = "button";
          cell.dataset.row = r;
          cell.dataset.col = c;
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-rowindex", r + 1);
          cell.setAttribute("aria-colindex", c + 1);
          cell.addEventListener("click", () => selectCell(r, c, true));
          boardEl.appendChild(cell);
          cells.push(cell);
        }
    updateControls();
    const selectedValue = board[selected.r][selected.c];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const value = board[r][c],
          cell = cells[r * 9 + c],
          active = r === selected.r && c === selected.c;
        const classes = ["cell"];
        if (givens[r][c]) classes.push("given");
        if (
          r === selected.r ||
          c === selected.c ||
          (Math.floor(r / 3) === Math.floor(selected.r / 3) &&
            Math.floor(c / 3) === Math.floor(selected.c / 3))
        )
          classes.push("peer");
        if (selectedValue && value === selectedValue) classes.push("same");
        if (active) classes.push("selected");
        cell.className = classes.join(" ");
        cell.tabIndex = active ? 0 : -1;
        cell.setAttribute("aria-selected", String(active));
        cell.setAttribute("aria-readonly", String(givens[r][c]));
        cell.setAttribute(
          "aria-label",
          `Row ${r + 1}, column ${c + 1}, ${givens[r][c] ? "given " : ""}${value || "empty"}${!value && notes[r][c].size ? ", notes " + [...notes[r][c]].sort().join(" ") : ""}`,
        );
        const content = value
          ? "v" + value
          : "n" + [...notes[r][c]].sort().join("");
        if (cell.dataset.content !== content) {
          cell.dataset.content = content;
          cell.innerHTML = "";
          if (value) cell.textContent = value;
          else {
            const note = document.createElement("span");
            note.className = "notes";
            note.setAttribute("aria-hidden", "true");
            for (let n = 1; n <= 9; n++) {
              const slot = document.createElement("span");
              slot.textContent = notes[r][c].has(n) ? n : "";
              note.appendChild(slot);
            }
            cell.appendChild(note);
          }
        }
      }
  }

  const SAVE_KEY = "sudoku-game-v1",
    MAX_TIME_MS = 2678400000;
  function discardSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {}
  }
  function saveGame() {
    if (!["playing", "paused"].includes(state)) return;
    const time = Math.min(
      MAX_TIME_MS,
      elapsedMs + (state === "playing" ? Math.max(0, now() - startTime) : 0),
    );
    const data = {
      version: 1,
      difficulty: ui.difficulty.value,
      puzzle: R.clone(puzzle),
      ...snapshot(),
      history,
      elapsedMs: time,
      mistakes,
      hintsUsed,
      notesMode,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      savedAt = time;
    } catch (_) {}
  }
  function validFrame(frame, original, answer) {
    if (
      !frame ||
      !R.validBoard(frame.board) ||
      !frame.selected ||
      ![frame.selected.r, frame.selected.c].every(
        (n) => Number.isInteger(n) && n >= 0 && n < 9,
      )
    )
      return false;
    if (
      !Array.isArray(frame.notes) ||
      frame.notes.length !== 9 ||
      !frame.notes.every((row) => Array.isArray(row) && row.length === 9)
    )
      return false;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const value = frame.board[r][c],
          list = frame.notes[r][c];
        if (
          (original[r][c] && value !== original[r][c]) ||
          (value && value !== answer[r][c])
        )
          return false;
        if (
          !Array.isArray(list) ||
          list.length > 9 ||
          new Set(list).size !== list.length ||
          !list.every((n) => Number.isInteger(n) && n >= 1 && n <= 9) ||
          (value && list.length)
        )
          return false;
      }
    return true;
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      if (raw.length > 200000) throw Error("save size");
      const s = JSON.parse(raw);
      if (
        !s ||
        s.version !== 1 ||
        !["easy", "medium", "hard"].includes(s.difficulty) ||
        !R.validBoard(s.puzzle)
      )
        throw Error("save puzzle");
      const clues = s.puzzle.flat().filter(Boolean).length;
      if (clues < 25 || clues > 80) throw Error("save clues");
      if (
        !Number.isFinite(s.elapsedMs) ||
        s.elapsedMs < 0 ||
        s.elapsedMs > MAX_TIME_MS ||
        !Number.isInteger(s.mistakes) ||
        s.mistakes < 0 ||
        s.mistakes > 2 ||
        !Number.isInteger(s.hintsUsed) ||
        s.hintsUsed < 0 ||
        s.hintsUsed > 10000 ||
        typeof s.notesMode !== "boolean"
      )
        throw Error("save counters");
      if (
        !Array.isArray(s.history) ||
        s.history.length > 100 ||
        R.countSolutions(s.puzzle, 2, 20000) !== 1
      )
        throw Error("save uniqueness");
      const answer = R.solve(s.puzzle);
      if (
        !answer ||
        !validFrame(s, s.puzzle, answer) ||
        R.isComplete(s.board) ||
        !s.history.every((frame) => validFrame(frame, s.puzzle, answer))
      )
        throw Error("save frame");
      currentDifficulty = s.difficulty;
      ui.difficulty.value = currentDifficulty;
      puzzle = R.clone(s.puzzle);
      solution = answer;
      board = R.clone(s.board);
      notes = s.notes.map((row) => row.map((list) => new Set(list)));
      givens = puzzle.map((row) => row.map(Boolean));
      selected = { ...s.selected };
      history = s.history;
      mistakes = s.mistakes;
      hintsUsed = s.hintsUsed;
      notesMode = s.notesMode;
      elapsedMs = s.elapsedMs;
      elapsed = Math.floor(elapsedMs / 1000);
      state = "paused";
      updateHud();
      render();
      updateTimer();
      setOverlay("SAVED GRID", "CONTINUE YOUR UNFINISHED PUZZLE", "RESUME");
      return true;
    } catch (_) {
      discardSave();
      return false;
    }
  }

  function selectCell(r, c, focus = false) {
    if (state !== "playing") return;
    selected = { r, c };
    render();
    saveGame();
    if (focus) cells[r * 9 + c].focus({ preventScroll: true });
  }
  function clearPeerNotes(r, c, value) {
    for (let i = 0; i < 9; i++) {
      notes[r][i].delete(value);
      notes[i][c].delete(value);
    }
    const br = Math.floor(r / 3) * 3,
      bc = Math.floor(c / 3) * 3;
    for (let y = br; y < br + 3; y++)
      for (let x = bc; x < bc + 3; x++) notes[y][x].delete(value);
  }
  function pushHistory() {
    history.push(snapshot());
    if (history.length > 100) history.shift();
  }
  function enterNumber(value) {
    if (
      state !== "playing" ||
      document.hidden ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 9 ||
      givens[selected.r][selected.c]
    )
      return;
    const { r, c } = selected;
    if (notesMode) {
      if (board[r][c]) return;
      pushHistory();
      notes[r][c].has(value)
        ? notes[r][c].delete(value)
        : notes[r][c].add(value);
      render();
      saveGame();
      return;
    }
    if (board[r][c] === value) return;
    if (value !== solution[r][c]) {
      mistakes++;
      updateHud();
      const cell = cells[r * 9 + c];
      cell.classList.add("error");
      setTimeout(() => cell.classList.remove("error"), 350);
      if (mistakes >= 3) {
        stopClock();
        state = "over";
        setOverlay("GAME OVER", "THREE MISTAKES", "TRY AGAIN");
        discardSave();
      } else saveGame();
      return;
    }
    pushHistory();
    board[r][c] = value;
    notes[r][c].clear();
    clearPeerNotes(r, c, value);
    render();
    if (R.isComplete(board)) finish();
    else saveGame();
  }
  function erase() {
    if (
      state !== "playing" ||
      document.hidden ||
      givens[selected.r][selected.c]
    )
      return;
    const { r, c } = selected;
    if (!board[r][c] && !notes[r][c].size) return;
    pushHistory();
    board[r][c] = 0;
    notes[r][c].clear();
    render();
    saveGame();
  }
  function undo() {
    if (!history.length || state !== "playing" || document.hidden) return;
    restore(history.pop());
    saveGame();
  }
  function hint() {
    if (state !== "playing" || document.hidden) return;
    const empties = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) if (!board[r][c]) empties.push({ r, c });
    if (!empties.length) return;
    hintsUsed++;
    pushHistory();
    const cell = !board[selected.r][selected.c] ? { ...selected } : empties[0];
    selected = cell;
    board[cell.r][cell.c] = solution[cell.r][cell.c];
    notes[cell.r][cell.c].clear();
    clearPeerNotes(cell.r, cell.c, board[cell.r][cell.c]);
    render();
    if (R.isComplete(board)) finish();
    else saveGame();
  }
  function finish() {
    if (state !== "playing" || !R.isComplete(board)) return;
    stopClock();
    state = "won";
    discardSave();
    const previous = readBest();
    if (!hintsUsed && (previous === null || elapsed < previous))
      try {
        localStorage.setItem(bestKey(), String(elapsed));
      } catch (_) {}
    updateBest();
    setOverlay(
      "PUZZLE CLEAR",
      `TIME ${formatTime(elapsed)} · ${mistakes} MISTAKES${hintsUsed ? " · ASSISTED" : ""}`,
      "NEW PUZZLE",
    );
  }
  function moveSelection(dr, dc) {
    selectCell(
      Math.max(0, Math.min(8, selected.r + dr)),
      Math.max(0, Math.min(8, selected.c + dc)),
      true,
    );
  }
  function requestNewGame() {
    if (
      ["playing", "paused"].includes(state) &&
      (history.length || mistakes || hintsUsed) &&
      !window.confirm("Start a new puzzle? Your current grid will be replaced.")
    ) {
      ui.difficulty.value = currentDifficulty;
      return;
    }
    newGame(false);
  }
  function toggleNotes() {
    if (state !== "playing") return;
    notesMode = !notesMode;
    updateHud();
    saveGame();
  }
  document
    .querySelectorAll("[data-number]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        enterNumber(+button.dataset.number),
      ),
    );
  $("notesButton").onclick = toggleNotes;
  $("eraseButton").onclick = erase;
  $("undoButton").onclick = undo;
  $("hintButton").onclick = hint;
  $("newButton").onclick = requestNewGame;
  ui.difficulty.onchange = requestNewGame;
  ui.start.onclick = () =>
    state === "title" || state === "paused" ? startClock() : newGame(false);
  if ($("pauseButton")) $("pauseButton").onclick = pause;
  window.addEventListener("keydown", (event) => {
    if (
      state !== "playing" ||
      document.hidden ||
      event.repeat ||
      event.target?.closest?.("select,input,textarea,[contenteditable]")
    )
      return;
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === "z"
    ) {
      event.preventDefault();
      undo();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
      return;
    const moves = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      enterNumber(+event.key);
    } else if (moves[event.key]) {
      event.preventDefault();
      moveSelection(...moves[event.key]);
    } else if (["Backspace", "Delete", "0"].includes(event.key)) {
      event.preventDefault();
      erase();
    } else if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      toggleNotes();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  window.addEventListener("blur", pause);
  window.addEventListener("pagehide", pause);
  window.addEventListener("game-data-clearing", () => {
    stopClock();
    state = "clearing";
    discardSave();
    updateControls();
  });
  function mountUtility() {
    const dock = $("utilityDock"),
      clear = document.querySelector?.(".clear-data-toggle");
    if (dock && clear) dock.appendChild(clear);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mountUtility);
  else mountUtility();
  if (!loadGame()) newGame(true);
})();
