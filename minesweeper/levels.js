(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MinesweeperLevels = factory();
})(typeof globalThis === 'undefined' ? this : globalThis, function() {
  'use strict';

  const specs = [
    ['EASY', 9, 9, 8], ['EASY', 9, 9, 10], ['EASY', 10, 10, 12], ['EASY', 10, 10, 15], ['EASY', 12, 10, 18],
    ['NORMAL', 12, 12, 20], ['NORMAL', 12, 12, 24], ['NORMAL', 14, 12, 28], ['NORMAL', 14, 14, 34], ['NORMAL', 16, 14, 40],
    ['HARD', 16, 14, 46], ['HARD', 16, 16, 52], ['HARD', 18, 16, 60], ['HARD', 18, 16, 68], ['HARD', 20, 16, 76],
    ['EXPERT', 20, 16, 84], ['EXPERT', 20, 16, 92], ['EXPERT', 22, 16, 100], ['EXPERT', 22, 16, 112], ['EXPERT', 24, 16, 124]
  ];

  const levels = specs.map(function(spec, index) {
    return { id: index + 1, difficulty: spec[0], rows: spec[1], cols: spec[2], mines: spec[3] };
  });

  function isLevelUnlocked(index, completed) {
    return index === 0 || Boolean(completed[index - 1]);
  }

  function completionCount(completed) {
    return completed.filter(Boolean).length;
  }

  return { levels, isLevelUnlocked, completionCount };
});
