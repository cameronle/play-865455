(() => {
  'use strict';
  const { newBoard, play, outcome, pickMove } = window.GomokuRules;
  const SIZE = 15, CANVAS = 750, EDGE = 42, STEP = (CANVAS - EDGE * 2) / (SIZE - 1);
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  let board = newBoard(), phase = 'idle', waiting = false, snapshots = [], last = null, timer = null;
  let stats = readStats();

  function readStats() {
    try { return JSON.parse(localStorage.getItem('gomoku-stats-v3')) || { win: 0, loss: 0, draw: 0 }; }
    catch (_) { return { win: 0, loss: 0, draw: 0 }; }
  }
  function paintStats() {
    $('winCount').textContent = stats.win; $('lossCount').textContent = stats.loss; $('drawCount').textContent = stats.draw;
    localStorage.setItem('gomoku-stats-v3', JSON.stringify(stats));
  }
  function status(text, stone) {
    $('statusText').textContent = text;
    $('turnStone').className = stone === 2 ? 'white' : 'black';
  }
  function overlay(title, text, button) {
    $('curtainTitle').textContent = title; $('curtainText').textContent = text; $('start').textContent = button;
    $('curtain').classList.remove('hidden');
  }
  function begin() {
    clearTimeout(timer); board = newBoard(); phase = 'play'; waiting = false; snapshots = []; last = null;
    $('curtain').classList.add('hidden'); $('undo').disabled = true; status('YOUR TURN', 1); render();
  }
  function end(result) {
    phase = 'over'; waiting = false; $('undo').disabled = true;
    if (result === 'human') { stats.win++; status('YOU WIN', 1); overlay('BLACK WINS', 'You connected five stones first.', 'PLAY AGAIN'); }
    else if (result === 'cpu') { stats.loss++; status('CPU WINS', 2); overlay('WHITE WINS', 'The computer connected five stones first.', 'TRY AGAIN'); }
    else { stats.draw++; status('DRAW', 1); overlay('DRAW', 'The board is full. No winner this time.', 'PLAY AGAIN'); }
    paintStats();
  }
  function human(row, col) {
    if (phase !== 'play' || waiting || board[row][col]) return;
    snapshots.push(board.map(line => line.slice()));
    if (!play(board, row, col, 1)) return;
    last = { row, col, stone: 1 }; render();
    const result = outcome(board, row, col, 1); if (result) return end(result);
    waiting = true; $('undo').disabled = true; status('CPU THINKING…', 2);
    timer = setTimeout(cpu, 280);
  }
  function cpu() {
    if (phase !== 'play') return;
    const move = pickMove(board, $('level').value);
    if (!move) return end('draw');
    play(board, move.row, move.col, 2); last = { ...move, stone: 2 }; waiting = false; render();
    const result = outcome(board, move.row, move.col, 2); if (result) return end(result);
    status('YOUR TURN', 1); $('undo').disabled = snapshots.length === 0;
  }
  function undo() {
    if (phase !== 'play' || waiting || !snapshots.length) return;
    board = snapshots.pop(); last = null; $('undo').disabled = snapshots.length === 0; status('YOUR TURN', 1); render();
  }
  function locate(event) {
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) * CANVAS / box.width, y = (event.clientY - box.top) * CANVAS / box.height;
    const col = Math.round((x - EDGE) / STEP), row = Math.round((y - EDGE) / STEP);
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    if (Math.hypot(x - (EDGE + col * STEP), y - (EDGE + row * STEP)) > STEP * .48) return null;
    return { row, col };
  }
  function drawBoard() {
    const wood = ctx.createLinearGradient(0, 0, CANVAS, CANVAS); wood.addColorStop(0, '#e1b76f'); wood.addColorStop(1, '#c9924b');
    ctx.fillStyle = wood; ctx.fillRect(0, 0, CANVAS, CANVAS); ctx.strokeStyle = '#67431f'; ctx.lineWidth = 1.5;
    for (let i = 0; i < SIZE; i++) { const p = EDGE + i * STEP; ctx.beginPath(); ctx.moveTo(EDGE, p); ctx.lineTo(CANVAS - EDGE, p); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p, EDGE); ctx.lineTo(p, CANVAS - EDGE); ctx.stroke(); }
    for (const row of [3, 7, 11]) for (const col of [3, 7, 11]) { ctx.beginPath(); ctx.arc(EDGE + col * STEP, EDGE + row * STEP, 4.7, 0, Math.PI * 2); ctx.fillStyle = '#5a3718'; ctx.fill(); }
  }
  function drawStone(row, col, stone) {
    const x = EDGE + col * STEP, y = EDGE + row * STEP, radius = STEP * .43;
    ctx.save(); ctx.shadowColor = '#321c0f66'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    const fill = ctx.createRadialGradient(x - radius * .35, y - radius * .38, 2, x, y, radius);
    if (stone === 1) { fill.addColorStop(0, '#777'); fill.addColorStop(.35, '#292724'); fill.addColorStop(1, '#030303'); }
    else { fill.addColorStop(0, '#fff'); fill.addColorStop(.6, '#eee7da'); fill.addColorStop(1, '#9c8d77'); }
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function render() {
    drawBoard();
    for (let row = 0; row < SIZE; row++) for (let col = 0; col < SIZE; col++) if (board[row][col]) drawStone(row, col, board[row][col]);
    if (last) { ctx.fillStyle = '#b2322a'; ctx.beginPath(); ctx.arc(EDGE + last.col * STEP, EDGE + last.row * STEP, 4, 0, Math.PI * 2); ctx.fill(); }
  }

  canvas.addEventListener('pointerdown', event => { event.preventDefault(); const spot = locate(event); if (spot) human(spot.row, spot.col); });
  $('start').addEventListener('click', begin); $('restart').addEventListener('click', begin); $('undo').addEventListener('click', undo);
  paintStats(); render();
})();
