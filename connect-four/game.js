(() => {
  "use strict";
  const R = window.ConnectFourRules;
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const turnDot = document.getElementById("turnDot");
  const difficulty = document.getElementById("difficulty");
  const firstPlayer = document.getElementById("firstPlayer");
  const undoButton = document.getElementById("undoButton");
  const newButton = document.getElementById("newButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");
  const resultButton = document.getElementById("resultButton");
  const columnButtons = [...document.querySelectorAll("[data-column]")];
  const recordEls = ["wins", "losses", "draws"].map((id) =>
    document.getElementById(id),
  );
  let board, history, turn, busy, over, recorded;
  let cpuTimer = 0,
    cpuEpoch = 0,
    paused = false;
  let currentDifficulty = "medium",
    currentFirst = "human";
  let moves = [],
    clearing = false,
    gesture = null,
    selectedColumn = 3;
  const SAVE_KEY = "connectFourGame-v1";
  function removeSavedGame() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (_) {}
  }
  function saveGame() {
    if (clearing) return;
    if (over || !moves.length) {
      removeSavedGame();
      return;
    }
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          difficulty: currentDifficulty,
          first: currentFirst,
          moves,
          review: recorded,
          selected: selectedColumn,
          cursors: history.map((entry) => entry.selected),
        }),
      );
    } catch (_) {}
  }
  function restoreGame() {
    try {
      const text = localStorage.getItem(SAVE_KEY);
      if (!text || text.length > 2048) return false;
      const raw = JSON.parse(text);
      if (
        !raw ||
        raw.version !== 1 ||
        !["easy", "medium", "hard"].includes(raw.difficulty) ||
        !["human", "computer"].includes(raw.first) ||
        typeof raw.review !== "boolean" ||
        !Array.isArray(raw.moves) ||
        !raw.moves.length ||
        raw.moves.length > 41
      )
        return false;
      if (
        raw.selected !== undefined &&
        (!Number.isInteger(raw.selected) ||
          raw.selected < 0 ||
          raw.selected > 6)
      )
        return false;
      if (
        raw.cursors !== undefined &&
        (!Array.isArray(raw.cursors) ||
          raw.cursors.some((c) => !Number.isInteger(c) || c < 0 || c > 6))
      )
        return false;
      const next = R.createBoard(),
        snapshots = [];
      let cursor = 3;
      let player = raw.first === "computer" ? 2 : 1;
      for (const col of raw.moves) {
        if (!Number.isInteger(col) || col < 0 || col > 6) return false;
        if (player === 1) {
          snapshots.push({
            board: next.map((row) => row.slice()),
            selected: raw.cursors?.[snapshots.length] ?? cursor,
          });
          cursor = col;
        }
        if (R.drop(next, col, player) < 0 || R.winner(next)) return false;
        player = 3 - player;
      }
      if (raw.cursors && raw.cursors.length !== snapshots.length) return false;
      selectedColumn = raw.selected ?? cursor;
      board = next;
      history = snapshots;
      moves = raw.moves.slice();
      turn = player;
      paused = true;
      busy = turn === 2;
      over = false;
      recorded = raw.review;
      currentDifficulty = raw.difficulty;
      currentFirst = raw.first;
      difficulty.value = currentDifficulty;
      firstPlayer.value = currentFirst;
      hideResult();
      render();
      return true;
    } catch (_) {
      return false;
    }
  }
  const pauseButton = document.getElementById("pauseButton"),
    resumeButton = document.getElementById("resumeButton"),
    pauseOverlay = document.getElementById("pauseOverlay");
  function cancelCPU() {
    gesture = null;
    window.clearTimeout(cpuTimer);
    cpuTimer = 0;
    cpuEpoch++;
  }
  function queueCPU(ms) {
    cancelCPU();
    busy = turn === 2;
    if (paused || over || document.hidden || turn !== 2) return;
    const epoch = cpuEpoch;
    cpuTimer = window.setTimeout(() => {
      if (epoch !== cpuEpoch || turn !== 2 || over || paused || document.hidden)
        return;
      cpuTimer = 0;
      computerMove();
    }, ms);
  }
  function pause(manual = false) {
    if (over || paused) return;
    paused = true;
    cancelCPU();
    saveGame();
    render();
    if (manual) resumeButton.focus();
  }
  function resume() {
    if (clearing || !paused || over || document.hidden) return;
    paused = false;
    if (turn === 2) queueCPU(260);
    render();
    boardEl.focus();
  }
  const record = loadRecord();
  const cells = [];

  function loadRecord() {
    try {
      const raw = JSON.parse(localStorage.getItem("connectFourRecord") || "{}");
      return Object.fromEntries(
        ["wins", "losses", "draws"].map((key) => [
          key,
          Number.isSafeInteger(raw?.[key]) && raw[key] >= 0 ? raw[key] : 0,
        ]),
      );
    } catch (_) {
      return { wins: 0, losses: 0, draws: 0 };
    }
  }
  function saveRecord() {
    if (clearing) return;
    try {
      localStorage.setItem("connectFourRecord", JSON.stringify(record));
    } catch (_) {}
    renderRecord();
  }
  function compact(n) {
    for (const [scale, suffix] of [
      [1e15, "P"],
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ])
      if (n >= scale)
        return Number((n / scale).toFixed(n / scale < 10 ? 1 : 0)) + suffix;
    return String(n);
  }
  function renderRecord() {
    recordEls.forEach((el, i) => {
      const key = ["wins", "losses", "draws"][i];
      el.textContent = compact(record[key]);
      el.setAttribute("aria-label", key + ": " + record[key]);
      el.title = String(record[key]);
    });
  }

  function render() {
    if (!cells.length)
      for (let row = 0; row < 6; row++) {
        const group = document.createElement("div");
        group.className = "board-row";
        group.setAttribute("role", "row");
        group.setAttribute("aria-rowindex", String(row + 1));
        boardEl.appendChild(group);
        for (let col = 0; col < 7; col++) {
          const cell = document.createElement("div");
          cells.push(cell);
          group.appendChild(cell);
        }
      }
    const winCells = over ? R.winningCells(board) : [];
    const lastCol = moves.at(-1),
      lastRow = Number.isInteger(lastCol)
        ? board.findIndex((row) => row[lastCol] !== 0)
        : -1;
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 7; col++) {
        const cell = cells[row * 7 + col];
        cell.className =
          "cell" +
          (board[row][col] === 1
            ? " human"
            : board[row][col] === 2
              ? " computer"
              : "");
        cell.setAttribute("role", "gridcell");
        cell.dataset.column = String(col);
        cell.dataset.row = String(row);
        cell.dataset.value = String(board[row][col]);
        cell.setAttribute("aria-rowindex", String(row + 1));
        cell.setAttribute("aria-colindex", String(col + 1));
        cell.setAttribute(
          "aria-label",
          "Row " +
            (row + 1) +
            ", column " +
            (col + 1) +
            ": " +
            (board[row][col] === 1
              ? "you"
              : board[row][col] === 2
                ? "computer"
                : "empty"),
        );
        cell.classList.toggle("selected", col === selectedColumn);
        cell.classList.toggle("last", row === lastRow && col === lastCol);
        cell.classList.toggle(
          "winning",
          winCells.some(([r, c]) => r === row && c === col),
        );
      }
    if (!over)
      setStatus(
        paused
          ? "PAUSED"
          : turn === 2
            ? "COMPUTER THINKING"
            : recorded
              ? "REVIEW · YOUR TURN"
              : "YOUR TURN",
      );
    pauseOverlay.classList.toggle("show", paused && !over);
    pauseOverlay.setAttribute("aria-hidden", String(!paused || over));
    pauseButton.disabled = over;
    pauseButton.textContent = paused ? "RESUME" : "PAUSE";
    boardEl.setAttribute(
      "aria-label",
      "Connect Four board. " +
        statusEl.textContent +
        ". Selected column " +
        (selectedColumn + 1) +
        ".",
    );
    const disabled = busy || over || paused || turn !== 1;
    columnButtons.forEach((button, col) => {
      button.disabled = disabled || board[0][col] !== 0;
      button.classList.toggle("selected", col === selectedColumn);
    });
    undoButton.disabled = history.length === 0;
  }

  function setStatus(message, player = turn) {
    statusEl.textContent = message;
    turnDot.style.background = player === 2 ? "var(--orange)" : "var(--cyan)";
  }

  function showResult(title, text) {
    resultTitle.textContent = title;
    resultText.textContent = text;
    resultButton.textContent = "PLAY AGAIN";
    resultOverlay.classList.add("show");
    resultOverlay.setAttribute("aria-hidden", "false");
    resultButton.focus();
  }

  function hideResult() {
    resultOverlay.classList.remove("show");
    resultOverlay.setAttribute("aria-hidden", "true");
  }

  function finish(result) {
    over = true;
    cancelCPU();
    busy = false;
    removeSavedGame();
    if (result === 1) {
      setStatus("YOU CONNECTED FOUR", 1);
      showResult("YOU WIN", "FOUR DISCS CONNECTED");
      if (!recorded)
        record.wins = Math.min(Number.MAX_SAFE_INTEGER, record.wins + 1);
    } else if (result === 2) {
      setStatus("COMPUTER CONNECTED FOUR", 2);
      showResult("COMPUTER WINS", "THE COMPUTER CONNECTED FOUR");
      if (!recorded)
        record.losses = Math.min(Number.MAX_SAFE_INTEGER, record.losses + 1);
    } else {
      setStatus("DRAW — BOARD FULL", 1);
      showResult("DRAW", "THE BOARD IS FULL");
      if (!recorded)
        record.draws = Math.min(Number.MAX_SAFE_INTEGER, record.draws + 1);
    }
    if (recorded) resultText.textContent = "REVIEW ROUND · RECORD UNCHANGED";
    if (!recorded) {
      recorded = true;
      saveRecord();
    }
    render();
  }

  function boardFull() {
    return board[0].every(Boolean);
  }
  function checkEnd() {
    const result = R.winner(board);
    if (result) {
      finish(result);
      return true;
    }
    if (boardFull()) {
      finish(0);
      return true;
    }
    return false;
  }

  function humanMove(column) {
    if (
      !Number.isInteger(column) ||
      column < 0 ||
      column > 6 ||
      busy ||
      over ||
      paused ||
      document.hidden ||
      turn !== 1 ||
      board[0][column] !== 0
    )
      return;
    history.push({
      board: board.map((row) => row.slice()),
      selected: selectedColumn,
    });
    selectedColumn = column;
    R.drop(board, column, 1);
    moves.push(column);
    render();
    if (checkEnd()) return;
    turn = 2;
    setStatus("COMPUTER THINKING", 2);
    render();
    busy = true;
    saveGame();
    queueCPU(260);
  }

  function computerMove() {
    if (over || paused || document.hidden || turn !== 2) return;
    let column = R.chooseMove(board, 2, currentDifficulty);
    if (
      !Number.isInteger(column) ||
      column < 0 ||
      column > 6 ||
      board[0][column] !== 0
    )
      column = R.validMoves(board)[0] ?? -1;
    if (column >= 0 && R.drop(board, column, 2) >= 0) moves.push(column);
    busy = false;
    render();
    if (checkEnd()) return;
    turn = 1;
    setStatus("YOUR TURN", 1);
    saveGame();
    render();
  }

  function newGame() {
    if (clearing) return;
    cancelCPU();
    paused = document.hidden;
    currentDifficulty = ["easy", "medium", "hard"].includes(difficulty.value)
      ? difficulty.value
      : "medium";
    currentFirst = firstPlayer.value === "computer" ? "computer" : "human";
    difficulty.value = currentDifficulty;
    firstPlayer.value = currentFirst;
    moves = [];
    selectedColumn = 3;
    removeSavedGame();
    board = R.createBoard();
    history = [];
    busy = false;
    over = false;
    recorded = false;
    hideResult();
    turn = firstPlayer.value === "computer" ? 2 : 1;
    setStatus(turn === 1 ? "YOUR TURN" : "COMPUTER OPENS", turn);
    render();
    if (turn === 2) {
      busy = true;
      queueCPU(300);
    }
  }

  function requestNew(event) {
    if (
      !over &&
      board.some((row) => row.some(Boolean)) &&
      !window.confirm("Start a new round? Current progress will be replaced.")
    ) {
      difficulty.value = currentDifficulty;
      firstPlayer.value = currentFirst;
      return;
    }
    newGame();
    if (event?.target?.tagName !== "SELECT") boardEl.focus();
  }

  function undo() {
    if (history.length === 0) return;
    cancelCPU();
    busy = false;
    const previous = history.pop();
    board = previous.board.map((row) => row.slice());
    selectedColumn = previous.selected;
    moves.length = board.flat().filter(Boolean).length;
    over = false;
    hideResult();
    turn = 1;
    setStatus("YOUR TURN", 1);
    saveGame();
    render();
  }

  columnButtons.forEach((button) =>
    button.addEventListener("click", () =>
      humanMove(Number(button.dataset.column)),
    ),
  );
  function pointerColumn(event) {
    const cell = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest(".cell");
    return cell && boardEl.contains(cell) ? Number(cell.dataset.column) : -1;
  }
  function cancelGesture() {
    gesture = null;
  }
  boardEl.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false) {
      cancelGesture();
      return;
    }
    if (busy || over || paused || document.hidden || turn !== 1) return;
    const col = pointerColumn(event);
    if (col < 0) return;
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      col,
      moved: false,
    };
    boardEl.focus();
    try {
      boardEl.setPointerCapture(event.pointerId);
    } catch (_) {}
  });
  boardEl.addEventListener("pointermove", (event) => {
    if (
      gesture &&
      gesture.id === event.pointerId &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10
    )
      gesture.moved = true;
  });
  boardEl.addEventListener("pointerup", (event) => {
    const tap = gesture;
    cancelGesture();
    if (
      !tap ||
      tap.id !== event.pointerId ||
      event.button !== 0 ||
      event.isPrimary === false ||
      tap.moved ||
      Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10 ||
      pointerColumn(event) !== tap.col
    )
      return;
    humanMove(tap.col);
  });
  for (const type of ["pointercancel", "lostpointercapture"])
    boardEl.addEventListener(type, cancelGesture);
  boardEl.addEventListener("click", (event) => {
    if (event.detail !== 0) return;
    const cell = event.target?.closest(".cell");
    if (cell && boardEl.contains(cell)) humanMove(Number(cell.dataset.column));
  });
  window.addEventListener("resize", cancelGesture);
  newButton.addEventListener("click", requestNew);
  resultButton.addEventListener("click", () => {
    newGame();
    boardEl.focus();
  });
  undoButton.addEventListener("click", undo);
  difficulty.addEventListener("change", requestNew);
  firstPlayer.addEventListener("change", requestNew);
  document.addEventListener("keydown", (event) => {
    if (
      event.repeat ||
      event.target?.isContentEditable ||
      event.target?.closest("select, input, textarea, [contenteditable]")
    )
      return;
    const key = event.key.toLowerCase();
    if (event.ctrlKey || event.metaKey || event.altKey) {
      if (
        key === "z" &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        undo();
      }
      return;
    }
    if (
      event.target === boardEl &&
      ["arrowleft", "arrowright", "enter", " "].includes(key)
    ) {
      event.preventDefault();
      if (key === "arrowleft" || key === "arrowright") {
        selectedColumn = (selectedColumn + (key === "arrowleft" ? 6 : 1)) % 7;
        render();
      } else humanMove(selectedColumn);
      return;
    }
    if (/^[1-7]$/.test(key)) {
      event.preventDefault();
      humanMove(Number(key) - 1);
    } else if (key === "u") {
      event.preventDefault();
      undo();
    } else if (key === "n") {
      event.preventDefault();
      requestNew();
    } else if (key === "escape") {
      event.preventDefault();
      if (paused) resume();
      else pause(true);
    }
  });
  pauseButton.addEventListener("click", () =>
    paused ? resume() : pause(true),
  );
  resumeButton.addEventListener("click", resume);
  document.getElementById("viewButton").addEventListener("click", () => {
    hideResult();
    boardEl.focus();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  window.addEventListener("blur", () => pause());
  window.addEventListener("pagehide", () => pause());
  window.addEventListener("game-data-clearing", () => {
    clearing = true;
    paused = true;
    cancelCPU();
  });
  function mountUtilities() {
    const dock = document.getElementById("utilityDock");
    for (const selector of [".theme-toggle", ".clear-data-toggle"]) {
      const button = document.querySelector(selector);
      if (button) dock.appendChild(button);
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mountUtilities, {
      once: true,
    });
  else mountUtilities();
  renderRecord();
  if (!restoreGame()) newGame();
})();
