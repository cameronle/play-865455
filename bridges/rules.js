(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BridgesRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function edgeKey(id1, id2) {
    const min = Math.min(id1, id2);
    const max = Math.max(id1, id2);
    return `${min}-${max}`;
  }

  function findValidNeighbors(level, islandId) {
    const current = level.islands.find(i => i.id === islandId);
    if (!current) return [];

    const islandMap = new Map(level.islands.map(i => [`${i.r},${i.c}`, i]));
    const neighbors = [];

    // North
    for (let r = current.r - 1; r >= 0; r--) {
      const hit = islandMap.get(`${r},${current.c}`);
      if (hit) { neighbors.push(hit); break; }
    }
    // South
    for (let r = current.r + 1; r < level.rows; r++) {
      const hit = islandMap.get(`${r},${current.c}`);
      if (hit) { neighbors.push(hit); break; }
    }
    // West
    for (let c = current.c - 1; c >= 0; c--) {
      const hit = islandMap.get(`${current.r},${c}`);
      if (hit) { neighbors.push(hit); break; }
    }
    // East
    for (let c = current.c + 1; c < level.cols; c++) {
      const hit = islandMap.get(`${current.r},${c}`);
      if (hit) { neighbors.push(hit); break; }
    }

    return neighbors;
  }

  function bridgesCross(a1, a2, b1, b2) {
    const isAH = a1.r === a2.r;
    const isAV = a1.c === a2.c;
    const isBH = b1.r === b2.r;
    const isBV = b1.c === b2.c;

    if (isAH && isBV) {
      const hRow = a1.r;
      const minHC = Math.min(a1.c, a2.c);
      const maxHC = Math.max(a1.c, a2.c);
      const vCol = b1.c;
      const minVR = Math.min(b1.r, b2.r);
      const maxVR = Math.max(b1.r, b2.r);
      return minVR < hRow && hRow < maxVR && minHC < vCol && vCol < maxHC;
    }

    if (isAV && isBH) {
      return bridgesCross(b1, b2, a1, a2);
    }

    return false;
  }

  function getIslandDegree(islandId, bridges) {
    let count = 0;
    for (const key in bridges) {
      const [u, v] = key.split('-').map(Number);
      if (u === islandId || v === islandId) {
        count += bridges[key] || 0;
      }
    }
    return count;
  }

  function isLevelComplete(level, bridges) {
    if (!level || !bridges) return false;

    // 1. Degree satisfaction
    for (const isl of level.islands) {
      if (getIslandDegree(isl.id, bridges) !== isl.count) return false;
    }

    // 2. No crossings
    const activeEdges = [];
    for (const key in bridges) {
      if (bridges[key] > 0) {
        const [u, v] = key.split('-').map(Number);
        const islU = level.islands.find(i => i.id === u);
        const islV = level.islands.find(i => i.id === v);
        if (islU && islV) activeEdges.push([islU, islV]);
      }
    }

    for (let i = 0; i < activeEdges.length; i++) {
      for (let j = i + 1; j < activeEdges.length; j++) {
        if (bridgesCross(activeEdges[i][0], activeEdges[i][1], activeEdges[j][0], activeEdges[j][1])) {
          return false;
        }
      }
    }

    // 3. Connected graph (Union-Find)
    const count = level.islands.length;
    if (count === 0) return true;
    const parent = Array.from({ length: count }, (_, idx) => idx);

    function find(x) {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }
    function union(x, y) {
      const rx = find(x), ry = find(y);
      if (rx !== ry) parent[rx] = ry;
    }

    for (const key in bridges) {
      if (bridges[key] > 0) {
        const [u, v] = key.split('-').map(Number);
        union(u, v);
      }
    }

    const root = find(0);
    for (let i = 1; i < count; i++) {
      if (find(i) !== root) return false;
    }

    return true;
  }

  return {
    edgeKey,
    findValidNeighbors,
    bridgesCross,
    getIslandDegree,
    isLevelComplete,
  };
});
