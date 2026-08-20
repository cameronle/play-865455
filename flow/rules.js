(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlowRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function isAdjacent(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function sameCell(a, b) {
    if (!a || !b) return false;
    return a.r === b.r && a.c === b.c;
  }

  function getEndpoint(level, r, c) {
    if (!level || !level.endpoints) return null;
    for (const ep of level.endpoints) {
      if (ep.start[0] === r && ep.start[1] === c) return { color: ep.color, type: 'start', r, c };
      if (ep.end[0] === r && ep.end[1] === c) return { color: ep.color, type: 'end', r, c };
    }
    return null;
  }

  function isPathConnected(endpoint, path) {
    if (!path || path.length < 2) return false;
    const first = path[0];
    const last = path[path.length - 1];
    const s = { r: endpoint.start[0], c: endpoint.start[1] };
    const e = { r: endpoint.end[0], c: endpoint.end[1] };
    return (sameCell(first, s) && sameCell(last, e)) || (sameCell(first, e) && sameCell(last, s));
  }

  function isLevelComplete(level, paths) {
    if (!level || !paths) return false;
    const size = level.size;
    const covered = new Set();

    for (const ep of level.endpoints) {
      const path = paths[ep.color];
      if (!isPathConnected(ep, path)) return false;
      for (let i = 0; i < path.length; i++) {
        const cell = path[i];
        if (cell.r < 0 || cell.r >= size || cell.c < 0 || cell.c >= size) return false;
        if (i > 0 && !isAdjacent(path[i - 1], cell)) return false;
        const key = `${cell.r},${cell.c}`;
        if (covered.has(key)) return false; // overlapping paths
        covered.add(key);
      }
    }

    return covered.size === size * size;
  }

  return {
    isAdjacent,
    sameCell,
    getEndpoint,
    isPathConnected,
    isLevelComplete,
  };
});
