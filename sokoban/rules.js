(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SokobanRules = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function key(x, y) { return x + ',' + y; }
  function parseLevel(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('Level must be a non-empty array');
    var width = rows.reduce(function (max, row) { return Math.max(max, row.length); }, 0);
    var state = {width: width, height: rows.length, walls: {}, goals: {}, boxes: {}, player: null, moves: 0, pushes: 0};
    rows.forEach(function (row, y) {
      for (var x = 0; x < width; x++) {
        var cell = row[x] || ' ';
        if (cell === '#') state.walls[key(x, y)] = true;
        if (cell === '.' || cell === '*' || cell === '+') state.goals[key(x, y)] = true;
        if (cell === '$' || cell === '*') state.boxes[key(x, y)] = true;
        if (cell === '@' || cell === '+') state.player = {x: x, y: y};
      }
    });
    if (!state.player) throw new Error('Level has no player');
    return state;
  }
  function move(state, dx, dy) {
    if (!state || !state.player || Math.abs(dx) + Math.abs(dy) !== 1) return false;
    var nx = state.player.x + dx, ny = state.player.y + dy, next = key(nx, ny);
    if (state.walls[next]) return false;
    if (state.boxes[next]) {
      var bx = nx + dx, by = ny + dy, beyond = key(bx, by);
      if (state.walls[beyond] || state.boxes[beyond]) return false;
      delete state.boxes[next]; state.boxes[beyond] = true; state.pushes++;
    }
    state.player.x = nx; state.player.y = ny; state.moves++;
    return true;
  }
  function isComplete(state) {
    var boxes = Object.keys(state.boxes);
    return boxes.length > 0 && boxes.every(function (position) { return !!state.goals[position]; });
  }
  return {parseLevel: parseLevel, move: move, isComplete: isComplete};
}));
