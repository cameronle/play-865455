(() => {
  'use strict';

  const route = location.pathname.split('/').filter(Boolean)[0] || '';
  const rules = {
    '2048': ['play-2048-best'],
    breakout: ['breakout-high'],
    bridges: ['bridges-progress-v1'],
    'bubble-shooter': ['bubble-shooter-best'],
    'color-bounce': ['color-bounce-best-v1'],
    'connect-four': ['connectFourRecord'],
    crosswalk: ['crosswalk-progress-v2'],
    'endless-runner': ['endlessRunnerBest'],
    flappy: ['flappy-best-v1'],
    flow: ['flow-progress-v1'],
    gomoku: ['gomoku-stats-v3'],
    'helicopter-cave': ['helicopterCaveBest'],
    'lunar-lander': ['lunarLanderBest'],
    maze: ['maze-high'],
    minesweeper: ['minesweeper-'],
    nonogram: ['nonogram-'],
    pong: ['pongMatchWins'],
    shooter: ['sky-patrol-best'],
    simon: ['signalEchoBest'],
    'sky-hopper': ['skyHopperBest'],
    'sliding-puzzle': ['sliding-puzzle-best-v1'],
    snake: ['classic-snake-high-score'],
    sokoban: ['sokoban'],
    solitaire: ['solitaire-wins', 'solitaire-best'],
    'space-invaders': ['invaders-high'],
    sudoku: ['sudokuBest-'],
    tetris: ['classic-tetris-high-score']
  };

  function matches(key, rule) {
    return rule.endsWith('-') ? key.startsWith(rule) : key === rule || (rule === 'sokoban' && key.startsWith('sokoban'));
  }

  function savedKeys() {
    const routeRules = rules[route] || [];
    return Object.keys(localStorage).filter(key => routeRules.some(rule => matches(key, rule)));
  }

  async function clearGameData(button) {
    if (!window.confirm('Clear saved data for this game and reload?')) return;
    button.disabled = true;

    for (const key of savedKeys()) localStorage.removeItem(key);
    try { sessionStorage.clear(); } catch (_) {}

    // Clear Cache Storage too, if a browser or future service worker created one.
    try {
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
    } catch (_) {}

    location.reload();
  }

  function install() {
    if (!rules[route] || document.querySelector('.clear-data-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'clear-data-toggle';
    button.textContent = 'CLEAR';
    button.title = 'Clear saved data for this game';
    button.setAttribute('aria-label', 'Clear saved data for this game and reload');
    button.addEventListener('click', () => clearGameData(button));
    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once: true});
  else install();
})();
