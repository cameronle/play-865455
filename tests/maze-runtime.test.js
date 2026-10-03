const test = require('node:test');
const assert = require('node:assert/strict');
const { loadMaze } = require('./helpers/maze-runtime');

test('maze starts, accepts touch direction, moves ghosts, and pauses', () => {
  const g = loadMaze(); g.start();
  g.buttons.right.emit('pointerdown'); g.run(200);
  assert.equal(g.nodes.score.textContent, '000010');
  assert.notEqual(`${g.snapshot().enemies[0].row},${g.snapshot().enemies[0].col}`, '13,1');
  g.nodes.game.emit('pointerdown', { clientX:200, clientY:200 });
  g.nodes.game.emit('pointerup', { clientX:200, clientY:100 });
  assert.deepEqual(g.snapshot().queued, {x:0,y:-1});
  g.nodes.pause.onclick(); assert.equal(g.nodes.title.textContent,'PAUSED');
});
