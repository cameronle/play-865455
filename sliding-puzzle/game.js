(() => {
  'use strict';

  const boardEl = document.getElementById('board');
  const R = window.SlidingRules;
  const STORAGE_KEY = 'sliding-puzzle-best-v1';

  const $ = id => document.getElementById(id);
  const ui = {
    sizeSelect: $('sizeSelect'),
    moveStat: $('moveStat'),
    timeStat: $('timeStat'),
    bestStat: $('bestStat'),
    winOverlay: $('winOverlay'),
    winTitle: $('winTitle'),
    winDetail: $('winDetail'),
    restartButton: $('restartButton'),
    undoButton: $('undoButton'),
    newButton: $('newButton'),
  };

  let size = 4;
  let board = [];
  let moves = 0;
  let history = [];
  let startTime = null;
  let timerInterval = null;
  let isWon = false;
  let records = loadRecords();

  function loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (_) {}
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startTimer() {
    if (timerInterval) return;
    startTime = Date.now();
    timerInterval = setInterval(() => {
      if (!startTime || isWon) return;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      ui.timeStat.textContent = formatTime(elapsed);
    }, 500);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateHud() {
    ui.moveStat.textContent = String(moves);
    const rec = records[String(size)];
    if (rec && rec.moves) {
      ui.bestStat.textContent = `${rec.moves}M · ${formatTime(rec.time)}`;
    } else {
      ui.bestStat.textContent = '--';
    }
  }

  function renderBoard() {
    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    boardEl.replaceChildren();

    board.forEach((val, idx) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      if (val === 0) {
        tile.classList.add('blank');
      } else {
        tile.textContent = String(val);
        if (val === idx + 1) tile.classList.add('correct');
        tile.addEventListener('click', () => handleTileClick(idx));
      }
      boardEl.appendChild(tile);
    });
  }

  function handleTileClick(idx) {
    if (isWon) return;
    const next = R.move(board, size, idx);
    if (next) {
      history.push(board.slice());
      board = next;
      moves++;
      if (!startTime) startTimer();
      updateHud();
      renderBoard();
      checkWin();
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }

  function undo() {
    if (isWon || history.length === 0) return;
    board = history.pop();
    moves = Math.max(0, moves - 1);
    updateHud();
    renderBoard();
  }

  function checkWin() {
    if (!R.isSolved(board)) return;
    isWon = true;
    stopTimer();
    const elapsed = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : 0;
    const key = String(size);
    const prev = records[key];

    if (!prev || moves < prev.moves || (moves === prev.moves && elapsed < prev.time)) {
      records[key] = { moves, time: elapsed };
      saveRecords();
    }

    updateHud();
    ui.winTitle.textContent = 'PUZZLE SOLVED';
    ui.winDetail.textContent = `${size}×${size} SOLVED IN ${moves} MOVES (${formatTime(elapsed)})`;
    ui.winOverlay.classList.remove('hide');
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  }

  function newGame() {
    stopTimer();
    startTime = null;
    moves = 0;
    history = [];
    isWon = false;
    ui.timeStat.textContent = '00:00';
    ui.winOverlay.classList.add('hide');
    board = R.generateSolvableBoard(size);
    updateHud();
    renderBoard();
  }

  function handleKey(e) {
    if (isWon) return;
    const blankIdx = board.indexOf(0);
    const r0 = Math.floor(blankIdx / size);
    const c0 = blankIdx % size;

    let targetIdx = -1;
    // Keys push a tile towards the blank space:
    // ArrowUp: tile below blank moves UP -> tile at (r0 + 1, c0)
    // ArrowDown: tile above blank moves DOWN -> tile at (r0 - 1, c0)
    // ArrowLeft: tile to the right of blank moves LEFT -> tile at (r0, c0 + 1)
    // ArrowRight: tile to the left of blank moves RIGHT -> tile at (r0, c0 - 1)
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (r0 + 1 < size) targetIdx = (r0 + 1) * size + c0;
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      if (r0 - 1 >= 0) targetIdx = (r0 - 1) * size + c0;
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      if (c0 + 1 < size) targetIdx = r0 * size + (c0 + 1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      if (c0 - 1 >= 0) targetIdx = r0 * size + (c0 - 1);
    } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
      undo();
      e.preventDefault();
      return;
    }

    if (targetIdx !== -1) {
      e.preventDefault();
      handleTileClick(targetIdx);
    }
  }

  // Swipe gesture support
  let touchStart = null;
  boardEl.addEventListener('pointerdown', e => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  boardEl.addEventListener('pointerup', e => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.hypot(dx, dy) < 20) return; // ignore simple tap

    const blankIdx = board.indexOf(0);
    const r0 = Math.floor(blankIdx / size);
    const c0 = blankIdx % size;
    let targetIdx = -1;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (dx > 0 && c0 - 1 >= 0) targetIdx = r0 * size + (c0 - 1); // Swiped right -> push left tile right
      else if (dx < 0 && c0 + 1 < size) targetIdx = r0 * size + (c0 + 1); // Swiped left -> push right tile left
    } else {
      // Vertical swipe
      if (dy > 0 && r0 - 1 >= 0) targetIdx = (r0 - 1) * size + c0; // Swiped down -> push top tile down
      else if (dy < 0 && r0 + 1 < size) targetIdx = (r0 + 1) * size + c0; // Swiped up -> push bottom tile up
    }

    if (targetIdx !== -1) handleTileClick(targetIdx);
  });
  boardEl.addEventListener('pointercancel', () => { touchStart = null; });

  // Event Listeners
  ui.sizeSelect.addEventListener('change', () => {
    size = Number(ui.sizeSelect.value);
    newGame();
  });
  ui.undoButton.addEventListener('click', undo);
  ui.newButton.addEventListener('click', newGame);
  ui.restartButton.addEventListener('click', newGame);
  window.addEventListener('keydown', handleKey);

  document.addEventListener('themechange', () => renderBoard());

  newGame();

  window.SlidingGame = {
    newGame,
    setSize: s => { size = s; ui.sizeSelect.value = String(s); newGame(); },
    getSnapshot: () => ({ size, moves, isWon, board: board.slice() }),
    handleTileClick,
    undo,
  };
})();
