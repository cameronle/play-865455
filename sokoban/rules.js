(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SokobanRules = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function key(x, y) { return x + ',' + y; }
  function parseLevel(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('Level must be a non-empty array');
    if (rows.some(function (row) { return typeof row !== 'string'; })) throw new Error('Level rows must be strings');
    var width = rows.reduce(function (max, row) { return Math.max(max, row.length); }, 0);
    var state = {width: width, height: rows.length, walls: {}, floor: {}, goals: {}, boxes: {}, player: null, moves: 0, pushes: 0};
    rows.forEach(function (row, y) {
      for (var x = 0; x < width; x++) {
        var cell = row[x];
        if (cell !== undefined && !' #.$*@+'.includes(cell)) throw new Error('Invalid cell in level');
        if (cell !== undefined && cell !== '#') state.floor[key(x, y)] = true;
        if (cell === '#') state.walls[key(x, y)] = true;
        if (cell === '.' || cell === '*' || cell === '+') state.goals[key(x, y)] = true;
        if (cell === '$' || cell === '*') state.boxes[key(x, y)] = true;
        if (cell === '@' || cell === '+') {
          if (state.player) throw new Error('Level must have exactly one player');
          state.player = {x: x, y: y};
        }
      }
    });
    if (!state.player) throw new Error('Level has no player');
    return state;
  }
  function move(state, dx, dy) {
    if (!state || !state.player || !Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return false;
    var nx = state.player.x + dx, ny = state.player.y + dy, next = key(nx, ny);
    if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height || !state.floor[next] || state.walls[next]) return false;
    if (state.boxes[next]) {
      var bx = nx + dx, by = ny + dy, beyond = key(bx, by);
      if (bx < 0 || by < 0 || bx >= state.width || by >= state.height || !state.floor[beyond] || state.walls[beyond] || state.boxes[beyond]) return false;
      delete state.boxes[next]; state.boxes[beyond] = true; state.pushes++;
    }
    state.player.x = nx; state.player.y = ny; state.moves++;
    return true;
  }
  function isComplete(state) {
    var boxes = Object.keys(state.boxes);
    return boxes.length > 0 && boxes.every(function (position) { return !!state.goals[position]; });
  }
  // Walking only: crates are obstacles, never implicit pushes or puzzle solutions.
  function findWalkPath(state, x, y) {
    if (!state || !state.player || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
    var target = key(x, y), start = key(state.player.x, state.player.y);
    if (!state.floor[target] || state.walls[target] || state.boxes[target]) return null;
    if (start === target) return '';
    var queue = [{x:state.player.x,y:state.player.y}], parents = new Map([[start, null]]);
    var steps = [[0,-1,'U'],[0,1,'D'],[-1,0,'L'],[1,0,'R']];
    for (var i = 0; i < queue.length; i++) {
      var position = queue[i], current = key(position.x, position.y);
      for (var step of steps) {
        var nx = position.x + step[0], ny = position.y + step[1], next = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height || !state.floor[next] || state.walls[next] || state.boxes[next] || parents.has(next)) continue;
        parents.set(next, {from:current,code:step[2]});
        if (next === target) {
          var path = [];
          for (var k = target; k !== start; k = parents.get(k).from) path.push(parents.get(k).code);
          return path.reverse().join('');
        }
        queue.push({x:nx,y:ny});
      }
    }
    return null;
  }
  return {parseLevel: parseLevel, move: move, isComplete: isComplete, findWalkPath: findWalkPath};
}));
