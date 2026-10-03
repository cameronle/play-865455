(() => {
  'use strict';
  const { newBoard, play, outcome, pickMove, winningLine } = window.GomokuRules;
  const SIZE = 15, CANVAS = 750, EDGE = 42, STEP = (CANVAS - EDGE * 2) / (SIZE - 1);
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  let board = newBoard(), phase = 'idle', waiting = false, snapshots = [], last = null, timer = null, gesture = null, generation = 0, cursor = { row: 7, col: 7 }, keyboardCursor = false, pendingLevel = 'normal', winning = [];
  let stats = readStats();

  function readStats() {
    try {
      const loaded = JSON.parse(localStorage.getItem('gomoku-stats-v3')) || {};
      const clean = {};
      for (const key of ['win', 'loss', 'draw']) clean[key] = Number.isSafeInteger(loaded[key]) && loaded[key] >= 0 ? loaded[key] : 0;
      return clean;
    }
    catch (_) { return { win: 0, loss: 0, draw: 0 }; }
  }
  function paintStats() {
    const format = value => value < 1000 ? value : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    $('winCount').textContent = format(stats.win); $('lossCount').textContent = format(stats.loss); $('drawCount').textContent = format(stats.draw);
    $('recordSummary').setAttribute('aria-label', `${stats.win} wins, ${stats.loss} losses, ${stats.draw} draws`);
    try { localStorage.setItem('gomoku-stats-v3', JSON.stringify(stats)); } catch (_) {}
  }
  function status(text, stone) {
    $('statusText').textContent = text;
    $('turnStone').className = stone === 2 ? 'white' : 'black';
    canvas.setAttribute('aria-label', `15 by 15 Gomoku board. Selected ${String.fromCharCode(65 + cursor.col)}${cursor.row + 1}. ${text}`);
  }
  function overlay(title, text, button) {
    $('curtainTitle').textContent = title; $('curtainText').textContent = text; $('start').textContent = button;
    $('curtain').classList.remove('hidden'); $('review').hidden = phase !== 'over'; $('start').focus({ preventScroll: true });
  }
  function cancelCpu() { clearTimeout(timer); timer = null; generation++; }
  function begin() {
    cancelCpu(); clearGesture(); board = newBoard(); phase = 'play'; waiting = false; snapshots = []; last = null; cursor = { row: 7, col: 7 }; keyboardCursor = false; winning = [];
    $('curtain').classList.add('hidden'); $('level').disabled = false; $('undo').disabled = true; status('YOUR TURN', 1); render(); canvas.focus({ preventScroll: true });
  }
  function end(result) {
    cancelCpu(); clearGesture(); phase = 'over'; waiting = false; $('level').disabled = false; $('undo').disabled = true;
    if (result === 'human') { stats.win = Math.min(Number.MAX_SAFE_INTEGER, stats.win + 1); status('YOU WIN', 1); overlay('BLACK WINS', 'You connected five stones first.', 'PLAY AGAIN'); }
    else if (result === 'cpu') { stats.loss = Math.min(Number.MAX_SAFE_INTEGER, stats.loss + 1); status('CPU WINS', 2); overlay('WHITE WINS', 'The computer connected five stones first.', 'TRY AGAIN'); }
    else { stats.draw = Math.min(Number.MAX_SAFE_INTEGER, stats.draw + 1); status('DRAW', 1); overlay('DRAW', 'The board is full. No winner this time.', 'PLAY AGAIN'); }
    winning = last ? winningLine(board, last.row, last.col, last.stone) : []; paintStats(); render();
  }
  function human(row, col) {
    if (phase !== 'play' || waiting) return;
    const previous = { board: board.map(line => line.slice()), last: last ? { ...last } : null, cursor: { ...cursor } };
    if (!play(board, row, col, 1)) return;
    snapshots.push(previous);
    cursor = { row, col }; last = { row, col, stone: 1 }; render();
    const result = outcome(board, row, col, 1); if (result) return end(result);
    waiting = true; $('undo').disabled = false; status('CPU THINKING…', 2);
    pendingLevel = $('level').value; $('level').disabled = true; scheduleCpu();
  }
  function scheduleCpu() {
    if (document.hidden) return;
    const ticket = ++generation;
    timer = setTimeout(() => { if (ticket !== generation || !waiting) return; timer = null; if (!document.hidden) cpu(); }, 280);
  }
  function cpu() {
    if (phase !== 'play' || !waiting) return;
    const move = pickMove(board, pendingLevel);
    if (!move) return end('draw');
    play(board, move.row, move.col, 2); last = { ...move, stone: 2 }; waiting = false; $('level').disabled = false; render();
    const result = outcome(board, move.row, move.col, 2); if (result) return end(result);
    status('YOUR TURN', 1); $('undo').disabled = snapshots.length === 0;
  }
  function undo() {
    if (phase !== 'play' || !snapshots.length) return;
    cancelCpu(); waiting = false; $('level').disabled = false; clearGesture();
    const previous = snapshots.pop(); board = previous.board; last = previous.last; cursor = previous.cursor; $('undo').disabled = snapshots.length === 0; status('YOUR TURN', 1); render();
  }
  function locate(event) {
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) * CANVAS / box.width, y = (event.clientY - box.top) * CANVAS / box.height;
    const col = Math.round((x - EDGE) / STEP), row = Math.round((y - EDGE) / STEP);
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    return { row, col };
  }
  function drawBoard() {
    ctx.fillStyle = '#d2a35f'; ctx.fillRect(0, 0, CANVAS, CANVAS); ctx.strokeStyle = '#67431f'; ctx.lineWidth = 1.5;
    for (let i = 0; i < SIZE; i++) { const p = EDGE + i * STEP; ctx.beginPath(); ctx.moveTo(EDGE, p); ctx.lineTo(CANVAS - EDGE, p); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p, EDGE); ctx.lineTo(p, CANVAS - EDGE); ctx.stroke(); }
    for (const row of [3, 7, 11]) for (const col of [3, 7, 11]) { ctx.beginPath(); ctx.arc(EDGE + col * STEP, EDGE + row * STEP, 4.7, 0, Math.PI * 2); ctx.fillStyle = '#5a3718'; ctx.fill(); }
  }
  function drawStone(row, col, stone) {
    const x = EDGE + col * STEP, y = EDGE + row * STEP, radius = STEP * .43;
    ctx.fillStyle = stone === 1 ? '#17191c' : '#f2eee6'; ctx.strokeStyle = stone === 1 ? '#050607' : '#9c9488'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  function render() {
    $('moveCount').textContent = board.flat().filter(Boolean).length;
    canvas.setAttribute('aria-label', `15 by 15 Gomoku board. Selected ${String.fromCharCode(65 + cursor.col)}${cursor.row + 1}. ${$('statusText').textContent}`);
    drawBoard();
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) if (board[row][col]) drawStone(row, col, board[row][col]);
    if (keyboardCursor && phase === 'play') { ctx.strokeStyle = '#174c50'; ctx.lineWidth = 3; ctx.strokeRect(EDGE + cursor.col * STEP - STEP * .46, EDGE + cursor.row * STEP - STEP * .46, STEP * .92, STEP * .92); }
    for (const cell of winning) { ctx.strokeStyle = '#174c50'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(EDGE + cell.col * STEP, EDGE + cell.row * STEP, STEP * .47, 0, Math.PI * 2); ctx.stroke(); }
    if (last) { ctx.fillStyle = last.stone === 1 ? '#ff8b69' : '#b2322a'; ctx.beginPath(); ctx.arc(EDGE + last.col * STEP, EDGE + last.row * STEP, 5.5, 0, Math.PI * 2); ctx.fill(); }
  }

  function clearGesture() {
    const held = gesture; gesture = null;
    if (held) try { if (canvas.hasPointerCapture?.(held.id)) canvas.releasePointerCapture(held.id); } catch (_) {}
  }
  canvas.addEventListener('pointerdown', event => {
    if (phase !== 'play' || waiting || gesture || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    event.preventDefault(); const spot = locate(event);
    if (!spot || board[spot.row][spot.col]) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, spot, moved: false };
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    event.preventDefault(); if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 10) gesture.moved = true;
  });
  canvas.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    event.preventDefault(); const held = gesture, spot = locate(event); clearGesture();
    if (!held.moved && Math.hypot(event.clientX - held.x, event.clientY - held.y) <= 10 && spot && spot.row === held.spot.row && spot.col === held.spot.col) human(spot.row, spot.col);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(type, event => {
    if (gesture?.id === event.pointerId) { event.preventDefault(); clearGesture(); }
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('keydown', event => {
    if (phase !== 'play') return;
    const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (directions[event.key]) {
      event.preventDefault(); keyboardCursor = true;
      const [dr, dc] = directions[event.key]; cursor = { row: Math.max(0, Math.min(SIZE - 1, cursor.row + dr)), col: Math.max(0, Math.min(SIZE - 1, cursor.col + dc)) }; render();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); if (!event.repeat) human(cursor.row, cursor.col);
    } else if (event.key.toLowerCase() === 'u' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z')) {
      event.preventDefault(); if (!event.repeat) undo();
    }
  });
  document.addEventListener('visibilitychange', () => {
    clearGesture();
    if (document.hidden) cancelCpu();
    else if (phase === 'play' && waiting && timer === null) scheduleCpu();
  });
  window.addEventListener('blur', clearGesture);
  window.addEventListener('resize', clearGesture);
  $('review').addEventListener('click', () => { if (phase !== 'over') return; $('curtain').classList.add('hidden'); canvas.focus({ preventScroll: true }); });
  $('start').addEventListener('click', begin); $('restart').addEventListener('click', begin); $('undo').addEventListener('click', undo);
  function dockUtilities() {
    for (const control of document.querySelectorAll('.theme-toggle, .clear-data-toggle')) $('utilityDock').appendChild(control);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dockUtilities); else dockUtilities();
  document.addEventListener('keydown', event => {
    if (phase === 'idle' && !event.repeat && event.key === 'Enter' && ['BODY', 'HTML'].includes(event.target.tagName)) { event.preventDefault(); begin(); }
    if (phase === 'over' && event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  });
  paintStats(); render();
})();
