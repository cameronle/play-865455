(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FlowRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function isAdjacent(a, b) {
    if (
      ![a, b].every((p) => p && Number.isInteger(p.r) && Number.isInteger(p.c))
    )
      return false;
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function sameCell(a, b) {
    if (!a || !b) return false;
    return a.r === b.r && a.c === b.c;
  }

  function getEndpoint(level, r, c) {
    if (!level || !level.endpoints) return null;
    for (const ep of level.endpoints) {
      if (ep.start[0] === r && ep.start[1] === c)
        return { color: ep.color, type: "start", r, c };
      if (ep.end[0] === r && ep.end[1] === c)
        return { color: ep.color, type: "end", r, c };
    }
    return null;
  }

  function isPathConnected(endpoint, path) {
    if (!endpoint || !Array.isArray(path) || path.length < 2) return false;
    const seen = new Set();
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (
        !p ||
        !Number.isInteger(p.r) ||
        !Number.isInteger(p.c) ||
        (i && !isAdjacent(path[i - 1], p))
      )
        return false;
      const key = `${p.r},${p.c}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    const first = path[0];
    const last = path[path.length - 1];
    const s = { r: endpoint.start[0], c: endpoint.start[1] };
    const e = { r: endpoint.end[0], c: endpoint.end[1] };
    return (
      (sameCell(first, s) && sameCell(last, e)) ||
      (sameCell(first, e) && sameCell(last, s))
    );
  }

  function normalizePaths(level, data) {
    if (!level || !data || typeof data !== "object" || Array.isArray(data))
      return null;
    const allowed = new Set(level.endpoints.map((ep) => String(ep.color)));
    if (Object.keys(data).some((key) => !allowed.has(key))) return null;
    const clean = {},
      occupied = new Set();
    for (const ep of level.endpoints) {
      const path = data[ep.color];
      if (path === undefined) continue;
      if (!Array.isArray(path) || path.length > level.size * level.size)
        return null;
      if (!path.length) continue;
      const first = path[0];
      if (
        !first ||
        ![ep.start, ep.end].some(([r, c]) => first.r === r && first.c === c)
      )
        return null;
      const copy = [];
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (
          !p ||
          !Number.isInteger(p.r) ||
          !Number.isInteger(p.c) ||
          p.r < 0 ||
          p.r >= level.size ||
          p.c < 0 ||
          p.c >= level.size ||
          (i && !isAdjacent(path[i - 1], p))
        )
          return null;
        const key = `${p.r},${p.c}`,
          endpoint = getEndpoint(level, p.r, p.c);
        if (
          occupied.has(key) ||
          (endpoint &&
            (endpoint.color !== ep.color || (i > 0 && i !== path.length - 1)))
        )
          return null;
        occupied.add(key);
        copy.push({ r: p.r, c: p.c });
      }
      clean[ep.color] = copy;
    }
    return clean;
  }

  function isLevelComplete(level, paths) {
    if (
      !level ||
      !Number.isInteger(level.size) ||
      level.size < 1 ||
      !Array.isArray(level.endpoints) ||
      !level.endpoints.length ||
      !paths ||
      !normalizePaths(level, paths)
    )
      return false;
    const size = level.size;
    const covered = new Set();

    for (const ep of level.endpoints) {
      const path = paths[ep.color];
      if (!isPathConnected(ep, path)) return false;
      for (let i = 0; i < path.length; i++) {
        const cell = path[i];
        if (
          !cell ||
          !Number.isInteger(cell.r) ||
          !Number.isInteger(cell.c) ||
          cell.r < 0 ||
          cell.r >= size ||
          cell.c < 0 ||
          cell.c >= size
        )
          return false;
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
    normalizePaths,
  };
});
