(() => {
  'use strict';
  const R = window.ConnectFourRules;
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const turnDot = document.getElementById('turnDot');
  const difficulty = document.getElementById('difficulty');
  const firstPlayer = document.getElementById('firstPlayer');
  const undoButton = document.getElementById('undoButton');
  const newButton = document.getElementById('newButton');
  const columnButtons = [...document.querySelectorAll('[data-column]')];
  const recordEls = ['wins', 'losses', 'draws'].map(id => document.getElementById(id));
  let board, history, turn, busy, over, recorded;
  const record = loadRecord();

  function loadRecord() {
    try { return { wins: 0, losses: 0, draws: 0, ...JSON.parse(localStorage.getItem('connectFourRecord') || '{}') }; }
    catch (_) { return { wins: 0, losses: 0, draws: 0 }; }
  }
  function saveRecord() { localStorage.setItem('connectFourRecord', JSON.stringify(record)); renderRecord(); }
  function renderRecord() { recordEls.forEach((el, i) => { el.textContent = record[['wins', 'losses', 'draws'][i]]; }); }

  function render() {
    boardEl.replaceChildren();
    for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (board[row][col] === 1 ? ' human' : board[row][col] === 2 ? ' computer' : '');
      cell.setAttribute('role', 'gridcell');
      boardEl.appendChild(cell);
    }
    const disabled = busy || over || turn !== 1;
    columnButtons.forEach((button, col) => { button.disabled = disabled || board[0][col] !== 0; });
    undoButton.disabled = busy || history.length === 0;
  }

  function setStatus(message, player = turn) {
    statusEl.textContent = message;
    turnDot.style.background = player === 2 ? 'var(--orange)' : 'var(--cyan)';
    turnDot.style.boxShadow = `0 0 12px ${player === 2 ? 'var(--orange)' : 'var(--cyan)'}`;
  }

  function finish(result) {
    over = true;
    if (result === 1) { setStatus('YOU CONNECTED FOUR', 1); if (!recorded) record.wins++; }
    else if (result === 2) { setStatus('COMPUTER CONNECTED FOUR', 2); if (!recorded) record.losses++; }
    else { setStatus('DRAW — BOARD FULL', 1); if (!recorded) record.draws++; }
    if (!recorded) { recorded = true; saveRecord(); }
    render();
  }

  function boardFull() { return board[0].every(Boolean); }
  function checkEnd() { const result = R.winner(board); if (result) { finish(result); return true; } if (boardFull()) { finish(0); return true; } return false; }

  function humanMove(column) {
    if (busy || over || turn !== 1 || board[0][column] !== 0) return;
    history.push(board.map(row => row.slice()));
    R.drop(board, column, 1);
    render();
    if (checkEnd()) return;
    turn = 2; setStatus('COMPUTER THINKING', 2); render();
    busy = true;
    window.setTimeout(computerMove, 260);
  }

  function computerMove() {
    if (over) return;
    const column = R.chooseMove(board, 2, difficulty.value);
    if (column >= 0) R.drop(board, column, 2);
    busy = false; render();
    if (checkEnd()) return;
    turn = 1; setStatus('YOUR TURN', 1); render();
  }

  function newGame() {
    board = R.createBoard(); history = []; busy = false; over = false; recorded = false;
    turn = firstPlayer.value === 'computer' ? 2 : 1;
    setStatus(turn === 1 ? 'YOUR TURN' : 'COMPUTER OPENS', turn); render();
    if (turn === 2) { busy = true; window.setTimeout(computerMove, 300); }
  }

  function undo() {
    if (busy || history.length === 0) return;
    if (recorded) { const key = R.winner(board) === 1 ? 'wins' : R.winner(board) === 2 ? 'losses' : 'draws'; record[key] = Math.max(0, record[key] - 1); recorded = false; saveRecord(); }
    board = history.pop().map(row => row.slice());
    over = false; turn = 1; setStatus('YOUR TURN', 1); render();
  }

  columnButtons.forEach(button => button.addEventListener('click', () => humanMove(Number(button.dataset.column))));
  boardEl.addEventListener('click', event => { const rect = boardEl.getBoundingClientRect(); humanMove(Math.min(6, Math.max(0, Math.floor((event.clientX - rect.left) / rect.width * 7)))); });
  newButton.addEventListener('click', newGame); undoButton.addEventListener('click', undo);
  difficulty.addEventListener('change', newGame); firstPlayer.addEventListener('change', newGame);
  document.addEventListener('keydown', event => { if (/^[1-7]$/.test(event.key)) humanMove(Number(event.key) - 1); else if (event.key.toLowerCase() === 'u') undo(); else if (event.key.toLowerCase() === 'n') newGame(); });
  renderRecord(); newGame();
})();
