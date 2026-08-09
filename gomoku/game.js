(() => {
  'use strict';

  const { createBoard, placeStone, getResult, chooseComputerMove } = window.GomokuEngine;
  const SIZE = 15;
  const LOGICAL_SIZE = 720;
  const MARGIN = 36;
  const GAP = (LOGICAL_SIZE - MARGIN * 2) / (SIZE - 1);
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);

  let board = createBoard(SIZE);
  let state = 'ready';
  let thinking = false;
  let history = [];
  let lastMove = null;
  let aiTimer = null;
  let record = loadRecord();

  function loadRecord() {
    try {
      return JSON.parse(localStorage.getItem('gomoku-record-v2')) || { wins: 0, losses: 0, draws: 0 };
    } catch (_) {
      return { wins: 0, losses: 0, draws: 0 };
    }
  }

  function saveRecord() {
    localStorage.setItem('gomoku-record-v2', JSON.stringify(record));
    $('wins').textContent = record.wins;
    $('losses').textContent = record.losses;
    $('draws').textContent = record.draws;
  }

  function setStatus(text, color = 'black') {
    $('status').textContent = text;
    $('turnDot').className = `stone ${color}`;
  }

  function showOverlay(title, text, buttonText) {
    $('overlayTitle').textContent = title;
    $('overlayText').textContent = text;
    $('start').textContent = buttonText;
    $('overlay').classList.remove('hidden');
  }

  function hideOverlay() {
    $('overlay').classList.add('hidden');
  }

  function startGame() {
    clearTimeout(aiTimer);
    board = createBoard(SIZE);
    history = [];
    lastMove = null;
    thinking = false;
    state = 'playing';
    setStatus('轮到你落子', 'black');
    $('undo').disabled = true;
    hideOverlay();
    draw();
  }

  function finish(result) {
    state = 'ended';
    thinking = false;
    if (result === 'human') {
      record.wins += 1;
      setStatus('你赢了', 'black');
      showOverlay('黑棋胜', '漂亮！你率先连成了五子。', '再来一局');
    } else if (result === 'computer') {
      record.losses += 1;
      setStatus('电脑获胜', 'white');
      showOverlay('白棋胜', '电脑先连成了五子，再试一次吧。', '重新挑战');
    } else {
      record.draws += 1;
      setStatus('和棋', 'black');
      showOverlay('和棋', '棋盘已满，双方未分胜负。', '再来一局');
    }
    saveRecord();
    $('undo').disabled = true;
  }

  function snapshot() {
    history.push(board.map((row) => row.slice()));
  }

  function humanMove(row, col) {
    if (state !== 'playing' || thinking || board[row][col]) return;
    snapshot();
    if (!placeStone(board, row, col, 1)) return;
    lastMove = { row, col, color: 1 };
    draw();
    const result = getResult(board, row, col, 1);
    if (result) return finish(result);
    thinking = true;
    $('undo').disabled = true;
    setStatus('电脑思考中…', 'white');
    aiTimer = setTimeout(computerMove, 320);
  }

  function computerMove() {
    if (state !== 'playing') return;
    const move = chooseComputerMove(board, $('difficulty').value);
    if (!move) return finish('draw');
    placeStone(board, move.row, move.col, 2);
    lastMove = { ...move, color: 2 };
    thinking = false;
    draw();
    const result = getResult(board, move.row, move.col, 2);
    if (result) return finish(result);
    setStatus('轮到你落子', 'black');
    $('undo').disabled = history.length === 0;
  }

  function undo() {
    if (state !== 'playing' || thinking || history.length === 0) return;
    board = history.pop();
    lastMove = null;
    setStatus('轮到你落子', 'black');
    $('undo').disabled = history.length === 0;
    draw();
  }

  function pointerToCell(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (LOGICAL_SIZE / rect.width);
    const y = (event.clientY - rect.top) * (LOGICAL_SIZE / rect.height);
    const col = Math.round((x - MARGIN) / GAP);
    const row = Math.round((y - MARGIN) / GAP);
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    const snapX = MARGIN + col * GAP;
    const snapY = MARGIN + row * GAP;
    if (Math.hypot(x - snapX, y - snapY) > GAP * 0.48) return null;
    return { row, col };
  }

  function drawBoard() {
    const gradient = ctx.createLinearGradient(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    gradient.addColorStop(0, '#dfb66f');
    gradient.addColorStop(1, '#c18b45');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    ctx.strokeStyle = 'rgba(75,47,23,.82)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < SIZE; i += 1) {
      const p = MARGIN + i * GAP;
      ctx.beginPath(); ctx.moveTo(MARGIN, p); ctx.lineTo(LOGICAL_SIZE - MARGIN, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, MARGIN); ctx.lineTo(p, LOGICAL_SIZE - MARGIN); ctx.stroke();
    }
    for (const row of [3, 7, 11]) for (const col of [3, 7, 11]) {
      ctx.beginPath();
      ctx.arc(MARGIN + col * GAP, MARGIN + row * GAP, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#563719';
      ctx.fill();
    }
  }

  function drawStone(row, col, color) {
    const x = MARGIN + col * GAP;
    const y = MARGIN + row * GAP;
    const radius = GAP * 0.43;
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,4,.45)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 3;
    const gradient = ctx.createRadialGradient(x - radius * .35, y - radius * .4, 2, x, y, radius);
    if (color === 1) {
      gradient.addColorStop(0, '#716b62');
      gradient.addColorStop(.35, '#282521');
      gradient.addColorStop(1, '#050505');
    } else {
      gradient.addColorStop(0, '#fffef7');
      gradient.addColorStop(.58, '#eee5d5');
      gradient.addColorStop(1, '#9c8a70');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLastMarker() {
    if (!lastMove) return;
    const x = MARGIN + lastMove.col * GAP;
    const y = MARGIN + lastMove.row * GAP;
    ctx.strokeStyle = lastMove.color === 1 ? '#f0c97c' : '#a32f27';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x - 6, y - 6, 12, 12);
  }

  function draw() {
    drawBoard();
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) if (board[row][col]) drawStone(row, col, board[row][col]);
    }
    drawLastMarker();
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const cell = pointerToCell(event);
    if (cell) humanMove(cell.row, cell.col);
  });
  $('start').addEventListener('click', startGame);
  $('newGame').addEventListener('click', startGame);
  $('undo').addEventListener('click', undo);
  window.addEventListener('resize', draw);

  saveRecord();
  draw();
})();
