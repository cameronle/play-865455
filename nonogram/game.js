(() => {
  'use strict';
  const R = window.NonogramRules,
    $ = (id) => document.getElementById(id);
  const boardEl = $('board'),
    rowCluesEl = $('rowClues'),
    colCluesEl = $('colClues');
  let puzzle,
    board,
    history = [],
    mode = R.FILLED,
    size = 10,
    puzzleIndex = 0,
    mistakes = 0,
    active = true,
    paused = false,
    elapsedMs = 0,
    startedAt = 0,
    timer = null,
    cursor = { r: 0, c: 0 },
    drag = null;
  function readStored(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }
  let clearing = false;
  function writeStored(key, value) {
    if (clearing) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
  function storedMap(key) {
    const value = readStored(key, {});
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  }
  const validKeys = new Set(
    [5, 10, 15].flatMap((n) => R.listPuzzles(n).map((p) => `${n}-${p.name}`)),
  );
  const bests = Object.fromEntries(
    Object.entries(storedMap('nonogram-bests')).filter(
      ([k, v]) =>
        validKeys.has(k) && Number.isInteger(v) && v > 0 && v <= 31536000,
    ),
  );
  const storedCompleted = readStored('nonogram-completed', []);
  const completed = new Set(
    Array.isArray(storedCompleted)
      ? storedCompleted.filter((k) => validKeys.has(k))
      : [],
  );
  const saves = Object.fromEntries(
    Object.entries(storedMap('nonogram-saves')).filter(
      ([k, v]) => validKeys.has(k) && validSave(v, Number(k.split('-')[0])),
    ),
  );
  function validSave(saved, n) {
    return (
      saved &&
      Array.isArray(saved.board) &&
      saved.board.length === n &&
      saved.board.every(
        (row) =>
          Array.isArray(row) &&
          row.length === n &&
          row.every((v) => [R.UNKNOWN, R.FILLED, R.MARKED].includes(v)),
      ) &&
      Number.isInteger(saved.mistakes) &&
      saved.mistakes >= 0 &&
      saved.mistakes <= 3 &&
      Number.isFinite(saved.elapsed) &&
      saved.elapsed >= 0 &&
      saved.elapsed <= 31536000 &&
      (!saved.cursor ||
        (Number.isInteger(saved.cursor.r) &&
          Number.isInteger(saved.cursor.c) &&
          saved.cursor.r >= 0 &&
          saved.cursor.c >= 0 &&
          saved.cursor.r < n &&
          saved.cursor.c < n))
    );
  }
  function saveCompleted() {
    writeStored('nonogram-completed', [...completed]);
  }
  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function bestKey() {
    return `${size}-${puzzle.name}`;
  }
  function elapsedSeconds() {
    return Math.max(
      0,
      Math.floor((elapsedMs + (startedAt ? Date.now() - startedAt : 0)) / 1000),
    );
  }
  function stopClock() {
    if (startedAt) {
      elapsedMs += Math.max(0, Date.now() - startedAt);
      startedAt = 0;
    }
    clearInterval(timer);
    timer = null;
    updateTime();
  }
  function syncClock() {
    const running =
      active &&
      !paused &&
      !document.hidden &&
      !$('levelOverlay').classList.contains('show');
    if (!running) stopClock();
    else if (!timer) {
      startedAt = Date.now();
      timer = setInterval(updateTime, 1000);
    }
    updateTime();
    if ($('pauseButton')) {
      $('pauseButton').disabled = !active;
      $('pauseButton').textContent = paused ? 'RESUME' : 'PAUSE';
    }
  }
  function canPlay() {
    return (
      active &&
      !paused &&
      !document.hidden &&
      !$('levelOverlay').classList.contains('show')
    );
  }
  function pause() {
    if (!active || paused) return;
    paused = true;
    endDrag();
    syncClock();
    saveGame();
    $('pauseOverlay').classList.add('show');
    $('pauseOverlay').setAttribute('aria-hidden', 'false');
    boardEl.inert = true;
    $('resumeButton').focus?.();
  }
  function resume() {
    if (!active || document.hidden) return;
    paused = false;
    $('pauseOverlay').classList.remove('show');
    $('pauseOverlay').setAttribute('aria-hidden', 'true');
    boardEl.inert = false;
    syncClock();
    boardEl.children[cursor.r * size + cursor.c].focus?.();
  }

  function updateCurrentLevelCard() {
    const card = $('levelGrid').children[puzzleIndex],
      saved = saves[bestKey()];
    if (!card || !saved || completed.has(bestKey())) return;
    card.classList.add('in-progress');
    const detail = card.children[2];
    if (detail) {
      const handled = saved.board
        .flat()
        .filter((value) => value !== R.UNKNOWN).length;
      detail.textContent = `IN PROGRESS · ${Math.round((handled / (size * size)) * 100)}%`;
    }
  }
  function saveGame() {
    if (!puzzle || !board || (!active && mistakes < 3)) return;
    const key = bestKey();
    saves[key] = {
      board: board.map((row) => row.slice()),
      mistakes,
      mode,
      cursor: { ...cursor },
      elapsed: elapsedSeconds(),
      updated: Date.now(),
    };
    writeStored('nonogram-saves', saves);
    writeStored('nonogram-last-played', {
      size,
      index: puzzleIndex,
      name: puzzle.name,
    });
    updateCurrentLevelCard();
  }
  function loadSavedGame() {
    const saved = saves[bestKey()];
    if (
      !saved ||
      !Array.isArray(saved.board) ||
      saved.board.length !== size ||
      saved.board.some((row) => !Array.isArray(row) || row.length !== size)
    )
      return false;
    board = saved.board.map((row) => row.slice());
    mistakes = Number(saved.mistakes) || 0;
    mode = saved.mode === R.MARKED ? R.MARKED : R.FILLED;
    cursor =
      saved.cursor &&
      Number.isInteger(saved.cursor.r) &&
      Number.isInteger(saved.cursor.c)
        ? saved.cursor
        : { r: 0, c: 0 };
    elapsedMs = saved.elapsed * 1000;
    startedAt = Date.now();
    return true;
  }
  function clearSavedGame() {
    if (!puzzle) return;
    delete saves[bestKey()];
    writeStored('nonogram-saves', saves);
    renderLevelGrid();
  }
  function updateTime() {
    $('timer').textContent = formatTime(elapsedSeconds());
  }
  function lineMatches(values, clue) {
    return (
      JSON.stringify(
        R.runs(values.map((value) => (value === R.FILLED ? 1 : 0))),
      ) === JSON.stringify(clue)
    );
  }
  function clueDepth(clues) {
    return Math.max(1, ...clues.map((group) => group.length));
  }
  function updateClueGeometry() {
    const mobile = window.matchMedia?.('(max-width: 680px)').matches,
      rowDepth = clueDepth(puzzle.clues.rows),
      colDepth = clueDepth(puzzle.clues.cols),
      base = mobile ? 11 : 15,
      min = mobile ? 36 : 56,
      max = mobile ? 100 : 132,
      frame = $('puzzleFrame');
    frame.style.setProperty(
      '--row-clue',
      `${Math.min(max, Math.max(min, rowDepth * base + 18))}px`,
    );
    frame.style.setProperty(
      '--col-clue',
      `${Math.min(max, Math.max(min, colDepth * base + 18))}px`,
    );
  }
  function fitBoard() {
    if (!window.innerHeight || !window.innerWidth) return;
    const page = $('gamePage'),
      layout = document.querySelector('.game-layout'),
      controls = $('controlsPanel');
    if (!page || !layout || !controls) return;
    const stacked = window.innerWidth <= 680 && window.innerHeight > 450,
      pad = window.innerWidth <= 680 ? 3 : 8;
    const pageStyle = getComputedStyle(page),
      rect = page.getBoundingClientRect(),
      top = layout.getBoundingClientRect().top;
    const width =
      rect.width -
      parseFloat(pageStyle.paddingLeft) -
      parseFloat(pageStyle.paddingRight) -
      (stacked ? 0 : controls.getBoundingClientRect().width + 8);
    const height =
      window.innerHeight -
      top -
      parseFloat(pageStyle.paddingBottom) -
      (stacked ? controls.getBoundingClientRect().height + 8 : 0);
    const style = getComputedStyle($('puzzleFrame')),
      row = parseFloat(style.getPropertyValue('--row-clue')),
      col = parseFloat(style.getPropertyValue('--col-clue'));
    const edge = Math.max(
      80,
      Math.floor(
        Math.min(width - row - pad * 2 - 2, height - col - pad * 2 - 2),
      ),
    );
    $('puzzleFrame').style.setProperty('--board-edge', `${edge}px`);
  }
  window.addEventListener('resize', () => {
    updateClueGeometry();
    fitBoard();
  });
  function buildClues() {
    rowCluesEl.replaceChildren();
    colCluesEl.replaceChildren();
    puzzle.clues.rows.forEach((clue, r) => {
      const el = document.createElement('div');
      el.className = 'row-clue';
      el.dataset.row = r;
      el.innerHTML = clue.map((n) => `<span>${n}</span>`).join('');
      rowCluesEl.appendChild(el);
    });
    puzzle.clues.cols.forEach((clue, c) => {
      const el = document.createElement('div');
      el.className = 'col-clue';
      el.dataset.col = c;
      el.innerHTML = clue.map((n) => `<span>${n}</span>`).join('');
      colCluesEl.appendChild(el);
    });
  }
  function buildBoard() {
    boardEl.replaceChildren();
    boardEl.style.setProperty('--size', size);
    $('puzzleFrame').style.setProperty('--size', size);
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute(
          'aria-label',
          `Row ${r + 1}, column ${c + 1}${isGiven(r, c) ? ', locked starter' : ''}`,
        );
        cell.classList.toggle('given', isGiven(r, c));
        cell.setAttribute('aria-disabled', String(isGiven(r, c)));
        if ((c + 1) % 5 === 0 && c < size - 1)
          cell.classList.add('major-right');
        if ((r + 1) % 5 === 0 && r < size - 1)
          cell.classList.add('major-bottom');
        boardEl.appendChild(cell);
      }
  }
  function render() {
    [...boardEl.children].forEach((cell, index) => {
      const r = Math.floor(index / size),
        c = index % size,
        value = board[r][c];
      cell.classList.toggle('filled', value === R.FILLED);
      cell.classList.toggle('marked', value === R.MARKED);
      cell.classList.toggle('cursor', r === cursor.r && c === cursor.c);
      cell.tabIndex = r === cursor.r && c === cursor.c ? 0 : -1;
      cell.setAttribute(
        'aria-label',
        `Row ${r + 1}, column ${c + 1}: ${value === R.FILLED ? 'filled' : value === R.MARKED ? 'marked empty' : 'unknown'}${isGiven(r, c) ? ', locked starter' : ''}`,
      );
      cell.setAttribute(
        'aria-pressed',
        value === R.UNKNOWN ? 'false' : value === R.FILLED ? 'true' : 'mixed',
      );
    });
    [...rowCluesEl.children].forEach((el, r) =>
      el.classList.toggle(
        'complete',
        lineMatches(board[r], puzzle.clues.rows[r]),
      ),
    );
    [...colCluesEl.children].forEach((el, c) =>
      el.classList.toggle(
        'complete',
        lineMatches(
          board.map((row) => row[c]),
          puzzle.clues.cols[c],
        ),
      ),
    );
    $('mistakes').textContent = `${mistakes} / 3`;
    $('undoButton').disabled = !active || !history.length;
    $('modeFill').classList.toggle('active', mode === R.FILLED);
    $('modeMark').classList.toggle('active', mode === R.MARKED);
    $('modeFill').setAttribute('aria-pressed', String(mode === R.FILLED));
    $('modeMark').setAttribute('aria-pressed', String(mode === R.MARKED));
    const best = bests[bestKey()];
    $('best').textContent = best ? formatTime(best) : '--:--';
  }
  function isGiven(r, c) {
    return puzzle.givens.some((g) => g.r === r && g.c === c);
  }
  function applyGivens() {
    for (const g of puzzle.givens)
      board[g.r][g.c] = g.value ? R.FILLED : R.MARKED;
  }
  function snapshot() {
    history.push({ board: board.map((row) => row.slice()), mistakes });
    if (history.length > 100) history.shift();
  }
  function paint(r, c, value, fromDrag = false) {
    if (
      !canPlay() ||
      r < 0 ||
      c < 0 ||
      r >= size ||
      c >= size ||
      isGiven(r, c) ||
      board[r][c] === value
    )
      return;
    if (!fromDrag) snapshot();
    board[r][c] = value;
    cursor = { r, c };
    const wrong =
      (value === R.FILLED) !== Boolean(puzzle.solution[r][c]) &&
      value !== R.UNKNOWN;
    if (wrong) {
      mistakes++;
      const cell = boardEl.children[r * size + c];
      cell.classList.add('error');
      setTimeout(() => cell.classList.remove('error'), 360);
    }
    render();
    if (mistakes >= 3) {
      finish(false);
      return;
    }
    if (R.isSolved(board, puzzle.solution)) {
      finish(true);
      return;
    }
    saveGame();
  }
  function cellFromEvent(event) {
    const el = event.target.closest?.('.cell');
    return el
      ? { r: Number(el.dataset.row), c: Number(el.dataset.col), el }
      : null;
  }
  function setMode(next) {
    if (!canPlay()) return;
    endDrag();
    mode = next;
    render();
  }
  function progressFor(currentSize = size) {
    const list = R.listPuzzles(currentSize);
    return {
      done: list.filter((item) => completed.has(`${currentSize}-${item.name}`))
        .length,
      total: list.length,
    };
  }
  function updateProgress() {
    const progress = progressFor();
    const text = `${size}×${size} PACK · ${progress.done} / ${progress.total}`;
    $('progressSummary').textContent = text;
    $('galleryProgress').textContent =
      `${progress.done} / ${progress.total} COMPLETE`;
  }
  function previewNode(item, done = false) {
    const preview = document.createElement('span');
    preview.className = 'pixel-preview';
    preview.style.gridTemplateColumns = `repeat(${item.size},1fr)`;
    preview.style.gridTemplateRows = `repeat(${item.size},1fr)`;
    item.solution.flat().forEach((value) => {
      const pixel = document.createElement('i');
      if (done && value) pixel.classList.add('on');
      preview.appendChild(pixel);
    });
    return preview;
  }
  function renderLevelGrid() {
    const list = R.listPuzzles(size),
      grid = $('levelGrid');
    grid.replaceChildren();
    list.forEach((item, index) => {
      const key = `${size}-${item.name}`,
        done = completed.has(key),
        saved = saves[key],
        inProgress = !done && saved && Array.isArray(saved.board),
        card = document.createElement('button');
      card.type = 'button';
      card.className = 'level-card';
      card.classList.toggle('completed', done);
      card.classList.toggle('in-progress', Boolean(inProgress));
      card.classList.toggle('current', index === puzzleIndex);
      card.appendChild(previewNode(item, done));
      const title = document.createElement('strong');
      title.textContent = `${String(index + 1).padStart(2, '0')} / ${item.name}`;
      card.appendChild(title);
      const detail = document.createElement('small');
      const handled = inProgress
        ? saved.board.flat().filter((value) => value !== R.UNKNOWN).length
        : 0;
      const percent = inProgress
        ? Math.round((handled / (item.size * item.size)) * 100)
        : 0;
      detail.textContent = done
        ? bests[key]
          ? `BEST ${formatTime(bests[key])}`
          : 'COMPLETE'
        : inProgress
          ? `IN PROGRESS · ${percent}%`
          : 'NOT STARTED';
      card.appendChild(detail);
      const check = document.createElement('span');
      check.className = 'check';
      check.textContent = '✓';
      card.appendChild(check);
      card.addEventListener('click', () => {
        saveGame();
        puzzleIndex = index;
        $('puzzleSelect').value = String(index);
        closeLevels();
        start();
      });
      grid.appendChild(card);
    });
    updateProgress();
  }
  let levelOpener = null;
  function openLevels() {
    endDrag();
    levelOpener = document.activeElement;
    renderLevelGrid();
    $('levelOverlay').classList.add('show');
    $('levelOverlay').setAttribute('aria-hidden', 'false');
    $('gamePage').inert = true;
    $('closeLevels').focus?.();
    syncClock();
    saveGame();
  }
  function closeLevels() {
    $('levelOverlay').classList.remove('show');
    $('levelOverlay').setAttribute('aria-hidden', 'true');
    $('gamePage').inert = false;
    (levelOpener || $('levelButton')).focus?.();
    syncClock();
  }
  function trapTab(event, dialog) {
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) return;
    const first = buttons[0],
      last = buttons[buttons.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !dialog.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !dialog.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  function populatePuzzles() {
    const list = R.listPuzzles(size);
    $('puzzleSelect').replaceChildren();
    list.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${String(index + 1).padStart(2, '0')} / ${item.name}`;
      $('puzzleSelect').appendChild(option);
    });
    puzzleIndex = Math.min(puzzleIndex, list.length - 1);
    $('puzzleSelect').value = String(puzzleIndex);
    renderLevelGrid();
  }
  const pendingTimeouts = new Set();
  function later(fn, ms) {
    const id = setTimeout(() => {
      pendingTimeouts.delete(id);
      fn();
    }, ms);
    pendingTimeouts.add(id);
    return id;
  }
  function cancelEffects() {
    for (const id of pendingTimeouts) clearTimeout(id);
    pendingTimeouts.clear();
    endDrag();
  }
  function start(fresh = false) {
    cancelEffects();
    size = Number($('sizeSelect').value);
    puzzleIndex = Number($('puzzleSelect').value || 0);
    puzzle = R.getPuzzle(size, puzzleIndex);
    board = R.emptyBoard(size);
    history = [];
    mistakes = 0;
    active = true;
    paused = false;
    elapsedMs = 0;
    cursor = { r: 0, c: 0 };
    startedAt = Date.now();
    $('pauseOverlay').classList.remove('show');
    $('pauseOverlay').setAttribute('aria-hidden', 'true');
    if (fresh) clearSavedGame();
    else loadSavedGame();
    applyGivens();
    clearInterval(timer);
    timer = null;
    syncClock();
    $('resultOverlay').classList.remove('show');
    $('resultOverlay').setAttribute('aria-hidden', 'true');
    boardEl.inert = false;
    $('revealName').classList.remove('show');
    updateClueGeometry();
    buildClues();
    buildBoard();
    render();
    fitBoard();
    writeStored('nonogram-last-played', {
      size,
      index: puzzleIndex,
      name: puzzle.name,
    });
    renderLevelGrid();
    if (mistakes >= 3) finish(false);
    else if (R.isSolved(board, puzzle.solution)) finish(true);
  }
  function showResultOverlay() {
    $('revealName').classList.remove('show');
    $('resultOverlay').classList.add('show');
    $('resultOverlay').setAttribute('aria-hidden', 'false');
    boardEl.inert = true;
    $('resultButton').focus?.();
  }
  function playCompletionAnimation() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      showResultOverlay();
      return;
    }
    const cells = [...boardEl.children],
      filled = [];
    cells.forEach((cell, index) => {
      cell.classList.remove('cursor', 'marked', 'reveal');
      if (puzzle.solution[Math.floor(index / size)][index % size])
        filled.push({ cell, index });
    });
    const delayStep = size <= 5 ? 55 : size <= 10 ? 24 : 12;
    filled
      .sort((a, b) => {
        const ar = Math.floor(a.index / size),
          ac = a.index % size,
          br = Math.floor(b.index / size),
          bc = b.index % size;
        return ar + ac - (br + bc) || ar - br || ac - bc;
      })
      .forEach(({ cell }, order) => {
        cell.style.setProperty('--reveal-delay', `${order * delayStep}ms`);
        cell.classList.add('filled', 'reveal');
      });
    const finalDelay = Math.max(300, filled.length * delayStep + 260);
    const name = $('revealName');
    name.querySelector('b').textContent = puzzle.name;
    later(() => name.classList.add('show'), finalDelay);
    later(showResultOverlay, finalDelay + 1450);
  }
  function finish(won) {
    stopClock();
    active = false;
    endDrag();
    syncClock();
    const elapsed = Math.max(1, elapsedSeconds());
    $('resultTitle').textContent = won ? 'PICTURE COMPLETE' : 'PUZZLE FAILED';
    $('resultText').textContent = won
      ? `${puzzle.name} · ${formatTime(elapsed)}`
      : 'THREE INCORRECT CELLS';
    $('resultButton').textContent = won ? 'NEXT PUZZLE' : 'TRY AGAIN';
    if (won) {
      completed.add(bestKey());
      saveCompleted();
      if (!bests[bestKey()] || elapsed < bests[bestKey()]) {
        bests[bestKey()] = elapsed;
        writeStored('nonogram-bests', bests);
      }
      clearSavedGame();
      renderLevelGrid();
      render();
      playCompletionAnimation();
    } else {
      saveGame();
      showResultOverlay();
      renderLevelGrid();
      render();
    }
  }
  function nextPuzzle() {
    if ($('resultTitle').textContent === 'PICTURE COMPLETE') {
      const count = R.listPuzzles(size).length;
      puzzleIndex = (puzzleIndex + 1) % count;
      $('puzzleSelect').value = String(puzzleIndex);
      start();
    } else resetCurrent(true);
  }
  function undo() {
    if (!canPlay()) return;
    endDrag();
    const state = history.pop();
    if (!state) return;
    board = state.board;
    mistakes = state.mistakes;
    active = true;
    $('resultOverlay').classList.remove('show');
    render();
    saveGame();
  }
  function hint() {
    if (!canPlay()) return;
    endDrag();
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++) {
        const correct = puzzle.solution[r][c] ? R.FILLED : R.MARKED;
        if (board[r][c] !== correct) {
          snapshot();
          board[r][c] = correct;
          cursor = { r, c };
          render();
          if (R.isSolved(board, puzzle.solution)) finish(true);
          else saveGame();
          return;
        }
      }
  }
  function resetCurrent(force = false) {
    if (
      !force &&
      active &&
      board.some((row, r) =>
        row.some((v, c) => v !== R.UNKNOWN && !isGiven(r, c)),
      ) &&
      window.confirm &&
      !window.confirm(
        'Reset this attempt? Completed puzzles and best times will stay saved.',
      )
    )
      return;
    clearSavedGame();
    start(true);
  }
  boardEl.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    const hit = cellFromEvent(event);
    if (hit)
      paint(hit.r, hit.c, board[hit.r][hit.c] === mode ? R.UNKNOWN : mode);
  });
  boardEl.addEventListener('contextmenu', (event) => event.preventDefault());
  boardEl.addEventListener('pointerdown', (event) => {
    const hit = cellFromEvent(event);
    if (
      !hit ||
      !canPlay() ||
      drag ||
      event.isPrimary === false ||
      ![0, 2].includes(event.button) ||
      isGiven(hit.r, hit.c)
    )
      return;
    event.preventDefault();
    boardEl.setPointerCapture?.(event.pointerId);
    const chosen = event.button === 2 ? R.MARKED : mode,
      value = board[hit.r][hit.c] === chosen ? R.UNKNOWN : chosen;
    drag = { pointerId: event.pointerId, value, last: `${hit.r},${hit.c}` };
    snapshot();
    hit.el.focus?.();
    paint(hit.r, hit.c, value, true);
  });
  boardEl.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = boardEl.getBoundingClientRect();
    const r = Math.floor(((event.clientY - rect.top) / rect.height) * size),
      c = Math.floor(((event.clientX - rect.left) / rect.width) * size);
    if (r < 0 || c < 0 || r >= size || c >= size) {
      drag.last = null;
      return;
    }
    const from = drag.last ? drag.last.split(',').map(Number) : [r, c],
      steps = Math.max(Math.abs(r - from[0]), Math.abs(c - from[1]));
    for (let i = steps ? 1 : 0; i <= steps && active; i++) {
      const rr = steps ? Math.round(from[0] + ((r - from[0]) * i) / steps) : r,
        cc = steps ? Math.round(from[1] + ((c - from[1]) * i) / steps) : c;
      paint(rr, cc, drag.value, true);
    }
    if (drag) drag.last = `${r},${c}`;
  });
  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const id = drag.pointerId;
    drag = null;
    try {
      if (boardEl.hasPointerCapture?.(id)) boardEl.releasePointerCapture(id);
    } catch {}
  }
  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);
  boardEl.addEventListener('lostpointercapture', endDrag);
  $('pauseButton').addEventListener('click', () =>
    paused ? resume() : pause(),
  );
  $('resumeButton').addEventListener('click', resume);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else syncClock();
  });
  window.addEventListener('blur', pause);
  window.addEventListener('pagehide', () => {
    stopClock();
    saveGame();
    cancelEffects();
  });
  window.addEventListener('game-data-clearing', () => {
    clearing = true;
    stopClock();
    cancelEffects();
    active = false;
  });
  $('modeFill').addEventListener('click', () => {
    setMode(R.FILLED);
    saveGame();
  });
  $('modeMark').addEventListener('click', () => {
    setMode(R.MARKED);
    saveGame();
  });
  $('undoButton').addEventListener('click', undo);
  $('hintButton').addEventListener('click', hint);
  $('resetButton').addEventListener('click', () => resetCurrent());
  $('newButton').addEventListener('click', () => resetCurrent());
  $('resultButton').addEventListener('click', nextPuzzle);
  $('levelButton').addEventListener('click', openLevels);
  $('progressSummary').addEventListener('click', openLevels);
  $('closeLevels').addEventListener('click', closeLevels);
  $('levelOverlay').addEventListener('click', (event) => {
    if (event.target === $('levelOverlay')) closeLevels();
  });
  $('puzzleSelect').addEventListener('change', () => {
    saveGame();
    puzzleIndex = Number($('puzzleSelect').value);
    start();
    renderLevelGrid();
  });
  $('sizeSelect').addEventListener('change', () => {
    saveGame();
    size = Number($('sizeSelect').value);
    puzzleIndex = 0;
    populatePuzzles();
    start();
  });
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ($('levelOverlay').classList.contains('show')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLevels();
      } else trapTab(event, $('levelOverlay'));
      return;
    }
    if ($('resultOverlay').classList.contains('show')) {
      trapTab(event, $('resultOverlay'));
      return;
    }
    if ($('pauseOverlay').classList.contains('show')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        resume();
      } else trapTab(event, $('pauseOverlay'));
      return;
    }
    if (event.key === 'Escape' && active) {
      event.preventDefault();
      pause();
      return;
    }
    if (
      !canPlay() ||
      event.repeat ||
      event.target.closest?.('input,select,textarea,[contenteditable]')
    )
      return;
    if (event.target.closest?.('button') && !event.target.closest?.('.cell'))
      return;
    const focusedCell=cellFromEvent(event);
    if(focusedCell)cursor={r:focusedCell.r,c:focusedCell.c};
    const key = event.key.toLowerCase();
    if (key === 'f') {
      setMode(R.FILLED);
      saveGame();
    } else if (key === 'x') {
      setMode(R.MARKED);
      saveGame();
    } else if (key === 'u') undo();
    else if (key === 'h') hint();
    else if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault();
      cursor.r = Math.max(
        0,
        Math.min(
          size - 1,
          cursor.r +
            (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0),
        ),
      );
      cursor.c = Math.max(
        0,
        Math.min(
          size - 1,
          cursor.c +
            (event.key === 'ArrowRight'
              ? 1
              : event.key === 'ArrowLeft'
                ? -1
                : 0),
        ),
      );
      render();
      boardEl.children[cursor.r * size + cursor.c].focus?.();
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      paint(
        cursor.r,
        cursor.c,
        board[cursor.r][cursor.c] === mode ? R.UNKNOWN : mode,
      );
    }
  });
  function dockUtilities() {
    const clear = document.querySelector?.('.clear-data-toggle');
    if (clear) $('utilityDock').appendChild(clear);
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', dockUtilities, {
      once: true,
    });
  else dockUtilities();
  const last = readStored('nonogram-last-played', null);
  if (last && [5, 10, 15].includes(Number(last.size))) {
    size = Number(last.size);
    const list = R.listPuzzles(size),
      byName = list.findIndex((p) => p.name === last.name);
    puzzleIndex =
      byName >= 0
        ? byName
        : Number.isInteger(last.index) &&
            last.index >= 0 &&
            last.index < list.length
          ? last.index
          : 0;
    $('sizeSelect').value = String(size);
  }
  size = Number($('sizeSelect').value);
  populatePuzzles();
  $('puzzleSelect').value = String(puzzleIndex);
  start();
})();
