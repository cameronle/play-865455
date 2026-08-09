(() => {
  'use strict';

  const pads = [...document.querySelectorAll('[data-pad]')];
  const board = document.getElementById('board');
  const startButton = document.getElementById('startButton');
  const strictToggle = document.getElementById('strictMode');
  const scoreDisplay = document.getElementById('score');
  const bestDisplay = document.getElementById('best');
  const statusDisplay = document.getElementById('status');
  const statusLight = document.getElementById('statusLight');

  const frequencies = [329.63, 261.63, 220, 164.81];
  const keyMap = { '1': 0, q: 0, '2': 1, w: 1, '3': 2, a: 2, '4': 3, s: 3 };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  let sequence = [];
  let playerIndex = 0;
  let score = 0;
  let best = Number.parseInt(localStorage.getItem('signalEchoBest') || '0', 10);
  let acceptingInput = false;
  let gameActive = false;
  let runToken = 0;
  let audioContext = null;

  bestDisplay.textContent = formatScore(best);
  setPadsEnabled(false);

  function formatScore(value) {
    return String(value).padStart(2, '0');
  }

  function setStatus(message, state = '') {
    statusDisplay.textContent = message;
    statusLight.className = `status-light${state ? ` ${state}` : ''}`;
  }

  function setPadsEnabled(enabled) {
    pads.forEach(pad => { pad.disabled = !enabled; });
  }

  function ensureAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
  }

  function playTone(index, duration = 240, error = false) {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = error ? 'sawtooth' : 'square';
    oscillator.frequency.setValueAtTime(error ? 85 : frequencies[index], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(error ? 0.12 : 0.075, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration / 1000 + 0.02);
  }

  async function flashPad(index, duration = 330, token = runToken) {
    const pad = pads[index];
    pad.classList.add('active');
    playTone(index, duration);
    await wait(duration);
    if (token === runToken) pad.classList.remove('active');
  }

  async function playSequence(token = runToken) {
    acceptingInput = false;
    setPadsEnabled(false);
    setStatus('LISTEN', 'live');
    await wait(450);

    const speed = Math.max(190, 480 - sequence.length * 18);
    for (const padIndex of sequence) {
      if (token !== runToken) return;
      await flashPad(padIndex, speed, token);
      await wait(Math.max(75, speed * 0.28));
    }

    if (token !== runToken) return;
    playerIndex = 0;
    acceptingInput = true;
    setPadsEnabled(true);
    setStatus('YOUR TURN', 'live');
  }

  async function nextRound(token = runToken) {
    if (token !== runToken || !gameActive) return;
    sequence.push(Math.floor(Math.random() * 4));
    score = sequence.length - 1;
    scoreDisplay.textContent = formatScore(score);
    await playSequence(token);
  }

  async function startGame() {
    ensureAudio();
    runToken += 1;
    const token = runToken;
    sequence = [];
    playerIndex = 0;
    score = 0;
    gameActive = true;
    acceptingInput = false;
    scoreDisplay.textContent = '00';
    startButton.textContent = 'RESTART SIGNAL';
    strictToggle.disabled = true;
    setStatus('SYNCING', 'live');
    clearPadLights();
    await wait(350);
    await nextRound(token);
  }

  async function handlePad(index) {
    if (!gameActive || !acceptingInput) return;
    ensureAudio();
    acceptingInput = false;
    const token = runToken;
    await flashPad(index, 180, token);
    if (token !== runToken) return;

    if (index !== sequence[playerIndex]) {
      await handleMistake(token);
      return;
    }

    playerIndex += 1;
    if (playerIndex === sequence.length) {
      score = sequence.length;
      scoreDisplay.textContent = formatScore(score);
      updateBest(score);
      setStatus('SEQUENCE CLEAR', 'live');
      await wait(650);
      await nextRound(token);
    } else {
      acceptingInput = true;
      setPadsEnabled(true);
      setStatus(`${playerIndex}/${sequence.length}`, 'live');
    }
  }

  async function handleMistake(token) {
    acceptingInput = false;
    setPadsEnabled(false);
    setStatus('SIGNAL LOST', 'error');
    playTone(0, 520, true);
    board.classList.add('error');
    pads.forEach(pad => pad.classList.add('active'));
    await wait(420);
    clearPadLights();
    board.classList.remove('error');
    if (token !== runToken) return;

    if (strictToggle.checked) {
      gameActive = false;
      strictToggle.disabled = false;
      startButton.textContent = 'TRY AGAIN';
      setStatus('STRICT FAILURE', 'error');
      return;
    }

    setStatus('REPLAYING');
    await wait(500);
    await playSequence(token);
  }

  function updateBest(value) {
    if (value <= best) return;
    best = value;
    bestDisplay.textContent = formatScore(best);
    try { localStorage.setItem('signalEchoBest', String(best)); } catch (_) { /* storage is optional */ }
  }

  function clearPadLights() {
    pads.forEach(pad => pad.classList.remove('active'));
  }

  pads.forEach(pad => {
    pad.addEventListener('pointerdown', event => {
      event.preventDefault();
      if (pad.setPointerCapture) pad.setPointerCapture(event.pointerId);
      handlePad(Number(pad.dataset.pad));
    });
  });

  startButton.addEventListener('click', startGame);

  strictToggle.addEventListener('change', () => {
    setStatus(strictToggle.checked ? 'STRICT ARMED' : 'STANDBY', strictToggle.checked ? 'error' : '');
  });

  window.addEventListener('keydown', event => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'enter') {
      event.preventDefault();
      startGame();
      return;
    }
    if (Object.hasOwn(keyMap, key)) {
      event.preventDefault();
      handlePad(keyMap[key]);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !gameActive) return;
    runToken += 1;
    gameActive = false;
    acceptingInput = false;
    setPadsEnabled(false);
    clearPadLights();
    strictToggle.disabled = false;
    startButton.textContent = 'RESYNC';
    setStatus('PAUSED');
  });
})();
