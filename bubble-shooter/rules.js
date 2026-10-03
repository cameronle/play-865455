(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BubbleShooterRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function emptyGrid(rows = 12, cols = 8) {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }
  function neighbors(row, col, offset = 0) {
    const diagonals =
      (row + offset) % 2
        ? [
            [row - 1, col],
            [row - 1, col + 1],
            [row + 1, col],
            [row + 1, col + 1],
          ]
        : [
            [row - 1, col - 1],
            [row - 1, col],
            [row + 1, col - 1],
            [row + 1, col],
          ];
    return [[row, col - 1], [row, col + 1], ...diagonals];
  }
  function inside(grid, row, col) {
    return row >= 0 && row < grid.length && col >= 0 && col < grid[0].length;
  }
  function component(
    grid,
    row,
    col,
    color = grid[row] && grid[row][col],
    offset = 0,
  ) {
    if (!color || !inside(grid, row, col)) return [];
    const found = [],
      seen = new Set([`${row},${col}`]),
      queue = [[row, col]];
    while (queue.length) {
      const [r, c] = queue.shift();
      found.push([r, c]);
      for (const [nr, nc] of neighbors(r, c, offset)) {
        const key = `${nr},${nc}`;
        if (inside(grid, nr, nc) && !seen.has(key) && grid[nr][nc] === color) {
          seen.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    return found;
  }
  function attached(grid, offset = 0) {
    const seen = new Set(),
      queue = [];
    for (let c = 0; c < grid[0].length; c++)
      if (grid[0][c]) {
        seen.add(`0,${c}`);
        queue.push([0, c]);
      }
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [nr, nc] of neighbors(r, c, offset)) {
        const key = `${nr},${nc}`;
        if (inside(grid, nr, nc) && grid[nr][nc] && !seen.has(key)) {
          seen.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    return seen;
  }
  function resolve(grid, row, col, offset = 0) {
    const group = component(grid, row, col, undefined, offset);
    if (group.length < 3) return { matched: 0, dropped: 0 };
    for (const [r, c] of group) grid[r][c] = null;
    const connected = attached(grid, offset);
    let dropped = 0;
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < grid[r].length; c++)
        if (grid[r][c] && !connected.has(`${r},${c}`)) {
          grid[r][c] = null;
          dropped++;
        }
    return { matched: group.length, dropped };
  }
  function addRow(grid, colors) {
    const cols = grid[0].length;
    grid.unshift(
      Array.from({ length: cols }, (_, i) => colors[i % colors.length]),
    );
  }
  function occupied(grid) {
    let count = 0;
    for (const row of grid) for (const cell of row) if (cell) count++;
    return count;
  }

  function cellCenter(row, col, offset = 0) {
    return {
      x: 27 + col * 56 + ((row + offset) % 2 ? 28 : 0),
      y: 30 + row * 48,
    };
  }
  function advanceShot(grid, input, distance, offset = 0) {
    const shot = { ...input },
      speed = Math.hypot(shot.vx, shot.vy),
      path = [{ x: shot.x, y: shot.y }];
    let remaining = Math.max(0, distance),
      hit = null;
    if (!speed || !Number.isFinite(remaining)) return { shot, hit, path };
    let dx = shot.vx / speed,
      dy = shot.vy / speed;
    for (let bounce = 0; bounce < 64 && remaining > 1e-8; bounce++) {
      let travel = remaining,
        event = null;
      const wall =
        dx > 1e-10
          ? (453 - shot.x) / dx
          : dx < -1e-10
            ? (27 - shot.x) / dx
            : Infinity;
      if (wall >= -1e-8 && wall <= travel) {
        travel = Math.max(0, wall);
        event = { kind: "wall" };
      }
      const ceiling = dy < -1e-10 ? (30 - shot.y) / dy : Infinity;
      if (ceiling >= -1e-8 && ceiling <= travel) {
        travel = Math.max(0, ceiling);
        event = { kind: "ceiling" };
      }
      for (let r = 0; r < grid.length; r++)
        for (let c = 0; c < grid[r].length; c++)
          if (grid[r][c]) {
            const p = cellCenter(r, c, offset),
              ox = shot.x - p.x,
              oy = shot.y - p.y,
              b = ox * dx + oy * dy,
              q = ox * ox + oy * oy - 2500,
              disc = b * b - q;
            if (disc < -1e-8) continue;
            let t = q < -1e-8 ? 0 : -b - Math.sqrt(Math.max(0, disc));
            if (t >= -1e-8 && t <= travel + 1e-8) {
              travel = Math.max(0, t);
              event = { kind: "bubble", row: r, col: c };
            }
          }
      shot.x += dx * travel;
      shot.y += dy * travel;
      remaining -= travel;
      path.push({ x: shot.x, y: shot.y });
      if (event && event.kind === "wall") {
        dx = -dx;
        shot.vx = dx * speed;
        continue;
      }
      if (event) {
        hit = { ...event, x: shot.x, y: shot.y };
        break;
      }
      break;
    }
    return { shot, hit, path };
  }
  function attachmentCell(grid, hit, offset = 0) {
    if (!hit) return null;
    let cells = [];
    if (hit.kind === "ceiling") {
      for (let c = 0; c < grid[0].length; c++)
        if (!grid[0][c]) cells.push([0, c]);
    } else {
      const struck = cellCenter(hit.row, hit.col, offset);
      cells = neighbors(hit.row, hit.col, offset).filter(
        ([r, c]) =>
          inside(grid, r, c) &&
          !grid[r][c] &&
          (cellCenter(r, c, offset).x - struck.x) * (hit.x - struck.x) +
            (cellCenter(r, c, offset).y - struck.y) * (hit.y - struck.y) >=
            -1e-8,
      );
    }
    cells.sort((a, b) => {
      let x = cellCenter(...a, offset),
        y = cellCenter(...b, offset);
      return (
        Math.hypot(x.x - hit.x, x.y - hit.y) -
        Math.hypot(y.x - hit.x, y.y - hit.y)
      );
    });
    return cells.length ? { row: cells[0][0], col: cells[0][1] } : null;
  }
  return {
    emptyGrid,
    neighbors,
    inside,
    component,
    resolve,
    addRow,
    occupied,
    cellCenter,
    advanceShot,
    attachmentCell,
  };
});
