(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CrosswalkRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const BASE_SAFE_ROWS = [1, 5, 8, 10, 11];

  function positiveModulo(value, modulus) {
    return ((value % modulus) + modulus) % modulus;
  }

  function signalState(signal, time) {
    if (!signal) return 'go';
    const cycle = Math.max(0.1, Number(signal.cycle) || 1);
    const go = Math.max(0, Math.min(cycle, Number(signal.go) || 0));
    const phase = Number(signal.phase) || 0;
    return positiveModulo(time + phase, cycle) < go ? 'go' : 'stop';
  }

  function vehicleMotionFactor(lane, time, vehicle = {}) {
    if (vehicle.kind === 'emergency') return lane.pattern === 'jam' ? 0.5 : 1;
    if (signalState(lane.signal, time) === 'stop') return 0;
    if (lane.pattern === 'jam') return 0.42;
    return 1;
  }

  function movingStart(moving, cols, time) {
    const width = Math.max(1, Math.min(cols, Math.floor(moving.width || 1)));
    const maxStart = Math.max(0, cols - width);
    if (!maxStart) return 0;
    const cycle = maxStart * 2;
    const phase = positiveModulo((Number(moving.start) || 0) + time * (Number(moving.speed) || 0), cycle);
    return Math.floor(phase <= maxStart ? phase : cycle - phase);
  }

  function movingSafeColumns(moving, cols, time) {
    const width = Math.max(1, Math.min(cols, Math.floor(moving.width || 1)));
    const start = movingStart(moving, cols, time);
    return Array.from({ length: width }, (_, index) => start + index).filter(col => col >= 0 && col < cols);
  }

  function isMovingSafe(moving, cols, col, time) {
    return movingSafeColumns(moving, cols, time).includes(col);
  }

  function safeRowConfig(level, row) {
    return (level.safeRows || []).find(item => item.row === row) || { row, blocks: [] };
  }

  function isBlockedCell(level, row, col) {
    return safeRowConfig(level, row).blocks.includes(col);
  }

  function isStaticPassable(level, row, col, cols = 9) {
    if (row < 0 || row > 11 || col < 0 || col >= cols) return false;
    if (!BASE_SAFE_ROWS.includes(row)) return true;
    return !isBlockedCell(level, row, col);
  }

  function hasTraversableSafeRows(level, cols = 9) {
    const queue = [{ row: 11, col: Math.floor(cols / 2) }];
    const visited = new Set(['11:' + Math.floor(cols / 2)]);
    while (queue.length) {
      const current = queue.shift();
      if (current.row === 0) return true;
      const neighbors = [
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 },
      ];
      for (const next of neighbors) {
        const key = `${next.row}:${next.col}`;
        if (!visited.has(key) && isStaticPassable(level, next.row, next.col, cols)) {
          visited.add(key);
          queue.push(next);
        }
      }
    }
    return false;
  }

  function isLevelUnlocked(index, completed) {
    if (index === 0) return true;
    return Boolean(completed[index - 1]);
  }

  function completionCount(completed) {
    return completed.filter(Boolean).length;
  }

  function vehicleWidth(kind) {
    return { car: 0.88, bus: 1.95, truck: 2.15, emergency: 1.08 }[kind] || 0.88;
  }

  function wrappedDistance(a, b, width) {
    const direct = Math.abs(a - b);
    return Math.min(direct, width - direct);
  }

  function collides(player, car, boardWidth) {
    return wrappedDistance(player.x, car.x, boardWidth) < car.w / 2 + player.r - 4;
  }

  return {
    BASE_SAFE_ROWS,
    signalState,
    vehicleMotionFactor,
    movingStart,
    movingSafeColumns,
    isMovingSafe,
    safeRowConfig,
    isBlockedCell,
    hasTraversableSafeRows,
    isLevelUnlocked,
    completionCount,
    vehicleWidth,
    wrappedDistance,
    collides,
  };
});
