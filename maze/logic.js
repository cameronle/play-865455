(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MazeLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DIRECTIONS = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  function createMaze() {
    const rows = [
      '###############',
      '#.............#',
      '#.###.###.###.#',
      '#.............#',
      '#.#.###.###.#.#',
      '#.#.........#.#',
      '#.###.#.#.###.#',
      '#.....#.#.....#',
      '###.#.....#.###',
      '#...#.###.#...#',
      '#.#.........#.#',
      '#.#.###.###.#.#',
      '#.............#',
      '#.............#',
      '###############',
    ];
    const walls = new Set();
    rows.forEach((line, row) => [...line].forEach((cell, col) => { if (cell === '#') walls.add(`${row},${col}`); }));
    return {
      size: rows.length,
      walls,
      isWall(row, col) { return row < 0 || col < 0 || row >= rows.length || col >= rows.length || walls.has(`${row},${col}`); },
    };
  }

  function neighbors(maze, point) {
    return DIRECTIONS.map(direction => ({
      row: point.row + direction.y,
      col: point.col + direction.x,
      direction,
    })).filter(next => !maze.isWall(next.row, next.col));
  }

  function distanceMap(maze, target) {
    const distances = new Map([[`${target.row},${target.col}`, 0]]);
    const queue = [{ row: target.row, col: target.col }];
    while (queue.length) {
      const current = queue.shift();
      const distance = distances.get(`${current.row},${current.col}`);
      for (const next of neighbors(maze, current)) {
        const key = `${next.row},${next.col}`;
        if (!distances.has(key)) {
          distances.set(key, distance + 1);
          queue.push(next);
        }
      }
    }
    return distances;
  }

  function chooseEnemyStep(maze, enemy, target, random = Math.random, personality = 0) {
    let options = neighbors(maze, enemy);
    if (!options.length) return { row: enemy.row, col: enemy.col };
    if (enemy.previous && options.length > 1) {
      const forward = options.filter(option => option.row !== enemy.previous.row || option.col !== enemy.previous.col);
      if (forward.length) options = forward;
    }
    const distances = distanceMap(maze, target);
    options.sort((a, b) => {
      const aDistance = distances.get(`${a.row},${a.col}`) ?? Infinity;
      const bDistance = distances.get(`${b.row},${b.col}`) ?? Infinity;
      return aDistance - bDistance;
    });
    if (personality === 1 && options.length > 1 && random() < 0.32) return { row: options[1].row, col: options[1].col };
    if (options.length > 1 && random() < 0.08) {
      const choice = options[Math.floor(random() * options.length)];
      return { row: choice.row, col: choice.col };
    }
    return { row: options[0].row, col: options[0].col };
  }

  return { createMaze, neighbors, chooseEnemyStep };
});
